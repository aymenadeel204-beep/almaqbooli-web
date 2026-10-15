// Service Worker for Al-Maqbooli Restaurant PWA - Developed by AYNEX
const CACHE_NAME = 'almaqbooli-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/images/almaqbool_logo.png',
  '/images/aynex_logo_transparent.png',
  '/images/mandi_meat.jpg',
  '/images/mandi_chicken.jpg',
  '/images/grilled_kabab.jpg',
  '/images/shawarma_wrap.jpg',
  '/images/broasted_chicken.jpg',
  '/images/grilled_fish.jpg',
  '/images/fresh_juice.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('SW cache skip:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // للـ API: نستخدم دائماً الشبكة أولاً مع إرجاع استجابة فورية
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', message: 'أنت غير متصل بالإنترنت حالياً' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // للملفات الثابتة: Network First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
