import * as dotenv from 'dotenv';

dotenv.config();

const config = {
	token: process.env.DISCORD_TOKEN,
	clientId: process.env.DISCORD_CLIENT_ID,
};

void (async () => {
	// Pega todos os comandos globais
	const commands: Array<{
		name: string;
		id: string;
		options: Array<{
			name: string;
			choices: Array<{ name: string; value: string }>;
		}>;
	}> = (await (
		await fetch(
			`https://discord.com/api/v10/applications/${config.clientId}/commands`,
			{ headers: { Authorization: `Bot ${config.token}` } }
		)
	).json()) as Array<{
		name: string;
		id: string;
		options: Array<{
			name: string;
			choices: Array<{ name: string; value: string }>;
		}>;
	}>;

	const command = commands.find((c) => c.name === 'events');
	if (!command) {
		console.log('Couldnt find command');
		return;
	}
	const option = command.options.find(
		(o: { name: string }) => o.name === 'period'
	);

	if (!option) {
		console.log('couldnt find option');
		return;
	}

	option.choices.push({ name: 'next', value: 'next' });

	await fetch(
		`https://discord.com/api/v10/applications/${config.clientId}/commands/${command.id}`,
		{
			method: 'PATCH',
			headers: {
				'Authorization': `Bot ${config.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(command),
		}
	);

	console.log('Comando atualizado!');
})();
