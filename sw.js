const CACHE_NAME = 'craftsoft-offline-v2';
const OFFLINE_URL = 'offline.html'; // Changed to relative path

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './favicon.svg',
    './assets/css/master.css?v=2.0'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Install Event starting...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching critical assets');
            // Using addAll but catching errors so one failing asset doesn't break the whole SW
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => {
                    return cache.add(url).catch(err => console.error(`[SW] Failed to cache: ${url}`, err));
                })
            );
        })
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate Event');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Interceptor
self.addEventListener('fetch', (event) => {
    // Only handle GET and http/https
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                console.log('[SW] Network failed, searching cache for:', event.request.url);
                return caches.match(event.request).then((response) => {
                    if (response) return response;

                    // Specific handling for navigation requests (HTML pages)
                    if (event.request.mode === 'navigate' ||
                        (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
                        console.log('[SW] Serving Offline Page');
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
    );
});
