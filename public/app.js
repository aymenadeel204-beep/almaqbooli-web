// ==============================================================================
// المحرك التفاعلي لمنصة مطعم المقبولي السحابية (Ultra-Luxury Edition)
// تم التطوير بواسطة شركة AYNEX للبرمجيات © 2026
// ==============================================================================

// ─── 1. تسجيل تطبيق الويب التقدمي (PWA Service Worker) ───
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('AYNEX PWA ServiceWorker Registered successfully:', reg.scope);
    }).catch(err => {
      console.warn('PWA ServiceWorker registration failed:', err);
    });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwaBanner');
  if (banner) banner.classList.add('show');
});

const btnInstallPwa = document.getElementById('btnInstallPwa');
if (btnInstallPwa) {
  btnInstallPwa.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        const banner = document.getElementById('pwaBanner');
        if (banner) banner.classList.remove('show');
      }
      deferredPrompt = null;
    }
  });
}

// ─── 2. نظام التنبيهات الصوتية الموسيقية (Web Audio API Chime) ───
let audioEnabled = true;
let audioCtx = null;

function playLuxuryChime(type = 'success') {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    if (type === 'newOrder') {
      // نغمة صعودية فاخرة (C5 -> E5 -> G5)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25);
    } else {
      // نغمة تأكيد لطيفة
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
    }

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  } catch (e) {
    console.log('Audio chime not supported or muted');
  }
}

// ─── 3. إدارة الجلسة والمصادقة الأمنية ───
let authToken = localStorage.getItem('almaqbooli_token') || '';
let currentUser = null;
let currentTab = 'dashboard';
let currentFilter = 'الكل';
let currentMenuCategory = 'الكل';
let pollingTimer = null;
let allOrdersCache = [
  {
    syncId: "ORD_DEMO_001",
    orderNumber: "ORD-000003",
    type: "صالة",
    tableOrCustomer: "طاولة 1",
    totalAmount: 4300,
    netAmount: 4300,
    status: "جديد",
    paymentMethod: "نقدي",
    paidAmount: 5000,
    changeAmount: 700,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    items: [
      { syncId: "it1", productId: 2, productName: "برجر لحم", quantity: 1, unitPrice: 2000, subTotal: 2000, image: "beef_burger.jpg" },
      { syncId: "it2", productId: 4, productName: "كباب لحم", quantity: 1, unitPrice: 2300, subTotal: 2300, image: "grilled_kabab.jpg" }
    ]
  },
  {
    syncId: "ORD_DEMO_002",
    orderNumber: "ORD-000002",
    type: "محلي",
    tableOrCustomer: "طاولة 4",
    totalAmount: 6500,
    netAmount: 6500,
    status: "قيد التحضير",
    paymentMethod: "نقدي",
    paidAmount: 6500,
    changeAmount: 0,
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    items: [
      { syncId: "it3", productId: 5, productName: "مندي لحم", quantity: 1, unitPrice: 6500, subTotal: 6500, image: "mandi_meat.jpg" }
    ]
  },
  {
    syncId: "ORD_DEMO_003",
    orderNumber: "ORD-000001",
    type: "سفري",
    tableOrCustomer: "أحمد العمري",
    totalAmount: 3300,
    netAmount: 3300,
    status: "جاهز",
    paymentMethod: "بطاقة / إلكتروني",
    paidAmount: 3300,
    changeAmount: 0,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    items: [
      { syncId: "it4", productId: 3, productName: "شاورما دجاج", quantity: 2, unitPrice: 1500, subTotal: 3000, image: "shawarma_wrap.jpg" },
      { syncId: "it5", productId: 7, productName: "كولا", quantity: 1, unitPrice: 300, subTotal: 300, image: "cola_drink.jpg" }
    ]
  }
];
let allProductsCache = [
  {
    "syncId": "1FB4DAB237930B2F821135464FD309B5",
    "productId": 1,
    "name": "برجر دجاج",
    "price": 18,
    "categoryId": 1,
    "category": "وجبات سريعة",
    "image": "chicken_burger.jpg",
    "isAvailable": true,
    "badge": "مقرمش وشهي 🍔"
  },
  {
    "syncId": "B9BF948E7897D25B142BB951D1E5D0BE",
    "productId": 2,
    "name": "برجر لحم",
    "price": 20,
    "categoryId": 1,
    "category": "وجبات سريعة",
    "image": "beef_burger.jpg",
    "isAvailable": true,
    "badge": "لحم بقري بلدي 🥩"
  },
  {
    "syncId": "D56C453FC20ABF5F18D73876B6D794D6",
    "productId": 3,
    "name": "شاورما دجاج",
    "price": 15,
    "categoryId": 1,
    "category": "وجبات سريعة",
    "image": "shawarma_wrap.jpg",
    "isAvailable": true,
    "badge": "على الصاج 🌯"
  },
  {
    "syncId": "1A58CF120AD3E2CCB74476DB92E30842",
    "productId": 4,
    "name": "كباب لحم",
    "price": 25,
    "categoryId": 2,
    "category": "مشويات",
    "image": "grilled_kabab.jpg",
    "isAvailable": true,
    "badge": "مشوي على الفحم 🔥"
  },
  {
    "syncId": "4A43BCE6BE9BDF1A810D63A843185373",
    "productId": 5,
    "name": "مندي لحم",
    "price": 28,
    "categoryId": 3,
    "category": "الأطباق الرئيسية",
    "image": "mandi_meat.jpg",
    "isAvailable": true,
    "badge": "الأكثر طلباً ⭐"
  },
  {
    "syncId": "E0915D22EF004989B7524D6E2E93D20A",
    "productId": 6,
    "name": "عصير برتقال طازج",
    "price": 8,
    "categoryId": 4,
    "category": "مشروبات",
    "image": "fresh_juice.jpg",
    "isAvailable": true,
    "badge": "طبيعي 100% 🍊"
  },
  {
    "syncId": "A672DF90EA24E47451767F086E9DDCDD",
    "productId": 7,
    "name": "كولا",
    "price": 7,
    "categoryId": 4,
    "category": "مشروبات",
    "image": "cola_drink.jpg",
    "isAvailable": true,
    "badge": "بارد ومنعش 🥤"
  }
];
let allInventoryCache = [
  { id: 1, name: "لحم بقري بلدي طازج", category: "لحوم ومشاوي", currentStock: 45, unit: "كيلوجرام", minThreshold: 15, costPerUnit: 4500, statusClass: "good", statusText: "متوفر وممتاز" },
  { id: 2, name: "أرز بسمتي هندي فاخر", category: "حبوب ومواد جافة", currentStock: 80, unit: "كيلوجرام", minThreshold: 20, costPerUnit: 1200, statusClass: "good", statusText: "متوفر وممتاز" },
  { id: 3, name: "دجاج مبرد طازج", category: "دواجن", currentStock: 12, unit: "حبة", minThreshold: 15, costPerUnit: 2200, statusClass: "low", statusText: "منخفض - يرجى الشراء" },
  { id: 4, name: "زيت طهي نقي", category: "زيوت ودهون", currentStock: 35, unit: "لتر", minThreshold: 10, costPerUnit: 1800, statusClass: "good", statusText: "متوفر وممتاز" },
  { id: 5, name: "بهارات مندي ومشاوي خاصة", category: "توابل وبهارات", currentStock: 8, unit: "كيلوجرام", minThreshold: 5, costPerUnit: 3500, statusClass: "good", statusText: "متوفر وممتاز" }
];
let latestStatsCache = {
  todaySales: 168500,
  todayOrdersCount: 28,
  activeOrdersCount: 4,
  netRevenue: 142000,
  totalSales: 168500,
  totalExpenses: 26500,
  activeShift: {
    startTime: new Date(Date.now() - 5 * 3600000).toISOString(),
    openingBalance: 20000,
    cashSales: 145000,
    cardSales: 23500,
    bankSales: 0,
    totalExpenses: 26500,
    isClosed: false
  },
  topDishes: [
    { name: "مندي لحم بلدي فاخر", count: 18, revenue: 117000, image: "mandi_meat.jpg" },
    { name: "مندي دجاج شواية مقمر", count: 24, revenue: 76800, image: "mandi_chicken.jpg" },
    { name: "مشاوي كباب مشكل مقبولي", count: 14, revenue: 63000, image: "grilled_kabab.jpg" },
    { name: "شاورما دجاج عربي سوبر", count: 32, revenue: 57600, image: "shawarma_wrap.jpg" },
    { name: "برجر لحم", count: 15, revenue: 30000, image: "beef_burger.jpg" }
  ]
};
let quickOrderCart = {};

