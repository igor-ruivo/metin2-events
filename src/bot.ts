import type { Interaction, TextChannel } from 'discord.js';
import {
	ApplicationCommandType,
	Client,
	EmbedBuilder,
	Events,
	GatewayIntentBits,
} from 'discord.js';
import * as cron from 'node-cron';

import {
	formatScheduleForDiscord,
	getCurrentMonthSchedule,
	type MonthlySchedule,
} from './scraper';

interface BotConfig {
	token: string;
	clientId: string;
	guildId: string;
	channelId: string;
}

export class Metin2Bot {
	private client: Client;
	private config: BotConfig;
	private lastReminderSent = new Set<string>();

	constructor(config: BotConfig) {
		this.config = config;
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		this.setupEventHandlers();
		this.setupScheduler();
	}

	private setupEventHandlers(): void {
		this.client.on(Events.ClientReady, () => {
			console.log(`🚀 Bot logged in as ${this.client.user?.tag}`);
			void this.registerCommands();
		});

		this.client.on(Events.InteractionCreate, (interaction) => {
			void this.handleInteraction(interaction);
		});
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		try {
			switch (interaction.commandName) {
				case 'events':
					await this.handleEventsCommand(interaction);
					break;
				default:
					await interaction.reply({
						content: 'Unknown command',
						ephemeral: true,
					});
			}
		} catch (error) {
			console.error('Error handling interaction:', error);
			const reply = (content: { content: string; ephemeral: boolean }) =>
				interaction.replied
					? interaction.followUp(content)
					: interaction.reply(content);
			await reply({
				content: '❌ An error occurred while processing your command.',
				ephemeral: true,
			});
		}
	}

	private async handleEventsCommand(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		await interaction.deferReply();

		try {
			const schedule = await getCurrentMonthSchedule();

			if (!schedule) {
				await interaction.editReply(
					'❌ No schedule found for the current month.'
				);
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle('📅 Metin2 Tigerghost Events - Current Month')
				.setDescription(formatScheduleForDiscord(schedule))
				.setColor(0x00ff00)
				.setTimestamp()
				.setFooter({ text: 'Events refresh automatically' });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('Error fetching events:', error);
			await interaction.editReply(
				'❌ Failed to fetch events. Please try again later.'
			);
		}
	}

	private async registerCommands(): Promise<void> {
		try {
			await this.client.application?.commands.set(
				[
					{
						name: 'events',
						description: "Show current month's Tigerghost events schedule",
						type: ApplicationCommandType.ChatInput,
					},
				],
				this.config.guildId
			);

			console.log('✅ Slash commands registered');
		} catch (error) {
			console.error('❌ Failed to register commands:', error);
		}
	}

	private setupScheduler(): void {
		// Daily reminder at 09:00
		cron.schedule(
			'0 9 * * *',
			async () => {
				await this.sendDailyReminder();
			},
			{
				timezone: 'Europe/Lisbon',
			}
		);

		// Check every 5 minutes for upcoming events
		cron.schedule(
			'*/5 * * * *',
			async () => {
				await this.checkUpcomingEvents();
			},
			{
				timezone: 'Europe/Lisbon',
			}
		);

		console.log('⏰ Scheduler initialized');
	}

	private async sendDailyReminder(): Promise<void> {
		try {
			const schedule = await getCurrentMonthSchedule();
			if (!schedule) return;

			const today = new Date().getDate();
			const todayEvents = schedule.days.find((d) => d.day === today);

			if (!todayEvents) return;

			const channel = (await this.client.channels.fetch(
				this.config.channelId
			)) as TextChannel;
			if (!channel) return;

			const embed = new EmbedBuilder()
				.setTitle('🌅 Daily Events Reminder')
				.setDescription(
					`**Today's Tigerghost Events (${today}/${schedule.month + 1}/${schedule.year})**`
				)
				.addFields(
					{
						name: '🕐 Event 1 (15:00-19:00)',
						value: todayEvents.event1 ?? 'No event',
						inline: true,
					},
					{
						name: '🕐 Event 2 (19:00-23:00)',
						value: todayEvents.event2 ?? 'No event',
						inline: true,
					}
				)
				.setColor(0xffa500)
				.setTimestamp();

			await channel.send({ embeds: [embed] });
			console.log('📢 Daily reminder sent');
		} catch (error) {
			console.error('❌ Error sending daily reminder:', error);
		}
	}

	private async checkUpcomingEvents(): Promise<void> {
		try {
			const schedule = await getCurrentMonthSchedule();
			if (!schedule) return;

			const now = new Date();
			const currentHour = now.getHours();
			const currentMinute = now.getMinutes();

			// Check if we're 15 minutes before Event 1 (15:00) or Event 2 (19:00)
			const event1Time = 15 * 60; // 15:00 in minutes
			const event2Time = 19 * 60; // 19:00 in minutes
			const currentTime = currentHour * 60 + currentMinute;

			const reminderKey = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`;

			// Event 1 reminder (15:00)
			if (
				currentTime >= event1Time - 15 &&
				currentTime < event1Time &&
				!this.lastReminderSent.has(`${reminderKey}-event1`)
			) {
				await this.sendEventReminder(schedule, 1, '15:00');
				this.lastReminderSent.add(`${reminderKey}-event1`);
			}

			// Event 2 reminder (19:00)
			if (
				currentTime >= event2Time - 15 &&
				currentTime < event2Time &&
				!this.lastReminderSent.has(`${reminderKey}-event2`)
			) {
				await this.sendEventReminder(schedule, 2, '19:00');
				this.lastReminderSent.add(`${reminderKey}-event2`);
			}
		} catch (error) {
			console.error('❌ Error checking upcoming events:', error);
		}
	}

	private async sendEventReminder(
		schedule: MonthlySchedule,
		eventNumber: number,
		time: string
	): Promise<void> {
		try {
			const today = new Date().getDate();
			const todayEvents = schedule.days.find((d) => d.day === today);

			if (!todayEvents) return;

			const eventName =
				eventNumber === 1 ? todayEvents.event1 : todayEvents.event2;
			if (!eventName) return;

			const channel = (await this.client.channels.fetch(
				this.config.channelId
			)) as TextChannel;
			if (!channel) return;

			const embed = new EmbedBuilder()
				.setTitle(`⏰ Event Starting Soon!`)
				.setDescription(
					`**Event ${eventNumber} starts in 15 minutes at ${time}**`
				)
				.addFields(
					{ name: '🎮 Event', value: eventName, inline: true },
					{
						name: '📅 Date',
						value: `${today}/${schedule.month + 1}/${schedule.year}`,
						inline: true,
					}
				)
				.setColor(0xff0000)
				.setTimestamp();

			await channel.send({ embeds: [embed] });
			console.log(`📢 Event ${eventNumber} reminder sent`);
		} catch (error) {
			console.error('❌ Error sending event reminder:', error);
		}
	}

	public async start(): Promise<void> {
		try {
			await this.client.login(this.config.token);
		} catch (error) {
			console.error('❌ Failed to start bot:', error);
			process.exit(1);
		}
	}

	public async stop(): Promise<void> {
		await this.client.destroy();
	}
}
