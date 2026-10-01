# Brain Wars PWA: installable and offline

Date: 2026-10-01
Status: approved design, pending spec review

## Goal

Make Brain Wars installable to the home screen and fully playable offline, without
adding a build step.

## Context and constraints

- Buildless static site: 11 HTML pages, plain JS, no `package.json`, no dependencies,
  no bundler. This must stay true.
- Hosted on GitHub Pages at `https://alex-just.github.io/brain-wars/` (HTTPS, subpath).
  All page URLs are relative, so the subpath already works.
- Runtime assets: the 11 pages plus `i18n.js`, `games.js`, `challenge.js`,
  `elapsed-time.js`, `follow-the-leader.js`.
- `localStorage` holds the language choice and the in-progress challenge; the service
  worker must not touch it.
- `games.js` is the single source of truth for the game registry.
- Tests are plain Node + `assert` scripts (`test-i18n.js`), run directly with `node`.

## Success criteria

- A parent can install from Chrome (Android/desktop) and Safari (iOS); the app opens
  standalone with no browser chrome.
- After one online visit, every page and game, including challenge mode, works with no
  network. Games the user never opened are included.
- Pushing to `master` reaches devices on a later launch. No version-bump ritual and no
  stale-forever caches.
- Online behavior is unchanged; a service worker failure never breaks a game.
- `node test-sw.js` and `node test-i18n.js` pass.

## Design

### New files

- `manifest.json`
  - `name` / `short_name`: "Brain Wars" (language-neutral; the manifest is a single
    static file while the app switches languages at runtime)
  - `id`, `start_url`, `scope`: `./` (resolves under `/brain-wars/`)
  - `display: standalone`, `background_color` / `theme_color`: `#f5f5f5`
  - icons: 192 and 512 PNG, plus a 512 maskable variant
- `sw.js` — service worker, behavior below
- `pwa.js` — registers `./sw.js` with `scope: './'` and `updateViaCache: 'none'`;
  feature-detects and stays silent on any failure
- `icons/` — `icon.svg` source plus rendered PNGs: 32 (favicon), 180 (Apple touch),
  192, 512, maskable 512
- `test-sw.js` — plain Node test, see Testing

PNG icons are generated once locally and committed, so the repo stays buildless.

### Page wiring

Each of the 11 HTML pages gets, in `<head>`:

- `<link rel="manifest" href="./manifest.json">`
- `<meta name="theme-color" content="#f5f5f5">`
- `<link rel="icon" type="image/png" href="./icons/icon-32.png">`
- `<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">`
- `mobile-web-app-capable` and legacy `apple-mobile-web-app-capable` metas,
  `apple-mobile-web-app-title` "Brain Wars"
- one deferred `<script src="./pwa.js"></script>`

All relative paths, matching the existing style. No other page changes.

The unused leftovers `clock/` images and `transformers-logo.svg` stay out of scope and
out of the cache.

### Service worker behavior

- **Precache list** is explicit in `sw.js`: the 11 pages, `i18n.js`, `games.js`,
  `challenge.js`, `elapsed-time.js`, `follow-the-leader.js`, `pwa.js`, `manifest.json`,
  and the icons. Both `./` and `./index.html` are cached so either navigation form works
  offline.
- **Install:** write each entry individually, tolerating a single bad entry so a typo
  cannot brick installation.
- **Fetch:**
  - Navigations: network-first, update the cached copy on success; offline fall back to
    the cached exact URL, then to the hub (`./index.html`) so an unknown page never
    shows a browser error.
  - Other same-origin GETs: stale-while-revalidate (serve cache, refresh in background).
  - Everything else (cross-origin, non-GET) is ignored and passes through.
- **Updates:** one `VERSION` constant names the cache; bump it whenever the precache
  list changes. The new worker waits until old tabs close (never interrupts a game),
  then activates, deletes the old cache, and takes over on the next launch.
  `updateViaCache: 'none'` bypasses GitHub Pages' asset cache for `sw.js` itself, so
  deploys land on the next visit.
- **No install button, no update banner.** Browser menu and the iOS Share sheet handle
  install.
- The worker does not touch `localStorage`; language and challenge state behave exactly
  as today.

### Icons and identity

- Design: rounded square in the app teal `#60ACBD` with the white 2\(\times\)2
  operators `+ − × ÷`, echoing the hub's operations tile. The maskable variant keeps
  the glyph inside the safe zone; the Apple 180 icon is a full square tile with no
  transparency.
- `icon.svg` is the committed source; PNGs are rendered once from it.
- The 32px favicon link also fixes the currently blank browser tab icon.
- If variants are wanted, mock them up before finalizing; text description alone is the
  current basis for approval.

### Testing

`test-sw.js`, in the style of `test-i18n.js`:

1. every game file in `games.js` appears in the `sw.js` precache list
2. every precache path exists on disk (with `./` mapped to `index.html`)
3. `manifest.json` parses, and every icon it references exists

Manual checklist:

- Chrome desktop: Lighthouse installability audit passes; DevTools shows the manifest,
  an activated worker, and the expected cache entries
- DevTools offline: reload every page, play every game, and finish a challenge step
  offline
- Android Chrome: install prompt, standalone launch, airplane-mode play
- iOS Safari: Add to Home Screen, standalone launch, airplane-mode play
- Online regression: pages load as before, no console errors, `test-i18n.js` passes

### Out of scope

Install prompts/buttons, update banners, push notifications, background sync, app-store
packaging, native wrappers, and any build tooling.

### Rollout

Merge to `master`; GitHub Pages publishes. First visit installs the worker; existing
users update on a later launch. If a bad deploy ships, the next deploy that changes
`sw.js` rolls the cache, and network-first serving keeps online users correct in the
meantime.
