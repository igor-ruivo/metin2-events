import * as dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const config = {
	token: process.env.DISCORD_TOKEN,
	clientId: process.env.DISCORD_CLIENT_ID,
	guildId: process.env.DISCORD_GUILD_ID,
	channelId: process.env.DISCORD_CHANNEL_ID,
};

const main = async () => {
	const BOT_TOKEN = config.token;
	const CLIENT_ID = config.clientId;

	const res = await fetch(
		`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
		{
			headers: {
				Authorization: `Bot ${BOT_TOKEN}`,
			},
		}
	);

	const ans: unknown = await res.json();
	console.log(JSON.stringify(ans));
};

void main();
