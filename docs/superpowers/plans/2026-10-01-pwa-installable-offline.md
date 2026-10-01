# Brain Wars PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Brain Wars installable to the home screen and fully playable offline, with no build step.

**Architecture:** A hand-written service worker precaches every page and runtime asset on first visit (list derived from the `games.js` registry and guarded by a plain-Node test). Navigations are network-first so deploys show up immediately; other assets refresh stale-while-revalidate. A small `pwa.js` registers the worker on every page; a web manifest plus committed PNG icons provide the install experience.

**Tech Stack:** Plain HTML/CSS/JS, Service Worker API, Web App Manifest, Node built-ins for tests. No frameworks, no package.json, no bundler.

**Spec:** `docs/superpowers/specs/2026-10-01-pwa-installable-offline-design.md`

## Global Constraints

- Buildless: no `package.json`, no dependencies, no bundler. Tests run directly as `node test-*.js`.
- Relative paths everywhere, because the site is served from the `/brain-wars/` subpath of GitHub Pages.
- The service worker must not touch `localStorage`; language and challenge state behave exactly as today.
- Do not modify game logic or page layout; only add head tags and scripts.
- App name is "Brain Wars"; palette teal `#60ACBD`, background `#f5f5f5`.
- The 11 pages are: `challenge.html`, `elapsed-time.html`, `follow-the-leader.html`, `index.html`, `long-addition.html`, `long-division.html`, `long-multiplication.html`, `long-subtraction.html`, `money-problems.html`, `operations.html`, `telling-time-es.html`.
- Existing runtime scripts (before this plan) are exactly: `i18n.js`, `games.js`, `challenge.js`, `elapsed-time.js`. Follow-the-leader is inline script; there is no `follow-the-leader.js`.
- Test harness style mirrors `test-i18n.js`: a `check(name, fn)` helper that re-throws on failure, and a final `All N checks passed.` line.

---

### Task 1: App icons and web manifest

**Files:**
- Create: `test-sw.js`
- Create: `icons/icon.svg`, `icons/icon-maskable.svg`
- Create (rendered): `icons/icon-512.png`, `icons/maskable-512.png`, `icons/icon-192.png`, `icons/icon-32.png`, `icons/apple-touch-icon.png`
- Create: `manifest.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the `check(name, fn)` test harness; `manifest` parsed object; icon files at the exact paths listed above (later tasks reference them in `sw.js` and in page heads).

- [ ] **Step 1: Write the failing test**

Create `test-sw.js`:

```js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ok - ' + name);
    } catch (error) {
        console.error('  FAIL - ' + name);
        throw error;
    }
}

const manifestPath = path.join(__dirname, 'manifest.json');
const manifestSource = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
let manifest = null;
try {
    manifest = JSON.parse(manifestSource);
} catch (error) {
    manifest = null;
}

console.log('manifest');
check('manifest.json parses', () => {
    assert.ok(manifest !== null, 'manifest.json is missing or not valid JSON');
});

check('manifest names the browser app and starts at the hub', () => {
    assert.strictEqual(manifest.name, 'Brain Wars');
    assert.strictEqual(manifest.short_name, 'Brain Wars');
    assert.strictEqual(manifest.display, 'standalone');
    assert.strictEqual(manifest.start_url, './');
    assert.strictEqual(manifest.scope, './');
});

check('manifest icons exist on disk', () => {
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'manifest needs at least three icons');
    manifest.icons.forEach((icon) => {
        assert.ok(icon.src && icon.sizes && icon.type, 'every icon needs src, sizes and type');
        const file = icon.src.replace(/^\.\//, '');
        assert.ok(fs.existsSync(path.join(__dirname, file)), icon.src + ' does not exist');
    });
    assert.ok(
        manifest.icons.some((icon) => icon.purpose === 'maskable'),
        'manifest needs a maskable icon'
    );
});