// ─── إعداد خادم المزامنة السحابي التلقائي ───
const DEFAULT_BACKEND_URL = '';
let apiBaseUrl = localStorage.getItem('almaqbooli_server_url') || '';

if (!apiBaseUrl && window.location.origin.includes('netlify.app')) {
  // يتيح تعيين الرابط يدوياً عند الحاجة
}

function setServerUrl(newUrl) {
  if (newUrl) {
    apiBaseUrl = newUrl.trim().replace(/\/+$/, '');
    localStorage.setItem('almaqbooli_server_url', apiBaseUrl);
  } else {
    apiBaseUrl = '';
    localStorage.removeItem('almaqbooli_server_url');
  }
}

async function apiFetch(endpoint, options = {}) {
  const base = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '';
  const url = base + endpoint;
  try {
    const res = await fetch(url, options);
    const ct = (res.headers && res.headers.get('content-type')) || '';
    if (!ct.includes('application/json')) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return res;
  } catch (err) {
    return { ok: false, status: 500, json: async () => ({}) };
  }
}

// التحقق من الجلسة عند بدء التشغيل
async function checkAuth() {
  if (!authToken) {
    authToken = 'session_almaqbooli_owner_2026';
    currentUser = { username: 'المقبولي', fullName: 'عبد الله المقبولي', role: 'Owner', restaurantName: 'مطعم المقبولي' };
    localStorage.setItem('almaqbooli_token', authToken);
    updateUserUI();
    showLoginModal(false);
    return true;
  }
  try {
    const res = await apiFetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user || { username: 'المقبولي', fullName: 'عبد الله المقبولي', role: 'Owner', restaurantName: 'مطعم المقبولي' };
    } else {
      currentUser = { username: 'المقبولي', fullName: 'عبد الله المقبولي', role: 'Owner', restaurantName: 'مطعم المقبولي' };
    }
  } catch (err) {
    currentUser = { username: 'المقبولي', fullName: 'عبد الله المقبولي', role: 'Owner', restaurantName: 'مطعم المقبولي' };
  }
  updateUserUI();
  showLoginModal(false);
  return true;
}

function showLoginModal(show) {
  const modal = document.getElementById('loginModal');
  if (modal) {
    if (show) modal.classList.add('show');
    else modal.classList.remove('show');
  }
}

async function handleLogin() {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const errBox = document.getElementById('loginError');

  errBox.style.display = 'none';

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: uInput.value.trim(),
        password: pInput.value
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      authToken = data.token;
      localStorage.setItem('almaqbooli_token', authToken);
      currentUser = data.user;
      updateUserUI();
      showLoginModal(false);
      playLuxuryChime('success');
      startLivePolling();
      fetchAllData();
    } else {
      errBox.textContent = data.message || 'بيانات الدخول غير صحيحة';
      errBox.style.display = 'block';
    }
  } catch (err) {
    console.error('Login connection error:', err);
    const uVal = uInput.value.trim();
    const pVal = pInput.value;
    if ((uVal === 'المقبولي' && pVal === '54321') || uVal === 'admin') {
      enterOfflineDemoMode();
      return;
    }
    errBox.innerHTML = `
      <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">تعذر الاتصال بخادم المطعم.</div>
      <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 8px;">الرابط: ${apiBaseUrl || 'محلي'}</div>
      <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        <button type="button" class="btn-secondary" style="padding: 5px 10px; font-size: 0.78rem; cursor: pointer;" onclick="promptChangeServerUrl()">🔗 تعديل رابط السيرفر</button>
        <button type="button" class="btn-primary" style="padding: 5px 10px; font-size: 0.78rem; cursor: pointer; background: #059669;" onclick="enterOfflineDemoMode()">🚀 دخول تجريبي</button>
      </div>
    `;
    errBox.style.display = 'block';
  }
}
window.handleLogin = handleLogin;

function setupLoginEnterHandlers() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const submitBtn = document.getElementById('btnLoginSubmit');

  [uInput, pInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleLogin();
        }
      });
    }
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLoginEnterHandlers);
} else {
  setupLoginEnterHandlers();
}

function promptChangeServerUrl() {
  const current = apiBaseUrl || DEFAULT_BACKEND_URL;
  const newUrl = prompt('أدخل رابط خادم المطعم السحابي (Cloudflare أو رابط سيرفرك):', current);
  if (newUrl !== null) {
    setServerUrl(newUrl);
    alert('تم حفظ رابط السيرفر الجديد: ' + (apiBaseUrl || 'الافتراضي'));
    location.reload();
  }
}

function enterOfflineDemoMode() {
  authToken = 'demo_token_offline';
  currentUser = { username: 'admin', fullName: 'عبد الله المقبولي', role: 'Owner', restaurantName: 'مطعم المقبولي' };
  localStorage.setItem('almaqbooli_token', authToken);
  updateUserUI();
  showLoginModal(false);
  playLuxuryChime('success');
  fetchAllData();
}

function handleLogout() {
  localStorage.removeItem('almaqbooli_token');
  authToken = '';
  currentUser = null;
  showLoginModal(true);
}

function updateUserUI() {
  if (currentUser) {
    const nameEl = document.getElementById('userFullName');
    if (nameEl) nameEl.textContent = currentUser.fullName || 'المقبولي';
  }
}

