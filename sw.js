/**
 * Brain Wars service worker: every game works offline after the first visit.
 *
 * Update rules:
 * - Bump VERSION whenever PRECACHE changes (a page added or removed); the activate
 *   handler then deletes the old cache.
 * - Content edits to already-listed files need no bump: pages are network-first and
 *   other assets stale-while-revalidate, so they refresh on their own.
 * - When a game is added to games.js, add its page here too; test-sw.js fails if
 *   a registered game page is missing from PRECACHE.
 */
'use strict';

const VERSION = 'v1';
const CACHE = 'brain-wars-' + VERSION;

const PRECACHE = [
    './',
    './index.html',
    './challenge.html',
    './elapsed-time.html',
    './follow-the-leader.html',
    './long-addition.html',
    './long-division.html',
    './long-multiplication.html',
    './long-subtraction.html',
    './money-problems.html',
    './operations.html',
    './telling-time-es.html',
    './i18n.js',
    './games.js',
    './challenge.js',
    './elapsed-time.js',
    './pwa.js',
    './manifest.json',
    './icons/icon-32.png',
    './icons/apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.all(
                PRECACHE.map((url) =>
                    cache.add(url).catch(() => {
                        // One bad entry must not stop the rest from being cached.
                    })
                )
            )
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((name) => name !== CACHE).map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Pages: fresh when online, cached when not; the hub catches unknown pages offline.
async function networkFirst(request) {
    const cache = await caches.open(CACHE);
    try {
        // Revalidate on every navigation so content edits show up right away
        // instead of being served from the browser's HTTP cache.
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        const hub = await cache.match('./index.html');
        if (hub) return hub;
        throw error;
    }
}

// Assets: instant from cache, refreshed in the background.
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) {
        fetch(request)
            .then((response) => {
                if (response && response.ok) cache.put(request, response.clone());
            })
            .catch(() => {});
        return cached;
    }
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
}
