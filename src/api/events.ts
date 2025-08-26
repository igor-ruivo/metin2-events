import { formatScheduleForDiscord, getCurrentMonthSchedule } from '../scraper';

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
	method: string;
	body: DiscordInteraction;
}

interface VercelResponse {
	status: (code: number) => VercelResponse;
	json: (data: DiscordResponse | { error: string }) => void;
}

export default async function handler(
	req: VercelRequest,
	res: VercelResponse
): Promise<void> {
	// Only allow POST requests
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	try {
		const { type, data } = req.body;

		// Discord ping (verification)
		if (type === 1) {
			res.json({ type: 1 });
			return;
		}

		// Slash command interaction
		if (type === 2) {
			const commandName = data?.name;

			if (commandName === 'events') {
				const schedule = await getCurrentMonthSchedule();

				if (!schedule) {
					const response: DiscordResponse = {
						type: 4,
						data: {
							content: '❌ No schedule found for the current month.',
							flags: 64, // Ephemeral (only visible to user)
						},
					};
					res.json(response);
					return;
				}

				const embed = {
					title: '📅 Metin2 Tigerghost Events - Current Month',
					description: formatScheduleForDiscord(schedule),
					color: 0x00ff00,
					timestamp: new Date().toISOString(),
					footer: { text: 'Events refresh automatically' },
				};

				const response: DiscordResponse = {
					type: 4,
					data: {
						embeds: [embed],
					},
				};
				res.json(response);
				return;
			}

			// Unknown command
			const response: DiscordResponse = {
				type: 4,
				data: {
					content: '❌ Unknown command',
					flags: 64,
				},
			};
			res.json(response);
			return;
		}

		// Unknown interaction type
		res.status(400).json({ error: 'Unknown interaction type' });
	} catch (error) {
		console.error('Error handling Discord interaction:', error);
		const response: DiscordResponse = {
			type: 4,
			data: {
				content: '❌ An error occurred while processing your command.',
				flags: 64,
			},
		};
		res.json(response);
	}
}
