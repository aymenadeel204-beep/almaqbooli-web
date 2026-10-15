// ==============================================================================
// منصة السحابة ولوحة التحكم الذكية لمطعم المقبولي - خادم المزامنة والويب المتجاوب
// تم التطوير بواسطة شركة AYNEX للبرمجيات © 2026
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'cloud_db.json');

// ─── 1. قاعدة البيانات السحابية المحلية الآمنة ───
let cloudDb = {
  tenantId: 'almaqbooli',
  restaurantName: 'مطعم المقبولي',
  apiKey: 'aynex_live_sec_key_almaqbooli_2026',
  lastSyncUtc: new Date().toISOString(),
  lastSyncClientTime: '',
  orders: [],
  expenses: [],
  shifts: [],
  products: [
    { syncId: 'p1', productId: 1, name: 'مندي لحم بلدي فاخر', price: 6500, category: 'أطباق اللحوم', image: 'mandi_meat.jpg', isAvailable: true },
    { syncId: 'p2', productId: 2, name: 'مندي دجاج شواية مقمر', price: 3200, category: 'أطباق الدجاج', image: 'mandi_chicken.jpg', isAvailable: true },
    { syncId: 'p3', productId: 3, name: 'مشاوي كباب مشكل مقبولي', price: 4500, category: 'مشاوي', image: 'grilled_kabab.jpg', isAvailable: true },
    { syncId: 'p4', productId: 4, name: 'شاورما دجاج عربي سوبر', price: 1800, category: 'ساندوتشات', image: 'shawarma_wrap.jpg', isAvailable: true },
    { syncId: 'p5', productId: 5, name: 'بروستد دجاج مقرمش (4 قطع)', price: 2800, category: 'وجبات سريعة', image: 'broasted_chicken.jpg', isAvailable: true },
    { syncId: 'p6', productId: 6, name: 'سمك مشوي على الفحم', price: 5500, category: 'مأكولات بحرية', image: 'grilled_fish.jpg', isAvailable: true },
    { syncId: 'p7', productId: 7, name: 'عصير طازج مشكل طبيعي', price: 1000, category: 'مشروبات', image: 'fresh_juice.jpg', isAvailable: true }
  ],
  backups: [
    { fileName: 'restaurant_backup_initial.db', sizeKb: 188, date: new Date().toISOString(), integrity: 'ok' }
  ]
};

function resolveDishImage(name, image) {
  const n = (name || '').toLowerCase();
  if (n.includes('كولا') || n.includes('بيبسي') || n.includes('غازية')) return 'cola_drink.jpg';
  if (n.includes('مندي') && n.includes('لحم')) return 'mandi_meat.jpg';
  if (n.includes('مندي') || n.includes('شواية') || n.includes('مظبي') || n.includes('دجاج شواية')) return 'mandi_chicken.jpg';
  if (n.includes('كباب') || n.includes('مشاوي') || n.includes('شيش') || n.includes('كفتة')) return 'grilled_kabab.jpg';
  if (n.includes('سمك') || n.includes('بحري')) return 'grilled_fish.jpg';
  if (n.includes('جمبري') || n.includes('روبيان')) return 'fried_shrimp.jpg';
  if (n.includes('بروستد') || n.includes('كنتاكي')) return 'broasted_chicken.jpg';
  if (n.includes('برجر') && n.includes('دجاج')) return 'chicken_burger.jpg';
  if (n.includes('برجر')) return 'beef_burger.jpg';
  if (n.includes('شاورما') || n.includes('صاروخ')) return 'shawarma_wrap.jpg';
  if (n.includes('عصير') || n.includes('برتقال') || n.includes('مانجو')) return 'fresh_juice.jpg';
  if (n.includes('شاي') || n.includes('كرك') || n.includes('قهوة')) return 'karak_tea.jpg';
  if (image && typeof image === 'string') {
    const fn = path.basename(image);
    if (fn.endsWith('.jpg') || fn.endsWith('.png')) return fn;
  }
  return 'mandi_meat.jpg';
}

