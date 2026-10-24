'use strict';

const assert = require('node:assert');
const WrongWait = require('./wrong-wait.js');

let passed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok - ${name}`);
    } catch (error) {
        console.error(`  FAIL - ${name}`);
        throw error;
    }
}

async function checkAsync(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok - ${name}`);
    } catch (error) {
        console.error(`  FAIL - ${name}`);
        throw error;
    }
}

function createFakeDocument() {
    function createElement(tagName) {
        const el = {
            tagName: String(tagName).toUpperCase(),
            className: '',
            id: '',
            textContent: '',
            style: {},
            children: [],
            parentNode: null,
            appendChild(child) {
                child.parentNode = el;
                el.children.push(child);
                return child;
            },
            remove() {
                if (!el.parentNode) return;
                const siblings = el.parentNode.children;
                const index = siblings.indexOf(el);
                if (index >= 0) siblings.splice(index, 1);
                el.parentNode = null;
            },
            querySelector(selector) {
                if (!selector.startsWith('.')) return null;
                const className = selector.slice(1);
                const stack = el.children.slice();
                while (stack.length) {
                    const child = stack.shift();
                    if (String(child.className).split(/\s+/).includes(className)) return child;
                    if (child.children?.length) {
                        stack.push(...child.children);
                    }
                }
                return null;
            },
            querySelectorAll(selector) {
                const match = el.querySelector(selector);
                return match ? [match] : [];
            },
            setAttribute() {},
            getAttribute() {
                return null;
            },
            // Layout read used by wrong-wait to commit the initial transform.
            offsetWidth: 1
        };
        return el;
    }

    const body = createElement('body');
    body.className = '';
    const game = createElement('main');
    game.id = 'game';
    body.appendChild(game);

    const head = createElement('head');
    const documentElement = createElement('html');

    const doc = {
        body,
        head,
        documentElement,
        getElementById(id) {
            if (id === 'game') return game;
            return null;
        },
        createElement,
        querySelector(selector) {
            if (selector === '.top-nav') return null;
            if (selector === '#game') return game;
            if (selector === 'main.game' || selector === 'main') return game;
            if (selector === 'main.game-card') return null;
            return body.querySelector(selector) || head.querySelector(selector);
        }
    };
    return { doc, game, body, head };
}

function installFakeTimers() {
    const stubs = [];
    let now = 0;
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;

    global.setTimeout = (fn, ms) => {
        const id = { fn, due: now + Number(ms) || 0 };
        stubs.push(id);
        return id;
    };
    global.clearTimeout = (id) => {
        const index = stubs.indexOf(id);
        if (index >= 0) stubs.splice(index, 1);
    };

    return {
        advance(ms) {
            now += ms;
            const due = stubs.filter((item) => item.due <= now);
            due.forEach((item) => {
                const index = stubs.indexOf(item);
                if (index >= 0) stubs.splice(index, 1);
                item.fn();
            });
        },
        restore() {
            global.setTimeout = originalSetTimeout;
            global.clearTimeout = originalClearTimeout;
        }
    };
}

console.log('wrong-wait');

check('exports the five-second wait constant', () => {
    assert.strictEqual(WrongWait.WRONG_WAIT_MS, 5000);
});

