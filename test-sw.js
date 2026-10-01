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
