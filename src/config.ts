import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
	webhookUrl: process.env.DISCORD_WEBHOOK_URL,
	timezone: 'Europe/Lisbon',
};

export function validateConfig(): void {
	console.log('✅ Configuration loaded:');
	console.log(`   Webhook set: ${config.webhookUrl ? 'yes' : 'no'}`);
	console.log(`   Timezone: ${config.timezone}`);
	console.log('');
}
