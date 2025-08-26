import * as dotenv from "dotenv";
import { Metin2Bot } from '../bot';

dotenv.config();

// Load environment variables
const config = {
	token: process.env.DISCORD_TOKEN,
	clientId: process.env.DISCORD_CLIENT_ID,
	guildId: process.env.DISCORD_GUILD_ID,
	channelId: process.env.DISCORD_CHANNEL_ID,
};

function validateConfig(): void {
	const required = [
		'DISCORD_TOKEN',
		'DISCORD_CLIENT_ID',
		'DISCORD_GUILD_ID',
		'DISCORD_CHANNEL_ID',
	];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error('❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`   ${key}`));
		console.error(
			'\nPlease set these in your environment or create a .env file:'
		);
		console.error('   DISCORD_TOKEN=your_bot_token');
		console.error('   DISCORD_CLIENT_ID=your_application_id');
		console.error('   DISCORD_GUILD_ID=your_guild_id');
		console.error('   DISCORD_CHANNEL_ID=your_channel_id');
		console.error('\nSee env.example for more details.');
		process.exit(1);
	}
}

async function main(): Promise<void> {
	console.log('🚀 Starting Metin2 Events Discord Bot...');

	validateConfig();

	const bot = new Metin2Bot({
		token: config.token!,
		clientId: config.clientId!,
		guildId: config.guildId!,
		channelId: config.channelId!,
	});

	// Handle graceful shutdown
	const shutdown = async (signal: string) => {
		console.log(`\n🛑 Received ${signal}, shutting down bot...`);
		await bot.stop();
		process.exit(0);
	};

	process.on('SIGINT', () => {
		void shutdown('SIGINT');
	});

	process.on('SIGTERM', () => {
		void shutdown('SIGTERM');
	});

	try {
		await bot.start();
	} catch (error) {
		console.error('❌ Failed to start bot:', error);
		process.exit(1);
	}
}

void main();

export default main;
