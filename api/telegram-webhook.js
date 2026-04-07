module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'telegram-webhook',
      configured: Boolean(process.env.TG_BOT_TOKEN)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const botToken = process.env.TG_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN is not configured' });
  }

  const update = req.body || {};
  const message = update.message;

  // Always acknowledge Telegram quickly.
  res.status(200).json({ ok: true });

  if (!message || !message.chat || typeof message.text !== 'string') {
    return;
  }

  const text = message.text.trim();
  if (!text.startsWith('/start')) {
    return;
  }

  const chatId = message.chat.id;
  const user = message.from || {};
  const displayName = user.username || user.first_name || 'друг';

  const greeting = [
    `Привет, ${displayName}!`,
    'Добро пожаловать в Food Delivery Admin.',
    'Я на связи и готов отправлять уведомления о заказах.'
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: greeting
      })
    });
  } catch (error) {
    console.error('Failed to send /start greeting:', error);
  }
};
