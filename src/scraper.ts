import { JSDOM } from 'jsdom';

import { convertCestToLisbon, portugalNow } from './utils';

const FORUM_URL =
	'https://board.pt.metin2.gameforge.com/index.php?board/86-eventos-metin2-pt/';

const UK_FORUM_URL =
	'https://board.en.metin2.gameforge.com/index.php?board/176-events/';

export type DailyEvents = {
	day: number;
	event1?: string;
	event2?: string;
	extra?: string;
};

export type MonthlySchedule = {
	serverLabel: string;
	month: number; // 0-11
	year: number;
	days: Array<DailyEvents>;
	threadTitle: string;
	threadUrl: string;
};

const monthToIndex: Record<string, number> = {
	janeiro: 0,
	january: 0,
	fevereiro: 1,
	february: 1,
	março: 2,
	marco: 2,
	march: 2,
	abril: 3,
	april: 3,
	maio: 4,
	may: 4,
	junho: 5,
	june: 5,
	julho: 6,
	july: 6,
	agosto: 7,
	august: 7,
	setembro: 8,
	september: 8,
	outubro: 9,
	october: 9,
	novembro: 10,
	november: 10,
	dezembro: 11,
	december: 11,
};

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'metin2-events-bot/1.0',
		},
	});
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return await res.text();
}

export function extractMonthYearFromTitle(title: string): {
	monthIndex: number | null;
	year: number | null;
} {
	const normalized = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	const monthKey = Object.keys(monthToIndex).find((m) =>
		normalized.includes(m)
	);
	const yearMatch = /20\d{2}/.exec(title);
	return {
		monthIndex: monthKey ? monthToIndex[monthKey] : null,
		year: yearMatch ? parseInt(yearMatch[0], 10) : null,
	};
}

export async function findTigerghostThreads(): Promise<
	Array<{ title: string; href: string }>
> {
	const html = await fetchHtml(FORUM_URL);
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	const anchors: Array<HTMLAnchorElement> = Array.from(
		doc
			.getElementById('content')
			?.querySelectorAll('[data-thread-id] a[href]') ?? []
	);
	const threads = anchors
		.filter(
			(a) =>
				/tigerghost/i.test(a.textContent || '') &&
				Object.keys(monthToIndex).some((m) => a.href?.includes(m))
		)
		.map((a) => ({
			title: (a.textContent || '').trim(),
			href: new URL(a.href, FORUM_URL).toString(),
		}));
	console.log(`Found ${threads.length} threads (PT).`);
	return threads;
}

export async function findTigerghostThreadsUK(): Promise<
	Array<{ title: string; href: string }>
> {
	const html = await fetchHtml(UK_FORUM_URL);
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	const anchors: Array<HTMLAnchorElement> = Array.from(
		doc
			.getElementById('content')
			?.querySelectorAll('[data-thread-id] a[href]') ?? []
	);
	const threads = anchors
		.filter(
			(a) =>
				/events/i.test(a.textContent || '') &&
				Object.keys(monthToIndex).some((m) => a.href?.includes(m))
		)
		.map((a) => ({
			title: (a.textContent || '').trim(),
			href: new URL(a.href, UK_FORUM_URL).toString(),
		}));
	console.log(`Found ${threads.length} threads (UK).`);
	return threads;
}

function parseMonthlyTable(document: Document): Array<DailyEvents> {
	// Heuristic: find a table that looks like a calendar with day cells containing "Evento 1"/"Evento 2"
	const tables = Array.from(document.querySelectorAll('table'));

	for (const table of tables) {
		const text = table.textContent?.toLowerCase() || '';
		if (!/evento\s*1|evento\s*2/.test(text)) {
			continue;
		}

		const days: Array<DailyEvents> = [];
		const tds = Array.from(table.querySelectorAll('td'));

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
				continue;
			}

			const day = parseInt(dayMatch[1], 10);
			const dayEntry: DailyEvents = { day };

			if (event1Text && event1Text !== '-') dayEntry.event1 = event1Text;
			if (event2Text && event2Text !== '-') dayEntry.event2 = event2Text;

			days.push(dayEntry);
		}

		if (days.length > 0) {
			return days;
		}
	}
	return [];
}

