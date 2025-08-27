import { verifyKey } from 'discord-interactions';

import type { MonthlySchedule } from '../src/scraper';
import { formatScheduleForDiscord, getSchedule } from '../src/scraper';

interface DiscordInteraction {
	type: number;
	data?: {
		name?: string;
		options?: Array<{ name: string; value: string }>;
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
	on: (event: string, callback: (chunk?: string) => void) => void;
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
	const stringifiedBody = rawBody.toString('utf8');

	const signature = req.headers['x-signature-ed25519'] as string;
	const timestamp = req.headers['x-signature-timestamp'] as string;

	const isValid = await verifyKey(
		rawBody,
		signature,
		timestamp,
		process.env.DISCORD_PUBLIC_KEY!
	);

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
		if (interaction.data?.name === 'events') {
			const periodOption = interaction.data.options?.find(
				(o) => o.name === 'period'
			);
			const period = periodOption?.value ?? 'month';

			const schedule = await getSchedule(period);

			if (!schedule) {
				return res.json({
					type: 4,
					data: {
						content: `❌ Não há nada agendado (${periodToTitle(period)}).`,
						flags: 64,
					},
				});
			}

			return res.json({
				type: 4,
				data: {
					embeds: getEmbeds(period, schedule),
				},
			});
		}

		return res.json({
			type: 4,
			data: {
				content: '❌ Comando inválido',
				flags: 64,
			},
		});
	}

	return res.status(400).json({ error: 'Interação inválida' });
}

const periodToTitle = (period: string) => {
	switch (period) {
		case 'next':
			return 'Próximo Mês';
		case 'today':
			return 'Hoje';
		case 'week':
			return 'Esta Semana';
		default:
			return 'Este Mês';
	}
};

export const getEmbeds = (period: string, schedule: MonthlySchedule) => {
	return [
		{
			title: `📅 Eventos Metin2 Tigerghost - ${periodToTitle(period)}`,
			description: formatScheduleForDiscord(schedule, period),
			color: 0x00ff00,
			timestamp: new Date().toISOString(),
			footer: {
				text: 'Evento 1 (15:00-19:00), Evento 2 (19:00-23:00)\nOs eventos estão sempre atualizados!',
			},
		},
	];
};
