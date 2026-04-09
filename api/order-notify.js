globalThis.__qbNotifyDebug = globalThis.__qbNotifyDebug || {
  updatedAt: null,
  lastEvent: null
};

module.exports = async function handler(req, res) {
  const botToken = (process.env.TG_BOT_TOKEN || '').trim();
  const chatId = (process.env.TG_CHAT_ID || '').trim();

  const requestUrl = (() => {
    try {
      return new URL(req.url || '', 'https://local.test');
    } catch (e) {
      return null;
    }
  })();

  const sendTestParam =
    (req.query && req.query.send_test) ||
    (requestUrl && requestUrl.searchParams.get('send_test')) ||
    '';

  const debugParam =
    (req.query && req.query.debug) ||
    (requestUrl && requestUrl.searchParams.get('debug')) ||
    '';

  async function sendTelegram(text) {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const tgData = await tgRes.json().catch(() => ({}));
    return { tgRes, tgData };
  }

  if (req.method === 'GET') {
    if (String(debugParam) === '1') {
      return res.status(200).json({ ok: true, debug: globalThis.__qbNotifyDebug });
    }

    if (String(sendTestParam) === '1') {
      if (!botToken || !chatId) {
        return res.status(500).json({
          ok: false,
          error: 'TG_BOT_TOKEN or TG_CHAT_ID is not configured on server'
        });
      }

      try {
        const { tgRes, tgData } = await sendTelegram('✅ QuickBite direct server test');
        if (!tgRes.ok || tgData.ok === false) {
          globalThis.__qbNotifyDebug = {
            updatedAt: new Date().toISOString(),
            lastEvent: { ok: false, type: 'direct_test', status: tgRes.status, telegram: tgData }
          };
          return res.status(500).json({ ok: false, telegram: tgData });
        }
        globalThis.__qbNotifyDebug = {
          updatedAt: new Date().toISOString(),
          lastEvent: { ok: true, type: 'direct_test', status: tgRes.status, telegram: tgData }
        };
        return res.status(200).json({ ok: true, direct_test: true, telegram: tgData });
      } catch (error) {
        const details = String(error && error.message ? error.message : error);
        globalThis.__qbNotifyDebug = {
          updatedAt: new Date().toISOString(),
          lastEvent: { ok: false, type: 'direct_test', error: 'direct_test_send_failed', details }
        };
        return res.status(500).json({ ok: false, error: 'direct_test_send_failed', details });
      }
    }

    return res.status(200).json({
      ok: true,
      service: 'order-notify',
      configured: Boolean(botToken && chatId),
      route: '/api/order-notify'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!botToken || !chatId) {
    return res.status(500).json({
      ok: false,
      error: 'TG_BOT_TOKEN or TG_CHAT_ID is not configured on server'
    });
  }

  const body = req.body || {};
  const type = body.type || 'order';

  let text = 'QuickBite notification';

  if (type === 'test') {
    text = [
      '✅ QuickBite test',
      'Telegram server notifications are working.'
    ].join('\n');
  } else if (type === 'welcome_auto') {
    const client = body.client || {};
    text = [
      '👋 Новый пользователь открыл QuickBite',
      `🧭 Роль: ${client.role || 'guest'}`,
      `🎨 Тема: ${client.theme || 'dark'}`,
      `🕐 ${client.ts ? new Date(client.ts).toLocaleString('ru-RU') : ''}`
    ].join('\n');
  } else {
    const order = body.order || {};
    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];

    const lines = items
      .map((i) => `• ${i.emoji || ''} ${i.name || 'Item'} x${i.qty || 1} = $${Number((i.price || 0) * (i.qty || 1)).toFixed(2)}`)
      .join('\n');

    text = [
      `🛎 Новый заказ #${String(order.id || '').slice(-4)}`,
      `👤 ${customer.name || '-'} | 📞 ${customer.phone || '-'}`,
      `📍 ${customer.address || '-'}`,
      '',
      'Состав:',
      lines || '- нет позиций -',
      '',
      `💰 Итого: $${Number(order.total || 0).toFixed(2)}`,
      `🕐 ${order.createdAt ? new Date(order.createdAt).toLocaleString('ru-RU') : ''}`
    ].join('\n');
  }

  try {
    const { tgRes, tgData } = await sendTelegram(text);
    if (!tgRes.ok || tgData.ok === false) {
      globalThis.__qbNotifyDebug = {
        updatedAt: new Date().toISOString(),
        lastEvent: { ok: false, type, status: tgRes.status, telegram: tgData }
      };
      return res.status(500).json({ ok: false, telegram: tgData });
    }

    globalThis.__qbNotifyDebug = {
      updatedAt: new Date().toISOString(),
      lastEvent: { ok: true, type, status: tgRes.status, telegram: tgData }
    };
    return res.status(200).json({ ok: true, type });
  } catch (error) {
    console.error('order-notify send failed:', error);
    const details = String(error && error.message ? error.message : error);
    globalThis.__qbNotifyDebug = {
      updatedAt: new Date().toISOString(),
      lastEvent: { ok: false, type, error: 'send_failed', details }
    };
    return res.status(500).json({ ok: false, error: 'send_failed', details });
  }
};
