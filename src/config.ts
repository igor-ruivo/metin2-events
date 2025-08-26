import * as dotenv from "dotenv";

dotenv.config();

// Simple configuration without dotenv
export const config = {
	// Local testing webhook (read from environment)
	webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',

	// Discord app config (for Vercel deployment)
	publicKey: process.env.DISCORD_PUBLIC_KEY || 'your_public_key_here',
	applicationId: process.env.DISCORD_APPLICATION_ID || 'your_application_id_here',

	// Timezone
	timezone: process.env.TZ || 'Europe/Lisbon',
};

export function validateConfig(): void {
	console.log('✅ Configuration loaded:');
	console.log(`   Webhook set: ${config.webhookUrl ? 'yes' : 'no'}`);
	console.log(`   Timezone: ${config.timezone}`);
	console.log('');
}
