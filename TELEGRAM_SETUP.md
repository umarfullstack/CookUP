# Telegram /start Setup

1. In Vercel Project Settings -> Environment Variables add:
- `TG_BOT_TOKEN` = your bot token from BotFather.

2. Redeploy project.

3. Set webhook (replace values):
`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/telegram-webhook`

4. Check status:
`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo`

When user sends `/start`, bot replies with:
`Привет, <username>!`