export async function parseThreadToSchedule(
	title: string,
	href: string,
	ukHref?: string
): Promise<MonthlySchedule | null> {
	const start = performance.now();
	const promises = [fetchHtml(href)];
	if (ukHref) {
		promises.push(fetchHtml(ukHref));
	}
	const [html, ukHtml] = await Promise.all(promises);
	console.log(`Took ${performance.now() - start} ms to fetch ${href}.`);
	const dom = new JSDOM(html);
	const doc = dom.window.document;
	const { monthIndex, year } = extractMonthYearFromTitle(title);
	const days = parseMonthlyTable(doc);
	if (monthIndex == null || year == null || days.length === 0) return null;
	const serverLabel = /\[(.*?)\]/.exec(title)?.[1] ?? 'Tigerghost';

	if (ukHtml) {
		const ukDom = new JSDOM(ukHtml);
		const ukDoc = ukDom.window.document;

		const groups = [
			...ukDoc.querySelectorAll('#content .messageBody > .messageText'),
		].flatMap((msg) => {
			const ps = msg.querySelectorAll('p');
			return ps.length > 0 &&
				ps[0].textContent?.toLocaleLowerCase().includes('tigerghost')
				? [...ps]
				: [];
		});

		let collecting = false;
		const result: Array<HTMLParagraphElement> = [];

		for (const p of groups) {
			if (!collecting) {
				if (p.textContent?.trim() === 'Additional events:') {
					collecting = true;
				}
			} else {
				if (p.textContent?.trim() === '') break; // stop at first empty <p>
				result.push(p);
			}
		}

		result.forEach((r) => {
			const text = r.textContent;
			if (!text) return;

			// Regex: capture the month name, then capture the whole days block (with + days)
			const match = /^[A-Za-z]+\s+\d+(?:\s*,\s*\+\s*\d+)*/.exec(text);
			if (!match) return;

			const dayPart = match[0]; // e.g. "August 28, + 29, + 30, + 31"
			let event = text.slice(dayPart.length).replace(/^,/, '').trim();

			event = convertCestToLisbon(event);

			// Extract all numbers from the day part
			const dayNumbers = [...dayPart.matchAll(/\d+/g)].map((m) =>
				parseInt(m[0], 10)
			);

			dayNumbers.forEach((d) => {
				// verifica se o dia já existe no array
				let dayObj = days.find((x) => x.day === d);

				if (!dayObj) {
					// se não existir, cria um novo
					dayObj = { day: d };
					days.push(dayObj);
				}

				dayObj.extra = event
					.replaceAll('Harvest Festival', 'Caça os Saqueadores')
					.replaceAll('Mining event', 'Spawn de Veios')
					.replaceAll('(Map: ', '(')
					.replaceAll('Deserto', 'Desert')
					.replaceAll('Desert', 'Deserto')
					.replaceAll(' and ', ' e ')
					.replaceAll(' and ', ' e ')
					.replaceAll('Catch carp', 'Captura de Carpas')
					.replaceAll(
						'Mysterious Chest , can be received at an event at the Fisherman in exchange for a living Carp',
						'poderás trocar Carpas vivas por Caixas Mistério no Pescador'
					);

				if (dayObj.extra.endsWith(' )')) {
					dayObj.extra = dayObj.extra.replace(/ \)$/, ')');
				}
			});
		});
	}

	return {
		serverLabel,
		month: monthIndex,
		year,
		days,
		threadTitle: title,
		threadUrl: href,
	};
}

