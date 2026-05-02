const { kvGet, kvSet }     = require('./_kv');
const { formatOrderText, getButtons } = require('./order-notify');
const { DEFAULT_PRODUCTS } = require('./_defaults');

const ORDER_STATUS_MAP = {
  accept: 'accepted', cooking: 'cooking',
  delivery: 'delivery', done: 'done', reject: 'rejected',
};

const ORDER_STATUS_LABELS = {
  accepted: (n) => `✅ Qabul qilindi — ${n}`,
  cooking:  (n) => `🍳 Tayyorlanmoqda — ${n}`,
  delivery: (n) => `🚀 Yo'lda — ${n}`,
  done:     (n) => `✅ Bajarildi — ${n}`,
  rejected: (n) => `❌ Bekor qilindi — ${n}`,
};

const DEFAULT_FOOTER = `🌟 5+ berilgan buyurtmalar bepul yetkazib beriladi 🌟

5 tagacha bo'lgan buyurtmalar shahar bo'yicha yetkazib berish 20.000 so'm

🌕 Halol, Pokiza va Sifatli taomlarni soat 11:30 ga qadar buyurtma berishga ulgurib qoling ❗

Barcha to'lov turlari mavjud:
5614 6819 1900 1556
Makhmudov Murodjon

📞 Buyurtma uchun: +99833 933 5555

📋 Online buyurtma: https://cookup-app.fly.dev
📢 Telegram kanal: https://t.me/cookup_catering`;

