import {
	findTigerghostThreads,
	formatScheduleForDiscord,
	parseThreadToSchedule,
} from '../scraper';

async function main(): Promise<void> {
	console.log('🧪 Testing Metin2 Events Scraper...\n');

	try {
		// Find Tigerghost threads
		console.log('🔍 Searching for Tigerghost threads...');
		const threads = await findTigerghostThreads();

		if (threads.length === 0) {
			console.log('❌ No Tigerghost threads found.');
			return;
		}

		console.log(`✅ Found ${threads.length} Tigerghost threads:\n`);
		threads.forEach((t, i) => console.log(`${i + 1}. ${t.title}`));

		// Parse first 3 threads
		console.log('\n📅 Parsing event schedules...\n');
		for (let i = 0; i < Math.min(3, threads.length); i++) {
			const thread = threads[i];
			console.log(`\n--- Parsing: ${thread.title} ---`);

			try {
				const schedule = await parseThreadToSchedule(thread.title, thread.href);
				if (schedule) {
					console.log(`✅ Successfully parsed ${schedule.days.length} days`);
					console.log(`📅 Month: ${schedule.month + 1}/${schedule.year}`);
					console.log(`🏷️  Server: ${schedule.serverLabel}`);
					console.log(`🔗 URL: ${schedule.threadUrl}`);

					// Show first few days as preview
					console.log('\n📋 Preview (first 5 days):');
					const previewDays = schedule.days.slice(0, 5);
					previewDays.forEach((d) => {
						console.log(
							`  ${String(d.day).padStart(2, '0')}: E1: ${d.event1 ?? '-'} | E2: ${d.event2 ?? '-'}`
						);
					});

					if (schedule.days.length > 5) {
						console.log(`  ... and ${schedule.days.length - 5} more days`);
					}
				} else {
					console.log('❌ Failed to parse schedule');
				}
			} catch (error) {
				console.error(`❌ Error parsing ${thread.title}:`, error);
			}
		}

		console.log('\n🎯 Testing Discord formatting...');
		const currentSchedule = await parseThreadToSchedule(
			threads[0].title,
			threads[0].href
		);
		if (currentSchedule) {
			console.log('\n📱 Discord-formatted output:');
			console.log(formatScheduleForDiscord(currentSchedule));
		}

		console.log('\n✅ Scraper test completed successfully!');
	} catch (error) {
		console.error('❌ Scraper test failed:', error);
		process.exit(1);
	}
}

void main();
