import { verifyKey } from 'discord-interactions';

import {
	formatScheduleForDiscord,
	getCurrentMonthSchedule,
} from '../src/scraper';

interface DiscordInteraction {
	type: number;
	data?: {
		name?: string;
	};
}

interface DiscordResponse {
	type: number;
	data?: {
		content?: string;
		embeds?: Array<{
			title?: string;
			description?: string;
			color?: number;
			timestamp?: string;
			footer?: { text: string };
		}>;
		flags?: number;
	};
}

interface VercelRequest {
	headers: Record<string, string | Array<string>>;
	method: string;
	on: (event: string, callback: (chunk?: string) => void) => void; // porque vamos ler o body manualmente
}

interface VercelResponse {
	status: (code: number) => VercelResponse;
	json: (data: DiscordResponse | { error: string }) => void;
}

export const config = {
	api: {
		bodyParser: false,
	},
};

async function buffer(req: VercelRequest): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Array<Buffer> = [];
		req.on('data', (chunk) => {
			if (chunk) {
				chunks.push(Buffer.from(chunk));
			}
		});
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		console.log('❌ Invalid method:', req.method);
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const rawBody = await buffer(req);
	console.log('📥 Raw body:', rawBody);

	const stringifiedBody = rawBody.toString('utf8');

	console.log('📥 Raw body (readable):', stringifiedBody);

	const signature = req.headers['x-signature-ed25519'] as string;
	const timestamp = req.headers['x-signature-timestamp'] as string;

	console.log('📥 Headers:', {
		'x-signature-ed25519': signature,
		'x-signature-timestamp': timestamp,
	});

	const isValid = await verifyKey(
		rawBody,
		signature,
		timestamp,
		process.env.DISCORD_PUBLIC_KEY!
	);

	console.log(`key:${process.env.DISCORD_PUBLIC_KEY}`);

	if (!isValid) {
		console.log('❌ Invalid signature');
		return res.status(401).json({ error: 'Bad request signature' });
	}

	const interaction: DiscordInteraction = JSON.parse(
		stringifiedBody
	) as DiscordInteraction;

	// PING
	if (interaction.type === 1) {
		console.log('✅ PING received');
		return res.status(200).json({ type: 1 });
	}

	// SLASH COMMAND
	if (interaction.type === 2) {
		console.log('✅ Command received:', interaction.data?.name);

		if (interaction.data?.name === 'events') {
			const schedule = await getCurrentMonthSchedule();

			if (!schedule) {
				console.log('⚠️ No schedule found');
				return res.json({
					type: 4,
					data: {
						content: '❌ No schedule found for the current month.',
						flags: 64,
					},
				});
			}

			console.log('✅ Schedule retrieved');
			return res.json({
				type: 4,
				data: {
					embeds: [
						{
							title: '📅 Metin2 Tigerghost Events - Current Month',
							description: formatScheduleForDiscord(schedule),
							color: 0x00ff00,
							timestamp: new Date().toISOString(),
							footer: { text: 'Events refresh automatically' },
						},
					],
				},
			});
		}

		console.log('❌ Unknown command');
		return res.json({
			type: 4,
			data: {
				content: '❌ Unknown command',
				flags: 64,
			},
		});
	}

	console.log('❌ Unknown interaction type:', interaction.type);
	return res.status(400).json({ error: 'Unknown interaction type' });
}
