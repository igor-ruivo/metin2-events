import * as dotenv from 'dotenv';

dotenv.config();

const config = {
	token: process.env.DISCORD_TOKEN,
	clientId: process.env.DISCORD_CLIENT_ID,
};

const main = async () => {
	const BOT_TOKEN = config.token;
	const CLIENT_ID = config.clientId;

	const body = {
		name: 'ping',
		description: 'Efetua um ping ao servidor.',
	};

	const res = await fetch(
		`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bot ${BOT_TOKEN}`,
			},
			body: JSON.stringify(body),
		}
	);

	if (!res.ok) {
		console.error(`Request failed: ${res.status} ${res.statusText}`);
		const err = await res.text();
		console.error(err);
		return;
	}

	const ans: unknown = await res.json();
	console.log(JSON.stringify(ans, null, 2));
};

void main();
