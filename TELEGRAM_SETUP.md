# Telegram /start Setup

1. In Vercel Project Settings -> Environment Variables add:
- `TG_BOT_TOKEN` = your bot token from BotFather.

2. Redeploy project.

3. Set webhook (replace values):
`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/telegram-webhook&drop_pending_updates=true`

4. Check status:
`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo`

## Important

- Mini App launch and `/start` are different flows.
- `/start` reply appears only when webhook is configured correctly.
- Mini App data is received only if the app calls `Telegram.WebApp.sendData(...)`.

Now webhook handles both:
- `/start` -> greeting `Привет, <username>!`
- `web_app_data` -> confirmation message.