module.exports = async function handler(req, res) {
  const botToken   = (process.env.TG_BOT_TOKEN  || '').trim();
  const testChatId = (process.env.TG_CHAT_ID    || '').trim();
  const adminTgId  = (process.env.TG_ADMIN_ID   || '').trim();
  const channelId  = (process.env.TG_CHANNEL_ID || '').trim();

  function isAdmin(userId) {
    return adminTgId && String(userId) === adminTgId;
  }

  const requestUrl = (() => {
    try { return new URL(req.url || '', 'https://local.test'); } catch { return null; }
  })();

  // ── Telegram API yordamchi funksiyalar ──

  async function tgCall(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    return r.json().catch(() => ({}));
  }

  async function sendMsg(chatId, text, extra = {}) {
    return tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
  }

  async function editMsg(chatId, messageId, text, replyMarkup) {
    return tgCall('editMessageText', {
      chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  async function editMarkup(chatId, messageId, replyMarkup) {
    return tgCall('editMessageReplyMarkup', {
      chat_id: chatId, message_id: messageId, reply_markup: replyMarkup,
    });
  }

  async function answerCB(id, text = '') {
    return tgCall('answerCallbackQuery', { callback_query_id: id, text });
  }

  // ── Kanal post yordamchi funksiyalar ──
  function uzDate() {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  }

  function extractFileId(imgUrl) {
    if (!imgUrl || !imgUrl.startsWith('/api/photo?')) return null;
    try {
      return decodeURIComponent(new URL(imgUrl, 'https://x').searchParams.get('id') || '');
    } catch { return null; }
  }

  async function postToChannel() {
    if (!channelId) return { ok: false, error: 'TG_CHANNEL_ID sozlanmagan' };
    const { products, todayMenu } = await getMenuData();
    const todayNums  = todayMenu.map(Number);
    const todayProds = products.filter(p => todayNums.includes(Number(p.id)));
    if (!todayProds.length) return { ok: false, error: "Bugungi menyu bo'sh" };

    const asosiy = todayProds.filter(p => p.category !== 'Bonus');
    const bonus  = todayProds.filter(p => p.category === 'Bonus');

    const lines = [`Assalomu Aleykum 🧡\n${uzDate()}`];
    if (asosiy.length) lines.push(asosiy.map((p, i) => `${i+1}. ${p.name} ${p.emoji}`).join('\n'));
    if (bonus.length)  lines.push(`🔥 BONUS 🔥\n${bonus.map((p, i) => `${i+1}.${p.name} ${p.emoji}`).join('\n')}`);

    const setPrice = await kvGet('ck_set_price') || (asosiy[0] ? Number(asosiy[0].price) : 40000);
    lines.push(`\n💰 Narxi: ${Number(setPrice).toLocaleString('ru-RU')} so'm`);
    lines.push(await kvGet('ck_post_footer') || DEFAULT_FOOTER);

    const text    = lines.join('\n');
    const fileIds = todayProds.map(p => extractFileId(p.img)).filter(Boolean).slice(0, 10);

    if (fileIds.length >= 2) {
      await tgCall('sendMediaGroup', {
        chat_id: channelId,
        media:   fileIds.map(id => ({ type: 'photo', media: id })),
      });
    } else if (fileIds.length === 1) {
      await tgCall('sendPhoto', { chat_id: channelId, photo: fileIds[0] });
    }
    await tgCall('sendMessage', { chat_id: channelId, text, parse_mode: 'HTML' });
    return { ok: true };
  }

  // ── Admin suhbat holati ──
  async function getConv()       { return await kvGet('ck_admin_conv') || null; }
  async function setConv(state)  { return kvSet('ck_admin_conv', state); }
  async function clearConv()     { return kvSet('ck_admin_conv', null); }

  // ── Menyu yordamchi funksiyalar ──

  async function getMenuData() {
    const products  = await kvGet('ck_products')   || DEFAULT_PRODUCTS;
    const savedMenu = await kvGet('ck_daily_menu');
    const todayMenu = savedMenu !== null ? savedMenu : products.map(p => p.id);
    return { products, todayMenu };
  }

  function buildMenuKeyboard(products, todayMenu) {
    const todayNums = todayMenu.map(Number);
    return {
      inline_keyboard: products.map(p => [{
        text: `${todayNums.includes(Number(p.id)) ? '✅' : '⬜'} ${p.emoji} ${p.name} — ${Number(p.price).toLocaleString('uz-UZ')} so'm`,
        callback_data: `admin_toggle:${p.id}`,
      }]),
    };
  }

  function isCmd(text, cmd) {
    return text === cmd || text.startsWith(cmd + ' ') || text.startsWith(cmd + '@');
  }

  function adminKeyboard() {
    return {
      inline_keyboard: [
        [{ text: '📋 Menyu boshqarish',    callback_data: 'admin_cmd:menu'         }],
        [{ text: '🍽 Bugungi menyu',        callback_data: 'admin_cmd:today'        },
         { text: '🗑 Menyuni tozalash',     callback_data: 'admin_cmd:cleartoday'   }],
        [{ text: '📦 Mahsulotlar ro\'yxati',callback_data: 'admin_cmd:items'        }],
        [{ text: '➕ Mahsulot qo\'shish',   callback_data: 'admin_cmd:additem'      },
         { text: '➖ Mahsulot o\'chirish',  callback_data: 'admin_cmd:removeitem'   }],
        [{ text: '📢 Kanalga yuborish',     callback_data: 'admin_cmd:post_channel' }],
      ],
    };
  }

  // ════════════════════════════════════════════
  //  GET — health / auto-setup / send-test
  // ════════════════════════════════════════════

  if (req.method === 'GET') {
    const qs = (k) =>
      (req.query && req.query[k]) ||
      (requestUrl && requestUrl.searchParams.get(k)) || '';

    if (qs('auto_setup') === '1') {
      if (!botToken) return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN not configured' });
      try {
        const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'https';
        const host  = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        if (!host) return res.status(500).json({ ok: false, error: 'no_host' });
        const url  = `${proto}://${host}/api/telegram-webhook`;
        const data = await tgCall('setWebhook', { url, drop_pending_updates: true });
        return res.status(200).json({ ok: true, auto_setup: true, webhookUrl: url, telegram: data });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    }

    if (qs('send_test') === '1') {
      if (!botToken || !testChatId)
        return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN or TG_CHAT_ID not configured' });
      try {
        const data = await sendMsg(testChatId, '✅ Telegram webhook test OK');
        return res.status(200).json({ ok: true, direct_test: true, telegram: data });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e.message || e) });
      }
    }

    return res.status(200).json({
      ok: true, service: 'telegram-webhook',
      configured: Boolean(botToken), route: '/api/telegram-webhook',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!botToken) return res.status(500).json({ ok: false, error: 'TG_BOT_TOKEN not configured' });

  const update = req.body || {};

  // ════════════════════════════════════════════
  //  CALLBACK QUERY (inline tugma bosildi)
  // ════════════════════════════════════════════

  const cq = update.callback_query;
  if (cq) {
    const data   = cq.data || '';
    const msgId  = cq.message && cq.message.message_id;
    const chatId = cq.message && cq.message.chat && cq.message.chat.id;

    // ── Admin callbacks (admin_toggle:productId) ──
    if (data.startsWith('admin_')) {
      if (!isAdmin(cq.from && cq.from.id)) {
        await answerCB(cq.id, "⛔ Ruxsatingiz yo'q");
        return res.status(200).json({ ok: true, ignored: true, reason: 'not_admin' });
      }

      const colonIdx  = data.indexOf(':');
      const subAction = colonIdx >= 0 ? data.slice(0, colonIdx) : data;
      const value     = colonIdx >= 0 ? data.slice(colonIdx + 1) : '';

      // ── Kategoriya tanlash ──
      if (subAction === 'admin_cat') {
        const conv = await getConv();
        if (conv && conv.step === 'category') {
          conv.data.category = value;
          conv.step = 'photo';
          await setConv(conv);
          await answerCB(cq.id, '');
          await sendMsg(adminTgId, `✅ Kategoriya: <b>${value}</b>\n\n📸 Endi rasm yuboring:\n\n/cancel — bekor qilish`);
        } else {
          await answerCB(cq.id, '');
        }
        return res.status(200).json({ ok: true, type: 'admin_cat' });
      }

      // ── Mahsulot o'chirish ──
      if (subAction === 'admin_remove') {
        const prodId   = Number(value);
        const products = await kvGet('ck_products') || DEFAULT_PRODUCTS;
        const idx      = products.findIndex(p => Number(p.id) === prodId);
        if (idx === -1) {
          await answerCB(cq.id, "Mahsulot topilmadi");
          return res.status(200).json({ ok: true });
        }
        const removed = products.splice(idx, 1)[0];
        await kvSet('ck_products', products);
        const todayMenu = await kvGet('ck_daily_menu');
        if (todayMenu) {
          await kvSet('ck_daily_menu', todayMenu.filter(id => Number(id) !== prodId));
        }
        await answerCB(cq.id, `✅ O'chirildi`);
        if (msgId && chatId) {
          await tgCall('deleteMessage', { chat_id: chatId, message_id: msgId });
        }
        await sendMsg(adminTgId, `✅ <b>${removed.emoji} ${removed.name}</b> o'chirildi.`);
        return res.status(200).json({ ok: true, type: 'admin_remove' });
      }

      if (subAction === 'admin_cmd') {
        if (value === 'menu') {
          const { products, todayMenu } = await getMenuData();
          if (!products.length) {
            await sendMsg(adminTgId, "📭 Mahsulotlar yo'q. /additem bilan qo'shing.");
          } else {
            await sendMsg(adminTgId,
              `📋 <b>Bugungi menyu boshqaruvi</b>\n\n✅ = bugun mavjud  |  ⬜ = yo'q`,
              { reply_markup: buildMenuKeyboard(products, todayMenu) }
            );
          }
        } else if (value === 'today') {
          const { products, todayMenu } = await getMenuData();
          const todayNums  = todayMenu.map(Number);
          const todayProds = products.filter(p => todayNums.includes(Number(p.id)));
          if (!todayProds.length) {
            await sendMsg(adminTgId, "📭 Bugungi menyu bo'sh.");
          } else {
            const lines = todayProds.map(p =>
              `${p.emoji} <b>${p.name}</b> — ${Number(p.price).toLocaleString('uz-UZ')} so'm`
            );
            await sendMsg(adminTgId, [`🍽 <b>Bugungi menyu (${todayProds.length} ta):</b>`, '', ...lines].join('\n'));
          }
        } else if (value === 'cleartoday') {
          await kvSet('ck_daily_menu', []);
          await sendMsg(adminTgId, "🗑 Bugungi menyu tozalandi.");
        } else if (value === 'items') {
          const products = await kvGet('ck_products') || DEFAULT_PRODUCTS;
          if (!products.length) {
            await sendMsg(adminTgId, "📭 Mahsulotlar yo'q.");
          } else {
            const lines = products.map((p, i) =>
              `${i + 1}. ${p.emoji} <b>${p.name}</b> — ${Number(p.price).toLocaleString('uz-UZ')} so'm [${p.category}]`
            );
            await sendMsg(adminTgId, [`📦 <b>Barcha mahsulotlar (${products.length} ta):</b>`, '', ...lines].join('\n'));
          }
        } else if (value === 'additem') {
          await clearConv();
          await setConv({ step: 'name', data: {} });
          await sendMsg(adminTgId, '➕ <b>Mahsulot qo\'shish</b>\n\n📝 Mahsulot nomini kiriting:\n\n/cancel — bekor qilish');
        } else if (value === 'post_channel') {
          await answerCB(cq.id, '⏳ Yuborilmoqda...');
          const result = await postToChannel();
          if (result.ok) {
            await sendMsg(adminTgId, '✅ Post kanalga muvaffaqiyatli yuborildi!', { reply_markup: adminKeyboard() });
          } else {
            await sendMsg(adminTgId, `❌ Xato: ${result.error}`);
          }
        } else if (value === 'removeitem') {
          const prods = await kvGet('ck_products') || DEFAULT_PRODUCTS;
          if (!prods.length) {
            await sendMsg(adminTgId, "📭 Mahsulotlar yo'q.");
          } else {
            await sendMsg(adminTgId, '➖ <b>Qaysi mahsulotni o\'chirish?</b>', {
              reply_markup: {
                inline_keyboard: prods.map(p => [{
                  text: `${p.emoji} ${p.name} — ${Number(p.price).toLocaleString('uz-UZ')} so'm`,
                  callback_data: `admin_remove:${p.id}`,
                }]),
              },
            });
          }
        }
        await answerCB(cq.id, '');
        return res.status(200).json({ ok: true, type: 'admin_callback', subAction: 'admin_cmd', value });
      }

      if (subAction === 'admin_toggle') {
        const productId = Number(value);
        const { products, todayMenu } = await getMenuData();
        const todayNums = todayMenu.map(Number);
        const isOn      = todayNums.includes(productId);

        const newMenu = isOn
          ? todayMenu.filter(id => Number(id) !== productId)
          : [...todayMenu, productId];

        await kvSet('ck_daily_menu', newMenu);

        if (msgId && chatId) {
          await editMarkup(chatId, msgId, buildMenuKeyboard(products, newMenu));
        }

        const prod     = products.find(p => Number(p.id) === productId);
        const prodName = prod ? prod.name : '';
        await answerCB(cq.id, isOn
          ? `⬜ ${prodName} menyudan olib tashlandi`
          : `✅ ${prodName} menyuga qo'shildi`
        );
      }

      return res.status(200).json({ ok: true, type: 'admin_callback', subAction });
    }

    // ── Zakaz status callbacks (action:orderId) ──
    const colonIdx  = data.indexOf(':');
    const action    = colonIdx >= 0 ? data.slice(0, colonIdx) : data;
    const orderId   = colonIdx >= 0 ? data.slice(colonIdx + 1) : '';
    const newStatus = ORDER_STATUS_MAP[action];

    if (!newStatus || !orderId) {
      await answerCB(cq.id, '');
      return res.status(200).json({ ok: true, ignored: true, reason: 'unknown_callback' });
    }

    const cookFirst = cq.from && cq.from.first_name ? cq.from.first_name : '';
    const cookLast  = cq.from && cq.from.last_name  ? cq.from.last_name  : '';
    const cookName  = [cookFirst, cookLast].filter(Boolean).join(' ') || 'Oshpaz';

    const kvData = await kvGet(`ck_order:${orderId}`);
    await kvSet(`ck_order:${orderId}`, {
      ...(kvData || {}),
      status: newStatus, acceptedBy: cookName, updatedAt: new Date().toISOString(),
    });

    const statusLabel = (ORDER_STATUS_LABELS[newStatus] || (() => newStatus))(cookName);
    const order       = (kvData && kvData.order) || {};
    if (msgId && chatId) {
      await editMsg(chatId, msgId, formatOrderText(order, statusLabel), getButtons(orderId, newStatus));
    }
    await answerCB(cq.id, statusLabel);

    return res.status(200).json({ ok: true, type: 'callback_query', action, orderId, newStatus });
  }

  // ════════════════════════════════════════════
  //  MESSAGE
  // ════════════════════════════════════════════

  const message = update.message || update.edited_message;
  if (!message || !message.chat) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'no_message' });
  }

  const fromUser = message.from || {};
  const chatId   = message.chat.id;
  const msgText  = typeof message.text === 'string' ? message.text.trim() : '';

  // ── Web app data ──
  if (message.web_app_data && typeof message.web_app_data.data === 'string') {
    const name = fromUser.first_name || fromUser.username || "do'st";
    await sendMsg(chatId, `Rahmat, ${name}!\nMini App ma'lumotlari qabul qilindi.`);
    return res.status(200).json({ ok: true, type: 'web_app_data' });
  }

  // ── /myid — har kim o'z Telegram ID'sini bilishi uchun ──
  if (isCmd(msgText, '/myid')) {
    await sendMsg(chatId,
      `🆔 <b>Sizning Telegram ID:</b> <code>${fromUser.id}</code>\n\nBu ID'ni <b>TG_ADMIN_ID</b> o'zgaruvchisiga kiriting.`
    );
    return res.status(200).json({ ok: true, type: 'myid' });
  }

  // ════════════════════════════════════════════
  //  ADMIN BUYRUQLARI
  // ════════════════════════════════════════════

  // ── Admin suhbat (conversation) holati ──
  if (isAdmin(fromUser.id)) {
    // Admin komandalar faqat private chatda ishlaydi
    if (message.chat.type !== 'private') {
      return res.status(200).json({ ok: true, ignored: true, reason: 'admin_in_group' });
    }

    const conv = await getConv();

    // /start va /help har doim conv ni bekor qilib admin panelni ko'rsatadi
    if (conv && (isCmd(msgText, '/start') || isCmd(msgText, '/help') || isCmd(msgText, '/cancel'))) {
      await clearConv();
      await sendMsg(chatId, '👑 <b>Admin boshqaruv paneli</b>', { reply_markup: adminKeyboard() });
      return res.status(200).json({ ok: true, type: 'conv_cancel' });
    }

    if (conv) {

      // Rasm kutilmoqda
      if (conv.step === 'photo') {
        if (!message.photo) {
          await sendMsg(chatId, '📸 Iltimos, rasm yuboring. Matn emas.\n\n/cancel — bekor qilish');
          return res.status(200).json({ ok: true });
        }
        const fileId = message.photo[message.photo.length - 1].file_id;
        const imgUrl = `/api/photo?id=${encodeURIComponent(fileId)}`;
        const { name, price, category } = conv.data;
        const newProduct = { id: Date.now(), name, price, emoji: '🍽', category, img: imgUrl, desc: '' };
        const products   = await kvGet('ck_products') || DEFAULT_PRODUCTS;
        products.push(newProduct);
        await kvSet('ck_products', products);
        let todayMenu = await kvGet('ck_daily_menu');
        if (todayMenu === null) todayMenu = products.slice(0, -1).map(p => p.id);
        todayMenu.push(newProduct.id);
        await kvSet('ck_daily_menu', todayMenu);
        await clearConv();
        await sendMsg(chatId,
          `✅ <b>${name}</b> qo'shildi!\nNarx: ${price.toLocaleString('uz-UZ')} so'm | ${category}`,
          { reply_markup: adminKeyboard() }
        );
        return res.status(200).json({ ok: true, type: 'conv_photo_done' });
      }

      // Matn qadam — faqat matn xabarlar
      if (!message.photo) {
        if (conv.step === 'name') {
          if (!msgText) { await sendMsg(chatId, '📝 Nom kiriting:'); return res.status(200).json({ ok: true }); }
          conv.data.name = msgText;
          conv.step = 'price';
          await setConv(conv);
          await sendMsg(chatId, `✅ Nom: <b>${msgText}</b>\n\n💰 Narxini kiriting (faqat raqam, so\'mda):\n\n/cancel — bekor qilish`);
          return res.status(200).json({ ok: true });
        }

        if (conv.step === 'price') {
          const price = parseInt(msgText.replace(/\D/g, ''));
          if (!price) {
            await sendMsg(chatId, '❌ Faqat raqam kiriting. Masalan: <code>35000</code>');
            return res.status(200).json({ ok: true });
          }
          conv.data.price = price;
          conv.step = 'category';
          await setConv(conv);
          await sendMsg(chatId, `✅ Narx: <b>${price.toLocaleString('uz-UZ')} so\'m</b>\n\n📂 Kategoriyani tanlang:`, {
            reply_markup: {
              inline_keyboard: [[
                { text: '🍖 Asosiy', callback_data: 'admin_cat:Asosiy' },
                { text: '🥤 Bonus',  callback_data: 'admin_cat:Bonus'  },
              ]],
            },
          });
          return res.status(200).json({ ok: true });
        }

        if (conv.step === 'category') {
          await sendMsg(chatId, '📂 Iltimos, tugmani bosing:');
          return res.status(200).json({ ok: true });
        }
      }
    }
  }

  if (isAdmin(fromUser.id)) {

    // /menu — bugungi menyuni interaktiv boshqarish
    if (isCmd(msgText, '/menu')) {
      const { products, todayMenu } = await getMenuData();
      if (!products.length) {
        await sendMsg(chatId, "📭 Mahsulotlar yo'q.\n<code>/additem</code> bilan qo'shing.", {});
      } else {
        await sendMsg(chatId,
          `📋 <b>Bugungi menyu boshqaruvi</b>\n\nMahsulotni bosib yoqing / o'chiring:\n✅ = bugun mavjud  |  ⬜ = yo'q`,
          { reply_markup: buildMenuKeyboard(products, todayMenu) }
        );
      }
      return res.status(200).json({ ok: true, type: 'admin_menu' });
    }

    // /additem Nomi | Narx | Emoji | Kategoriya
    if (isCmd(msgText, '/additem')) {
      const raw   = msgText.replace(/^\/additem\S*\s*/, '').trim();
      const parts = raw.split('|').map(s => s.trim());
      const name  = parts[0] || '';
      const price = parseInt((parts[1] || '').replace(/\s/g, '')) || 0;
      const emoji = parts[2] || '🍽';
      const cat   = parts[3] || 'Asosiy';

      if (!name || !price) {
        await sendMsg(chatId, [
          '❌ Format noto\'g\'ri. To\'g\'ri:',
          '<code>/additem Nomi | Narx | Emoji | Kategoriya</code>',
          '',
          'Misol:',
          '<code>/additem Shashlik | 35000 | 🥩 | Asosiy</code>',
          '<code>/additem Manti | 20000 | 🥟</code>',
        ].join('\n'));
        return res.status(200).json({ ok: true, type: 'admin_additem_error' });
      }

      const newProduct = { id: Date.now(), name, price, emoji, category: cat, img: '', desc: '' };
      const products   = await kvGet('ck_products') || DEFAULT_PRODUCTS;
      products.push(newProduct);
      await kvSet('ck_products', products);

      let todayMenu = await kvGet('ck_daily_menu');
      if (todayMenu === null) todayMenu = products.slice(0, -1).map(p => p.id);
      todayMenu.push(newProduct.id);
      await kvSet('ck_daily_menu', todayMenu);

      await sendMsg(chatId, [
        `✅ <b>${emoji} ${name}</b> qo'shildi!`,
        `Narx: ${price.toLocaleString('uz-UZ')} so'm | Kategoriya: ${cat}`,
        `Bugungi menyuga ham qo'shildi. /menu dan tasdiqlang.`,
      ].join('\n'));
      return res.status(200).json({ ok: true, type: 'admin_additem' });
    }

    // /removeitem Nomi
    if (isCmd(msgText, '/removeitem')) {
      const targetName = msgText.replace(/^\/removeitem\S*\s*/, '').trim().toLowerCase();
      if (!targetName) {
        await sendMsg(chatId, "Mahsulot nomini kiriting.\nMisol: <code>/removeitem Shashlik</code>");
        return res.status(200).json({ ok: true, type: 'admin_removeitem_empty' });
      }

      const products = await kvGet('ck_products') || DEFAULT_PRODUCTS;
      const idx      = products.findIndex(p => p.name.toLowerCase() === targetName);
      if (idx === -1) {
        await sendMsg(chatId, `❌ "${targetName}" topilmadi.\n/items bilan ro'yxatni ko'ring.`);
        return res.status(200).json({ ok: true, type: 'admin_removeitem_notfound' });
      }

      const removed = products.splice(idx, 1)[0];
      await kvSet('ck_products', products);

      let todayMenu = await kvGet('ck_daily_menu');
      if (todayMenu) {
        await kvSet('ck_daily_menu', todayMenu.filter(id => Number(id) !== Number(removed.id)));
      }

      await sendMsg(chatId, `✅ <b>${removed.emoji} ${removed.name}</b> o'chirildi.`);
      return res.status(200).json({ ok: true, type: 'admin_removeitem' });
    }

    // /items — barcha mahsulotlar ro'yxati
    if (isCmd(msgText, '/items')) {
      const products = await kvGet('ck_products') || DEFAULT_PRODUCTS;
      if (!products.length) {
        await sendMsg(chatId, "📭 Mahsulotlar yo'q.");
      } else {
        const lines = products.map((p, i) =>
          `${i + 1}. ${p.emoji} <b>${p.name}</b> — ${Number(p.price).toLocaleString('uz-UZ')} so'm [${p.category}]`
        );
        await sendMsg(chatId, [
          `📦 <b>Barcha mahsulotlar (${products.length} ta):</b>`,
          '',
          ...lines,
          '',
          "O'chirish: <code>/removeitem Nomi</code>",
        ].join('\n'));
      }
      return res.status(200).json({ ok: true, type: 'admin_items' });
    }

    // /today — bugungi menyuni ko'rish
    if (isCmd(msgText, '/today')) {
      const { products, todayMenu } = await getMenuData();
      const todayNums    = todayMenu.map(Number);
      const todayProds   = products.filter(p => todayNums.includes(Number(p.id)));
      if (!todayProds.length) {
        await sendMsg(chatId, "📭 Bugungi menyu bo'sh.\n/menu dan mahsulot qo'shing.");
      } else {
        const lines = todayProds.map(p =>
          `${p.emoji} <b>${p.name}</b> — ${Number(p.price).toLocaleString('uz-UZ')} so'm`
        );
        await sendMsg(chatId, [`🍽 <b>Bugungi menyu (${todayProds.length} ta):</b>`, '', ...lines].join('\n'));
      }
      return res.status(200).json({ ok: true, type: 'admin_today' });
    }

    // /cleartoday — bugungi menyuni tozalash
    if (isCmd(msgText, '/cleartoday')) {
      await kvSet('ck_daily_menu', []);
      await sendMsg(chatId, "🗑 Bugungi menyu tozalandi.\n/menu bilan yangi menyu tanlang.");
      return res.status(200).json({ ok: true, type: 'admin_cleartoday' });
    }

    // /setprice NARX — kanal post narxini o'rnatish
    if (isCmd(msgText, '/setprice')) {
      const price = parseInt(msgText.replace(/^\/setprice\S*\s*/, '').replace(/\D/g, ''));
      if (!price) {
        const cur = await kvGet('ck_set_price') || '—';
        await sendMsg(chatId, `💰 Joriy narx: <b>${cur ? Number(cur).toLocaleString('ru-RU') : '(mahsulot narxidan)'} so'm</b>\n\nO'zgartirish: <code>/setprice 40000</code>`);
      } else {
        await kvSet('ck_set_price', price);
        await sendMsg(chatId, `✅ Narx <b>${price.toLocaleString('ru-RU')} so'm</b> qilib saqlandi.`);
      }
      return res.status(200).json({ ok: true, type: 'admin_setprice' });
    }

    // /setfooter MATN — kanal post tagida chiqadigan matnni o'rnatish
    if (isCmd(msgText, '/setfooter')) {
      const footer = msgText.replace(/^\/setfooter\S*\s*/, '').trim();
      if (!footer) {
        const cur = await kvGet('ck_post_footer') || DEFAULT_FOOTER;
        await sendMsg(chatId, `📝 <b>Joriy footer:</b>\n\n${cur}\n\nO'zgartirish uchun:\n<code>/setfooter yangi matn...</code>`);
      } else {
        await kvSet('ck_post_footer', footer);
        await sendMsg(chatId, '✅ Footer saqlandi.');
      }
      return res.status(200).json({ ok: true, type: 'admin_setfooter' });
    }

    // /help — admin boshqaruv paneli
    if (isCmd(msgText, '/help')) {
      await sendMsg(chatId, '👑 <b>Admin boshqaruv paneli</b>', { reply_markup: adminKeyboard() });
      return res.status(200).json({ ok: true, type: 'admin_help' });
    }

    // Noma'lum buyruq — admin uchun yo'riqnoma
    if (msgText.startsWith('/')) {
      await sendMsg(chatId, "ℹ️ Buyruqlar uchun /help yozing.");
      return res.status(200).json({ ok: true, type: 'admin_unknown_cmd' });
    }
  }

  // ── /start ──
  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(msgText)) {
    const displayName = fromUser.first_name || fromUser.username || "do'st";
    if (isAdmin(fromUser.id)) {
      // Admin /start faqat private chatda ko'rinadi
      if (message.chat.type === 'private') {
        await sendMsg(adminTgId, `👑 <b>Xush kelibsiz, Admin!</b>`, { reply_markup: adminKeyboard() });
      }
    } else {
      await sendMsg(chatId,
        `✨ Salom, ${displayName}! CookUP'ga xush kelibsiz 🍽\nMenyu uchun saytga o'ting 👇`
      );
    }
    return res.status(200).json({ ok: true, type: 'start' });
  }

  return res.status(200).json({ ok: true, ignored: true, reason: 'not_handled' });
};
