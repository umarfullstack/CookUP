module.exports = async function handler(req, res) {
  const botToken = (process.env.TG_BOT_TOKEN || '').trim();
  const chatId   = (process.env.TG_CHAT_ID   || '').trim();

  async function sendTelegram(text) {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    const tgData = await tgRes.json().catch(() => ({}));
    return { tgRes, tgData };
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'order-notify',
      configured: Boolean(botToken && chatId),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!botToken || !chatId) {
    return res.status(500).json({
      ok: false,
      error: 'TG_BOT_TOKEN yoki TG_CHAT_ID server muhitida sozlanmagan',
    });
  }

  const body  = req.body || {};
  const type  = body.type || 'order';

  let text = '';

  if (type === 'test') {
    text = '✅ <b>CookUP</b> — Telegram ulanishi ishlayapti!';

  } else {
    const order    = body.order || {};
    const customer = order.customer || {};
    const items    = Array.isArray(order.items) ? order.items : [];
    const orderNum = String(order.id || '').slice(-5);

    const itemLines = items
      .map(i => `  ${i.emoji || '•'} ${i.name} × ${i.qty}  —  ${formatSum(i.price * i.qty)}`)
      .join('\n');

    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleString('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '';

    text = [
      `🛎 <b>Yangi zakaz #${orderNum}</b>`,
      ``,
      `👤 <b>Mijoz:</b> ${customer.name || '—'}`,
      `📞 <b>Telefon:</b> <code>${customer.phone || '—'}</code>`,
      `🔑 <b>Akkaunt:</b> ${customer.account || 'Mehmon'}`,
      ``,
      `🍽 <b>Zakaz tarkibi:</b>`,
      itemLines || '  — bo\'sh —',
      ``,
      `💰 <b>Jami: ${formatSum(order.total)}</b>`,
      date ? `🕐 ${date}` : '',
    ].filter(l => l !== null && l !== undefined).join('\n');
  }

  try {
    const { tgRes, tgData } = await sendTelegram(text);
    if (!tgRes.ok || tgData.ok === false) {
      return res.status(500).json({ ok: false, telegram: tgData });
    }
    return res.status(200).json({ ok: true, type });
  } catch (error) {
    const details = String(error && error.message ? error.message : error);
    return res.status(500).json({ ok: false, error: 'send_failed', details });
  }
};

function formatSum(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('uz-UZ') + ' so\'m';
}
