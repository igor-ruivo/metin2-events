import { JSDOM } from 'jsdom';

const FORUM_URL =
	'https://board.pt.metin2.gameforge.com/index.php?board/86-eventos-metin2-pt/';

type DailyEvents = {
	day: number;
	event1?: string;
	event2?: string;
};

type MonthlySchedule = {
	serverLabel: string;
	month: number; // 0-11
	year: number;
	days: Array<DailyEvents>;
	threadTitle: string;
	threadUrl: string;
};

const ptMonthToIndex: Record<string, number> = {
	janeiro: 0,
	fevereiro: 1,
	março: 2,
	marco: 2,
	abril: 3,
	maio: 4,
	junho: 5,
	julho: 6,
	agosto: 7,
	setembro: 8,
	outubro: 9,
	novembro: 10,
	dezembro: 11,
};

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'metin2-events-bot/1.0',
		},
	});
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return await res.text();
}

function extractMonthYearFromTitle(title: string): {
	monthIndex: number | null;
	year: number | null;
} {
	const normalized = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	const monthKey = Object.keys(ptMonthToIndex).find((m) =>
		normalized.includes(m)
	);
	const yearMatch = /20\d{2}/.exec(title);
	return {
		monthIndex: monthKey ? ptMonthToIndex[monthKey] : null,
		year: yearMatch ? parseInt(yearMatch[0], 10) : null,
	};
}

async function findTigerghostThreads(): Promise<
	Array<{ title: string; href: string }>
> {
	console.log('Fetching forum page...');
	const html = await fetchHtml(FORUM_URL);
	console.log('Forum page fetched, length:', html.length);
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	const anchors = Array.from(doc.querySelectorAll('a'));
	console.log('Found', anchors.length, 'anchor elements');
	const threads = anchors
		.filter((a) => /tigerghost/i.test(a.textContent || ''))
		.map((a) => ({
			title: (a.textContent || '').trim(),
			href: new URL(a.href, FORUM_URL).toString(),
		}));
	console.log('Tigerghost threads found:', threads.length);
	threads.forEach((t, i) => console.log(`  ${i + 1}. ${t.title}`));
	return threads;
}

function parseMonthlyTable(document: Document): Array<DailyEvents> {
	// Heuristic: find a table that looks like a calendar with day cells containing "Evento 1"/"Evento 2"
	const tables = Array.from(document.querySelectorAll('table'));
	console.log('Found', tables.length, 'tables in the document');

	for (const table of tables) {
		const text = table.textContent?.toLowerCase() || '';
		console.log('Table text preview:', text.substring(0, 200));
		if (!/evento\s*1|evento\s*2/.test(text)) {
			console.log('Table does not contain Evento 1/2, skipping');
			continue;
		}
		console.log('Found table with Evento 1/2 content');
		const days: Array<DailyEvents> = [];
		const tds = Array.from(table.querySelectorAll('td'));
		console.log('Found', tds.length, 'td elements in this table');

		// The table has 3 columns: Data, Evento 1, Evento 2
		// We need to process rows of 3 cells at a time
		for (let i = 0; i < tds.length; i += 3) {
			if (i + 2 >= tds.length) break;

			const dayCell = tds[i];
			const event1Cell = tds[i + 1];
			const event2Cell = tds[i + 2];

			const dayText = (dayCell.textContent || '').trim();
			const event1Text = (event1Cell.textContent || '').trim();
			const event2Text = (event2Cell.textContent || '').trim();

			// Skip header row
			if (
				dayText.toLowerCase() === 'data' ||
				event1Text.toLowerCase().includes('evento 1')
			) {
				continue;
			}

			// Extract day number from Portuguese date format like "sexta-feira, agosto 01, 2025"
			const dayMatch = /\b(\d{1,2})\b/.exec(dayText);
			if (!dayMatch) {
				console.log('Could not extract day from:', dayText);
				continue;
			}

			const day = parseInt(dayMatch[1], 10);
			const dayEntry: DailyEvents = { day };

			if (event1Text && event1Text !== '-') dayEntry.event1 = event1Text;
			if (event2Text && event2Text !== '-') dayEntry.event2 = event2Text;

			days.push(dayEntry);
			console.log('Parsed day:', dayEntry);
		}

		if (days.length > 0) {
			console.log('Returning', days.length, 'parsed days');
			return days;
		}
	}
	console.log('No valid event tables found');
	return [];
}

async function parseThreadToSchedule(
	title: string,
	href: string
): Promise<MonthlySchedule | null> {
	const html = await fetchHtml(href);
	await sleep(300);
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	const { monthIndex, year } = extractMonthYearFromTitle(title);
	const days = parseMonthlyTable(doc);
	if (monthIndex == null || year == null || days.length === 0) return null;
	const serverLabel = /\[(.*?)\]/.exec(title)?.[1] ?? 'Tigerghost';
	return {
		serverLabel,
		month: monthIndex,
		year,
		days,
		threadTitle: title,
		threadUrl: href,
	};
}

function formatScheduleForConsole(schedule: MonthlySchedule): string {
	const now = new Date();
	const isCurrentMonth =
		now.getMonth() === schedule.month && now.getFullYear() === schedule.year;
	const lines: Array<string> = [];
	lines.push(`${schedule.threadTitle} -> ${schedule.threadUrl}`);
	for (const d of schedule.days.sort((a, b) => a.day - b.day)) {
		const todayMark =
			isCurrentMonth && d.day === now.getDate() ? ' <== HOJE' : '';
		lines.push(
			`${String(d.day).padStart(2, '0')}: ` +
				`E1: ${d.event1 ?? '-'} | E2: ${d.event2 ?? '-'}${todayMark}`
		);
	}
	return lines.join('\n');
}

async function main(): Promise<void> {
	console.log('Starting Metin2 events scraper...');
	const threads = await findTigerghostThreads();
	if (threads.length === 0) {
		console.log('No Tigerghost threads found.');
		return;
	}

	console.log(`\nProcessing ${threads.length} threads...`);
	for (const t of threads.slice(0, 3)) {
		try {
			console.log(`\nParsing: ${t.title}`);
			const schedule = await parseThreadToSchedule(t.title, t.href);
			if (schedule) {
				console.log(formatScheduleForConsole(schedule));
				console.log('');
			} else {
				console.log(`Could not parse schedule for ${t.title}`);
			}
		} catch (err) {
			console.error('Failed parsing', t.href, err);
		}
	}
	console.log('Script finished.');
}

void main();

export default main;