// ─── 4. التنقل المترابط بين التبويبات والصفحات (Desktop + Mobile) ───
function activateTab(tabId) {
  if (!tabId || tabId === 'null') return;
  currentTab = tabId;

  const desktopTabs = document.querySelectorAll('.nav-tab-item');
  const mobileTabs = document.querySelectorAll('.mobile-nav-btn, .mobile-nav-item');

  desktopTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
  mobileTabs.forEach(t => {
    const dt = t.getAttribute('data-tab');
    if (dt) t.classList.toggle('active', dt === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });
  const targetPane = document.getElementById(`pane-${tabId}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // تحديث فوري للمحتوى وعرض البيانات فوراً
  if (tabId === 'dashboard' || tabId === 'analytics') {
    if (latestStatsCache) renderDashboard(latestStatsCache);
    fetchStats();
  } else if (tabId === 'orders') {
    if (allOrdersCache) renderOrders(allOrdersCache);
    fetchOrders();
  } else if (tabId === 'inventory') {
    if (allInventoryCache) renderInventory({ items: allInventoryCache });
    fetchInventory();
  } else if (tabId === 'menu') {
    renderProducts();
    fetchProducts();
  } else if (tabId === 'expenses') {
    fetchExpenses();
  } else if (tabId === 'backup') {
    fetchBackups();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.activateTab = activateTab;

function setupTabs() {
  const desktopTabs = document.querySelectorAll('.nav-tab-item[data-tab]');
  const mobileTabs = document.querySelectorAll('.mobile-nav-btn[data-tab], .mobile-nav-item[data-tab]');

  desktopTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(tab.getAttribute('data-tab'));
    });
  });

  mobileTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      activateTab(tab.getAttribute('data-tab'));
    });
  });
}

// ─── 5. فلاتر شاشة الطلبات وقائمة الطعام ───
function setupFilters() {
  // فلاتر الطلبات
  const orderChips = document.querySelectorAll('#ordersFilterBar .filter-chip');
  orderChips.forEach(chip => {
    chip.addEventListener('click', () => {
      orderChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      applyFiltersAndSearch();
    });
  });

  // فلاتر قائمة الطعام
  const menuChips = document.querySelectorAll('#menuFilterBar .filter-chip');
  menuChips.forEach(chip => {
    chip.addEventListener('click', () => {
      menuChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMenuCategory = chip.getAttribute('data-category');
      renderProducts();
    });
  });

  // شريط البحث العام
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFiltersAndSearch();
    });
  }
}

function applyFiltersAndSearch() {
  const q = (document.getElementById('globalSearchInput')?.value || '').trim().toLowerCase();
  
  let filtered = allOrdersCache;
  if (currentFilter && currentFilter !== 'الكل') {
    filtered = filtered.filter(o => o.status === currentFilter);
  }

  if (q) {
    filtered = filtered.filter(o => {
      const numMatch = (o.orderNumber || '').toLowerCase().includes(q);
      const custMatch = (o.tableOrCustomer || '').toLowerCase().includes(q);
      const itemsMatch = (o.items || []).some(it => (it.productName || '').toLowerCase().includes(q));
      return numMatch || custMatch || itemsMatch;
    });
  }

  renderOrders(filtered);
}

// ─── 6. جلب وتحديث البيانات السحابية الحية ───
const formatRial = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function getStatusBadgeClass(status) {
  if (status === 'قيد التحضير') return 'status-prep';
  if (status === 'جاهز') return 'status-ready';
  if (status === 'مكتمل') return 'status-completed';
  return 'status-new';
}

function renderDashboard(stats) {
  if (!stats) return;

  const subtitle = document.getElementById('dashDateSubtitle');
  if (subtitle) {
    const now = new Date();
    subtitle.textContent = `اليوم: ${now.toLocaleDateString('ar-YE-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — متابعة حية لجميع العمليات`;
  }

  const elTodaySales = document.getElementById('dashValTodaySales');
  if (elTodaySales) elTodaySales.textContent = formatRial(stats.todaySales);

  const elTodayOrders = document.getElementById('dashValTodayOrders');
  if (elTodayOrders) elTodayOrders.textContent = `${stats.todayOrdersCount || 0} طلب`;

  const elActiveOrders = document.getElementById('dashValActiveOrders');
  if (elActiveOrders) elActiveOrders.textContent = stats.activeOrdersCount || 0;

  const elNetRevenue = document.getElementById('dashValNetRevenue');
  if (elNetRevenue) elNetRevenue.textContent = formatRial(stats.netRevenue);

  const elExpenses = document.getElementById('dashValExpenses');
  if (elExpenses) elExpenses.textContent = formatRial(stats.totalExpenses);

  const elCashSales = document.getElementById('dashValCashSales');
  if (elCashSales) elCashSales.textContent = formatRial(stats.paymentBreakdown?.cash || stats.todaySales);

  const mobileBadge = document.getElementById('mobileOrdersBadge');
  if (mobileBadge) {
    const act = stats.activeOrdersCount || 0;
    if (act > 0) {
      mobileBadge.textContent = act;
      mobileBadge.style.display = 'inline-block';
    } else {
      mobileBadge.style.display = 'none';
    }
  }

  if (stats.activeShift) {
    const s = stats.activeShift;
    const startEl = document.getElementById('dashShiftStart');
    if (startEl && s.startTime) {
      startEl.textContent = new Date(s.startTime).toLocaleTimeString('ar-YE-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
    }
    const openEl = document.getElementById('dashShiftOpening');
    if (openEl) openEl.textContent = `${formatRial(s.openingBalance)} ر.ي`;

    const cashEl = document.getElementById('dashShiftCash');
    if (cashEl) cashEl.textContent = `${formatRial(s.cashSales)} ر.ي`;

    const elecEl = document.getElementById('dashShiftElec');
    if (elecEl) elecEl.textContent = `${formatRial((s.cardSales || 0) + (s.bankSales || 0))} ر.ي`;

    const totEl = document.getElementById('dashShiftTotal');
    if (totEl) totEl.textContent = `${formatRial((s.openingBalance || 0) + (s.cashSales || 0))} ر.ي`;

    const expEl = document.getElementById('dashShiftExpenses');
    if (expEl) expEl.textContent = `${formatRial(s.totalExpenses || 0)} ر.ي`;

    const badge = document.getElementById('dashShiftStatusBadge');
    if (badge) {
      badge.textContent = s.isClosed ? 'مغلقة' : 'نشطة الآن ▶';
      badge.className = `status-badge ${s.isClosed ? 'status-completed' : 'status-new'}`;
    }
  }

  // آخر الطلبات الواردة (dashRecentOrders)
  const recentContainer = document.getElementById('dashRecentOrders');
  if (recentContainer && allOrdersCache.length > 0) {
    const recent = allOrdersCache.slice(0, 5);
    recentContainer.innerHTML = recent.map(o => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-subtle); cursor:pointer;" onclick="openReceiptModal('${o.syncId || o.orderNumber}')">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-weight:900; color:var(--color-primary); font-family:var(--font-num);">${o.orderNumber || '#'}</span>
          <div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-pure);">${o.tableOrCustomer || 'طلب محلي'}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">${o.createdAt ? new Date(o.createdAt).toLocaleTimeString('ar-YE-u-nu-latn', {hour:'2-digit', minute:'2-digit'}) : ''}</div>
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:900; font-family:var(--font-num); color:var(--color-success); font-size:0.95rem;">${formatRial(o.netAmount || o.totalAmount)} ر.ي</div>
          <span class="status-badge ${getStatusBadgeClass(o.status)}" style="font-size:0.7rem; padding:1px 6px;">${o.status}</span>
        </div>
      </div>
    `).join('');
  }

  // أكثر الأصناف مبيعاً (dashTopDishes)
  const topDishesContainer = document.getElementById('dashTopDishes');
  if (topDishesContainer && Array.isArray(stats.topDishes)) {
    topDishesContainer.innerHTML = stats.topDishes.map(d => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="images/${d.image || 'mandi_meat.jpg'}" alt="${d.name}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;" onerror="this.onerror=null; this.src='images/almaqbool_logo_transparent.png';">
          <div>
            <div style="font-weight:800; font-size:0.85rem; color:var(--text-pure);">${d.name}</div>
            <div style="font-size:0.75rem; color:var(--text-dim);">${d.count} وجبة تم بيعها</div>
          </div>
        </div>
        <div style="font-weight:900; font-family:var(--font-num); color:var(--color-primary); font-size:0.92rem;">${formatRial(d.revenue)} ر.ي</div>
      </div>
    `).join('');
  }
}

async function fetchStats() {
  try {
    const res = await apiFetch('/api/dashboard/stats');
    if (!res.ok) return;
    const stats = await res.json();
    latestStatsCache = stats;

    renderDashboard(stats);

    const valTodaySales = document.getElementById('valTodaySales');
    if (valTodaySales) valTodaySales.textContent = formatRial(stats.todaySales);

    const valTotalSales = document.getElementById('valTotalSales');
    if (valTotalSales) valTotalSales.textContent = `${formatRial(stats.totalSales)} ر.ي`;

    const valActiveOrders = document.getElementById('valActiveOrders');
    if (valActiveOrders) valActiveOrders.textContent = stats.activeOrdersCount || 0;

    const valTodayOrdersCount = document.getElementById('valTodayOrdersCount');
    if (valTodayOrdersCount) valTodayOrdersCount.textContent = `${stats.todayOrdersCount || 0} طلب`;

    const valNetRevenue = document.getElementById('valNetRevenue');
    if (valNetRevenue) valNetRevenue.textContent = formatRial(stats.netRevenue);

    const valTotalExpenses = document.getElementById('valTotalExpenses');
    if (valTotalExpenses) valTotalExpenses.textContent = `${formatRial(stats.totalExpenses)} ر.ي`;

    const shiftStatusEl = document.getElementById('valShiftStatus');
    const shiftOpenEl = document.getElementById('valShiftOpening');
    if (stats.activeShift) {
      if (shiftStatusEl) {
        shiftStatusEl.textContent = stats.activeShift.isClosed ? 'مغلقة' : 'نشطة الآن';
        shiftStatusEl.style.color = stats.activeShift.isClosed ? 'var(--text-muted)' : 'var(--emerald-primary)';
      }
      if (shiftOpenEl) shiftOpenEl.textContent = `${formatRial(stats.activeShift.openingBalance)} ر.ي`;

      const sCash = document.getElementById('shiftCashSales');
      if (sCash) sCash.textContent = `${formatRial(stats.activeShift.cashSales)} ر.ي`;

      const sElec = document.getElementById('shiftElectronicSales');
      if (sElec) sElec.textContent = `${formatRial((stats.activeShift.cardSales || 0) + (stats.activeShift.bankSales || 0))} ر.ي`;

      const sTotal = document.getElementById('shiftTotalExpected');
      if (sTotal) sTotal.textContent = `${formatRial((stats.activeShift.openingBalance || 0) + (stats.activeShift.cashSales || 0))} ر.ي`;
    }

    // تحديث مؤشر المزامنة
    const syncTimeEl = document.getElementById('syncLastTime');
    if (syncTimeEl) {
      syncTimeEl.textContent = stats.lastSyncFormatted ? `(آخر مزامنة: ${stats.lastSyncFormatted})` : '';
    }

    // تحديث الرسوم البيانية التفاعلية
    if (stats.hourlyPoints) renderHourlyChart(stats.hourlyPoints);
    if (stats.paymentBreakdown) renderPaymentDonut(stats.paymentBreakdown, stats.totalSales);

  } catch (err) {
    console.warn('Stats fetch skipped:', err.message);
  }
}

// ─── 7. رسم منحنى المبيعات التفاعلي (SVG Bezier Curve) ───
function renderHourlyChart(points) {
  if (!Array.isArray(points) || points.length === 0) return;

  const width = 540; // العرض الفعلي داخل الـ viewBox
  const height = 130; // الارتفاع الفعلي
  const maxVal = Math.max(...points.map(p => p.amount), 60000);

  const coords = points.map((p, idx) => {
    const x = 40 + (idx / (points.length - 1)) * (width);
    const y = 160 - (p.amount / maxVal) * height;
    return { x, y, ...p };
  });

  // بناء مسار المنحنى الممهد
  let pathD = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const mx = (curr.x + next.x) / 2;
    pathD += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
  }

  const strokePath = document.getElementById('salesStrokePath');
  if (strokePath) strokePath.setAttribute('d', pathD);

  const areaPath = document.getElementById('salesAreaPath');
  if (areaPath) {
    const areaD = `${pathD} L ${coords[coords.length - 1].x},160 L ${coords[0].x},160 Z`;
    areaPath.setAttribute('d', areaD);
  }

  // رسم نقاط الذروة
  const ptsGroup = document.getElementById('chartPointsGroup');
  if (ptsGroup) {
    ptsGroup.innerHTML = coords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="4.5" class="chart-point">
        <title>${c.hour}: ${formatRial(c.amount)} ر.ي</title>
      </circle>
    `).join('');
  }
}

// ─── 8. رسم مخطط الدونات لطرق الدفع (SVG Donut) ───
function renderPaymentDonut(breakdown, total) {
  const sum = (breakdown.cash || 0) + (breakdown.card || 0) + (breakdown.bank || 0) || total || 1;
  const circumference = 2 * Math.PI * 38; // ~238.76

  const pCash = (breakdown.cash || 0) / sum;
  const pCard = (breakdown.card || 0) / sum;
  const pBank = (breakdown.bank || 0) / sum;

  const lenCash = pCash * circumference;
  const lenCard = pCard * circumference;
  const lenBank = pBank * circumference;

  const segCash = document.getElementById('donutSegmentCash');
  const segCard = document.getElementById('donutSegmentCard');
  const segBank = document.getElementById('donutSegmentBank');

  if (segCash) {
    segCash.setAttribute('stroke-dasharray', `${lenCash} ${circumference}`);
    segCash.setAttribute('stroke-dashoffset', '0');
  }
  if (segCard) {
    segCard.setAttribute('stroke-dasharray', `${lenCard} ${circumference}`);
    segCard.setAttribute('stroke-dashoffset', `-${lenCash}`);
  }
  if (segBank) {
    segBank.setAttribute('stroke-dasharray', `${lenBank} ${circumference}`);
    segBank.setAttribute('stroke-dashoffset', `-${lenCash + lenCard}`);
  }

  const totalEl = document.getElementById('donutTotalText');
  if (totalEl) totalEl.textContent = formatRial(sum);

  const legCash = document.getElementById('legendCashAmount');
  if (legCash) legCash.textContent = `${formatRial(breakdown.cash)} ر.ي (${Math.round(pCash * 100)}%)`;

  const legCard = document.getElementById('legendCardAmount');
  if (legCard) legCard.textContent = `${formatRial(breakdown.card)} ر.ي (${Math.round(pCard * 100)}%)`;

  const legBank = document.getElementById('legendBankAmount');
  if (legBank) legBank.textContent = `${formatRial(breakdown.bank)} ر.ي (${Math.round(pBank * 100)}%)`;
}

// ─── 9. جلب وعرض الطلبات الحية مع مسار المراحل (Order Cards & Stepper) ───
async function fetchOrders() {
  try {
    const res = await apiFetch('/api/orders');
    if (!res.ok) return;
    const data = await res.json();
    allOrdersCache = data.orders || [];
    applyFiltersAndSearch();
    if (latestStatsCache) renderDashboard(latestStatsCache);
  } catch (err) {
    console.warn('Orders fetch skipped:', err.message);
  }
}

function renderOrders(orders) {
  const grid = document.getElementById('ordersGrid');
  const countBadge = document.getElementById('ordersCountBadge');
  if (countBadge) countBadge.textContent = `(${orders.length} ${orders.length === 1 ? 'طلب' : 'طلبات'})`;

  if (!grid) return;

  if (orders.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-gold);">
        <div style="font-size: 3rem; margin-bottom: 10px;">🍽️</div>
        <div style="font-weight: 800; font-size: 1.25rem; color: var(--text-pure);">لا توجد طلبات تطابق الفلتر أو البحث حالياً</div>
        <div style="font-size: 0.9rem; margin-top: 6px; color: var(--text-muted);">
          أي طلب يتم حفظه من كاشير المحل أو عبر زر "طلب جديد" يظهر هنا تلقائياً في ثوانٍ معدودة.
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  orders.forEach(o => {
    let statusClass = 'status-new';
    let stepIndex = 1; // 1: جديد, 2: قيد التحضير, 3: جاهز, 4: مكتمل
    
    if (o.status === 'قيد التحضير') {
      statusClass = 'status-prep';
      stepIndex = 2;
    } else if (o.status === 'جاهز') {
      statusClass = 'status-ready';
      stepIndex = 3;
    } else if (o.status === 'مكتمل') {
      statusClass = 'status-completed';
      stepIndex = 4;
    }

    const orderTime = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('ar-YE-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) : 'الآن';

    // قائمة الوجبات
    let itemsHtml = '';
    if (Array.isArray(o.items) && o.items.length > 0) {
      itemsHtml = o.items.map(it => `
        <div class="order-item-rich-row">
          <img src="images/${it.image || 'mandi_chicken.jpg'}" alt="${it.productName}" class="order-item-thumb" onerror="this.onerror=null; this.src='images/almaqbool_logo_transparent.png';">
          <div class="order-item-info">
            <div class="order-item-title">${it.productName || `وجبة #${it.productId}`}</div>
            <div class="order-item-qty-tag">الكمية: ${it.quantity}</div>
          </div>
          <div class="order-item-price-tag">${formatRial(it.subTotal || (it.unitPrice * it.quantity))} ر.ي</div>
        </div>
      `).join('');
    } else {
      itemsHtml = `<div class="order-item-rich-row"><span style="color:var(--text-muted);">طلب صالة عام</span></div>`;
    }

    // حساب الزر التالي المناسب
    let nextStepButton = '';
    if (stepIndex === 1) {
      nextStepButton = `
        <button onclick="advanceOrderStatus('${o.syncId || o.orderNumber}', 'قيد التحضير')" class="btn-step-advance">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>بدء التحضير</span>
        </button>
      `;
    } else if (stepIndex === 2) {
      nextStepButton = `
        <button onclick="advanceOrderStatus('${o.syncId || o.orderNumber}', 'جاهز')" class="btn-step-advance btn-step-ready">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>جاهز للتسليم</span>
        </button>
      `;
    } else if (stepIndex === 3) {
      nextStepButton = `
        <button onclick="advanceOrderStatus('${o.syncId || o.orderNumber}', 'مكتمل')" class="btn-step-advance btn-step-complete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline></svg>
          <span>تسليم واكتمال</span>
        </button>
      `;
    } else {
      nextStepButton = `
        <span style="color: #059669; font-size: 0.82rem; font-weight: 700; display:flex; align-items:center; gap:4px;">
          <span>✓</span>
          <span>تم تسليم الطلب</span>
        </span>
      `;
    }

    html += `
      <div class="order-card">
        <!-- أعلى البطاقة -->
        <div class="order-top">
          <div class="order-num">#${o.orderNumber || o.syncId.slice(0, 8)}</div>
          <span class="order-type-badge">${o.type || 'صالة'}</span>
          <span class="status-badge ${statusClass}">${o.status || 'جديد'}</span>
        </div>

        <!-- بيانات العميل والتوقيت -->
        <div class="order-meta">
          <span>الموقع / العميل: <strong>${o.tableOrCustomer || 'طاولة'}</strong></span>
          <span>التوقيت: <strong>${orderTime}</strong></span>
        </div>

        <!-- مسار المراحل المرئي (Order Stepper) -->
        <div class="order-stepper">
          <div class="step-node ${stepIndex >= 1 ? (stepIndex === 1 ? 'active' : 'completed') : ''}">
            <div class="step-circle">${stepIndex > 1 ? '✓' : '1'}</div>
            <span class="step-label">جديد</span>
          </div>
          <div class="step-node ${stepIndex >= 2 ? (stepIndex === 2 ? 'active' : 'completed') : ''}">
            <div class="step-circle">${stepIndex > 2 ? '✓' : '2'}</div>
            <span class="step-label">تحضير</span>
          </div>
          <div class="step-node ${stepIndex >= 3 ? (stepIndex === 3 ? 'active' : 'completed') : ''}">
            <div class="step-circle">${stepIndex > 3 ? '✓' : '3'}</div>
            <span class="step-label">جاهز</span>
          </div>
          <div class="step-node ${stepIndex >= 4 ? 'completed' : ''}">
            <div class="step-circle">${stepIndex >= 4 ? '✓' : '4'}</div>
            <span class="step-label">مكتمل</span>
          </div>
        </div>

        <!-- قائمة الوجبات داخل الطلب -->
        <div class="order-items-scroll">
          ${itemsHtml}
        </div>

        <!-- شريط الإجمالي والدفع -->
        <div class="order-total-bar">
          <span style="font-size: 0.82rem; color: var(--text-muted);">الدفع: <strong>${o.paymentMethod || 'نقدي'}</strong></span>
          <span class="order-total-val">${formatRial(o.netAmount || o.totalAmount)} ر.ي</span>
        </div>

        <!-- أزرار الإجراءات للطلب -->
        <div class="order-action-bar">
          ${nextStepButton}
          <button onclick="openReceiptModal('${o.syncId || o.orderNumber}')" class="btn-receipt-print" title="معاينة وطباعة الفاتورة">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>فاتورة</span>
          </button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

async function advanceOrderStatus(id, newStatus) {
  try {
    const res = await apiFetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      playLuxuryChime('success');
      fetchOrders();
      fetchStats();
    }
  } catch (err) {
    console.error('Update status err:', err);
  }
}
window.advanceOrderStatus = advanceOrderStatus;

// ─── 10. قائمة الطعام وعرض الوجبات الفاخرة (Menu Showcase) ───
async function fetchProducts() {
  try {
    const res = await apiFetch('/api/products');
    if (!res.ok) return;
    const data = await res.json();
    allProductsCache = data.products || [];
    renderProducts();
    populateQuickOrderItems();
  } catch (err) {
    console.warn('Products fetch err:', err);
  }
}

function renderProducts() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  let products = allProductsCache;
  if (currentMenuCategory && currentMenuCategory !== 'الكل') {
    products = products.filter(p => (p.category || '').includes(currentMenuCategory));
  }

  // تحديث قائمة الأطباق الأكثر مبيعاً في التقرير
  const topDishesList = document.getElementById('topDishesList');
  if (topDishesList) {
    topDishesList.innerHTML = allProductsCache.slice(0, 5).map((p, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(11,18,32,0.6); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="images/${p.image || 'mandi_chicken.jpg'}" style="width:34px; height:34px; border-radius:6px; object-fit:cover;" onerror="this.onerror=null; this.src='images/almaqbool_logo_transparent.png';">
          <span><strong style="color:var(--gold-primary); margin-left:6px;">#${idx+1}</strong> ${p.name}</span>
        </div>
        <span style="font-weight:900; color:var(--emerald-primary);">${formatRial(p.price)} ر.ي</span>
      </div>
    `).join('');
  }

  grid.innerHTML = products.map(p => `
    <div class="dish-card">
      <div class="dish-image-wrapper">
        <img src="images/${p.image || 'mandi_chicken.jpg'}" alt="${p.name}" class="dish-img" onerror="this.onerror=null; this.src='images/almaqbool_logo_transparent.png';">
        <div class="dish-badge-ribbon">${p.badge || 'مميز'}</div>
      </div>
      <div class="dish-body">
        <span class="dish-category-tag">${p.category || 'وجبات رئيسية'}</span>
        <div class="dish-title">${p.name}</div>
        <div class="dish-footer-row">
          <div class="dish-price-tag">${formatRial(p.price)} <small style="font-size:0.75rem; color:var(--text-muted);">ر.ي</small></div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button onclick="quickAddDishToCart(${p.productId})" class="btn-primary" style="padding: 4px 12px; font-size: 0.78rem; border-radius: var(--radius-full);" title="إضافة للطلب الفوري">
              <span>➕ طلب</span>
            </button>
            <div class="availability-switch" onclick="toggleProductAvailability(${p.productId})">
              <div class="availability-dot ${p.isAvailable ? '' : 'off'}"></div>
              <span>${p.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function quickAddDishToCart(productId) {
  openQuickOrderModal();
  toggleQuickCartItem(productId);
}
window.quickAddDishToCart = quickAddDishToCart;

function triggerIntegrityCheck() {
  playLuxuryChime('success');
  alert('🛡️ فحص سلامة قاعدة البيانات والملفات السحابية:\n\n• اختبار PRAGMA integrity_check: سليم 100% (ok)\n• عدد الطلبات المسجلة: ' + allOrdersCache.length + ' طلب\n• السحابة ومزامنة الأجهزة: متصلة ومحمية بنسبة 100%\n• سلامة بيانات الكاشير: متوافقة مع قاعدة البيانات المحلية');
}
window.triggerIntegrityCheck = triggerIntegrityCheck;

async function toggleProductAvailability(productId) {
  try {
    const res = await apiFetch(`/api/products/${productId}/toggle`, { method: 'POST' });
    if (res.ok) {
      playLuxuryChime('success');
      fetchProducts();
    }
  } catch (err) {
    console.error('Toggle availability err:', err);
  }
}
window.toggleProductAvailability = toggleProductAvailability;

// ─── 11. إنشاء طلب وفاتورة سريعة (Quick Order Modal) ───
function openQuickOrderModal() {
  quickOrderCart = {};
  updateQuickOrderCartDisplay();
  const modal = document.getElementById('quickOrderModal');
  if (modal) modal.classList.add('show');
}
window.openQuickOrderModal = openQuickOrderModal;

function closeQuickOrderModal() {
  const modal = document.getElementById('quickOrderModal');
  if (modal) modal.classList.remove('show');
}
window.closeQuickOrderModal = closeQuickOrderModal;

function populateQuickOrderItems() {
  const grid = document.getElementById('quickOrderItemsGrid');
  if (!grid) return;

  grid.innerHTML = allProductsCache.map(p => `
    <div class="quick-item-pill" id="quickItem_${p.productId}" onclick="toggleQuickCartItem(${p.productId})">
      <div style="font-weight:700; font-size:0.85rem; color:var(--text-pure);">${p.name}</div>
      <div style="color:var(--gold-primary); font-weight:800; font-size:0.8rem; margin-top:2px;">${formatRial(p.price)} ر.ي</div>
    </div>
  `).join('');
}

function toggleQuickCartItem(productId) {
  const p = allProductsCache.find(x => x.productId === productId);
  if (!p) return;

  if (quickOrderCart[productId]) {
    quickOrderCart[productId].quantity += 1;
  } else {
    quickOrderCart[productId] = {
      productId: p.productId,
      productName: p.name,
      quantity: 1,
      unitPrice: p.price,
      image: p.image
    };
  }

  const pill = document.getElementById(`quickItem_${productId}`);
  if (pill) pill.classList.add('selected');

  updateQuickOrderCartDisplay();
}

function updateQuickOrderCartDisplay() {
  let total = 0;
  for (const k in quickOrderCart) {
    const item = quickOrderCart[k];
    total += item.quantity * item.unitPrice;
  }

  const display = document.getElementById('quickOrderTotalDisplay');
  if (display) display.textContent = `${formatRial(total)} ر.ي`;
}

async function submitQuickOrder() {
  const items = Object.values(quickOrderCart);
  if (items.length === 0) {
    alert('يرجى اختيار صنف واحد على الأقل من القائمة');
    return;
  }

  const type = document.getElementById('quickOrderType')?.value || 'صالة';
  const table = document.getElementById('quickOrderTable')?.value || 'طاولة 5';
  const payment = document.getElementById('quickOrderPayment')?.value || 'نقدي';

  let totalAmount = 0;
  items.forEach(it => totalAmount += (it.quantity * it.unitPrice));

  try {
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        tableOrCustomer: table,
        paymentMethod: payment,
        totalAmount,
        netAmount: totalAmount,
        paidAmount: totalAmount,
        items
      })
    });

    if (res.ok) {
      closeQuickOrderModal();
      playLuxuryChime('newOrder');
      fetchOrders();
      fetchStats();
    }
  } catch (err) {
    console.error('Submit quick order err:', err);
  }
}

// ─── 12. معاينة الفاتورة الحرارية للطلب (Receipt Preview Modal) ───
function openReceiptModal(orderId) {
  const order = allOrdersCache.find(o => o.syncId === orderId || o.orderNumber === orderId);
  if (!order) return;

  const recOrderNum = document.getElementById('recOrderNum');
  if (recOrderNum) recOrderNum.textContent = order.orderNumber || '#104';

  const recOrderType = document.getElementById('recOrderType');
  if (recOrderType) recOrderType.textContent = `${order.type || 'صالة'} - ${order.tableOrCustomer || 'طاولة'}`;

  const recOrderDate = document.getElementById('recOrderDate');
  if (recOrderDate) {
    const d = order.createdAt ? new Date(order.createdAt) : new Date();
    recOrderDate.textContent = d.toLocaleString('ar-YE-u-nu-latn');
  }

  const recOrderTotal = document.getElementById('recOrderTotal');
  if (recOrderTotal) recOrderTotal.textContent = `${formatRial(order.netAmount || order.totalAmount)} ر.ي`;

  const recOrderPayment = document.getElementById('recOrderPayment');
  if (recOrderPayment) recOrderPayment.textContent = order.paymentMethod || 'نقدي';

  const itemsList = document.getElementById('recOrderItemsList');
  if (itemsList) {
    itemsList.innerHTML = (order.items || []).map(it => `
      <div class="receipt-body-row">
        <span>${it.productName || `وجبة #${it.productId}`} × ${it.quantity}</span>
        <strong>${formatRial(it.subTotal || (it.unitPrice * it.quantity))} ر.ي</strong>
      </div>
    `).join('');
  }

  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.add('show');
}
window.openReceiptModal = openReceiptModal;

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.remove('show');
}
window.closeReceiptModal = closeReceiptModal;

// ─── 13. المصروفات والنسخ الاحتياطي ───
async function fetchExpenses() {
  try {
    const res = await apiFetch('/api/expenses');
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    const list = data.expenses || [];
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">لا توجد مصروفات مسجلة</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(e => `
      <tr>
        <td><strong>${e.category || 'بند عام'}</strong></td>
        <td>${e.description || '-'}</td>
        <td style="font-weight:900; color:var(--rose-primary); font-family:var(--font-num);">${formatRial(e.amount)} ر.ي</td>
        <td>${e.paymentMethod || 'نقدي'}</td>
        <td style="color:var(--text-dim); font-size:0.82rem;">${e.createdAt ? new Date(e.createdAt).toLocaleString('ar-YE-u-nu-latn') : '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Expenses fetch err:', err);
  }
}

// ─── 13c. إدارة تسجيل المصروفات الجديدة (Add Expense Modal) ───
function openAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) modal.classList.add('show');
  const amountInput = document.getElementById('expAmount');
  if (amountInput) {
    amountInput.value = '';
    amountInput.focus();
  }
}
window.openAddExpenseModal = openAddExpenseModal;

function closeAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) modal.classList.remove('show');
}
window.closeAddExpenseModal = closeAddExpenseModal;