console.log('\nAll ' + passed + ' checks passed.');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-sw.js`
Expected: `FAIL - manifest.json parses` followed by a rethrown assertion error; exit code 1.

- [ ] **Step 3: Create the icon sources**

Create `icons/icon.svg` (rounded tile, used for 512, 192 and the favicon):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#60ACBD"/>
  <g stroke="#ffffff" stroke-width="28" stroke-linecap="round" fill="none">
    <path d="M128 176 H224"/>
    <path d="M176 128 V224"/>
    <path d="M288 176 H384"/>
    <path d="M288 288 L384 384"/>
    <path d="M384 288 L288 384"/>
    <path d="M288 336 H384"/>
  </g>
  <circle cx="336" cy="300" r="14" fill="#ffffff"/>
  <circle cx="336" cy="372" r="14" fill="#ffffff"/>
</svg>
```

Create `icons/icon-maskable.svg` (full-bleed square; the glyph already sits inside the maskable safe zone):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#60ACBD"/>
  <g stroke="#ffffff" stroke-width="28" stroke-linecap="round" fill="none">
    <path d="M128 176 H224"/>
    <path d="M176 128 V224"/>
    <path d="M288 176 H384"/>
    <path d="M288 288 L384 384"/>
    <path d="M384 288 L288 384"/>
    <path d="M288 336 H384"/>
  </g>
  <circle cx="336" cy="300" r="14" fill="#ffffff"/>
  <circle cx="336" cy="372" r="14" fill="#ffffff"/>
</svg>
```

- [ ] **Step 4: Render the PNGs**

Run from the repo root (headless Chrome renders the SVG at its natural 512px size; the `CVDisplayLink` stderr noise is harmless):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --screenshot="$PWD/icons/icon-512.png" --window-size=512,512 --default-background-color=00000000 "file://$PWD/icons/icon.svg"
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --screenshot="$PWD/icons/maskable-512.png" --window-size=512,512 --default-background-color=00000000 "file://$PWD/icons/icon-maskable.svg"
sips -z 192 192 icons/icon-512.png --out icons/icon-192.png
sips -z 32 32 icons/icon-512.png --out icons/icon-32.png
sips -z 180 180 icons/maskable-512.png --out icons/apple-touch-icon.png
```

Verify the sizes (expected 32, 192, 512, 180, 512):

```bash
sips -g pixelWidth -g pixelHeight icons/icon-32.png icons/icon-192.png icons/icon-512.png icons/apple-touch-icon.png icons/maskable-512.png
```

Do not render small sizes straight from the SVG: a 32px Chrome window crops the unscaled 512px document instead of scaling it.

- [ ] **Step 5: Create the manifest**

Create `manifest.json`:

```json
{
  "id": "./",
  "name": "Brain Wars",
  "short_name": "Brain Wars",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f5f5f5",
  "theme_color": "#f5f5f5",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "./icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node test-sw.js`
Expected: three `ok` lines and `All 3 checks passed.`; exit code 0.

- [ ] **Step 7: Commit**

```bash
git add icons manifest.json test-sw.js
git commit -m "Add app icons and web manifest"
```

---

### Task 2: Register the worker on every page

**Files:**
- Create: `pwa.js`
- Modify: all 11 HTML pages (insert one head block after the viewport meta, line 5)
- Modify: `test-sw.js` (append wiring checks)

**Interfaces:**
- Consumes: `check(name, fn)` from Task 1.
- Produces: `pwa.js` registering `./sw.js` with `scope: './'` and `updateViaCache: 'none'`; each page head carries `rel="manifest"`, `name="theme-color"`, `rel="apple-touch-icon"`, and `<script src="pwa.js" defer>`. Task 3's `sw.js` will be loaded by this script at runtime; the string `src="pwa.js"` is what the test looks for.

- [ ] **Step 1: Write the failing test**

In `test-sw.js`, insert this block immediately before the final line `console.log('\nAll ' + passed + ' checks passed.');`:

