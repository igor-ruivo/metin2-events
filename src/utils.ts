import { access, constants, readFile } from 'fs/promises';

export interface DiscordWebhookPayload {
	content?: string;
	embeds?: Array<{
		title?: string;
		description?: string;
		color?: number;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		timestamp?: string;
		footer?: { text: string };
	}>;
}

export async function sendDiscordWebhook(
	webhookUrl: string,
	payload: DiscordWebhookPayload
): Promise<void> {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`Webhook failed: ${response.status} ${response.statusText}`
			);
		}

		console.log('✅ Discord webhook sent successfully');
	} catch (error) {
		console.error('❌ Failed to send Discord webhook:', error);
		throw error;
	}
}

export function convertCestToLisbon(event: string): string {
	return event.replace(
		/\b(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*CEST\b/,
		(_, h1: string, m1: string, h2: string, m2: string) => {
			// parse as números
			let start = parseInt(h1, 10);
			let end = parseInt(h2, 10);
			const startMin = m1;
			const endMin = m2;

			// subtrai 1 hora
			start = (start - 1 + 24) % 24;
			end = (end - 1 + 24) % 24;

			// formata de volta (com zero padding)
			const fmt = (h: number, m: string) =>
				h.toString().padStart(2, '0') + ':' + m;

			return `${fmt(start, startMin)} - ${fmt(end, endMin)}`;
		}
	);
}

export function portugalNow(): Date {
	return new Date(
		new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })
	);
}

export async function hasPeriodFile(period: string): Promise<boolean> {
	const filePath = `./data/${period}.json`;

	try {
		await access(filePath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function readPeriodFile<T = unknown>(period: string): Promise<T> {
	const filePath = `./data/${period}.json`;

	const content = await readFile(filePath, 'utf-8');
	return JSON.parse(content) as T;
}
