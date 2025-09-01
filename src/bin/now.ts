import { config, validateConfig } from '../config';
import { getSchedule } from '../scraper';
import type { DiscordWebhookPayload } from '../utils';
import { portugalNow, sendDiscordWebhook } from '../utils';

const extractExtraHour = (extra: string) => {
	const match = /\b(\d{1,2}):\d{2}\b/.exec(extra);
	if (!match) return null;

	const hour = parseInt(match[1], 10);
	if (hour >= 0 && hour <= 23) {
		return hour;
	}
	return null;
};

async function sendDailyReminder(webhookUrl: string): Promise<void> {
	try {
		const schedule = await getSchedule('month');
		if (!schedule) {
			console.log('⚠️ No schedule found for current day');
			return;
		}

		const now = portugalNow();
		const today = now.getDate();
		const todayEvents = schedule.days.find((d) => d.day === today);
		const extraEventsFromDayAfter = schedule.days.find(
			(d) => d.day === today + 1
		); // it's ok if day is invalid (next month). We don't usually have early month events starting too early

		if (!todayEvents) {
			console.log('⚠️ No events found for today');
			return;
		}

		const currentHour = now.getHours();

		const events = [
			{
				triggerHour: 14,
				eventHour: 15,
				label: 'Evento 1',
				name: todayEvents.event1,
			},
			{
				triggerHour: 18,
				eventHour: 19,
				label: 'Evento 2',
				name: todayEvents.event2,
			},
		];

		// i'm assuming we won't have short events starting at late hours (after 11pm etc)
		if (todayEvents.extra) {
			const extraHour = extractExtraHour(todayEvents.extra); // does not include full day events

			if (extraHour) {
				events.push({
					triggerHour: extraHour - 1,
					eventHour: extraHour,
					label: 'Adicional',
					name: todayEvents.extra,
				});
			}
		}

		// edge case for full day events that must be warned the previous day
		if (extraEventsFromDayAfter?.extra) {
			const extraHour = extractExtraHour(extraEventsFromDayAfter.extra); // if it's null then it's whole day CEST, which means 23 PT previous day

			if (extraHour == null) {
				events.push({
					triggerHour: 22,
					eventHour: 23,
					label: 'Adicional',
					name: todayEvents.extra,
				});
			}
		}

		for (const { triggerHour, eventHour, label, name } of events) {
			if (currentHour === triggerHour) {
				const targetDate = new Date(now);
				targetDate.setHours(eventHour, 0, 0, 0);

				const timeRemainingMs = targetDate.getTime() - now.getTime();
				const minutes = Math.floor(timeRemainingMs / 60000);

				const embeds: DiscordWebhookPayload['embeds'] = [
					{
						title: '📅 Contagem Decrescente!',
						description: `**${label}**: ${name}`,
						color: 0xffa500,
						footer: {
							text: `⏰ Começa dentro de ${minutes} minutos`,
						},
					},
				];

				await sendDiscordWebhook(webhookUrl, {
					content: '<@&1410116889740316684>',
					embeds,
				});
			}
		}

		console.log('📢 Daily reminder sent');
	} catch (error) {
		console.error('❌ Error sending daily reminder:', error);
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

	console.log(
		`🕐 Current time: ${now.toLocaleString('en-US', { timeZone: config.timezone })}`
	);

	await sendDailyReminder(webhookUrl);

	console.log('✅ Reminder processing completed');
}

void main().catch((error) => {
	console.error('❌ Reminder processing failed:', error);
	process.exit(1);
});
