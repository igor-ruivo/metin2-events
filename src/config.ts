import * as dotenv from "dotenv";

dotenv.config();

// Simple configuration without dotenv
export const config = {
	// Local testing webhook (read from environment)
	webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',

	// Timezone
	timezone: process.env.TZ || 'Europe/Lisbon',
};

export function validateConfig(): void {
	console.log('✅ Configuration loaded:');
	console.log(`   Webhook set: ${config.webhookUrl ? 'yes' : 'no'}`);
	console.log(`   Timezone: ${config.timezone}`);
	console.log('');
}
