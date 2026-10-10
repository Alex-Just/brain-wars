'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Games = require('./games.js');

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

const swPath = path.join(__dirname, 'sw.js');
const swSource = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
const precacheMatch = swSource.match(/const PRECACHE = (\[[\s\S]*?\]);/);
const PRECACHE = precacheMatch ? vm.runInNewContext('(' + precacheMatch[1] + ')') : [];

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

console.log('page wiring');
check('every page is wired for the PWA', () => {
    const pages = fs.readdirSync(__dirname).filter((file) => file.endsWith('.html'));
    assert.strictEqual(pages.length, 14, 'expected 14 pages, found ' + pages.length);
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
    ['./index.html', './i18n.js', './games.js', './challenge.js', './analytics.js', './elapsed-time.js', './time-calculations.js', './money-calculations.js', './pwa.js', './manifest.json'].forEach((entry) => {
        assert.ok(PRECACHE.includes(entry), entry + ' is missing from PRECACHE');
    });
});

check('sw.js matches queries against the cache and only cleans its own caches', () => {
    assert.ok(swSource.includes('ignoreSearch: true'), 'offline navigations with query strings must match the cached page');
    assert.ok(swSource.includes("startsWith('brain-wars-')"), 'activate must not delete other projects caches');
});

console.log('service worker updates');
check('a new worker takes over at once instead of waiting for every tab to close', () => {
    assert.ok(swSource.includes('self.skipWaiting()'), 'install must call skipWaiting');
    const pwaSource = fs.readFileSync(path.join(__dirname, 'pwa.js'), 'utf8');
    assert.ok(pwaSource.includes('controllerchange'), 'pwa.js must notice an updated worker taking over');
    assert.ok(pwaSource.includes('window.location.reload()'), 'pwa.js must reload once onto the new version');
});

check('precache and runtime fetches never trust the older browser HTTP cache', () => {
    assert.ok(swSource.includes("cache: 'reload'"), 'precache fetches must bypass the HTTP cache');
    assert.ok(swSource.includes('new Request(url, FRESH)'), 'every precache entry must be requested fresh');
    assert.ok((swSource.match(/REVALIDATE/g) || []).length >= 4, 'runtime fetches must revalidate before use');
});

console.log('\nAll ' + passed + ' checks passed.');
