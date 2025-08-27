interface DiscordWebhookPayload {
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
