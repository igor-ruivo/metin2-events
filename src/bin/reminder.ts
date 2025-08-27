import { config, validateConfig } from '../config';
import { getSchedule, portugalNow } from '../scraper';

interface DiscordWebhookPayload {
	content?: string;
	embeds?: Array<{
		title?: string;
		description?: string;
		color?: number;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		timestamp?: string;
		footer?: { text: string };
	}>;
}

async function sendDiscordWebhook(
	webhookUrl: string,
	payload: DiscordWebhookPayload
): Promise<void> {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`Webhook failed: ${response.status} ${response.statusText}`
			);
		}

		console.log('✅ Discord webhook sent successfully');
	} catch (error) {
		console.error('❌ Failed to send Discord webhook:', error);
		throw error;
	}
}

async function sendDailyReminder(webhookUrl: string): Promise<void> {
	try {
		const schedule = await getSchedule('week');
		if (!schedule) {
			console.log('⚠️ No schedule found for current month');
			return;
		}

		const today = portugalNow().getDate();
		const todayEvents = schedule.days.find((d) => d.day === today);

		if (!todayEvents) {
			console.log('⚠️ No events found for today');
			return;
		}

		const embed = {
			title: '🌅 Daily Events Reminder',
			description: `**Today's Tigerghost Events (${today}/${schedule.month + 1}/${schedule.year})**`,
			fields: [
				{
					name: '🕐 Event 1 (15:00-19:00)',
					value: todayEvents.event1 ?? 'No event',
					inline: true,
				},
				{
					name: '🕐 Event 2 (19:00-23:00)',
					value: todayEvents.event2 ?? 'No event',
					inline: true,
				},
			],
			color: 0xffa500,
			timestamp: new Date().toISOString(),
		};

		await sendDiscordWebhook(webhookUrl, { embeds: [embed] });
		console.log('📢 Daily reminder sent');
	} catch (error) {
		console.error('❌ Error sending daily reminder:', error);
		throw error;
	}
}

async function checkUpcomingEvents(webhookUrl: string): Promise<void> {
	try {
		const schedule = await getSchedule();
		if (!schedule) return;

		const now = portugalNow();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();
		const currentTime = currentHour * 60 + currentMinute;

		// Check if we're 15 minutes before Event 1 (15:00) or Event 2 (19:00)
		const event1Time = 15 * 60; // 15:00 in minutes
		const event2Time = 19 * 60; // 19:00 in minutes

		const today = now.getDate();
		const todayEvents = schedule.days.find((d) => d.day === today);
		if (!todayEvents) return;

		// Event 1 reminder (15:00)
		if (currentTime >= event1Time - 15 && currentTime < event1Time) {
			const embed = {
				title: '⏰ Event Starting Soon!',
				description: '**Event 1 starts in 15 minutes at 15:00**',
				fields: [
					{
						name: '🎮 Event',
						value: todayEvents.event1 ?? 'Unknown',
						inline: true,
					},
					{
						name: '📅 Date',
						value: `${today}/${schedule.month + 1}/${schedule.year}`,
						inline: true,
					},
				],
				color: 0xff0000,
				timestamp: new Date().toISOString(),
			};
			await sendDiscordWebhook(webhookUrl, { embeds: [embed] });
			console.log('📢 Event 1 reminder sent');
		}

		// Event 2 reminder (19:00)
		if (currentTime >= event2Time - 15 && currentTime < event2Time) {
			const embed = {
				title: '⏰ Event Starting Soon!',
				description: '**Event 2 starts in 15 minutes at 19:00**',
				fields: [
					{
						name: '🎮 Event',
						value: todayEvents.event2 ?? 'Unknown',
						inline: true,
					},
					{
						name: '📅 Date',
						value: `${today}/${schedule.month + 1}/${schedule.year}`,
						inline: true,
					},
				],
				color: 0xff0000,
				timestamp: new Date().toISOString(),
			};
			await sendDiscordWebhook(webhookUrl, { embeds: [embed] });
			console.log('📢 Event 2 reminder sent');
		}
	} catch (error) {
		console.error('❌ Error checking upcoming events:', error);
		throw error;
	}
}

async function main(): Promise<void> {
	validateConfig();

	const webhookUrl = config.webhookUrl;
	if (!webhookUrl) {
		console.error('❌ Webhook URL not found in configuration');
		process.exit(1);
	}

	const now = portugalNow();
	const currentHour = now.getHours();
	const currentMinute = now.getMinutes();

	console.log(
		`🕐 Current time: ${now.toLocaleString('en-US', { timeZone: config.timezone })}`
	);

	// Daily reminder at 09:00 (08:00 UTC)
	if (currentHour === 8 && currentMinute === 0) {
		console.log('🌅 Sending daily reminder...');
		await sendDailyReminder(webhookUrl);
	} else {
		console.log('⏰ Checking for upcoming events...');
		await checkUpcomingEvents(webhookUrl);
	}

	console.log('✅ Reminder processing completed');
}

void main().catch((error) => {
	console.error('❌ Reminder processing failed:', error);
	process.exit(1);
});
