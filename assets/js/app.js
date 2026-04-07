document.addEventListener('alpine:init', () => {
  Alpine.store('app', {

    page: 'menu',
    theme: 'dark',
    showCart: false,
    showAdmin: false,
    showSettings: false,

    /* ── Auth ── */
    role: 'guest',        // guest | user | admin
    authPage: 'login',    // login | register | profile
    showAuth: false,
    currentUser: null,    // { name, phone, email }
    loginForm: { email:'', password:'' },
    loginError: '',
    regForm: { name:'', phone:'', email:'', password:'' },
    regError: '',
    ADMIN_PASS: '12345678',
    activeCategory: 'Все',
    toast: { visible:false, msg:'' },
    _toastTimer: null,

    config: { supabaseUrl:'', supabaseKey:'' },
    form: { name:'', phone:'', address:'' },
    formErrors: {},
    trackingOrder: null,
    _mapInstance: null,
    _trackInterval: null,

    /* ── Каталог — ОРИГИНАЛЬНЫЕ картинки и товары ── */
    products: [
          { id: 1, name: 'Jumbo Burger', price: 6.59, category: 'Бургеры', emoji: '🍔', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', desc: 'Сочная говяжья котлета, хрустящий салат, томаты, свежий лук, хрустящая булочка' },
          { id: 2, name: 'Cheeseburger', price: 6.99, category: 'Бургеры', emoji: '🍔', img: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hlZXNlYnVyZ2VyfGVufDB8fDB8fHww', desc: 'Сочная говяжья котлета, хрустящий салат, томаты, свежий лук, хрустящая булочка, сыр' },
          { id: 3, name: 'Breaded Chicken', price: 5.99, category: 'Курица', emoji: '🍗', img: 'https://images.unsplash.com/photo-1586793783658-261cddf883ef?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8RnJpZWQlMjBDaGlja2VufGVufDB8fDB8fHww', desc: 'Куриное филе на гриле в панировке' },
          { id: 4, name: 'Fried Chicken', price: 6.29, category: 'Курица', emoji: '🍗', img: 'https://images.unsplash.com/photo-1638439430466-b2bb7fdc1d67?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8RnJpZWQlMjBDaGlja2VufGVufDB8fDB8fHww', desc: 'Куриное филе на гриле' },
          { id: 5, name: 'Veggie Wrap', price: 4.49, category: 'Роллы', emoji: '🌯', img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop', desc: 'Свежие овощи, хумус, авокадо' },
          { id: 6, name: 'Spicy Tuna Roll', price: 5.20, category: 'Роллы', emoji: '🍣', img: 'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=400&h=300&fit=crop', desc: 'Тунец, кунжут, острый соус' },
          { id: 7, name: 'Margherita', price: 8.90, category: 'Пицца', emoji: '🍕', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', desc: 'Томатный соус, моцарелла, базилик' },
          { id: 8, name: 'Pepperoni XXL', price: 10.50, category: 'Пицца', emoji: '🍕', img: 'https://images.unsplash.com/photo-1605478371310-a9f1e96b4ff4?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fFBlcHBlcm9uaXxlbnwwfHwwfHx8MA%3D%3D', desc: 'Щедрая пепперони, тройной сыр' },
          { id: 9, name: 'Caesar Salad', price: 5.30, category: 'Салаты', emoji: '🥗', img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop', desc: 'Романо, крутоны, пармезан' },
          { id: 10, name: 'Greek Salad', price: 4.80, category: 'Салаты', emoji: '🥙', img: 'https://images.unsplash.com/photo-1659270156961-323ea2afcd0a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fEdyZWVrJTIwc2FsYXR8ZW58MHx8MHx8fDA%3D', desc: 'Огурцы, маслины, фета' },
          { id: 11, name: 'Lemonade', price: 2.50, category: 'Напитки', emoji: '🍋', img: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', desc: 'Домашний лимонад с мятой' },
          { id: 12, name: 'Milkshake', price: 3.90, category: 'Напитки', emoji: '🥤', img: 'https://media.istockphoto.com/id/926990564/photo/chocolate-milk-and-whipped-cream.webp?a=1&b=1&s=612x612&w=0&k=20&c=ilJBEWejGCIwCGi3AV7eiVJ3jE9AI18HEj4bllQM-QI=', desc: 'Ваниль, клубника или шоколад' },
          { id: 13, name: 'Choco Lava', price: 4.20, category: 'Десерты', emoji: '🍫', img: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop', desc: 'Тёплый брауни с шоколадным центром' },
          { id: 14, name: 'Tiramisu', price: 4.60, category: 'Десерты', emoji: '🍮', img: 'https://plus.unsplash.com/premium_photo-1695028378225-97fbe39df62a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8VGlyYW1pc3V8ZW58MHx8MHx8fDA%3D', desc: 'Классический итальянский десерт' },
        ],

    cart: [],
    orders: [],

    init() {
      try {
        const c=localStorage.getItem('qb_cart');   if(c) this.cart=JSON.parse(c);
        const o=localStorage.getItem('qb_orders'); if(o) this.orders=JSON.parse(o);
        const g=localStorage.getItem('qb_config'); if(g) this.config={...this.config,...JSON.parse(g)};
        const t=localStorage.getItem('qb_theme');  if(t) this.theme=t;
      } catch(e){}
      this._applyTheme(this.theme);
      // Восстанавливаем сессию
      const savedRole=localStorage.getItem('qb_role');
      const savedUser=localStorage.getItem('qb_user');
      if(savedRole&&savedUser){
        this.role=savedRole;
        this.currentUser=JSON.parse(savedUser);
      }
      this.$nextTick(()=>lucide.createIcons());
    },

    _applyTheme(t){
      const r=document.documentElement.style;
      if(t==='light'){
        r.setProperty('--z950','#F4F4F5');
        r.setProperty('--z900','#FFFFFF');
        r.setProperty('--z800','#E4E4E7');
        r.setProperty('--z700','#D4D4D8');
        r.setProperty('--z400','#71717A');
        document.body.classList.add('light');
        document.body.style.color='#18181b';
      } else {
        r.setProperty('--z950','#09090B');
        r.setProperty('--z900','#18181B');
        r.setProperty('--z800','#27272A');
        r.setProperty('--z700','#3F3F46');
        r.setProperty('--z400','#A1A1AA');
        document.body.classList.remove('light');
        document.body.style.color='#ffffff';
      }
    },

    toggleTheme(){
      this.theme=this.theme==='dark'?'light':'dark';
      localStorage.setItem('qb_theme',this.theme);
      this._applyTheme(this.theme);
      this.$nextTick(()=>lucide.createIcons());
    },

    /* ══ AUTH ══ */
    login(){
      this.loginError='';
      const email=this.loginForm.email.trim().toLowerCase();
      const pass=this.loginForm.password;
      if(!email||!pass){this.loginError='Заполните все поля';return;}

      // Проверяем пароль админа
      if(pass===this.ADMIN_PASS){
        this.role='admin';
        this.currentUser={name:'Администратор',email,phone:''};
        localStorage.setItem('qb_role','admin');
        localStorage.setItem('qb_user',JSON.stringify(this.currentUser));
        this.showAuth=false;
        this.loginForm={email:'',password:''};
        this.showToast('👑 Добро пожаловать, Администратор!');
        this.$nextTick(()=>lucide.createIcons());
        return;
      }

      // Обычный пользователь — ищем в localStorage
      const users=JSON.parse(localStorage.getItem('qb_users')||'[]');
      const user=users.find(u=>u.email===email&&u.password===pass);
      if(!user){this.loginError='Неверный email или пароль';return;}
      this.role='user';
      this.currentUser={name:user.name,email:user.email,phone:user.phone};
      localStorage.setItem('qb_role','user');
      localStorage.setItem('qb_user',JSON.stringify(this.currentUser));
      this.showAuth=false;
      this.loginForm={email:'',password:''};
      this.showToast(`👋 Привет, ${user.name}!`);
      this.$nextTick(()=>lucide.createIcons());
    },

    register(){
      this.regError='';
      const {name,phone,email,password}=this.regForm;
      if(!name.trim()||!phone.trim()||!email.trim()||!password.trim()){this.regError='Заполните все поля';return;}
      if(password.length<6){this.regError='Пароль минимум 6 символов';return;}
      if(password===this.ADMIN_PASS){this.regError='Этот пароль недоступен';return;}
      const users=JSON.parse(localStorage.getItem('qb_users')||'[]');
      if(users.find(u=>u.email===email.toLowerCase())){this.regError='Email уже используется';return;}
      const newUser={name:name.trim(),phone:phone.trim(),email:email.trim().toLowerCase(),password};
      users.push(newUser);
      localStorage.setItem('qb_users',JSON.stringify(users));
      // Авто-логин
      this.role='user';
      this.currentUser={name:newUser.name,email:newUser.email,phone:newUser.phone};
      localStorage.setItem('qb_role','user');
      localStorage.setItem('qb_user',JSON.stringify(this.currentUser));
      this.showAuth=false;
      this.regForm={name:'',phone:'',email:'',password:''};
      this.showToast(`🎉 Аккаунт создан! Привет, ${newUser.name}!`);
      this.$nextTick(()=>lucide.createIcons());
    },

    logout(){
      this.role='guest';
      this.currentUser=null;
      localStorage.removeItem('qb_role');
      localStorage.removeItem('qb_user');
      this.showAdmin=false;
      this.showAuth=false;
      this.page='menu';
      this.showToast('👋 Вы вышли из аккаунта');
      this.$nextTick(()=>lucide.createIcons());
    },

    openAuth(page='login'){
      this.authPage=page;
      this.showAuth=true;
      this.loginError='';
      this.regError='';
      this.$nextTick(()=>lucide.createIcons());
    },

    _saveCart()  { localStorage.setItem('qb_cart',  JSON.stringify(this.cart)); },
    _saveConfig(){ localStorage.setItem('qb_config',JSON.stringify(this.config)); },

    showToast(msg,ms=2400){
      if(this._toastTimer) clearTimeout(this._toastTimer);
      this.toast={visible:true,msg};
      this._toastTimer=setTimeout(()=>{this.toast.visible=false;},ms);
    },

    get categories(){ return ['Все',...new Set(this.products.map(p=>p.category))]; },
    get filteredProducts(){ return this.activeCategory==='Все'?this.products:this.products.filter(p=>p.category===this.activeCategory); },
    cartQty(id){ const i=this.cart.find(i=>i.id===id); return i?i.qty:0; },
    get cartCount(){ return this.cart.reduce((s,i)=>s+i.qty,0); },
    get cartTotal(){ return this.cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2); },
    get totalRevenue(){ return this.orders.reduce((s,o)=>s+o.total,0).toFixed(2); },
    get topSellers(){
      const m={};
      this.orders.forEach(o=>o.items.forEach(i=>{m[i.name]=(m[i.name]||0)+i.qty;}));
      return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);
    },

    addToCart(product){
      const item=this.cart.find(i=>i.id===product.id);
      if(item) item.qty++;
      else this.cart.push({...product,qty:1});
      this._saveCart();
      this.showToast(`${product.emoji} ${product.name} добавлен!`);
      this.$nextTick(()=>lucide.createIcons());
    },

    changeQty(id,delta){
      const item=this.cart.find(i=>i.id===id);
      if(!item) return;
      item.qty+=delta;
      if(item.qty<=0) this.cart=this.cart.filter(i=>i.id!==id);
      this._saveCart();
      this.$nextTick(()=>lucide.createIcons());
    },

    getLocation(){
      if(!navigator.geolocation){this.showToast('Геолокация не поддерживается');return;}
      this.showToast('📍 Определяю местоположение…');
      navigator.geolocation.getCurrentPosition(
        pos=>{
          this.form.address=`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          this.showToast('✅ Координаты получены!');
        },
        ()=>this.showToast('❌ Не удалось получить геолокацию')
      );
    },

    _extractCoordinates(address){
      if(typeof address!=='string') return null;
      const raw=address.trim();
      if(!raw) return null;

      let latStr='', lngStr='';

      // 1) "41.33056, 69.26278" or "41.33056 69.26278"
      const standard=raw.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[, ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
      if(standard){
        latStr=standard[1];
        lngStr=standard[2];
      } else {
        // 2) "41,33056 69,26278" or "41,33056;69,26278"
        const bySep=raw.split(/[;\s]+/).filter(Boolean);
        if(bySep.length===2){
          latStr=bySep[0];
          lngStr=bySep[1];
        } else {
          // 3) "41,33056,69,26278"
          const parts=raw.split(',').map(s=>s.trim()).filter(Boolean);
          if(parts.length===4){
            latStr=`${parts[0]},${parts[1]}`;
            lngStr=`${parts[2]},${parts[3]}`;
          } else {
            return null;
          }
        }
      }

      const lat=parseFloat(latStr.replace(',','.'));
      const lng=parseFloat(lngStr.replace(',','.'));
      if(Number.isNaN(lat)||Number.isNaN(lng)) return null;
      if(lat<-90||lat>90||lng<-180||lng>180) return null;
      return {lat,lng};
    },

    async _geocodeAddress(address){
      try{
        const q=encodeURIComponent(address.trim());
        const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${q}`;
        const res=await fetch(url,{headers:{'Accept':'application/json'}});
        if(!res.ok) return null;
        const data=await res.json();
        if(!Array.isArray(data)||!data.length) return null;
        const lat=parseFloat(data[0].lat);
        const lng=parseFloat(data[0].lon);
        if(Number.isNaN(lat)||Number.isNaN(lng)) return null;
        return {lat,lng};
      }catch(e){
        return null;
      }
    },

    async _resolveDeliveryCoords(address){
      const byCoords=this._extractCoordinates(address);
      if(byCoords) return byCoords;
      const byGeocode=await this._geocodeAddress(address);
      if(byGeocode) return byGeocode;
      return null;
    },

    async _sendToSupabase(order){
      if(!this.config.supabaseUrl||!this.config.supabaseKey) return null;
      try{
        const res=await fetch(`${this.config.supabaseUrl}/rest/v1/orders`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':this.config.supabaseKey,'Authorization':`Bearer ${this.config.supabaseKey}`,'Prefer':'return=representation'},
          body:JSON.stringify({customer_name:order.customer.name,customer_phone:order.customer.phone,customer_address:order.customer.address,items:order.items,total:order.total,status:'new',created_at:order.createdAt})
        });
        if(!res.ok) throw new Error(await res.text());
        const data=await res.json();
        console.log('✅ Supabase OK',data);
        return data[0];
      }catch(e){ console.error('❌ Supabase:',e); this.showToast('⚠️ Supabase: ошибка сохранения'); return null; }
    },

    async _sendToTelegram(order){
      try{
        const res=await fetch('/api/order-notify',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({type:'order',order})
        });
        const d=await res.json().catch(()=>({ok:false,error:'invalid_json'}));
        if(!res.ok||!d.ok){
          console.error('❌ TG notify failed:',d);
          this.showToast('❌ Telegram: не удалось отправить');
          return d;
        }
        console.log('✅ Telegram notify OK');
        return d;
      }catch(e){
        console.error('❌ TG notify fetch:',e.message);
        this.showToast('❌ Telegram: сетевая ошибка');
        return {ok:false};
      }
    },

    async testTelegram(){
      this.showToast('📤 Отправляю тест…');
      try{
        const res=await fetch('/api/order-notify',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({type:'test'})
        });
        const d=await res.json().catch(()=>({ok:false,error:'invalid_json'}));
        if(d&&d.ok) this.showToast('✅ Тест отправлен! Проверь чат.');
        else this.showToast('❌ Тест не отправился');
      }catch(e){
        this.showToast('❌ Тест не отправился');
      }
    },

    prefillForm(){
      if(this.currentUser){
        if(this.currentUser.name&&!this.form.name) this.form.name=this.currentUser.name;
        if(this.currentUser.phone&&!this.form.phone) this.form.phone=this.currentUser.phone;
      }
    },

    async submitOrder(){
      this.formErrors={};
      if(!this.form.name.trim())    this.formErrors.name='Введите имя';
      if(!this.form.phone.trim())   this.formErrors.phone='Введите телефон';
      if(!this.form.address.trim()) this.formErrors.address='Введите адрес';
      if(!this.cart.length)         this.formErrors.cart='Корзина пуста';
      if(Object.keys(this.formErrors).length) return;
      const resolvedCoords=await this._resolveDeliveryCoords(this.form.address);
      const fallbackCoords={lat:41.2995+(Math.random()-.5)*.018,lng:69.2401+(Math.random()-.5)*.018};
      const delivery=resolvedCoords||fallbackCoords;
      if(!resolvedCoords){
        this.showToast('⚠️ Адрес не распознан, использую примерную точку');
      }
      const order={id:Date.now(),createdAt:new Date().toISOString(),customer:{...this.form,email:this.currentUser?.email||''},items:[...this.cart],total:parseFloat(this.cartTotal),status:'cooking',deliveryLat:delivery.lat,deliveryLng:delivery.lng};
      console.log('📦 ORDER JSON:',JSON.stringify(order,null,2));
      await Promise.all([this._sendToSupabase(order),this._sendToTelegram(order)]);
      this.orders.unshift(order);
      localStorage.setItem('qb_orders',JSON.stringify(this.orders));
      this.cart=[]; this._saveCart();
      this.form={name:'',phone:'',address:''};
      this.trackingOrder=order;
      this.page='success';
      this.$nextTick(()=>lucide.createIcons());
    },

    initMap(){
      if(this._trackInterval) clearInterval(this._trackInterval);
      if(this._mapInstance){this._mapInstance.remove();this._mapInstance=null;}
      const order=this.trackingOrder;
      if(!order) return;
      const dLat=order.deliveryLat, dLng=order.deliveryLng;
      let cLat=dLat-.014, cLng=dLng-.010;
      setTimeout(()=>{
        const el=document.getElementById('tracking-map');
        if(!el) return;
        const map=L.map(el,{zoomControl:false,attributionControl:false}).setView([dLat,dLng],14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
        const mkDest=L.divIcon({html:`<div style="background:#F59E0B;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 16px rgba(245,158,11,.6);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:15px">🏠</span></div>`,className:'',iconAnchor:[18,36]});
        const mkCourier=L.divIcon({html:`<div style="background:#10b981;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 16px rgba(16,185,129,.6);display:flex;align-items:center;justify-content:center;font-size:18px">🛵</div>`,className:'',iconAnchor:[20,20]});
        L.marker([dLat,dLng],{icon:mkDest}).addTo(map).bindPopup('<b>Адрес доставки</b>').openPopup();
        const cm=L.marker([cLat,cLng],{icon:mkCourier}).addTo(map);
        this._mapInstance=map;
        setTimeout(()=>map.invalidateSize(),100);
        this._trackInterval=setInterval(()=>{
          cLat+=(dLat-cLat)*.08; cLng+=(dLng-cLng)*.08;
          cm.setLatLng([cLat,cLng]);
          map.panTo([cLat,cLng],{animate:true,duration:.8});
          if(Math.abs(dLat-cLat)<.0002&&Math.abs(dLng-cLng)<.0002){
            clearInterval(this._trackInterval);
            this.showToast('🎉 Курьер прибыл!');
            if(this.trackingOrder) this.trackingOrder.status='done';
          }
        },1800);
      },200);
    },
  });
});

document.addEventListener('DOMContentLoaded',()=>lucide.createIcons());