(async () => {
    await checkAsync('lock resolves after the wait and removes the panel', async () => {
        WrongWait._resetForTests();
        const { doc, game } = createFakeDocument();
        const timers = installFakeTimers();
        const done = WrongWait.lock({ document: doc, durationMs: 5000 });
        assert.ok(game.querySelector('.bw-wrong-wait'), 'panel must mount');
        assert.ok(game.querySelector('.bw-wrong-wait-capture'), 'capture must mount');
        let settled = false;
        done.then(() => {
            settled = true;
        });
        timers.advance(4999);
        await Promise.resolve();
        assert.strictEqual(settled, false, 'must not finish early');
        timers.advance(1);
        await done;
        assert.strictEqual(settled, true);
        assert.strictEqual(game.querySelector('.bw-wrong-wait'), null);
        assert.strictEqual(game.querySelector('.bw-wrong-wait-capture'), null);
        timers.restore();
        WrongWait._resetForTests();
    });

    await checkAsync('overlapping lock calls share one wait', async () => {
        WrongWait._resetForTests();
        const { doc, game } = createFakeDocument();
        const timers = installFakeTimers();
        const first = WrongWait.lock({ document: doc, durationMs: 5000 });
        const second = WrongWait.lock({ document: doc, durationMs: 5000 });
        assert.strictEqual(first, second);
        assert.strictEqual(
            game.children.filter((child) => child.className.includes('bw-wrong-wait') && !child.className.includes('capture')).length,
            1,
            'only one panel'
        );
        timers.advance(5000);
        await first;
        timers.restore();
        WrongWait._resetForTests();
    });

    await checkAsync('a new lock can start after the previous one settles', async () => {
        WrongWait._resetForTests();
        const { doc, game } = createFakeDocument();
        const timers = installFakeTimers();
        const first = WrongWait.lock({ document: doc, durationMs: 1000 });
        timers.advance(1000);
        await first;
        const second = WrongWait.lock({ document: doc, durationMs: 1000 });
        assert.notStrictEqual(first, second);
        assert.ok(game.querySelector('.bw-wrong-wait'));
        timers.advance(1000);
        await second;
        timers.restore();
        WrongWait._resetForTests();
    });

    await checkAsync('label uses the English fallback when I18n is missing', async () => {
        WrongWait._resetForTests();
        const { doc, game } = createFakeDocument();
        const timers = installFakeTimers();
        const previous = global.I18n;
        delete global.I18n;
        const done = WrongWait.lock({ document: doc, durationMs: 10 });
        const label = game.querySelector('.bw-wrong-wait-label');
        assert.ok(label);
        assert.strictEqual(label.textContent, 'Wait to try again');
        timers.advance(10);
        await done;
        global.I18n = previous;
        timers.restore();
        WrongWait._resetForTests();
    });

    await checkAsync('mount gains the locked class while waiting and loses it after', async () => {
        WrongWait._resetForTests();
        const { doc, game } = createFakeDocument();
        const timers = installFakeTimers();
        const done = WrongWait.lock({ document: doc, durationMs: 100 });
        assert.ok(
            String(game.className).split(/\s+/).includes('bw-wrong-wait-locked'),
            'mount must show dimmed controls while locked'
        );
        timers.advance(100);
        await done;
        assert.ok(
            !String(game.className).split(/\s+/).includes('bw-wrong-wait-locked'),
            'mount must clear the locked class after the wait'
        );
        timers.restore();
        WrongWait._resetForTests();
    });

    await checkAsync('isLocked tracks the in-flight wait and keydown is blocked', async () => {
        WrongWait._resetForTests();
        const { doc } = createFakeDocument();
        const listeners = [];
        doc.addEventListener = (type, fn, capture) => {
            listeners.push({ type, fn, capture });
        };
        doc.removeEventListener = (type, fn, capture) => {
            const index = listeners.findIndex((item) => item.type === type && item.fn === fn && item.capture === capture);
            if (index >= 0) listeners.splice(index, 1);
        };
        const timers = installFakeTimers();
        assert.strictEqual(WrongWait.isLocked(), false);
        const done = WrongWait.lock({ document: doc, durationMs: 100 });
        assert.strictEqual(WrongWait.isLocked(), true);
        const keydown = listeners.find((item) => item.type === 'keydown' && item.capture === true);
        assert.ok(keydown, 'keydown capture guard must be installed');
        let prevented = false;
        keydown.fn({
            target: { closest: () => null },
            preventDefault() { prevented = true; },
            stopPropagation() {}
        });
        assert.strictEqual(prevented, true);
        timers.advance(100);
        await done;
        assert.strictEqual(WrongWait.isLocked(), false);
        assert.strictEqual(listeners.length, 0, 'keydown guard must be removed');
        timers.restore();
        WrongWait._resetForTests();
    });

    console.log(`\n${passed} passed`);
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