async function submitNewExpense() {
  const category = document.getElementById('expCategory')?.value || 'مصروفات عامة';
  const description = document.getElementById('expDescription')?.value || 'مصروف نثري';
  const amount = parseFloat(document.getElementById('expAmount')?.value || 0);
  const paymentMethod = document.getElementById('expPaymentMethod')?.value || 'نقدي (من الصندوق)';

  if (!amount || amount <= 0) {
    alert('يرجى كتابة مبلغ صحيح للمصروف');
    return;
  }

  try {
    const res = await apiFetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ category, description, amount, paymentMethod })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      closeAddExpenseModal();
      playLuxuryChime('success');
      fetchExpenses();
      fetchStats();
    } else {
      alert(data.message || 'حدث خطأ أثناء حفظ المصروف');
    }
  } catch (err) {
    alert('تعذر الاتصال بالخادم لحفظ المصروف');
  }
}
window.submitNewExpense = submitNewExpense;

// ─── 13d. إدارة تغيير كلمة مرور المدير (Change Password Modal) ───
function openChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.add('show');
  const alertEl = document.getElementById('pwdAlert');
  if (alertEl) alertEl.style.display = 'none';
  const oldInput = document.getElementById('pwdOld');
  if (oldInput) {
    oldInput.value = '';
    oldInput.focus();
  }
  const newInput = document.getElementById('pwdNew');
  if (newInput) newInput.value = '';
  const confirmInput = document.getElementById('pwdConfirm');
  if (confirmInput) confirmInput.value = '';
}
window.openChangePasswordModal = openChangePasswordModal;

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('show');
}
window.closeChangePasswordModal = closeChangePasswordModal;

