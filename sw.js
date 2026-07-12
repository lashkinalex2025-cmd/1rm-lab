// ===== 1RM Lab — Service Worker =====
const CACHE_NAME = '1rm-lab-v5';

// Файлы, которые кэшируются при установке (работают оффлайн)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Установка — кэшируем базовые файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.log('SW install error:', err))
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Стратегия: сначала кэш, потом сеть (с докэшированием CDN)
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // ✅ Кешируем ТОЛЬКО http/https и GET-запросы
    if (!req.url.startsWith('http')) return;
    if (req.method !== 'GET') return;

    event.respondWith(
        caches.match(req).then((cached) => {
            // Есть в кеше → отдаём
            if (cached) return cached;

            // Иначе — грузим из сети и кешируем
            return fetch(req).then((res) => {
                // Не кешируем «плохие» ответы
                if (!res || res.status !== 200 || res.type === 'opaque') {
                    return res;
                }

                const resClone = res.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // ⚠️ Двойная защита: только http/https
                    if (req.url.startsWith('http')) {
                        cache.put(req, resClone);
                    }
                });

                return res;
            }).catch(() => {
                // Офлайн-фолбэк (если нужно)
                return caches.match('./index.html');
            });
        })
    );
});
