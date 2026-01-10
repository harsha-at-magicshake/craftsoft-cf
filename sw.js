const CACHE_NAME = 'craftsoft-offline-v3';
const OFFLINE_URL = '/offline.html';

// Only cache local assets
const ASSETS_TO_CACHE = [
    '/offline.html',
    '/favicon.svg'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching offline page');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - ONLY handle navigation requests for offline fallback
self.addEventListener('fetch', (event) => {
    // Only handle same-origin navigation requests (HTML pages)
    const url = new URL(event.request.url);

    // Skip cross-origin requests entirely - let browser handle them
    if (url.origin !== location.origin) {
        return;
    }

    // Only handle navigation requests (page loads)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If offline, serve the offline page
                    return caches.match(OFFLINE_URL);
                })
        );
    }

    // For all other same-origin requests, let browser handle normally
    // (don't call event.respondWith)
});