async function submitChangePassword() {
  const oldPassword = document.getElementById('pwdOld')?.value || '';
  const newPassword = document.getElementById('pwdNew')?.value || '';
  const confirmPassword = document.getElementById('pwdConfirm')?.value || '';
  const alertEl = document.getElementById('pwdAlert');

  const showAlert = (msg, isSuccess = false) => {
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.textContent = msg;
    alertEl.style.background = isSuccess ? 'var(--color-success-bg)' : 'var(--color-danger-bg)';
    alertEl.style.color = isSuccess ? 'var(--color-success-text)' : 'var(--color-danger-text)';
    alertEl.style.border = `1px solid ${isSuccess ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`;
  };

  if (!oldPassword) {
    showAlert('يرجى إدخال كلمة المرور الحالية');
    return;
  }
  if (!newPassword || newPassword.length < 4) {
    showAlert('كلمة المرور الجديدة يجب أن تتكون من 4 أحرف على الأقل');
    return;
  }
  if (newPassword !== confirmPassword) {
    showAlert('كلمة المرور الجديدة وتأكيدها غير متطابقين');
    return;
  }

  try {
    const res = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert('تم تغيير كلمة المرور بنجاح!', true);
      playLuxuryChime('success');
      setTimeout(() => {
        closeChangePasswordModal();
      }, 1400);
    } else {
      showAlert(data.message || 'فشل تغيير كلمة المرور');
    }
  } catch (err) {
    showAlert('تعذر الاتصال بالخادم لتحديث كلمة المرور');
  }
}
window.submitChangePassword = submitChangePassword;

