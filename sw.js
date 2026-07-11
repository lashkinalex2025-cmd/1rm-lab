// ============================================================
//  1RM Lab — Service Worker
//  Разработчик: Alex Lashkin · 2026
// ============================================================

// ============ ВЕРСИЯ КЭША ============
// 👇 Меняйте эту цифру при каждом обновлении сайта (v3 → v4 → v5...)
const CACHE_VERSION = 'v6';
const CACHE_NAME = '1rm-lab-' + CACHE_VERSION;

// ============ ФАЙЛЫ ДЛЯ КЭШИРОВАНИЯ ============
const ASSETS = [
    './',
    './index.html',
    './manifest.json'
    // './icon-192.png',   // раскомментируйте, если есть иконки
    // './icon-512.png'
];

// ============ УСТАНОВКА ============
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // addAll упадёт, если хоть один файл 404 — оборачиваем в безопасный режим
                return Promise.allSettled(
                    ASSETS.map((asset) => cache.add(asset))
                );
            })
            .then(() => self.skipWaiting()) // сразу активировать новый SW
    );
});

// ============ АКТИВАЦИЯ (удаление старого кэша) ============
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys.map((key) => {
                        // Удаляем ВСЕ старые версии кэша
                        if (key !== CACHE_NAME) {
                            console.log('SW: удаляю старый кэш', key);
                            return caches.delete(key);
                        }
                    })
                )
            )
            .then(() => self.clients.claim()) // взять контроль над всеми вкладками
    );
});

// ============ ОБРАБОТКА ЗАПРОСОВ ============
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // 🛑 Игнорируем не-http(s) запросы (chrome-extension://, data:, blob: и т.д.)
    if (!url.startsWith('http')) return;

    // 🛑 Игнорируем расширения браузера
    if (url.startsWith('chrome-extension://')) return;

    // 🛑 Кэшируем только GET-запросы
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Если есть в кэше — отдаём сразу
            if (cached) return cached;

            // Иначе идём в сеть
            return fetch(event.request)
                .then((response) => {
                    // Кэшируем только успешные ответы
                    if (
                        response &&
                        response.status === 200 &&
                        response.type === 'basic' // только свой домен (не CDN)
                    ) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            // Ещё раз проверяем схему перед put (защита от chrome-extension)
                            if (event.request.url.startsWith('http')) {
                                cache.put(event.request, clone);
                            }
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Офлайн-фолбэк: если запрос страницы — отдаём главную
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});

// ============ УВЕДОМЛЕНИЕ О ГОТОВНОСТИ ============
console.log('SW: 1RM Lab ' + CACHE_VERSION + ' готов ✅');
