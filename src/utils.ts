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

export async function fetchPeriodFile<T = unknown>(
	period: string
): Promise<T | null> {
	const url = `https://raw.githubusercontent.com/igor-ruivo/metin2-events/refs/heads/main/data/${period}.json`;

	const res = await fetch(url);

	if (!res.ok) {
		console.warn(
			`⚠️ File for ${period} not found at ${url} (status ${res.status})`
		);
		return null;
	}

	try {
		const data = (await res.json()) as T;
		return data;
	} catch (err) {
		console.error(`❌ Failed to parse JSON for ${period}:`, err);
		return null;
	}
}