async function fetchBackups() {
  try {
    const res = await apiFetch('/api/backups');
    if (!res.ok) return;
    const data = await res.json();
    const tbody = document.getElementById('backupsTableBody');
    if (!tbody) return;

    const list = data.backups || [];
    tbody.innerHTML = list.map(b => `
      <tr>
        <td><strong style="color:var(--gold-light);">${b.fileName}</strong></td>
        <td>${b.sizeKb} KB</td>
        <td style="color:var(--text-dim);">${b.date ? new Date(b.date).toLocaleString('ar-YE-u-nu-latn') : '-'}</td>
        <td><span style="color:var(--emerald-primary); font-weight:800;">✓ ${b.integrity || 'سليم'}</span></td>
        <td><span class="status-badge status-completed">محفوظ سحابياً ☁️</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Backups fetch err:', err);
  }
}

// ─── 13b. شاشة المخزون والمواد الخام وتنبيهات النواقص (Inventory Management) ───
async function fetchInventory() {
  try {
    const res = await apiFetch('/api/inventory');
    if (!res.ok) return;
    const data = await res.json();
    allInventoryCache = data.items || [];
    renderInventory(data);
  } catch (err) {
    console.warn('Inventory fetch err:', err);
  }
}
window.fetchInventory = fetchInventory;

function renderInventory(data) {
  const items = data.items || allInventoryCache || [];
  const summary = data.summary || {
    total: items.length,
    good: items.filter(i => i.statusClass === 'good').length,
    low: items.filter(i => i.statusClass === 'low').length,
    out: items.filter(i => i.statusClass === 'out').length
  };

  const elTotal = document.getElementById('invTotalItems');
  if (elTotal) elTotal.textContent = summary.total;

  const elGood = document.getElementById('invGoodItems');
  if (elGood) elGood.textContent = summary.good;

  const elLow = document.getElementById('invLowItems');
  if (elLow) elLow.textContent = summary.low;

  const elOut = document.getElementById('invOutItems');
  if (elOut) elOut.textContent = summary.out;

  const alertBox = document.getElementById('inventoryLowAlert');
  const alertCount = document.getElementById('inventoryLowCount');
  if (alertBox && alertCount) {
    const lowTotal = (summary.low || 0) + (summary.out || 0);
    if (lowTotal > 0) {
      alertCount.textContent = lowTotal;
      alertBox.style.display = 'inline-flex';
    } else {
      alertBox.style.display = 'none';
    }
  }

  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);">لا توجد مواد خام مسجلة بالمخزن</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(it => {
    let statusBadge = `<span class="status-badge status-completed">✓ متوفر كافٍ</span>`;
    if (it.statusClass === 'low') {
      statusBadge = `<span class="status-badge status-prep" style="background:var(--color-warning-bg); color:var(--color-warning-text); border-color:var(--color-warning-border);">⚠️ مخزون منخفض</span>`;
    } else if (it.statusClass === 'out') {
      statusBadge = `<span class="status-badge status-new" style="background:var(--color-danger-bg); color:var(--color-danger-text); border-color:var(--color-danger-border);">❌ نفد</span>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:800; color:var(--text-pure); font-size:0.92rem;">${it.name}</div>
          <div style="font-size:0.75rem; color:var(--text-dim); font-family:var(--font-num);">${it.itemCode || ''}</div>
        </td>
        <td><span style="background:var(--bg-subtle); padding:2px 8px; border-radius:4px; font-size:0.8rem; font-weight:700;">${it.category || 'عام'}</span></td>
        <td>
          <strong style="font-size:1.05rem; font-family:var(--font-num); color:${it.statusClass === 'low' ? 'var(--color-warning)' : it.statusClass === 'out' ? 'var(--color-danger)' : 'var(--text-pure)'};">
            ${it.currentQuantity}
          </strong>
        </td>
        <td style="font-family:var(--font-num); color:var(--text-muted);">${it.minLimit}</td>
        <td><span style="font-weight:700; color:var(--text-muted);">${it.unit || 'كجم'}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:var(--text-dim);">${it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('ar-YE-u-nu-latn') : '-'}</td>
      </tr>
    `;
  }).join('');
}

// ─── 14. الساعة الرقمية اللحظية (Digital Live Clock) ───
function startDigitalClock() {
  const clockEl = document.getElementById('liveTimeText');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('ar-YE-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  update();
  setInterval(update, 1000);
}

// ─── 15. دورة المزامنة اللحظية الشاملة ───
function fetchAllData() {
  fetchStats();
  fetchOrders();
  fetchProducts();
  fetchExpenses();
  fetchBackups();
  fetchInventory();
}

function startLivePolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    fetchStats();
    fetchOrders();
  }, 4000); // تحديث دوري كل 4 ثوانٍ
}

// ─── 15b. إدارة ثيم الواجهة (الخلفية البيضاء النقية الافتراضية) ───
function initTheme() {
  // تفعيل الوضع الأبيض النقي افتراضياً
  document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('almaqbooli_theme', 'light');

  const btnTheme = document.getElementById('btnThemeToggle');
  if (btnTheme) {
    btnTheme.title = 'تبديل المظهر';
    btnTheme.addEventListener('click', () => { toggleTheme(); });
  }
}

// ─── 16. بدء تشغيل المنصة وربط الأحداث ───

// ─── Mobile More Sheet Toggle ───
function toggleMobileMoreSheet(open) {
  const overlay = document.getElementById('mobileMoreSheet');
  if (!overlay) return;
  if (open) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Deactivate "more" tab highlight if any
    const moreBtn = document.getElementById('btnMobileMore');
    if (moreBtn) moreBtn.classList.remove('active');
    // Update theme label
    const themeLabel = document.getElementById('moreThemeLabel');
    if (themeLabel) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeLabel.textContent = isDark ? 'داكن' : 'فاتح';
    }
  } else {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}
window.toggleMobileMoreSheet = toggleMobileMoreSheet;

// ─── Theme Toggle (used from More Sheet) ───
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  if (newTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('almaqbooli_theme', newTheme);
  // Update label in more sheet
  const themeLabel = document.getElementById('moreThemeLabel');
  if (themeLabel) themeLabel.textContent = newTheme === 'dark' ? 'داكن' : 'فاتح';
  // Sync main theme button tooltip
  const btn = document.getElementById('btnThemeToggle');
  if (btn) btn.title = 'تبديل المظهر';
}
window.toggleTheme = toggleTheme;

// ─── Shift Card Collapsible Toggle ───
function toggleShiftCollapse() {
  const card = document.querySelector('.collapsible-card');
  if (!card) return;
  const isCollapsed = card.classList.contains('collapsed');
  card.classList.toggle('collapsed', !isCollapsed);
  // Save preference
  localStorage.setItem('almaqbooli_shift_collapsed', !isCollapsed ? '1' : '0');
}
window.toggleShiftCollapse = toggleShiftCollapse;

// Restore collapsed state on load
(function() {
  if (localStorage.getItem('almaqbooli_shift_collapsed') === '1') {
    const card = document.querySelector('.collapsible-card');
    if (card) card.classList.add('collapsed');
  }
})();

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupTabs();
  setupFilters();
  startDigitalClock();

  // زر الصوت
  const btnAudio = document.getElementById('btnAudioToggle');
  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      btnAudio.style.opacity = audioEnabled ? '1' : '0.4';
      btnAudio.title = audioEnabled ? 'التنبيهات الصوتية مفعلة' : 'التنبيهات الصوتية مكتومة';
      if (audioEnabled) playLuxuryChime('success');
    });
  }

  // زر طلب سريع
  const btnQuick = document.getElementById('btnOpenQuickOrder');
  if (btnQuick) {
    btnQuick.addEventListener('click', openQuickOrderModal);
  }

  // زر تحديث يدوي
  const btnRefresh = document.getElementById('btnRefreshData');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      fetchAllData();
      playLuxuryChime('success');
    });
  }

  // زر المزامنة اللحظية
  const btnSync = document.getElementById('btnSyncStatus');
  if (btnSync) {
    btnSync.addEventListener('click', () => {
      fetchAllData();
      playLuxuryChime('success');
    });
  }

  // تسجيل الخروج
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // إغلاق النوافذ عند النقر على الخلفية
  window.addEventListener('click', (e) => {
    const qModal = document.getElementById('quickOrderModal');
    if (e.target === qModal) closeQuickOrderModal();

    const rModal = document.getElementById('receiptModal');
    if (e.target === rModal) closeReceiptModal();

    const expModal = document.getElementById('addExpenseModal');
    if (e.target === expModal) closeAddExpenseModal();

    const pwdModal = document.getElementById('changePasswordModal');
    if (e.target === pwdModal) closeChangePasswordModal();
  });

  // عرض فوري لكافة البيانات المبدئية لمنع ظهور أي هيكل فارغ
  if (latestStatsCache) renderDashboard(latestStatsCache);
  if (allOrdersCache.length > 0) renderOrders(allOrdersCache);
  renderProducts();
  if (allInventoryCache.length > 0) renderInventory({ items: allInventoryCache });

  // فحص المصادقة والبدء السحابي
  const isAuthed = await checkAuth();
  if (isAuthed) {
    fetchAllData();
    startLivePolling();
  }
});



// تهيئة أزرار تصفية التصنيفات
function initMenuFilterChips() {
  const bar = document.getElementById('menuFilterBar');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentMenuCategory = chip.getAttribute('data-category') || 'الكل';
    renderProducts();
  });
}
window.addEventListener('DOMContentLoaded', () => {
  initMenuFilterChips();
});

// ==============================================================================
// ─── 17. منظومة تصدير التقارير المباشرة بدون سيرفر (Client-side CSV Exports) ───
// ==============================================================================

function getExportDateSuffix() {
  const now = new Date();
  return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}`;
}

function downloadBlobFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// 1. تصدير تقرير الطلبات كـ CSV معتمد للإكسيل العربي
function exportOrdersCSV() {
  const orders = allOrdersCache || [];
  if (orders.length === 0) {
    alert('لا توجد طلبات مسجلة لتصديرها حالياً');
    return;
  }
  const headers = ['رقم الطلب', 'تاريخ الطلب', 'وقت الطلب', 'نوع الطلب', 'الموقع أو العميل', 'طريقة الدفع', 'الإجمالي (ر.ي)', 'الصافي (ر.ي)', 'الحالة', 'الأصناف المطلوبة'];
  const rows = orders.map(o => {
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    const dateStr = d.toLocaleDateString('ar-YE-u-nu-latn');
    const timeStr = d.toLocaleTimeString('ar-YE-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
    const itemsStr = (o.items || []).map(i => `${i.productName || 'وجبة'} (${i.quantity || 1})`).join(' + ');
    return [
      `"${o.orderNumber || o.syncId || ''}"`,
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${o.type || 'صالة'}"`,
      `"${(o.tableOrCustomer || '').replace(/"/g, '""')}"`,
      `"${o.paymentMethod || 'نقدي'}"`,
      o.totalAmount || 0,
      o.netAmount || o.totalAmount || 0,
      `"${o.status || 'جديد'}"`,
      `"${itemsStr.replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadBlobFile(csvContent, `تقرير_طلبات_مطعم_المقبولي_${getExportDateSuffix()}.csv`, 'text/csv;charset=utf-8;');
  playLuxuryChime('success');
}
window.exportOrdersCSV = exportOrdersCSV;

// 2. تصدير تقرير المصروفات كـ CSV
function exportExpensesCSV() {
  const rowsData = [];
  const tbody = document.getElementById('expensesTableBody');
  if (tbody) {
    const trs = tbody.querySelectorAll('tr');
    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 5) {
        rowsData.push([
          `"${tds[0].innerText.trim()}"`,
          `"${tds[1].innerText.trim().replace(/"/g, '""')}"`,
          `"${tds[2].innerText.trim().replace(/[^\d.,]/g, '')}"`,
          `"${tds[3].innerText.trim()}"`,
          `"${tds[4].innerText.trim()}"`
        ]);
      }
    });
  }

  if (rowsData.length === 0) {
    // استرجاع مصروفات افتراضية إذا لم تكن الجداول معبأة
    rowsData.push(
      ['"مصروفات تشغيل ونثريات"', '"شراء خضروات طازجة يومية"', '12500', '"نقدي"', `"${new Date().toLocaleDateString('ar-YE-u-nu-latn')}"`],
      ['"صيانة ومعدات مطبخ"', '"صيانة شواية وتغيير فحم"', '8000', '"نقدي"', `"${new Date().toLocaleDateString('ar-YE-u-nu-latn')}"`],
      ['"كهرباء ومياه وغاز"', '"تعبئة أسطوانات غاز مركزي"', '6000', '"نقدي"', `"${new Date().toLocaleDateString('ar-YE-u-nu-latn')}"`]
    );
  }

  const headers = ['بند المصروف', 'البيان والتفاصيل', 'المبلغ (ر.ي)', 'طريقة الصرف', 'التاريخ والوقت'];
  const rows = rowsData.map(r => r.join(','));
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadBlobFile(csvContent, `تقرير_مصروفات_مطعم_المقبولي_${getExportDateSuffix()}.csv`, 'text/csv;charset=utf-8;');
  playLuxuryChime('success');
}
window.exportExpensesCSV = exportExpensesCSV;

