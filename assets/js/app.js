document.addEventListener('alpine:init', () => {
  Alpine.store('app', {

    page: 'menu',
    theme: 'dark',
    showCart: false,
    showAdmin: false,

    /* ── Auth ── */
    role: 'guest',
    authPage: 'login',
    showAuth: false,
    currentUser: null,
    loginForm: { phone: '', password: '' },
    loginError: '',
    regForm: { name: '', phone: '', password: '' },
    regError: '',
    ADMIN_PASS: 'cookup2026',
    toast: { visible: false, msg: '' },
    _toastTimer: null,

    form: { name: '', phone: '' },
    formErrors: {},
    orders: [],

    /* ── Bugungi menyu — admin o'zgartiradi ── */
    todayMenu: [],

    /* ── Barcha mahsulotlar (admin boshqaradi) ── */
    products: [
      { id: 1, name: 'Qozon kabob', price: 40000, category: 'Asosiy', emoji: '🍖', img: '', desc: 'Qozonda pishirilgan mazali kabob' },
      { id: 2, name: 'Bedro mangal', price: 40000, category: 'Asosiy', emoji: '🍗', img: '', desc: 'Mangalda pishirilgan bedro' },
      { id: 3, name: 'Kulcha', price: 5000, category: 'Bonus', emoji: '🫓', img: '', desc: 'Yangi pishirilgan kulcha' },
      { id: 4, name: 'Kompot', price: 5000, category: 'Bonus', emoji: '🥤', img: '', desc: 'Sovuq kompot' },
      { id: 5, name: 'Salat', price: 8000, category: 'Bonus', emoji: '🥗', img: '', desc: 'Yangi sabzavot salati' },
    ],

    cart: [],

    init() {
      try {
        const c = localStorage.getItem('cu_cart');   if (c) this.cart = JSON.parse(c);
        const o = localStorage.getItem('cu_orders'); if (o) this.orders = JSON.parse(o);
        const t = localStorage.getItem('cu_theme');  if (t) this.theme = t;
        const m = localStorage.getItem('cu_menu');   if (m) this.todayMenu = JSON.parse(m);
        const p = localStorage.getItem('cu_products'); if (p) this.products = JSON.parse(p);
      } catch (e) {}
      this._applyTheme(this.theme);
      const savedRole = localStorage.getItem('cu_role');
      const savedUser = localStorage.getItem('cu_user');
      if (savedRole && savedUser) {
        this.role = savedRole;
        this.currentUser = JSON.parse(savedUser);
      }
      // Agar bugungi menyu bo'sh bo'lsa, barcha mahsulotlarni ko'rsatamiz
      if (!this.todayMenu.length) {
        this.todayMenu = this.products.map(p => p.id);
        this._saveTodayMenu();
      }
      this.$nextTick(() => lucide.createIcons());
    },

    _applyTheme(t) {
      const r = document.documentElement.style;
      if (t === 'light') {
        r.setProperty('--z950', '#F4F4F5');
        r.setProperty('--z900', '#FFFFFF');
        r.setProperty('--z800', '#E4E4E7');
        r.setProperty('--z700', '#D4D4D8');
        r.setProperty('--z400', '#71717A');
        document.body.classList.add('light');
        document.body.style.color = '#18181b';
      } else {
        r.setProperty('--z950', '#09090B');
        r.setProperty('--z900', '#18181B');
        r.setProperty('--z800', '#27272A');
        r.setProperty('--z700', '#3F3F46');
        r.setProperty('--z400', '#A1A1AA');
        document.body.classList.remove('light');
        document.body.style.color = '#ffffff';
      }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cu_theme', this.theme);
      this._applyTheme(this.theme);
      this.$nextTick(() => lucide.createIcons());
    },

    /* ══ AUTH ══ */
    login() {
      this.loginError = '';
      const phone = this.loginForm.phone.trim();
      const pass = this.loginForm.password;
      if (!phone || !pass) { this.loginError = 'Barcha maydonlarni to\'ldiring'; return; }

      if (pass === this.ADMIN_PASS) {
        this.role = 'admin';
        this.currentUser = { name: 'Admin', phone };
        localStorage.setItem('cu_role', 'admin');
        localStorage.setItem('cu_user', JSON.stringify(this.currentUser));
        this.showAuth = false;
        this.loginForm = { phone: '', password: '' };
        this.showToast('👑 Xush kelibsiz, Admin!');
        this.$nextTick(() => lucide.createIcons());
        return;
      }

      const users = JSON.parse(localStorage.getItem('cu_users') || '[]');
      const user = users.find(u => u.phone === phone && u.password === pass);
      if (!user) { this.loginError = 'Telefon yoki parol noto\'g\'ri'; return; }
      this.role = 'user';
      this.currentUser = { name: user.name, phone: user.phone };
      localStorage.setItem('cu_role', 'user');
      localStorage.setItem('cu_user', JSON.stringify(this.currentUser));
      this.showAuth = false;
      this.loginForm = { phone: '', password: '' };
      this.showToast(`👋 Xush kelibsiz, ${user.name}!`);
      this.$nextTick(() => lucide.createIcons());
    },

    register() {
      this.regError = '';
      const { name, phone, password } = this.regForm;
      if (!name.trim() || !phone.trim() || !password.trim()) { this.regError = 'Barcha maydonlarni to\'ldiring'; return; }
      if (password.length < 6) { this.regError = 'Parol kamida 6 ta belgi'; return; }
      if (password === this.ADMIN_PASS) { this.regError = 'Bu paroldan foydalanib bo\'lmaydi'; return; }
      const users = JSON.parse(localStorage.getItem('cu_users') || '[]');
      if (users.find(u => u.phone === phone.trim())) { this.regError = 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan'; return; }
      const newUser = { name: name.trim(), phone: phone.trim(), password };
      users.push(newUser);
      localStorage.setItem('cu_users', JSON.stringify(users));
      this.role = 'user';
      this.currentUser = { name: newUser.name, phone: newUser.phone };
      localStorage.setItem('cu_role', 'user');
      localStorage.setItem('cu_user', JSON.stringify(this.currentUser));
      this.showAuth = false;
      this.regForm = { name: '', phone: '', password: '' };
      this.showToast(`🎉 Ro'yxatdan o'tdingiz! Xush kelibsiz, ${newUser.name}!`);
      this.$nextTick(() => lucide.createIcons());
    },

    logout() {
      this.role = 'guest';
      this.currentUser = null;
      localStorage.removeItem('cu_role');
      localStorage.removeItem('cu_user');
      this.showAdmin = false;
      this.showAuth = false;
      this.page = 'menu';
      this.showToast('👋 Chiqib ketdingiz');
      this.$nextTick(() => lucide.createIcons());
    },

    openAuth(page = 'login') {
      this.authPage = page;
      this.showAuth = true;
      this.loginError = '';
      this.regError = '';
      this.$nextTick(() => lucide.createIcons());
    },

    openProfile() {
      if (this.role === 'guest') { this.openAuth('login'); return; }
      if (this.role === 'admin') {
        this.showAdmin = true;
        this.page = 'menu';
      } else {
        this.showAdmin = false;
        this.page = 'user_profile';
      }
      this.$nextTick(() => lucide.createIcons());
    },

    _saveCart()      { localStorage.setItem('cu_cart', JSON.stringify(this.cart)); },
    _saveTodayMenu() { localStorage.setItem('cu_menu', JSON.stringify(this.todayMenu)); },
    _saveProducts()  { localStorage.setItem('cu_products', JSON.stringify(this.products)); },

    showToast(msg, ms = 2600) {
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this.toast = { visible: true, msg };
      this._toastTimer = setTimeout(() => { this.toast.visible = false; }, ms);
    },

    /* ── Bugungi menyu mahsulotlari ── */
    get todayProducts() {
      return this.products.filter(p => this.todayMenu.includes(p.id));
    },

    cartQty(id)      { const i = this.cart.find(i => i.id === id); return i ? i.qty : 0; },
    get cartCount()  { return this.cart.reduce((s, i) => s + i.qty, 0); },
    get cartTotal()  { return this.cart.reduce((s, i) => s + i.price * i.qty, 0); },
    get totalRevenue(){ return this.orders.reduce((s, o) => s + o.total, 0); },
    get topSellers() {
      const m = {};
      this.orders.forEach(o => o.items.forEach(i => { m[i.name] = (m[i.name] || 0) + i.qty; }));
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    },

    addToCart(product) {
      const item = this.cart.find(i => i.id === product.id);
      if (item) item.qty++;
      else this.cart.push({ ...product, qty: 1 });
      this._saveCart();
      this.showToast(`${product.emoji} ${product.name} savatga qo'shildi!`);
      this.$nextTick(() => lucide.createIcons());
    },

    changeQty(id, delta) {
      const item = this.cart.find(i => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) this.cart = this.cart.filter(i => i.id !== id);
      this._saveCart();
      this.$nextTick(() => lucide.createIcons());
    },

    prefillForm() {
      if (this.currentUser) {
        if (this.currentUser.name && !this.form.name) this.form.name = this.currentUser.name;
        if (this.currentUser.phone && !this.form.phone) this.form.phone = this.currentUser.phone;
      }
    },

    async submitOrder() {
      this.formErrors = {};
      if (!this.form.name.trim())  this.formErrors.name = 'Ismingizni kiriting';
      if (!this.form.phone.trim()) this.formErrors.phone = 'Telefon raqamingizni kiriting';
      if (!this.cart.length)       this.formErrors.cart = 'Savat bo\'sh';
      if (Object.keys(this.formErrors).length) return;

      const order = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        customer: {
          name: this.form.name.trim(),
          phone: this.form.phone.trim(),
          account: this.currentUser ? this.currentUser.name + ' (' + this.currentUser.phone + ')' : 'Mehmon',
        },
        items: [...this.cart],
        total: this.cartTotal,
        status: 'new',
      };

      await this._sendToTelegram(order);

      this.orders.unshift(order);
      localStorage.setItem('cu_orders', JSON.stringify(this.orders));
      this.cart = [];
      this._saveCart();
      this.form = { name: '', phone: '' };
      this.page = 'success';
      this.$nextTick(() => lucide.createIcons());
    },

    async _sendToTelegram(order) {
      try {
        const res = await fetch('/api/order-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order', order })
        });
        const d = await res.json().catch(() => ({ ok: false }));
        if (!d.ok) {
          const details = d?.telegram?.description || d?.error || 'yuborilmadi';
          this.showToast(`❌ Telegram: ${details}`);
        }
        return d;
      } catch (e) {
        this.showToast('❌ Tarmoq xatosi');
        return { ok: false };
      }
    },

    /* ══ ADMIN: menyu boshqarish ══ */
    adminNewProduct: { name: '', price: '', category: 'Asosiy', emoji: '🍽', desc: '' },
    adminTab: 'orders', // orders | menu | products

    toggleTodayMenu(productId) {
      if (this.todayMenu.includes(productId)) {
        this.todayMenu = this.todayMenu.filter(id => id !== productId);
      } else {
        this.todayMenu.push(productId);
      }
      this._saveTodayMenu();
    },

    addProduct() {
      const p = this.adminNewProduct;
      if (!p.name.trim() || !p.price) { this.showToast('❌ Ism va narx majburiy'); return; }
      const newP = {
        id: Date.now(),
        name: p.name.trim(),
        price: parseInt(p.price),
        category: p.category || 'Asosiy',
        emoji: p.emoji || '🍽',
        img: '',
        desc: p.desc.trim(),
      };
      this.products.push(newP);
      this.todayMenu.push(newP.id);
      this._saveProducts();
      this._saveTodayMenu();
      this.adminNewProduct = { name: '', price: '', category: 'Asosiy', emoji: '🍽', desc: '' };
      this.showToast(`✅ ${newP.name} qo'shildi`);
    },

    removeProduct(id) {
      if (!confirm('Mahsulotni o\'chirasizmi?')) return;
      this.products = this.products.filter(p => p.id !== id);
      this.todayMenu = this.todayMenu.filter(mid => mid !== id);
      this.cart = this.cart.filter(c => c.id !== id);
      this._saveProducts();
      this._saveTodayMenu();
      this._saveCart();
      this.showToast('🗑 O\'chirildi');
    },

    setOrderStatus(orderId, status) {
      const order = this.orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
        localStorage.setItem('cu_orders', JSON.stringify(this.orders));
        this.showToast('✅ Status yangilandi');
      }
    },
  });
});

document.addEventListener('DOMContentLoaded', () => lucide.createIcons());
