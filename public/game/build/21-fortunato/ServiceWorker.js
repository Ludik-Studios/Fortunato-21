const cacheName = "Ludik Studio-21 Fortunato-1.1";
const contentToCache = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "Build/21-fortunato.loader.js",
    "Build/21-fortunato.framework.js.br",
    "Build/21-fortunato.data.br",
    "Build/21-fortunato.wasm.br",
    "TemplateData/style.css",
    "TemplateData/favicon.ico",
    "TemplateData/unity-logo-dark.png",
    "TemplateData/progress-bar-empty-dark.png",
    "TemplateData/progress-bar-full-dark.png"
];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install 21 Fortunato');
    e.waitUntil((async function () {
        const cache = await caches.open(cacheName);
        console.log('[Service Worker] Caching all content for offline play');
        await cache.addAll(contentToCache);
        self.skipWaiting();
    })());
});

self.addEventListener('activate', function (e) {
    e.waitUntil((async function () {
        const keys = await caches.keys();
        await Promise.all(
            keys.map(key => {
                if (key !== cacheName) {
                    return caches.delete(key);
                }
            })
        );
        self.clients.claim();
    })());
});

self.addEventListener('fetch', function (e) {
    e.respondWith((async function () {
        const cachedResponse = await caches.match(e.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const networkResponse = await fetch(e.request);
            if (networkResponse && networkResponse.status === 200) {
                const cache = await caches.open(cacheName);
                cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (err) {
            if (e.request.mode === 'navigate') {
                const fallback = await caches.match('index.html');
                if (fallback) return fallback;
            }
            throw err;
        }
    })());
});