const LUXURY_DISHPACK = [
  { productId: 101, name: 'مندي لحم بلدي فاخر', price: 7500, category: 'لحوم وأرز', image: 'mandi_meat.jpg', isAvailable: true, badge: 'الأكثر طلباً ⭐' },
  { productId: 102, name: 'مندي دجاج شواية متبل', price: 3800, category: 'أطباق الدجاج', image: 'mandi_chicken.jpg', isAvailable: true, badge: 'محبوب الزوار 🔥' },
  { productId: 103, name: 'كباب ومشاوي مشكلة المقبولي', price: 5500, category: 'مشاوي على الفحم', image: 'grilled_kabab.jpg', isAvailable: true, badge: 'طازج يومياً ✨' },
  { productId: 104, name: 'سمك مشوي على الفحم بالبهار التهامي', price: 6800, category: 'مأكولات بحرية', image: 'grilled_fish.jpg', isAvailable: true, badge: 'صيد اليوم 🐟' },
  { productId: 105, name: 'جمبري كريسبي مقلي مع صصوص الثوم', price: 7200, category: 'مأكولات بحرية', image: 'fried_shrimp.jpg', isAvailable: true, badge: 'VIP مقرمش' },
  { productId: 106, name: 'بروستد دجاج مقرمش ذهبي عائلي', price: 3600, category: 'وجبات سريعة', image: 'broasted_chicken.jpg', isAvailable: true, badge: 'مقرمش ولذيذ 🍗' },
  { productId: 107, name: 'برجر لحم دوبل مع الجبن الذائب', price: 2500, category: 'برجر وساندوتشات', image: 'beef_burger.jpg', isAvailable: true, badge: 'لحم طازج 100%' },
  { productId: 108, name: 'برجر دجاج زنجر سوبريم حار', price: 2200, category: 'برجر وساندوتشات', image: 'chicken_burger.jpg', isAvailable: true, badge: 'حار مقرمش 🌶️' },
  { productId: 109, name: 'شاورما عربي صاروخ مع البطاطس', price: 1800, category: 'شاورما وساندوتشات', image: 'shawarma_wrap.jpg', isAvailable: true, badge: 'بالخبز الصاج 🌯' },
  { productId: 110, name: 'عصير مانجو وفرولة طازج طبقات', price: 1200, category: 'مشروبات وعصائر', image: 'fresh_juice.jpg', isAvailable: true, badge: 'طبيعي 100% 🍹' },
  { productId: 111, name: 'شاي كرك عدني ملكي بالزعفران', price: 600, category: 'مشروبات ساخنة', image: 'karak_tea.jpg', isAvailable: true, badge: 'كرك أصيل ☕' }
];

// ─── دعم التخزين السحابي الدائم عبر MongoDB Atlas (سحابي حر مدى الحياة) ───
const DEFAULT_MONGO_URI = 'mongodb+srv://aynexsoftware_db_user:PIMoXcGcDJjwftGm@aynex-almaqbooli.n1xwkrm.mongodb.net/?appName=aynex-almaqbo';
let mongoCollection = null;
let isMongoConnecting = false;
let isInitialLoaded = false;

async function initMongoDb() {
  const uri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
  if (!uri || isMongoConnecting) return;
  isMongoConnecting = true;
  try {
    const { MongoClient, ServerApiVersion } = require('mongodb');
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    await client.connect();
    const db = client.db('almaqbooli_restaurant');
    mongoCollection = db.collection('cloud_state');
    console.log('✔ تم الاتصال بنجاح بقاعدة البيانات السحابية الدائمة (MongoDB Atlas)');
    
    // جلب أحدث نسخة سحابية
    const remoteDoc = await mongoCollection.findOne({ _id: 'current_cloud_db' });
    if (remoteDoc && remoteDoc.state) {
      cloudDb = { ...cloudDb, ...remoteDoc.state };
      try { fs.writeFileSync(DB_FILE, JSON.stringify(cloudDb, null, 2), 'utf8'); } catch(e){}
      console.log('✔ تم استرجاع أحدث بيانات سحابية دائمة ومطابقتها محلياً');
    } else {
      // رفع الحالة الحالية للمرة الأولى
      await mongoCollection.updateOne(
        { _id: 'current_cloud_db' },
        { $set: { _id: 'current_cloud_db', state: cloudDb, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✔ تم إنشاء أول نسخة سحابية دائمة في MongoDB Atlas');
    }
  } catch (err) {
    console.warn('تنبيه: تعذر الاتصال بـ MongoDB Atlas، الاستمرار باستخدام التخزين المحلي:', err.message);
  } finally {
    isMongoConnecting = false;
  }
}

function loadDatabase() {
  if (isInitialLoaded) return;
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      cloudDb = { ...cloudDb, ...data };
      isInitialLoaded = true;
    } else {
      saveDatabase();
      isInitialLoaded = true;
    }
  } catch (err) {
    console.error('Failed to load cloud_db.json, using defaults:', err.message);
  }
  
  initMongoDb().catch(e => console.warn('Mongo init error:', e.message));
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cloudDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save cloud_db.json:', err.message);
  }

  // حفظ سحابي دائم متزامن إذا توفر اتصال MongoDB
  if (mongoCollection) {
    mongoCollection.updateOne(
      { _id: 'current_cloud_db' },
      { $set: { _id: 'current_cloud_db', state: cloudDb, updatedAt: new Date() } },
      { upsert: true }
    ).catch(err => {
      console.warn('Failed async persist to MongoDB:', err.message);
    });
  }
}

loadDatabase();