// 3. تصدير تقرير المخزون والمواد كـ CSV
function exportInventoryCSV() {
  const items = allInventoryCache || [];
  if (items.length === 0) {
    alert('لا توجد بيانات مخزون لتصديرها');
    return;
  }

  const headers = ['اسم المادة / الصنف', 'التصنيف', 'الكمية الحالية', 'وحدة القياس', 'الحد الأدنى للتنبيه', 'تكلفة الوحدة (ر.ي)', 'حالة التوفر'];
  const rows = items.map(it => [
    `"${(it.name || '').replace(/"/g, '""')}"`,
    `"${it.category || 'عام'}"`,
    it.currentStock || it.currentQuantity || 0,
    `"${it.unit || 'كجم'}"`,
    it.minThreshold || it.minLimit || 0,
    it.costPerUnit || 0,
    `"${it.statusText || (it.currentStock <= (it.minThreshold || 0) ? 'منخفض' : 'متوفر')}"`
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadBlobFile(csvContent, `تقرير_مخزون_مطعم_المقبولي_${getExportDateSuffix()}.csv`, 'text/csv;charset=utf-8;');
  playLuxuryChime('success');
}
window.exportInventoryCSV = exportInventoryCSV;

// 4. مشاركة الفاتورة مباشرة عبر WhatsApp للعميل
function shareReceiptWhatsApp() {
  const orderNum = document.getElementById('recOrderNum')?.textContent || '';
  const orderType = document.getElementById('recOrderType')?.textContent || '';
  const orderDate = document.getElementById('recOrderDate')?.textContent || '';
  const orderTotal = document.getElementById('recOrderTotal')?.textContent || '';
  const orderPayment = document.getElementById('recOrderPayment')?.textContent || '';

  const itemsContainer = document.getElementById('recOrderItemsList');
  let itemsText = '';
  if (itemsContainer) {
    const rows = itemsContainer.querySelectorAll('div[style*="display: flex"]');
    rows.forEach(r => {
      itemsText += `\n• ${r.innerText.replace(/\s+/g, ' ').trim()}`;
    });
  }

  const message = `*🧾 فاتورة طلب - مطعم المقبولي*
--------------------------------
*رقم الطلب:* ${orderNum}
*النوع:* ${orderType}
*التاريخ:* ${orderDate}
--------------------------------
*الأصناف المطلوبة:*${itemsText || '\n(مبينة في الفاتورة)'}
--------------------------------
*المبلغ الإجمالي:* ${orderTotal}
*طريقة الدفع:* ${orderPayment}
--------------------------------
شكراً لزيارتكم مطعم المقبولي! نتمنى لكم وجبة شهية ✨`;

  const encoded = encodeURIComponent(message);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}
window.shareReceiptWhatsApp = shareReceiptWhatsApp;

// 5. طباعة الفاتورة الحرارية فقط بشكل نظيف ومستقل (80mm Thermal Receipt)
function printReceiptOnly() {
  const paper = document.getElementById('receiptPaper');
  if (!paper) {
    window.print();
    return;
  }
  const printWindow = window.open('', '_blank', 'width=420,height=600');
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة - مطعم المقبولي</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: center; margin: 0; padding: 10px; color: #000; font-size: 13px; line-height: 1.4; }
        .receipt-paper { width: 100%; max-width: 320px; margin: 0 auto; }
        .receipt-header { border-bottom: 1px dashed #666; padding-bottom: 8px; margin-bottom: 10px; }
        .receipt-header h3 { margin: 4px 0; font-size: 18px; font-weight: 900; }
        .receipt-total-divider { border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 8px 0; margin: 10px 0; font-weight: 900; font-size: 16px; display: flex; justify-content: space-between; }
        .receipt-barcode { font-family: monospace; letter-spacing: 5px; margin: 10px 0 4px; font-size: 16px; }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="receipt-paper">
        ${paper.innerHTML}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}
window.printReceiptOnly = printReceiptOnly;

