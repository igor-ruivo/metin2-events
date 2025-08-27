import { config, validateConfig } from '../config';
import { getSchedule } from '../scraper';
import type { DiscordWebhookPayload } from '../utils';
import { portugalNow, sendDiscordWebhook } from '../utils';

async function sendDailyReminder(webhookUrl: string): Promise<void> {
	try {
		const schedule = await getSchedule('today');
		if (!schedule) {
			console.log('⚠️ No schedule found for current day');
			return;
		}

		const now = portugalNow();
		const today = now.getDate();
		const todayEvents = schedule.days.find((d) => d.day === today);

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

		for (const { triggerHour, eventHour, label, name } of events) {
			if (currentHour === triggerHour) {
				const targetDate = new Date(now);
				targetDate.setHours(eventHour, 0, 0, 0);

				const timeRemainingMs = targetDate.getTime() - now.getTime();
				const minutes = Math.floor(timeRemainingMs / 60000);

				const embeds: DiscordWebhookPayload['embeds'] = [
					{
						title: '📅 Contagem Decrescente!',
						description: `**${label}**: ${name}\n⏰ Começa dentro de ${minutes} minutos`,
						color: 0xffa500
					},
				];

				if (todayEvents.extra) {
					embeds[0].fields = [
						{
							name: 'Evento Adicional',
							value: `Não te esqueças do evento adicional de hoje:\n${todayEvents.extra}!`,
							inline: false,
						},
					];
				}

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