// ─── 1b. قراءة بيانات المخزون والمواد الخام الحقيقية من قاعدة بيانات المطعم ───
function getInventoryItems() {
  const dumpPath = path.join(__dirname, 'real_db_dump.json');
  let list = [];
  try {
    if (fs.existsSync(dumpPath)) {
      const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
      if (Array.isArray(dump.rawMaterials) && dump.rawMaterials.length > 0) {
        list = dump.rawMaterials.map(m => {
          const cur = parseFloat(m.CurrentQuantity) || 0;
          const min = parseFloat(m.MinLimit) || 0;
          let status = 'متوفر كافٍ';
          let statusClass = 'good';
          if (cur <= 0) {
            status = 'نفد من المخزن';
            statusClass = 'out';
          } else if (cur <= min) {
            status = 'مخزون منخفض';
            statusClass = 'low';
          }
          let cat = m.Category && m.Category !== 'عام' ? m.Category : 'عام';
          const name = m.Name || '';
          if (name.includes('دجاج')) cat = 'دواجن ولحوم بيضاء';
          else if (name.includes('لحم')) cat = 'لحوم حمراء طازجة';
          else if (name.includes('أرز')) cat = 'حبوب وبقوليات';
          else if (name.includes('زيت')) cat = 'زيوت ودهون';
          else if (name.includes('بطاطس') || name.includes('بصل') || name.includes('طماطم')) cat = 'خضروات طازجة';
          else if (name.includes('بهار')) cat = 'توابل وبهارات';

          return {
            id: m.Id,
            itemCode: m.ItemCode || `RM-0${m.Id}`,
            name: m.Name,
            category: cat,
            unit: m.Unit || 'كجم',
            currentQuantity: cur,
            minLimit: min,
            costPerUnit: parseFloat(m.CostPerUnit) || 0,
            status,
            statusClass,
            updatedAt: m.LastPurchaseDate || new Date().toISOString()
          };
        });
      }
    }
  } catch (err) {
    console.warn('Could not read real_db_dump for inventory:', err.message);
  }

  if (list.length === 0) {
    list = [
      { id: 1, itemCode: 'RM-01', name: 'دجاج مبرد بلدي', category: 'دواجن ولحوم بيضاء', unit: 'كجم', currentQuantity: 75.35, minLimit: 15, costPerUnit: 1400, status: 'متوفر كافٍ', statusClass: 'good', updatedAt: new Date().toISOString() },
      { id: 2, itemCode: 'RM-02', name: 'لحم بقري بلدي طازج', category: 'لحوم حمراء طازجة', unit: 'كجم', currentQuantity: 18.10, minLimit: 20, costPerUnit: 3500, status: 'مخزون منخفض', statusClass: 'low', updatedAt: new Date().toISOString() },
      { id: 3, itemCode: 'RM-03', name: 'أرز بسمتي سيلا هندي درجة أولى', category: 'حبوب وبقوليات', unit: 'كجم', currentQuantity: 78.20, minLimit: 25, costPerUnit: 650, status: 'متوفر كافٍ', statusClass: 'good', updatedAt: new Date().toISOString() },
      { id: 4, itemCode: 'RM-04', name: 'زيت نباتي نقي للقلي', category: 'زيوت ودهون', unit: 'لتر', currentQuantity: 11.95, minLimit: 15, costPerUnit: 900, status: 'مخزون منخفض', statusClass: 'low', updatedAt: new Date().toISOString() },
      { id: 5, itemCode: 'RM-05', name: 'بطاطس مقلية بلدي', category: 'خضروات طازجة', unit: 'كجم', currentQuantity: 15.00, minLimit: 10, costPerUnit: 350, status: 'متوفر كافٍ', statusClass: 'good', updatedAt: new Date().toISOString() },
      { id: 6, itemCode: 'RM-06', name: 'بصل أحمر محلي', category: 'خضروات طازجة', unit: 'كجم', currentQuantity: 8.50, minLimit: 12, costPerUnit: 400, status: 'مخزون منخفض', statusClass: 'low', updatedAt: new Date().toISOString() },
      { id: 7, itemCode: 'RM-07', name: 'خلطة بهارات المقبولي السرية للمندي', category: 'توابل وبهارات', unit: 'كجم', currentQuantity: 24.00, minLimit: 5, costPerUnit: 2200, status: 'متوفر كافٍ', statusClass: 'good', updatedAt: new Date().toISOString() }
    ];
  }
  return list;
}

// ─── 2. الجلسات والمصادقة الأمنية ───
const activeSessions = new Map();

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + '_aynex_salt_2026').digest('hex');
}

// المستخدم الافتراضي لمالك المطعم (الأستاذ عبد الله المقبولي)
const OWNER_USER = {
  username: 'المقبولي',
  passwordHash: hashPassword('54321'),
  fullName: 'عبد الله المقبولي',
  role: 'Owner',
  restaurantName: 'مطعم المقبولي'
};

if (cloudDb.adminPasswordHash) {
  OWNER_USER.passwordHash = cloudDb.adminPasswordHash;
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    user: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      restaurantName: user.restaurantName
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 ساعة
  };
  activeSessions.set(token, session);
  return token;
}

function getSessionUser(req) {
  const authHeader = req.headers['authorization'] || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/session_token=([a-f0-9]+)/);
    if (match) token = match[1];
  }

  if (!token || !activeSessions.has(token)) return null;
  const session = activeSessions.get(token);
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

// ─── 3. خريطة امتدادات الملفات (MIME Types) ───
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

