/**
 * Brain Wars service worker: every game works offline after the first visit.
 *
 * Update rules:
 * - Installs skip the waiting phase and take over as soon as the fresh precache is
 *   ready. Installed apps are rarely fully closed, and a waiting worker would strand
 *   them on the old version; pwa.js reloads the open page once onto the new one.
 * - Bump VERSION whenever PRECACHE changes (a page added or removed); the activate
 *   handler then deletes the old cache.
 * - Content edits to already-listed files need no bump: pages are network-first and
 *   other assets stale-while-revalidate, so they refresh on their own.
 * - When a game is added to games.js, add its page here too; test-sw.js fails if
 *   a registered game page is missing from PRECACHE.
 */
'use strict';

const VERSION = 'v5';
const CACHE = 'brain-wars-' + VERSION;

// The browser's HTTP cache may hold older copies than the server. A new worker must
// never seed its cache from it, and runtime reads must revalidate before reusing one.
const FRESH = { cache: 'reload' };        // fetch past the HTTP cache entirely
const REVALIDATE = { cache: 'no-cache' }; // fetch, but check with the server first

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
    './money-calculations.html',
    './operations.html',
    './telling-time-es.html',
    './unfollow-the-leader.html',
    './time-calculations.html',
    './i18n.js',
    './games.js',
    './challenge.js',
    './elapsed-time.js',
    './time-calculations.js',
    './money-calculations.js',
    './pwa.js',
    './manifest.json',
    './icons/icon-32.png',
    './icons/apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
    // Take over as soon as the fresh precache is ready: an installed app is rarely
    // fully closed, and a waiting worker leaves its users on the old version.
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.all(
                PRECACHE.map((url) =>
                    cache.add(new Request(url, FRESH)).catch(() => {
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
                names.filter((name) => name.startsWith('brain-wars-') && name !== CACHE)
                    .map((name) => caches.delete(name))
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
        const response = await fetch(request, REVALIDATE);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
    } catch (error) {
        // Match ignoring the query string so a challenge step (?challenge=1) still
        // finds the precached game page while the URL keeps its query for challenge.js.
        const cached = await cache.match(request, { ignoreSearch: true });
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
        fetch(request, REVALIDATE)
            .then((response) => {
                if (response && response.ok) cache.put(request, response.clone());
            })
            .catch(() => {});
        return cached;
    }
    const response = await fetch(request, REVALIDATE);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
}
