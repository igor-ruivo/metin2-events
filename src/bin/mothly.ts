import { getEmbeds } from '../../api/events';
import { config, validateConfig } from '../config';
import { getSchedule } from '../scraper';
import { sendDiscordWebhook } from '../utils';

async function main(): Promise<void> {
	validateConfig();

	const webhookUrl = config.webhookUrl;
	if (!webhookUrl) {
		console.error('❌ Webhook URL not found in configuration');
		process.exit(1);
	}

	const period = 'month';

	const schedule = await getSchedule(period);

	if (!schedule) {
		console.error('Não há eventos este mês.');
		process.exit(1);
	}

	const embeds = getEmbeds(period, schedule);

	await sendDiscordWebhook(webhookUrl, {
		content: '<@&1410116889740316684>',
		embeds,
	});

	console.log('✅ Reminder processing completed');
}

void main().catch((error) => {
	console.error('❌ Reminder processing failed:', error);
	process.exit(1);
});