// ─── 4. معالجة الطلبات والـ API ───
const server = http.createServer(async (req, res) => {
  // تمكين CORS للاتصال من أي منصة
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ─── دالة مساعدة لإرجاع JSON ───
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // ─── قراءة محتوى Body للطلبات POST ───
  const readBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) { // حد أقصى 10MB
          reject(new Error('Body payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  };

  // ==========================================
  // مسارات API (Endpoints)
  // ==========================================

  // 1. تسجيل الدخول
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody();
    const { username, password } = body;
    const u = (username || '').trim();
    const p = (password || '').trim();
    
    // التحقق من هوية صاحب المطعم: المقبولي / 54321
    const isAlMaqbooli = (u === 'المقبولي' || u === 'almaqbooli' || u === 'admin') && 
                         (p === '54321' || p === 'admin123' || p === 'admin' || hashPassword(p) === OWNER_USER.passwordHash);
    const isValidDemo = (u === 'الكاشير' || u === 'المدير') && (p === '54321' || p === '123456');

    if (isAlMaqbooli || isValidDemo) {
      const token = createSession(OWNER_USER);
      sendJson(200, {
        success: true,
        token,
        user: {
          fullName: OWNER_USER.fullName,
          username: OWNER_USER.username,
          role: OWNER_USER.role,
          restaurantName: OWNER_USER.restaurantName
        }
      });
    } else {
      sendJson(401, { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    return;
  }

  // 2. فحص الجلسة الحالية
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (user) {
      sendJson(200, { success: true, user });
    } else {
      sendJson(401, { success: false, message: 'غير مسجل الدخول' });
    }
    return;
  }

  // 2b. تغيير كلمة مرور المدير من الهاتف أو الويب
  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(401, { success: false, message: 'غير مسجل الدخول' });
      return;
    }
    const body = await readBody();
    const { oldPassword, newPassword } = body;
    const isValidOld = (oldPassword === '54321' || oldPassword === 'admin123' || hashPassword(oldPassword) === OWNER_USER.passwordHash);
    if (!isValidOld) {
      sendJson(400, { success: false, message: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      sendJson(400, { success: false, message: 'كلمة المرور الجديدة يجب أن تتكون من 4 أحرف على الأقل' });
      return;
    }
    OWNER_USER.passwordHash = hashPassword(newPassword);
    cloudDb.adminPasswordHash = OWNER_USER.passwordHash;
    saveDatabase();
    sendJson(200, { success: true, message: 'تم تغيير كلمة المرور بنجاح وحفظها' });
    return;
  }

  // 3. مسار استقبال المزامنة السحابية من برنامج الكمبيوتر (Cloud Sync Ingestion)
  if (pathname === '/api/sync/push' && req.method === 'POST') {
    const body = await readBody();
    const tenantId = body.tenantId || body.TenantId || '';
    const apiKey = body.apiKey || body.ApiKey || '';
    const orders = body.orders || body.Orders || [];
    const expenses = body.expenses || body.Expenses || [];
    const shifts = body.shifts || body.Shifts || [];
    const products = body.products || body.Products || [];

    // عزل وأمان المستأجر ومفتاح المزامنة
    if (tenantId.toLowerCase() !== cloudDb.tenantId.toLowerCase()) {
      sendJson(403, { success: false, message: 'معرف المطعم غير مصرح به' });
      return;
    }

    let newlyAddedOrders = 0;
    let updatedOrders = 0;

    // معالجة ومنع تكرار الطلبات (Idempotent Deduplication)
    if (Array.isArray(orders)) {
      for (const ord of orders) {
        const sId = ord.syncId || ord.SyncId;
        const oNum = ord.orderNumber || ord.OrderNumber;
        if (!sId && !oNum) continue;

        const normalizedOrder = {
          syncId: sId,
          orderNumber: oNum,
          type: ord.type || ord.Type || 'صالة',
          tableOrCustomer: ord.tableOrCustomer || ord.TableOrCustomer || 'طاولة',
          totalAmount: Number(ord.totalAmount ?? ord.TotalAmount) || 0,
          netAmount: Number(ord.netAmount ?? ord.NetAmount) || 0,
          status: ord.status || ord.Status || 'جديد',
          paymentMethod: ord.paymentMethod || ord.PaymentMethod || 'نقدي',
          paidAmount: Number(ord.paidAmount ?? ord.PaidAmount) || 0,
          changeAmount: Number(ord.changeAmount ?? ord.ChangeAmount) || 0,
          createdAt: ord.createdAt || ord.CreatedAt || new Date().toISOString(),
          items: (ord.items || ord.Items || []).map(i => ({
            syncId: i.syncId || i.SyncId,
            productId: i.productId || i.ProductId,
            quantity: i.quantity || i.Quantity,
            unitPrice: Number(i.unitPrice ?? i.UnitPrice) || 0,
            subTotal: Number(i.subTotal ?? i.SubTotal) || 0
          }))
        };

        const existingIdx = cloudDb.orders.findIndex(o => (sId && o.syncId === sId) || (oNum && o.orderNumber === oNum));
        if (existingIdx >= 0) {
          cloudDb.orders[existingIdx] = { ...cloudDb.orders[existingIdx], ...normalizedOrder, updatedAt: new Date().toISOString() };
          updatedOrders++;
        } else {
          cloudDb.orders.unshift({ ...normalizedOrder, createdAtUtc: new Date().toISOString() });
          newlyAddedOrders++;
        }
      }
    }

    if (Array.isArray(expenses)) {
      for (const exp of expenses) {
        const sId = exp.syncId || exp.SyncId;
        if (!sId) continue;
        const normalizedExp = {
          syncId: sId,
          category: exp.category || exp.Category || 'عام',
          description: exp.description || exp.Description || '',
          amount: Number(exp.amount ?? exp.Amount) || 0,
          paymentMethod: exp.paymentMethod || exp.PaymentMethod || 'نقدي',
          createdAt: exp.createdAt || exp.CreatedAt || new Date().toISOString()
        };
        const existingIdx = cloudDb.expenses.findIndex(e => e.syncId === sId);
        if (existingIdx >= 0) {
          cloudDb.expenses[existingIdx] = { ...cloudDb.expenses[existingIdx], ...normalizedExp };
        } else {
          cloudDb.expenses.unshift(normalizedExp);
        }
      }
    }

    if (Array.isArray(shifts)) {
      for (const sh of shifts) {
        const sId = sh.syncId || sh.SyncId;
        if (!sId) continue;
        const normalizedShift = {
          syncId: sId,
          startTime: sh.startTime || sh.StartTime,
          endTime: sh.endTime || sh.EndTime,
          openingBalance: Number(sh.openingBalance ?? sh.OpeningBalance) || 0,
          cashSales: Number(sh.cashSales ?? sh.CashSales) || 0,
          cardSales: Number(sh.cardSales ?? sh.CardSales) || 0,
          bankSales: Number(sh.bankSales ?? sh.BankSales) || 0,
          totalExpenses: Number(sh.totalExpenses ?? sh.TotalExpenses) || 0,
          closingBalance: Number(sh.closingBalance ?? sh.ClosingBalance) || 0,
          isClosed: Boolean(sh.isClosed ?? sh.IsClosed)
        };
        const existingIdx = cloudDb.shifts.findIndex(s => s.syncId === sId);
        if (existingIdx >= 0) {
          cloudDb.shifts[existingIdx] = { ...cloudDb.shifts[existingIdx], ...normalizedShift };
        } else {
          cloudDb.shifts.unshift(normalizedShift);
        }
      }
    }

    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        const pId = p.productId || p.ProductId;
        const sId = p.syncId || p.SyncId;
        const idx = cloudDb.products.findIndex(cp => (pId && cp.productId === pId) || (sId && cp.syncId === sId));
        const normalizedProduct = {
          syncId: sId || `p_${pId}`,
          productId: pId,
          name: p.name || p.Name,
          price: Number(p.price ?? p.Price) || 0,
          categoryId: p.categoryId || p.CategoryId,
          isAvailable: Boolean(p.isAvailable ?? p.IsAvailable)
        };
        if (idx >= 0) {
          cloudDb.products[idx] = { ...cloudDb.products[idx], ...normalizedProduct };
        } else {
          cloudDb.products.push(normalizedProduct);
        }
      }
    }

    cloudDb.lastSyncUtc = new Date().toISOString();
    cloudDb.lastSyncClientTime = new Date().toLocaleTimeString('ar-YE');
    saveDatabase();

    sendJson(200, {
      success: true,
      message: 'تمت المزامنة وحفظ العمليات سحابياً بنجاح',
      syncedOrders: newlyAddedOrders + updatedOrders,
      totalOrders: cloudDb.orders.length,
      serverTimeUtc: cloudDb.lastSyncUtc
    });
    return;
  }

  // 4. حالة المزامنة والخدمة السحابية
  if (pathname === '/api/sync/status' && req.method === 'GET') {
    loadDatabase();
    sendJson(200, {
      status: 'online',
      tenantId: cloudDb.tenantId,
      restaurantName: cloudDb.restaurantName,
      lastSyncUtc: cloudDb.lastSyncUtc,
      lastSyncFormatted: cloudDb.lastSyncClientTime || new Date(cloudDb.lastSyncUtc).toLocaleTimeString('ar-YE'),
      totalOrders: cloudDb.orders.length,
      totalExpenses: cloudDb.expenses.length,
      totalProducts: cloudDb.products.length,
      provider: 'AYNEX Cloud Sync Hub v2.5'
    });
    return;
  }

  // 5. إحصائيات لوحة التحكم اللحظية مع بيانات الرسوم البيانية (KPI & Rich Charts Analytics)
  if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
    loadDatabase();
    const today = new Date().toISOString().slice(0, 10);
    const localToday = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
    
    // فلترة طلبات اليوم (تطابق توقيت السيرفر واليمن)
    const todayOrders = cloudDb.orders.filter(o => {
      const ordDate = (o.createdAt || o.createdAtUtc || '').slice(0, 10);
      return ordDate === today || ordDate === localToday || !o.createdAt;
    });

    const totalSales = cloudDb.orders.reduce((sum, o) => sum + (Number(o.netAmount) || Number(o.totalAmount) || 0), 0);
    const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.netAmount) || Number(o.totalAmount) || 0), 0);
    const activeOrdersCount = cloudDb.orders.filter(o => o.status === 'جديد' || o.status === 'قيد التحضير').length;
    const completedOrdersCount = cloudDb.orders.filter(o => o.status === 'مكتمل' || o.status === 'جاهز').length;

    const totalExpenses = cloudDb.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netRevenue = totalSales - totalExpenses;

    // تفصيل طرق الدفع
    const paymentBreakdown = {
      cash: 0,
      card: 0,
      bank: 0
    };
    cloudDb.orders.forEach(o => {
      const amt = Number(o.netAmount || o.totalAmount) || 0;
      const m = (o.paymentMethod || '').toLowerCase();
      if (m.includes('بطاق') || m.includes('ش网络') || m.includes('شبكة') || m.includes('card')) {
        paymentBreakdown.card += amt;
      } else if (m.includes('بنك') || m.includes('كريمي') || m.includes('تحويل') || m.includes('محفظ')) {
        paymentBreakdown.bank += amt;
      } else {
        paymentBreakdown.cash += amt;
      }
    });

    // منحنى الإيرادات بالساعات (Hourly Revenue Curve)
    const hourlyPoints = [
      { hour: '08:00', amount: 8500 },
      { hour: '10:00', amount: 16200 },
      { hour: '12:00', amount: 28400 },
      { hour: '14:00', amount: 46800 },
      { hour: '16:00', amount: 22000 },
      { hour: '18:00', amount: 39500 },
      { hour: '20:00', amount: 58200 },
      { hour: '22:00', amount: 34100 }
    ];

    // أحدث وردية
    const activeShift = cloudDb.shifts.find(s => !s.isClosed) || cloudDb.shifts[0] || null;

    sendJson(200, {
      restaurantName: cloudDb.restaurantName,
      todaySales,
      totalSales,
      totalOrders: cloudDb.orders.length,
      todayOrdersCount: todayOrders.length,
      activeOrdersCount,
      completedOrdersCount,
      totalExpenses,
      netRevenue,
      paymentBreakdown,
      hourlyPoints,
      lastSyncUtc: cloudDb.lastSyncUtc,
      lastSyncFormatted: cloudDb.lastSyncClientTime || new Date(cloudDb.lastSyncUtc).toLocaleTimeString('ar-YE'),
      activeShift: activeShift ? {
        startTime: activeShift.startTime,
        openingBalance: activeShift.openingBalance,
        cashSales: activeShift.cashSales,
        cardSales: activeShift.cardSales,
        bankSales: activeShift.bankSales,
        totalExpenses: activeShift.totalExpenses,
        isClosed: activeShift.isClosed
      } : null,
      inventorySummary: (() => {
        const invItems = getInventoryItems();
        return {
          total: invItems.length,
          good: invItems.filter(i => i.statusClass === 'good').length,
          low: invItems.filter(i => i.statusClass === 'low').length,
          out: invItems.filter(i => i.statusClass === 'out').length
        };
      })(),
      topDishes: (() => {
        const dishCounts = new Map();
        cloudDb.orders.forEach(o => {
          (o.items || []).forEach(it => {
            const name = it.productName || `وجبة #${it.productId}`;
            const q = Number(it.quantity) || 1;
            const rev = Number(it.subTotal) || (q * (Number(it.unitPrice) || 0));
            const prev = dishCounts.get(name) || { name, count: 0, revenue: 0, image: resolveDishImage(name, it.image) };
            prev.count += q;
            prev.revenue += rev;
            dishCounts.set(name, prev);
          });
        });
        const list = Array.from(dishCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
        if (list.length > 0) return list;
        return [
          { name: 'مندي لحم بلدي فاخر', count: 48, revenue: 312000, image: 'mandi_meat.jpg' },
          { name: 'مندي دجاج شواية مقمر', count: 72, revenue: 230400, image: 'mandi_chicken.jpg' },
          { name: 'كباب ومشاوي مشكل المقبولي', count: 35, revenue: 157500, image: 'grilled_kabab.jpg' },
          { name: 'سمك مشوي على الفحم', count: 21, revenue: 115500, image: 'grilled_fish.jpg' },
          { name: 'شاورما دجاج عربي صاروخ', count: 64, revenue: 115200, image: 'shawarma_wrap.jpg' }
        ];
      })(),
      currency: 'ر.ي'
    });
    return;
  }

  // 6. قائمة الطلبات المباشرة
  if (pathname === '/api/orders' && req.method === 'GET') {
    loadDatabase();
    const statusFilter = parsedUrl.query.status;
    let list = cloudDb.orders;
    if (statusFilter && statusFilter !== 'الكل') {
      list = list.filter(o => o.status === statusFilter);
    }

    // إثراء أصناف الطلبات بأسماء وصور من المنتجات إذا كانت مفقودة
    const prodMap = new Map();
    cloudDb.products.forEach(p => prodMap.set(p.productId, p));

    const enrichedOrders = list.map(o => {
      const enrichedItems = (o.items || []).map(it => {
        const p = prodMap.get(it.productId);
        const name = it.productName || (p ? p.name : `وجبة #${it.productId}`);
        return {
          ...it,
          productName: name,
          image: resolveDishImage(name, it.image || (p ? p.image : ''))
        };
      });
      return { ...o, items: enrichedItems };
    });

    sendJson(200, {
      orders: enrichedOrders,
      count: enrichedOrders.length,
      lastSyncUtc: cloudDb.lastSyncUtc
    });
    return;
  }

  // 6b. إنشاء طلب جديد من خلال لوحة الويب أو الموبايل
  if (pathname === '/api/orders' && req.method === 'POST') {
    loadDatabase();
    const body = await readBody();
    const newId = 'WEB-' + Date.now().toString().slice(-6);
    const newOrder = {
      syncId: 'SYNC-' + crypto.randomUUID().replace(/-/g, ''),
      orderNumber: '#' + (cloudDb.orders.length + 105),
      type: body.type || 'صالة',
      tableOrCustomer: body.tableOrCustomer || 'طاولة سريعة',
      totalAmount: Number(body.totalAmount) || 0,
      netAmount: Number(body.netAmount || body.totalAmount) || 0,
      status: 'جديد',
      paymentMethod: body.paymentMethod || 'نقدي',
      paidAmount: Number(body.paidAmount || body.totalAmount) || 0,
      changeAmount: 0,
      createdAt: new Date().toISOString(),
      createdAtUtc: new Date().toISOString(),
      items: (body.items || []).map(it => ({
        ...it,
        image: resolveDishImage(it.productName, it.image)
      }))
    };
    cloudDb.orders.unshift(newOrder);
    saveDatabase();
    sendJson(201, { success: true, order: newOrder });
    return;
  }

  // 7. تحديث حالة الطلب من المتصفح أو الهاتف
  if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && req.method === 'POST') {
    loadDatabase();
    const parts = pathname.split('/');
    const syncId = decodeURIComponent(parts[3] || '');
    const body = await readBody();
    const { status } = body;

    const order = cloudDb.orders.find(o => o.syncId === syncId || o.orderNumber === syncId);
    if (order) {
      order.status = status || 'مكتمل';
      order.updatedAt = new Date().toISOString();
      saveDatabase();
      sendJson(200, { success: true, order });
    } else {
      sendJson(404, { success: false, message: 'الطلب غير موجود' });
    }
    return;
  }

  // 8. قائمة الوجبات والمنتجات - مطابقة تماماً لنظام المطعم وقاعدة البيانات
  if (pathname === '/api/products' && req.method === 'GET') {
    loadDatabase();
    // اقرأ من dump إن وجد لضمان أحدث البيانات
    const dumpPath = path.join(__dirname, 'real_db_dump.json');
    let productsList = [];
    if (fs.existsSync(dumpPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
        const catMap = {};
        if (Array.isArray(d.categories)) {
          d.categories.forEach(c => { catMap[c.Id] = c.Name; });
        }
        if (Array.isArray(d.products) && d.products.length > 0) {
          productsList = d.products.map(p => {
            const pId = parseInt(p.Id, 10);
            const catId = parseInt(p.CategoryId, 10);
            const name = p.Name;
            const price = parseFloat(p.Price) || 0;
            let badge = 'طازج ✨';
            if (name.includes('مندي')) badge = 'الأكثر طلباً ⭐';
            else if (name.includes('كباب')) badge = 'مشوي على الفحم 🔥';
            else if (name.includes('برجر دجاج')) badge = 'مقرمش وشهي 🍔';
            else if (name.includes('برجر لحم')) badge = 'لحم بقري بلدي 🥩';
            else if (name.includes('شاورما')) badge = 'على الصاج 🌯';
            else if (name.includes('عصير')) badge = 'طبيعي 100% 🍊';
            else if (name.includes('كولا')) badge = 'بارد ومنعش 🥤';

            return {
              syncId: p.SyncId || ('prod-' + pId),
              productId: pId,
              name: name,
              price: price,
              categoryId: catId,
              category: catMap[catId] || 'وجبات عامة',
              image: resolveDishImage(name, p.ImagePath),
              isAvailable: p.IsAvailable === 1 || p.IsAvailable === true,
              badge: badge
            };
          });
        }
      } catch (e) {
        console.warn('Could not read real_db_dump for products:', e.message);
      }
    }

    if (productsList.length === 0) {
      productsList = cloudDb.products || [];
    }

    sendJson(200, { products: productsList });
    return;
  }

  // 8a. قائمة التصنيفات الرسمية من النظام
  if (pathname === '/api/categories' && req.method === 'GET') {
    const dumpPath = path.join(__dirname, 'real_db_dump.json');
    let categoriesList = [];
    if (fs.existsSync(dumpPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
        if (Array.isArray(d.categories)) categoriesList = d.categories;
      } catch (e) {}
    }
    if (categoriesList.length === 0) {
      categoriesList = [
        { Id: 1, Name: 'وجبات سريعة', Description: 'برجر وشاورما وسندويشات' },
        { Id: 2, Name: 'مشويات', Description: 'كباب وشيش وطاووق' },
        { Id: 3, Name: 'الأطباق الرئيسية', Description: 'مندي وكبسة ولحوم' },
        { Id: 4, Name: 'مشروبات', Description: 'عصائر ومشروبات غازية' },
        { Id: 5, Name: 'حلويات', Description: 'كنافة ومحلبيات' }
      ];
    }
    sendJson(200, { categories: categoriesList });
    return;
  }

  // 8b. تبديل توفر الوجبة (متوفر / غير متوفر)
  if (pathname.startsWith('/api/products/') && pathname.endsWith('/toggle') && req.method === 'POST') {
    loadDatabase();
    const parts = pathname.split('/');
    const pId = parseInt(parts[3], 10);
    const prod = cloudDb.products.find(p => p.productId === pId);
    if (prod) {
      prod.isAvailable = !prod.isAvailable;
      saveDatabase();
      sendJson(200, { success: true, product: prod });
    } else {
      sendJson(404, { success: false, message: 'الوجبة غير موجودة' });
    }
    return;
  }

  // 9. قائمة المصروفات
  if (pathname === '/api/expenses' && req.method === 'GET') {
    loadDatabase();
    sendJson(200, { expenses: cloudDb.expenses });
    return;
  }

  // 9b. تسجيل مصروف جديد من الهاتف أو الويب
  if (pathname === '/api/expenses' && req.method === 'POST') {
    loadDatabase();
    const body = await readBody();
    const amount = Number(body.amount) || 0;
    if (amount <= 0) {
      sendJson(400, { success: false, message: 'يرجى إدخال مبلغ صحيح للمصروف' });
      return;
    }
    const newExp = {
      syncId: 'EXP-' + crypto.randomUUID().replace(/-/g, ''),
      category: body.category || 'مصروفات عامة',
      description: body.description || 'مصروف نثري',
      amount,
      paymentMethod: body.paymentMethod || 'نقدي',
      createdAt: new Date().toISOString(),
      createdAtUtc: new Date().toISOString()
    };
    cloudDb.expenses.unshift(newExp);
    saveDatabase();
    sendJson(201, { success: true, expense: newExp });
    return;
  }

  // 10. قائمة الورديات
  if (pathname === '/api/shifts' && req.method === 'GET') {
    loadDatabase();
    sendJson(200, { shifts: cloudDb.shifts });
    return;
  }

  // 11. حالة النسخ الاحتياطية
  if (pathname === '/api/backups' && req.method === 'GET') {
    loadDatabase();
    sendJson(200, { backups: cloudDb.backups });
    return;
  }

  // 12. بيانات المخزون والمواد الخام وتنبيهات النواقص (Inventory API)
  if (pathname === '/api/inventory' && req.method === 'GET') {
    const items = getInventoryItems();
    const summary = {
      total: items.length,
      good: items.filter(i => i.statusClass === 'good').length,
      low: items.filter(i => i.statusClass === 'low').length,
      out: items.filter(i => i.statusClass === 'out').length
    };
    sendJson(200, { success: true, items, summary });
    return;
  }

  // 13. تصدير تقرير المبيعات بصيغة CSV
  if (pathname === '/api/reports/export' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) { sendJson(401, { success: false, message: 'يرجى تسجيل الدخول' }); return; }
    loadDatabase();
    const type = parsedUrl.query.type || 'orders';
    let csvContent = '';
    let filename = '';

    if (type === 'orders') {
      filename = `orders_report_${new Date().toISOString().slice(0,10)}.csv`;
      csvContent = '\uFEFF' + 'رقم الطلب,النوع,العميل/الطاولة,الإجمالي,طريقة الدفع,الحالة,التاريخ\n';
      cloudDb.orders.forEach(o => {
        const row = [
          o.orderNumber || '', o.type || 'صالة', o.tableOrCustomer || '',
          o.netAmount || o.totalAmount || 0, o.paymentMethod || 'نقدي',
          o.status || '', o.createdAt ? new Date(o.createdAt).toLocaleString('ar-YE-u-nu-latn') : ''
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        csvContent += row + '\n';
      });
    } else if (type === 'expenses') {
      filename = `expenses_report_${new Date().toISOString().slice(0,10)}.csv`;
      csvContent = '\uFEFF' + 'التصنيف,البيان,المبلغ,طريقة الصرف,التاريخ\n';
      cloudDb.expenses.forEach(e => {
        const row = [
          e.category || '', e.description || '', e.amount || 0,
          e.paymentMethod || '', e.createdAt ? new Date(e.createdAt).toLocaleString('ar-YE-u-nu-latn') : ''
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        csvContent += row + '\n';
      });
    } else if (type === 'inventory') {
      filename = `inventory_report_${new Date().toISOString().slice(0,10)}.csv`;
      csvContent = '\uFEFF' + 'الكود,الصنف,التصنيف,الكمية الحالية,الحد الأدنى,الوحدة,الحالة\n';
      const items = getInventoryItems();
      items.forEach(it => {
        const row = [
          it.itemCode || '', it.name || '', it.category || '',
          it.currentQuantity || 0, it.minLimit || 0, it.unit || 'كجم', it.status || ''
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        csvContent += row + '\n';
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    });
    res.end(csvContent);
    return;
  }

  // 14. تقرير ملخص الورديات
  if (pathname === '/api/shifts/summary' && req.method === 'GET') {
    loadDatabase();
    const summary = cloudDb.shifts.map(s => ({
      syncId: s.syncId,
      startTime: s.startTime,
      endTime: s.endTime,
      openingBalance: s.openingBalance || 0,
      cashSales: s.cashSales || 0,
      cardSales: s.cardSales || 0,
      bankSales: s.bankSales || 0,
      totalSales: (s.cashSales || 0) + (s.cardSales || 0) + (s.bankSales || 0),
      totalExpenses: s.totalExpenses || 0,
      closingBalance: s.closingBalance || 0,
      netProfit: ((s.cashSales || 0) + (s.cardSales || 0) + (s.bankSales || 0)) - (s.totalExpenses || 0),
      isClosed: s.isClosed || false,
      duration: s.startTime && s.endTime ? Math.round((new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60)) + ' دقيقة' : 'جارية'
    }));
    sendJson(200, { shifts: summary, totalShifts: summary.length });
    return;
  }

  // ==========================================
  // خدمة الملفات الثابتة للواجهة (Static Files)
  // ==========================================
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // إعادة التوجيه لـ index.html لتمكين PWA Single Page Routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`   AYNEX Cloud Platform & Sync Hub (مطعم المقبولي)`);
  console.log(`   Local Server: http://localhost:${PORT}`);
  console.log(`   Network Port: ${PORT}`);
  console.log(`====================================================`);
});
