# Metin2 Events Discord Bot

A Discord bot that automatically scrapes Metin2 forum events and provides:

- `/events` command to show current month's schedule
- Daily reminders at 09:00 (Lisbon time)
- 15-minute pre-event notifications
- Automatic parsing of Portuguese event schedules

## Features

- **Real-time scraping** of [Metin2 PT Events Forum](https://board.pt.metin2.gameforge.com/index.php?board/86-eventos-metin2-pt/)
- **Smart parsing** of Portuguese month names and event tables
- **Discord slash commands** for easy access
- **Automated scheduling** with timezone support
- **Rich embeds** with formatted event information

## Architecture

This bot uses a **webhook-based approach** that's perfect for serverless hosting:

```
User types /events → Discord → HTTP POST to Vercel → Scrapes Forum → Response
```

**No persistent connections needed** - just HTTP webhooks when commands are used!

## Quick Start

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the **Bot Token** (you'll need this)
5. Go to "General Information" and copy the **Application ID** and **Public Key**

### 2. Set Up Slash Commands

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `applications.commands`
3. Copy the generated URL and open it in browser
4. Select your server and authorize

### 3. Deploy to Vercel

1. **Fork/Clone this repo**
2. **Connect to Vercel**:

   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

3. **Set Environment Variables** in Vercel:
   - `DISCORD_PUBLIC_KEY` - Your app's public key
   - `DISCORD_APPLICATION_ID` - Your app's ID

4. **Deploy**:
   ```bash
   vercel --prod
   ```

### 4. Configure Discord Commands

1. **Register the `/events` command**:

   ```bash
   curl -X POST "https://discord.com/api/v10/applications/YOUR_APP_ID/commands" \
     -H "Authorization: Bot YOUR_BOT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "events",
       "description": "Show current month'\''s Tigerghost events schedule",
       "type": 1
     }'
   ```

2. **Set the interaction endpoint** in Discord Developer Portal:
   - Go to your app → "General Information"
   - Set "Interactions Endpoint URL" to: `https://your-vercel-app.vercel.app/api/events`

### 5. Set Up GitHub Actions for Reminders

1. **Create Discord Webhook**:
   - Right-click your channel → "Edit Channel" → "Integrations" → "Webhooks"
   - Create webhook and copy the URL

2. **Add GitHub Secret**:
   - Go to your repo → "Settings" → "Secrets and variables" → "Actions"
   - Add `DISCORD_WEBHOOK_URL` with your webhook URL

3. **Push to GitHub** - Actions will automatically run!

## Usage

### Commands

- **`/events`** - Shows current month's Tigerghost events schedule

### Automatic Notifications

- **Daily Reminder**: Posted at 09:00 Lisbon time via GitHub Actions
- **15-min Warning**: Posted 15 minutes before each event via GitHub Actions

## How It Works

### Slash Commands

1. User types `/events`
2. Discord sends HTTP POST to your Vercel API
3. API scrapes Metin2 forum for current month
4. Returns formatted embed with events

### Reminders

1. GitHub Actions runs every 15 minutes
2. Checks if events start soon
3. Posts to Discord via webhook
4. No server needed - completely serverless!

## Files Structure

```
src/
├── api/
│   └── events.ts          # Vercel API route for /events command
├── scraper.ts             # Forum scraping and parsing logic
├── reminder.ts            # GitHub Actions reminder script
└── bin/
    ├── index.ts           # Legacy bot entry point (not needed for Vercel)
    └── scraper.ts         # Standalone scraper tester

.github/
└── workflows/
    └── reminders.yml      # GitHub Actions cron jobs

vercel.json                # Vercel configuration
```

## Environment Variables

### Vercel (Required)

- `DISCORD_PUBLIC_KEY` - Your Discord app's public key
- `DISCORD_APPLICATION_ID` - Your Discord app's ID

### GitHub Actions (Required)

- `DISCORD_WEBHOOK_URL` - Discord webhook URL for reminders

## Development

### Scripts

```bash
pnpm start      # Legacy bot (not needed for Vercel)
pnpm dev        # Legacy bot with file watching
pnpm scraper    # Test scraper only
pnpm reminder   # Test reminder script
pnpm lint       # Run linter
pnpm format     # Format code
pnpm build      # TypeScript compilation
```

### Testing

```bash
# Test scraper
pnpm scraper

# Test reminder script
DISCORD_WEBHOOK_URL=your_webhook_url pnpm reminder

# Test API locally
vercel dev
```

## Hosting Options

### ✅ **Vercel (Recommended)**

- **Perfect for slash commands** - HTTP webhooks only
- **Free tier** - 100GB bandwidth/month
- **Global CDN** - Fast response times
- **Automatic scaling** - No server management

### ❌ **Not Suitable for Vercel**

- Traditional Discord bots with persistent connections
- Real-time event handling
- Background processes

## Troubleshooting

### Common Issues

1. **"Invalid signature" error**
   - Check your `DISCORD_PUBLIC_KEY` in Vercel
   - Verify interactions endpoint URL in Discord

2. **Commands not showing up**
   - Ensure bot has `applications.commands` scope
   - Check command registration with Discord API

3. **Reminders not working**
   - Verify `DISCORD_WEBHOOK_URL` in GitHub Secrets
   - Check GitHub Actions logs

4. **Scraping failed**
   - Forum might be down or changed structure
   - Check Vercel function logs

### Debug Mode

```bash
# Test API locally
vercel dev

# Check Vercel logs
vercel logs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint` and `pnpm format`
5. Submit a pull request

## License

ISC License - see LICENSE file for details.
