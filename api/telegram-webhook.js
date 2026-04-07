module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'telegram-webhook',
      configured: Boolean(process.env.TG_BOT_TOKEN),
      route: '/api/telegram-webhook'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const botToken = process.env.TG_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN is not configured' });
  }

  async function sendMessage(chatId, text) {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const tgData = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || tgData.ok === false) {
      throw new Error(`Telegram sendMessage failed: ${JSON.stringify(tgData)}`);
    }
  }

  const update = req.body || {};
  const message = update.message || update.edited_message;

  if (!message || !message.chat) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'No message' });
  }

  const chatId = message.chat.id;
  const user = message.from || {};
  const displayName = user.username || user.first_name || user.last_name || 'друг';
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const isStartCommand = /^\/start(?:@\w+)?(?:\s|$)/i.test(text);

  if (message.web_app_data && typeof message.web_app_data.data === 'string') {
    const reply = [
      `Спасибо, ${displayName}!`,
      'Данные из Mini App получены.'
    ].join('\n');

    try {
      await sendMessage(chatId, reply);
      return res.status(200).json({ ok: true, replied: true, type: 'web_app_data' });
    } catch (error) {
      console.error('Failed to send web_app_data reply:', error);
      return res.status(200).json({ ok: false, error: 'Send failed (web_app_data)' });
    }
  }

  if (!isStartCommand) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'Not /start or web_app_data' });
  }

  const greeting = [
    `Привет, ${displayName}!`,
    'Добро пожаловать в Food Delivery Admin.',
    'Я на связи и готов отправлять уведомления о заказах.'
  ].join('\n');

  try {
    await sendMessage(chatId, greeting);
    return res.status(200).json({ ok: true, replied: true, type: 'start' });
  } catch (error) {
    console.error('Failed to send /start greeting:', error);
    return res.status(200).json({ ok: false, error: 'Send failed (/start)' });
  }
};