```js
console.log('page wiring');
check('every page is wired for the PWA', () => {
    const pages = fs.readdirSync(__dirname).filter((file) => file.endsWith('.html'));
    assert.strictEqual(pages.length, 11, 'expected 11 pages, found ' + pages.length);
    pages.forEach((file) => {
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.ok(html.includes('rel="manifest"'), file + ' must link the manifest');
        assert.ok(html.includes('name="theme-color"'), file + ' must set the theme colour');
        assert.ok(html.includes('rel="icon"'), file + ' must set the favicon');
        assert.ok(html.includes('rel="apple-touch-icon"'), file + ' must set the Apple touch icon');
        assert.ok(html.includes('src="pwa.js"'), file + ' must load pwa.js');
    });
});

check('pwa.js registers the worker for the whole site', () => {
    const source = fs.readFileSync(path.join(__dirname, 'pwa.js'), 'utf8');
    assert.ok(source.includes("register('./sw.js'"), 'pwa.js must register ./sw.js');
    assert.ok(source.includes("scope: './'"), 'the worker must control the whole site');
    assert.ok(source.includes("updateViaCache: 'none'"), 'sw.js updates must bypass the HTTP cache');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-sw.js`
Expected: `FAIL - every page is wired for the PWA`, naming the first page that lacks `rel="manifest"`; exit code 1.

- [ ] **Step 3: Create `pwa.js`**

```js
/**
 * Registers the service worker that makes Brain Wars installable and playable
 * offline. Failure is silent: games must keep working if this never runs.
 */
'use strict';

(function () {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
        }).catch(() => {});
    });
})();
```

- [ ] **Step 4: Wire up all 11 pages**

In each page below, insert this block immediately after the `<meta name="viewport" content="width=device-width, initial-scale=1.0">` line. Use the file's prevailing indentation: 4 spaces everywhere except `follow-the-leader.html`, which uses 2 spaces.

```html
<link rel="manifest" href="./manifest.json">
<meta name="theme-color" content="#f5f5f5">
<link rel="icon" type="image/png" href="./icons/icon-32.png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Brain Wars">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script src="pwa.js" defer></script>
```

Pages: `challenge.html`, `elapsed-time.html`, `follow-the-leader.html`, `index.html`, `long-addition.html`, `long-division.html`, `long-multiplication.html`, `long-subtraction.html`, `money-problems.html`, `operations.html`, `telling-time-es.html`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node test-sw.js`
Expected: five `ok` lines and `All 5 checks passed.`

Run: `node test-i18n.js`
Expected: `All 32 checks passed.` (no regressions).

- [ ] **Step 6: Commit**

```bash
git add pwa.js test-sw.js *.html
git commit -m "Register the service worker on every page"
```

---

### Task 3: Precache every game in the service worker

**Files:**
- Modify: `test-sw.js` (add registry constants and precache checks)
- Create: `sw.js`

**Interfaces:**
- Consumes: icon paths from Task 1; `pwa.js` path and `Games` registry from earlier tasks.
- Produces: `sw.js` with `VERSION` (`'v1'`), `CACHE` (`'brain-wars-v1'`), `PRECACHE` array, and handlers `install`, `activate`, `fetch`, plus functions `networkFirst(request)` and `staleWhileRevalidate(request)`. `test-sw.js` extracts `PRECACHE` by matching `const PRECACHE = [...];` and evaluating the array literal with `vm.runInNewContext`.

- [ ] **Step 1: Write the failing test**

In `test-sw.js`, add after the line `const vm = require('vm');`:

```js
const Games = require('./games.js');
```

Then add after the `try { manifest = JSON.parse(manifestSource); } catch ...` block:

```js
const swPath = path.join(__dirname, 'sw.js');
const swSource = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
const precacheMatch = swSource.match(/const PRECACHE = (\[[\s\S]*?\]);/);
const PRECACHE = precacheMatch ? vm.runInNewContext('(' + precacheMatch[1] + ')') : [];
```

Then insert before the final `console.log('\nAll ' + passed + ' checks passed.');` line:

```js
console.log('service worker precache');
check('sw.js defines the precache list', () => {
    assert.ok(precacheMatch, 'sw.js must define "const PRECACHE = [...];"');
});