export function formatScheduleForDiscord(
	schedule: MonthlySchedule,
	period: string
): string {
	const now = portugalNow();
	const weekdays = [
		'Domingo',
		'Segunda-feira',
		'Terça-feira',
		'Quarta-feira',
		'Quinta-feira',
		'Sexta-feira',
		'Sábado',
	];
	const lines: Array<string> = [];

	lines.push(`**${schedule.threadTitle}**`);

	if (period === 'today') {
		const day = schedule.days.find((d) => d.day === now.getDate());
		if (!day) return '❌ Não há eventos hoje.';
		lines.push(
			`\n**Hoje, ${String(day.day).padStart(2, '0')}/${schedule.month + 1}**`
		);
		lines.push(`• **Evento 1**: ${day.event1 ?? '-'}`);
		lines.push(`• **Evento 2**: ${day.event2 ?? '-'}`);
		if (day.extra) {
			lines.push(`• **Adicional**: ${day.extra ?? '-'}`);
		}
	} else if (period === 'week') {
		const start = new Date(now);
		const dayOfWeek = start.getDay(); // 0 = Domingo
		start.setDate(now.getDate() - dayOfWeek + 1); // ajusta para segunda-feira
		for (let i = 0; i < 7; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			const dayNumber = d.getDate();
			const dayEntry = schedule.days.find((s) => s.day === dayNumber);
			const todayMark =
				now.getDate() === dayNumber && now.getMonth() === schedule.month
					? ' 🎯'
					: '';
			lines.push(
				`\n**${weekdays[d.getDay()]}, ${String(dayNumber).padStart(2, '0')}/${d.getMonth() + 1}${todayMark}**`
			);
			if (dayEntry) {
				lines.push(`• **Evento 1**: ${dayEntry.event1 ?? '-'}`);
				lines.push(`• **Evento 2**: ${dayEntry.event2 ?? '-'}`);
				if (dayEntry.extra) {
					lines.push(`• **Adicional**: ${dayEntry.extra ?? '-'}`);
				}
			} else {
				lines.push('• Nenhum evento.');
			}
		}
	} else {
		// month ou next
		const isCurrentMonth =
			now.getMonth() === schedule.month && now.getFullYear() === schedule.year;

		for (const d of schedule.days.sort((a, b) => a.day - b.day)) {
			const syntheticDate = new Date(schedule.year, schedule.month, d.day);
			const todayMark = isCurrentMonth && d.day === now.getDate() ? ' 🎯' : '';
			lines.push(
				`\n**${weekdays[syntheticDate.getDay()]}, ${String(d.day).padStart(2, '0')}/${schedule.month + 1}${todayMark}**`
			);
			lines.push(`• **Evento 1**: ${d.event1 ?? '-'}`);
			lines.push(`• **Evento 2**: ${d.event2 ?? '-'}`);
			if (d.extra) {
				lines.push(`• **Adicional**: ${d.extra ?? '-'}`);
			}
		}
	}

	return lines.join('\n');
}

export async function getSchedule(
	pediod = 'month'
): Promise<MonthlySchedule | null> {
	const [threads, UKThreads] = await Promise.all([
		findTigerghostThreads(),
		findTigerghostThreadsUK(),
	]);
	const now = portugalNow();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();

	const parsedThread = threads.find((t) => {
		const { monthIndex, year } = extractMonthYearFromTitle(t.title);
		if (pediod === 'next') {
			if (currentMonth === 11) {
				return monthIndex === 0 && year === currentYear + 1;
			}
			return monthIndex === currentMonth + 1 && year === currentYear;
		}
		return monthIndex === currentMonth && year === currentYear;
	});

	if (!parsedThread) {
		return null;
	}

	const { monthIndex, year } = extractMonthYearFromTitle(parsedThread.title);

	const ukThread = UKThreads.find((t) => {
		const ukData = extractMonthYearFromTitle(t.title);
		return ukData.monthIndex === monthIndex && ukData.year === year;
	});

	if (!ukThread) {
		console.warn(`Couldn't find UK Thread for ${parsedThread.href}`);
	}

	return parseThreadToSchedule(
		parsedThread.title,
		parsedThread.href,
		ukThread?.href
	);
}
