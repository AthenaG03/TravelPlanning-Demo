/* 川西环线之旅 · PWA Service Worker
   策略：页面与静态资源 cache-first（离线可用），高德 REST API 请求一律 network-only（保证路线/榜单实时性，避免缓存过期数据） */
const CACHE = 'chuanxi-trip-v1';
const SHELL = [
  './chuanxi_travel_amap_mvp_v2.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 高德 API（REST / JS API 动态请求）不缓存，直接走网络
  if (url.hostname.includes('amap.com') || url.hostname.includes('a.amap.com')) return;
  // 同源静态资源：cache-first，失败回退网络；导航请求离线时回退页面缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./chuanxi_travel_amap_mvp_v2.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      if (resp.ok && url.origin === self.location.origin) {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