check('every precache entry is relative and exists on disk', () => {
    assert.ok(PRECACHE.length >= 20, 'the precache list looks too short');
    PRECACHE.forEach((entry) => {
        assert.ok(entry.startsWith('./'), entry + ' must start with ./');
        const file = entry === './' ? 'index.html' : entry.replace(/^\.\//, '');
        assert.ok(fs.existsSync(path.join(__dirname, file)), file + ' does not exist');
    });
});

check('every registered game is precached', () => {
    Games.all().forEach((game) => {
        assert.ok(PRECACHE.includes('./' + game.file), game.file + ' is missing from PRECACHE');
    });
});

check('core runtime files are precached', () => {
    ['./index.html', './i18n.js', './games.js', './challenge.js', './elapsed-time.js', './pwa.js', './manifest.json'].forEach((entry) => {
        assert.ok(PRECACHE.includes(entry), entry + ' is missing from PRECACHE');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-sw.js`
Expected: `FAIL - sw.js defines the precache list`; exit code 1.

- [ ] **Step 3: Create `sw.js`**

```js
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
        const response = await fetch(request);
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-sw.js`
Expected: nine `ok` lines and `All 9 checks passed.`

Run: `node test-i18n.js`
Expected: `All 32 checks passed.`

- [ ] **Step 5: Commit**

```bash
git add sw.js test-sw.js
git commit -m "Precache every game so Brain Wars works offline"
```

---

### Task 4: Browser verification and ship

**Files:**
- No planned changes; fix and commit only if a check fails.

**Interfaces:**
- Consumes: everything from Tasks 1-3.

- [ ] **Step 1: Serve the site locally**

```bash
python3 -m http.server 8123 --bind 127.0.0.1
```

Leave it running, open `http://127.0.0.1:8123/` in Chrome. (Service workers are allowed on `http://127.0.0.1`.)

- [ ] **Step 2: Check the install surface in DevTools**

DevTools → Application:
- Manifest: name "Brain Wars", icons load, no errors; a Chrome install control appears in the address bar (Lighthouse removed its PWA category, so the Application panel is the check).
- Service Workers: `sw.js` is activated and running.
- Cache Storage: `brain-wars-v1` contains 23 entries.

- [ ] **Step 3: Offline pass**

DevTools → Network → Offline, then reload the hub and open every game plus challenge mode; play a round of each picker game, the startup games, and one challenge step. Nothing should show a browser error page.

- [ ] **Step 4: Freshness check**

Edit a visible string in `index.html` (e.g. the `<title>`), reload while online, and confirm the change appears immediately (network-first). Revert the edit afterwards.

- [ ] **Step 5: Device checks (as available)**

- Android Chrome on `https://alex-just.github.io/brain-wars/`: install from the menu, launch standalone, enable airplane mode, play every game.
- iOS Safari: Share → Add to Home Screen, launch standalone, enable airplane mode, play every game.

- [ ] **Step 6: Run both tests one last time**

Run: `node test-sw.js && node test-i18n.js`
Expected: test-sw ends with `All 9 checks passed.` and test-i18n ends with `All 32 checks passed.`

- [ ] **Step 7: Commit any fixes, then push**

If Steps 2-6 changed anything:

```bash
git add -A && git commit -m "Fix issues found in PWA browser verification"
```

Then deploy (this publishes to GitHub Pages):

```bash
git push origin master
```

- [ ] **Step 8: Verify live**

Open `https://alex-just.github.io/brain-wars/`, confirm the worker registers (DevTools → Application), and repeat a quick offline check.

---

## Post-plan notes

- Adding a game later: add its entry to `games.js`, add its page to `PRECACHE` in `sw.js`, bump `VERSION`. `node test-sw.js` fails if the page is missing from `PRECACHE`.
- Removing or renaming a file: remove it from `PRECACHE` and bump `VERSION` so `activate` deletes the old cache.
- Everyday content edits need no `sw.js` change at all.
