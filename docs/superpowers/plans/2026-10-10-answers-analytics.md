# Answers Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record one event per answer attempt (game, correct/incorrect, timestamp, device, server-captured IP + country) in a free Cloudflare Worker + D1 store, uploaded from the static PWA with an offline-tolerant, idempotent client queue.

**Architecture:** A new `analytics.js` module watches the registry's completion/mistake DOM signals (MutationObserver, per-game policy), appends events to a localStorage outbox, and flushes batches to a Worker. The Worker validates, rate-limits by server-side arrival time, and inserts with `INSERT OR IGNORE` so retries never duplicate. A daily cron clears IPs older than 90 days.

**Tech Stack:** Plain browser JavaScript (no dependencies, no build step), Cloudflare Workers (`worker.mjs`, ESM) + D1 (SQLite), plain Node test scripts (no framework).

**Spec:** `docs/superpowers/specs/2026-10-10-answers-analytics-design.md`

## Global Constraints

- No dependencies, no build step, no `package.json` for the app. Node's standard library only in tests.
- The app is a static PWA on GitHub Pages; `analytics.js` must be require-safe in Node (no `window`/`document`/`localStorage` at module scope).
- Comments: short, active voice, current state only.
- Script placement on every game page: `<script src="analytics.js" defer></script>` immediately after `games.js`, before the game's own script and `challenge.js`.
- Config constants (exact values): `ENDPOINT = ''` (disabled when empty), `QUEUE_KEY = 'brain_wars_answers'`, `DEVICE_KEY = 'brain_wars_device'`, `QUEUE_MAX = 1000`, `BATCH_MAX = 200`, `TIMEOUT_MS = 8000`, `MIN_FLUSH_GAP_MS = 30000`, `MAX_PERMANENT_TRIES = 3`.
- Worker limits (exact values): batch ≤ 200 events, body ≤ 65536 bytes, rate limit 5000 events/IP/24 h, insert chunks of 50, retention 90 days, cleanup batches of 500 × up to 20 rounds.
- CORS hosts: `alex-just.github.io`, `localhost`, `127.0.0.1` (exact hostname match, any port).
- Commit style: single-line imperative, e.g. `Add the answers analytics client core`.

---

## File Structure

- `analytics.js` — client module: pure core (events, queue, capture policy, flush state machine, response classification) + guarded browser bootstrap (observer, storage, flush triggers).
- `analytics-worker/worker.mjs` — Worker: `GAME_IDS`, `validateEvents`, fetch handler, scheduled cleanup.
- `analytics-worker/schema.sql` — D1 schema.
- `analytics-worker/README.md` — deploy steps, curl checks, capture matrix, device workflow.
- `test-analytics.js` — Node tests for the client core and the Worker.
- `games.js`, `i18n.js`, `sw.js` — untouched except: 12 game pages gain a script tag; `sw.js` precaches `analytics.js` and bumps `VERSION`; `README.md` documents the feature.
- `test-i18n.js`, `test-sw.js` — extended checks.
- `README.md` — tests list, structure, Analytics section, intro wording.

---

### Task 1: Client core — events, queue, capture policy, flush state machine

**Files:**
- Create: `analytics.js`
- Create: `test-analytics.js`

**Interfaces:**
- Consumes: nothing.
- Produces (exported by `analytics.js` as `window.BrainWarsAnalytics` / `module.exports`):
  - `buildEvent(game, correct, now, device) → { id, game, correct, ts, device }`
  - `enqueue(queue, event, cap) → queue'` (drops oldest beyond cap)
  - `takeBatch(queue, max) → queue.slice(0, max)`
  - `ack(queue, sentIds) → queue'` (removes only sent ids)
  - `risingEdges(prev, next) → ['mistake' | 'completion']` (only false→true)
  - `captureEvent(state, edge, gameId) → boolean | null` (mutates `state.mistakeSeen`; `null` = record nothing)
  - `classifyResponse(status) → 'ok' | 'transient' | 'permanent'`
  - `nextBackoff(current) → ms` (0 → 30000, doubling, capped 300000)
  - `flushOnce(queue, post, state, now) → Promise<{ queue, backoff, nextTryAt, permanentTries }>`
  - constants: `QUEUE_MAX`, `BATCH_MAX`, `MIN_FLUSH_GAP_MS`, `MAX_PERMANENT_TRIES`, `ENDPOINT`

- [ ] **Step 1: Write the failing tests**

Create `test-analytics.js`:

```js
'use strict';

const assert = require('assert');

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

const Analytics = require('./analytics.js');

console.log('analytics client core');

check('buildEvent shapes an event', () => {
    const event = Analytics.buildEvent('time-calculations', true, 1791700000000, 'dev-1');
    assert.strictEqual(event.game, 'time-calculations');
    assert.strictEqual(event.correct, true);
    assert.strictEqual(event.ts, 1791700000000);
    assert.strictEqual(event.device, 'dev-1');
    assert.ok(typeof event.id === 'string' && event.id.length >= 8);
});

check('enqueue appends and drops the oldest beyond the cap', () => {
    let queue = [];
    for (let i = 0; i < 5; i++) queue = Analytics.enqueue(queue, { id: 'e' + i }, 3);
    assert.deepStrictEqual(queue.map((event) => event.id), ['e2', 'e3', 'e4']);
});

check('takeBatch returns the first events only', () => {
    const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepStrictEqual(Analytics.takeBatch(queue, 2).map((event) => event.id), ['a', 'b']);
});

check('ack removes exactly the sent ids', () => {
    const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepStrictEqual(Analytics.ack(queue, ['a', 'c']).map((event) => event.id), ['b']);
});

check('risingEdges reports only false-to-true transitions', () => {
    assert.deepStrictEqual(Analytics.risingEdges({ mistake: false, completion: false }, { mistake: true, completion: false }), ['mistake']);
    assert.deepStrictEqual(Analytics.risingEdges({ mistake: true, completion: false }, { mistake: true, completion: true }), ['completion']);
    assert.deepStrictEqual(Analytics.risingEdges({ mistake: true, completion: true }, { mistake: false, completion: true }), []);
});

check('captureEvent records every attempt in standard games', () => {
    const state = { mistakeSeen: false };
    assert.strictEqual(Analytics.captureEvent(state, 'mistake', 'time-calculations'), false);
    assert.strictEqual(state.mistakeSeen, true);
    assert.strictEqual(Analytics.captureEvent(state, 'completion', 'time-calculations'), true);
    assert.strictEqual(state.mistakeSeen, false);
});

check('captureEvent suppresses the completion after a mistake in telling-time', () => {
    const state = { mistakeSeen: false };
    assert.strictEqual(Analytics.captureEvent(state, 'mistake', 'telling-time'), false);
    assert.strictEqual(Analytics.captureEvent(state, 'completion', 'telling-time'), null);
    assert.strictEqual(state.mistakeSeen, false);
});

check('captureEvent keeps a clean telling-time completion', () => {
    const state = { mistakeSeen: false };
    assert.strictEqual(Analytics.captureEvent(state, 'completion', 'telling-time'), true);
});

check('classifyResponse maps statuses', () => {
    assert.strictEqual(Analytics.classifyResponse(200), 'ok');
    assert.strictEqual(Analytics.classifyResponse(0), 'transient');
    assert.strictEqual(Analytics.classifyResponse(408), 'transient');
    assert.strictEqual(Analytics.classifyResponse(429), 'transient');
    assert.strictEqual(Analytics.classifyResponse(500), 'transient');
    assert.strictEqual(Analytics.classifyResponse(400), 'permanent');
});

check('nextBackoff doubles to a five minute cap', () => {
    assert.strictEqual(Analytics.nextBackoff(0), 30000);
    assert.strictEqual(Analytics.nextBackoff(30000), 60000);
    assert.strictEqual(Analytics.nextBackoff(240000), 300000);
    assert.strictEqual(Analytics.nextBackoff(300000), 300000);
});

check('flushOnce acks a successful batch', async () => {
    const queue = [{ id: 'a' }, { id: 'b' }];
    const result = await Analytics.flushOnce(queue, async () => 200, { backoff: 0, nextTryAt: 0, permanentTries: 0 }, 1000);
    assert.deepStrictEqual(result.queue, []);
    assert.strictEqual(result.backoff, 0);
    assert.strictEqual(result.nextTryAt, 0);
});

check('flushOnce keeps a batch after a transient failure and backs off', async () => {
    const queue = [{ id: 'a' }];
    const result = await Analytics.flushOnce(queue, async () => 500, { backoff: 0, nextTryAt: 0, permanentTries: 0 }, 1000);
    assert.deepStrictEqual(result.queue, queue);
    assert.strictEqual(result.backoff, 30000);
    assert.strictEqual(result.nextTryAt, 31000);
});

check('flushOnce drops the head batch after three permanent failures', async () => {
    const queue = [{ id: 'a' }];
    const post = async () => 400;
    let state = { backoff: 0, nextTryAt: 0, permanentTries: 0 };
    state = await Analytics.flushOnce(queue, post, state, 1000);
    assert.deepStrictEqual(state.queue, queue);
    state = await Analytics.flushOnce(state.queue, post, state, 2000);
    assert.deepStrictEqual(state.queue, queue);
    state = await Analytics.flushOnce(state.queue, post, state, 3000);
    assert.deepStrictEqual(state.queue, []);
});

check('a network error counts as a transient failure', async () => {
    const queue = [{ id: 'a' }];
    const result = await Analytics.flushOnce(queue, async () => { throw new Error('offline'); }, { backoff: 0, nextTryAt: 0, permanentTries: 0 }, 1000);
    assert.deepStrictEqual(result.queue, queue);
    assert.strictEqual(result.backoff, 30000);
});

console.log('\nAll ' + passed + ' checks passed.');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node test-analytics.js`
Expected: FAIL — `Cannot find module './analytics.js'`.

- [ ] **Step 3: Implement the client core**

Create `analytics.js`:

```js
/**
 * Answer analytics: capture game results, queue them offline, upload them idempotently.
 * Disabled unless ENDPOINT is set. Browser: window.BrainWarsAnalytics. Node (tests): module.exports.
 */
(function (global) {
    'use strict';

    const ENDPOINT = ''; // e.g. 'https://brain-wars-answers.<account>.workers.dev/ingest'
    const QUEUE_KEY = 'brain_wars_answers';
    const DEVICE_KEY = 'brain_wars_device';
    const QUEUE_MAX = 1000;
    const BATCH_MAX = 200;
    const TIMEOUT_MS = 8000;
    const MIN_FLUSH_GAP_MS = 30000;
    const MAX_PERMANENT_TRIES = 3;

    // telling-time raises its completion signal after a wrong tap too, so a round
    // whose one attempt was already recorded wrong must not emit a correct event.
    const SUPPRESS_AFTER_MISTAKE = ['telling-time'];

    /* ---------- pure core ---------- */

    function randomId(prefix) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function buildEvent(game, correct, now, device) {
        return { id: randomId('e-'), game, correct, ts: now, device };
    }

    function enqueue(queue, event, cap) {
        const next = queue.concat(event);
        return next.length > cap ? next.slice(next.length - cap) : next;
    }

    function takeBatch(queue, max) {
        return queue.slice(0, max);
    }

    function ack(queue, sentIds) {
        const sent = new Set(sentIds);
        return queue.filter((event) => !sent.has(event.id));
    }

    function risingEdges(prev, next) {
        const edges = [];
        if (!prev.mistake && next.mistake) edges.push('mistake');
        if (!prev.completion && next.completion) edges.push('completion');
        return edges;
    }

    // Returns the correct flag for the event to record, or null for no event.
    function captureEvent(state, edge, gameId) {
        if (edge === 'mistake') {
            state.mistakeSeen = true;
            return false;
        }
        if (edge === 'completion') {
            const suppress = state.mistakeSeen && SUPPRESS_AFTER_MISTAKE.includes(gameId);
            state.mistakeSeen = false;
            return suppress ? null : true;
        }
        return null;
    }

    function classifyResponse(status) {
        if (status === 200) return 'ok';
        if (status === 0 || status === 408 || status === 429 || status >= 500) return 'transient';
        return 'permanent';
    }

    function nextBackoff(current) {
        return current === 0 ? 30000 : Math.min(current * 2, 300000);
    }

    // One flush attempt: post the head batch and return the next queue and backoff state.
    async function flushOnce(queue, post, state, now) {
        const batch = takeBatch(queue, BATCH_MAX);
        let status = 0;
        try {
            status = await post(batch);
        } catch (error) {
            status = 0;
        }
        const kind = classifyResponse(status);
        if (kind === 'ok') {
            return { queue: ack(queue, batch.map((event) => event.id)), backoff: 0, nextTryAt: 0, permanentTries: 0 };
        }
        if (kind === 'permanent') {
            const permanentTries = state.permanentTries + 1;
            if (permanentTries >= MAX_PERMANENT_TRIES) {
                return { queue: ack(queue, batch.map((event) => event.id)), backoff: 0, nextTryAt: 0, permanentTries: 0 };
            }
            const backoff = nextBackoff(state.backoff);
            return { queue, backoff, nextTryAt: now + backoff, permanentTries };
        }
        const backoff = nextBackoff(state.backoff);
        return { queue, backoff, nextTryAt: now + backoff, permanentTries: 0 };
    }

    const core = {
        buildEvent, enqueue, takeBatch, ack, risingEdges, captureEvent,
        classifyResponse, nextBackoff, flushOnce,
        ENDPOINT, QUEUE_MAX, BATCH_MAX, MIN_FLUSH_GAP_MS, MAX_PERMANENT_TRIES
    };
    global.BrainWarsAnalytics = core;

    if (typeof module !== 'undefined' && module.exports) module.exports = core;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-analytics.js`
Expected: `All 14 checks passed.`

- [ ] **Step 5: Commit**

```bash
git add analytics.js test-analytics.js
git commit -m "Add the answers analytics client core"
```

---

### Task 2: Worker validation and the game allowlist

**Files:**
- Create: `analytics-worker/worker.mjs`
- Modify: `test-analytics.js` (append the worker section)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces (from `analytics-worker/worker.mjs`):
  - `GAME_IDS: string[]` — every registry id, hidden ones included.
  - `validateEvents(events, now) → { valid, rejected } | null` — `valid` items are `{ id, game, correct (0|1), ts, device }`; `null` means the request is malformed (not an array, or more than 200 events).
  - (Task 3 adds the default export with `fetch`; Task 4 adds `scheduled`.)

- [ ] **Step 1: Write the failing tests**

Append to `test-analytics.js`, replacing the final `console.log` line with the worker section (the async main is required — top-level `await` is invalid in CommonJS):

```js
console.log('analytics worker');

const Games = require('./games.js');

(async () => {
    const Worker = await import('./analytics-worker/worker.mjs');
    const NOW = 1791700000000;
    const DAY = 24 * 60 * 60 * 1000;

    async function checkAsync(name, fn) {
        try {
            await fn();
            passed++;
            console.log('  ok - ' + name);
        } catch (error) {
            console.error('  FAIL - ' + name);
            throw error;
        }
    }

    const validEvent = (overrides) => Object.assign({
        id: 'e-0123456789', game: 'time-calculations', correct: true, ts: NOW, device: 'dev-1'
    }, overrides);

    await checkAsync('GAME_IDS matches the registry ids', () => {
        const expected = Games.all().map((game) => game.id)
            .concat(['follow-the-leader', 'unfollow-the-leader']).sort();
        assert.deepStrictEqual([...Worker.GAME_IDS].sort(), expected);
    });

    await checkAsync('validateEvents accepts a valid event', () => {
        const result = Worker.validateEvents([validEvent()], NOW);
        assert.strictEqual(result.valid.length, 1);
        assert.strictEqual(result.rejected, 0);
        assert.deepStrictEqual(result.valid[0], {
            id: 'e-0123456789', game: 'time-calculations', correct: 1, ts: NOW, device: 'dev-1'
        });
    });

    await checkAsync('validateEvents rejects bad fields and counts them', () => {
        const result = Worker.validateEvents([
            validEvent(),
            validEvent({ id: 'short' }),
            validEvent({ game: 'not-a-game' }),
            validEvent({ correct: 'yes' }),
            validEvent({ ts: NOW + 3 * DAY }),
            validEvent({ ts: NOW - 3 * 365 * DAY }),
            validEvent({ device: '' }),
            null
        ], NOW);
        assert.strictEqual(result.valid.length, 1);
        assert.strictEqual(result.rejected, 7);
    });

    await checkAsync('validateEvents rejects malformed batches', () => {
        assert.strictEqual(Worker.validateEvents('nope', NOW), null);
        assert.strictEqual(Worker.validateEvents(new Array(201).fill(validEvent()), NOW), null);
    });

    console.log('\nAll ' + passed + ' checks passed.');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node test-analytics.js`
Expected: FAIL — cannot find `./analytics-worker/worker.mjs`.

- [ ] **Step 3: Implement validation**

Create `analytics-worker/worker.mjs`:

```js
/**
 * Brain Wars answers ingest: validate, rate-limit, and deduplicate events into D1.
 * Deploy from the Cloudflare dashboard; keep the pasted copy in sync with this file.
 */

export const GAME_IDS = [
    'follow-the-leader', 'unfollow-the-leader', 'operations', 'telling-time',
    'long-division', 'long-multiplication', 'long-addition', 'long-subtraction',
    'money-problems', 'elapsed-time', 'time-calculations', 'money-calculations'
];

const BATCH_MAX = 200;
const BODY_MAX_BYTES = 65536;
const RATE_LIMIT = 5000;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const INSERT_CHUNK = 50;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 500;
const CLEANUP_ROUNDS = 20;
const TS_PAST_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const TS_FUTURE_MS = 2 * 24 * 60 * 60 * 1000;
const ALLOWED_HOSTS = ['alex-just.github.io'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// Returns { valid, rejected } for a well-formed batch, or null for a malformed request.
export function validateEvents(events, now) {
    if (!Array.isArray(events) || events.length > BATCH_MAX) return null;
    const valid = [];
    let rejected = 0;
    for (const event of events) {
        const ok = event && typeof event === 'object' &&
            typeof event.id === 'string' && event.id.length >= 8 && event.id.length <= 64 &&
            GAME_IDS.includes(event.game) &&
            typeof event.correct === 'boolean' &&
            Number.isInteger(event.ts) && event.ts >= now - TS_PAST_MS && event.ts <= now + TS_FUTURE_MS &&
            typeof event.device === 'string' && event.device.length >= 1 && event.device.length <= 64;
        if (ok) {
            valid.push({ id: event.id, game: event.game, correct: event.correct ? 1 : 0, ts: event.ts, device: event.device });
        } else {
            rejected += 1;
        }
    }
    return { valid, rejected };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-analytics.js`
Expected: `All 18 checks passed.` (14 core + 4 worker)

- [ ] **Step 5: Commit**

```bash
git add analytics-worker/worker.mjs test-analytics.js
git commit -m "Add the answers analytics worker validation"
```

---

### Task 3: Worker ingest pipeline

**Files:**
- Modify: `analytics-worker/worker.mjs` (add helpers + default export with `fetch`)
- Modify: `test-analytics.js` (append handler checks inside the async main, before the final `console.log`)

**Interfaces:**
- Consumes: `GAME_IDS`, `validateEvents` from Task 2.
- Produces: `export default { fetch(request, env) }` — routes: `POST /ingest`; `OPTIONS` → 204; otherwise 405. Responses: `200 { inserted, ignored, rejected }`, `400 { error }`, `429 { error: 'rate_limit' }`. Uses `env.DB` (D1 binding): `prepare().bind().first()` for the rate count, `prepare().bind()` + `batch()` for inserts. Server fields: `ip` from `CF-Connecting-IP` (or null), `country` from `request.cf.country` (or null), `received_at = Date.now()`.

- [ ] **Step 1: Write the failing tests**

Insert this block into `test-analytics.js` inside the async main, just before `console.log('\nAll ' + passed + ' checks passed.');`:

```js
    const stubRequest = ({ method = 'POST', path = '/ingest', origin, body = '', cf, ip }) => ({
        method,
        url: 'https://worker.example' + path,
        headers: new Headers(Object.assign(
            origin ? { Origin: origin } : {},
            ip ? { 'CF-Connecting-IP': ip } : {}
        )),
        cf,
        text: async () => body
    });

    const stubDB = ({ count = 0, changes = 1 } = {}) => {
        const log = { inserts: [], updates: [], batches: 0 };
        return {
            log,
            prepare(sql) {
                return {
                    bind(...values) {
                        return {
                            sql,
                            values,
                            first: async () => ({ n: count }),
                            run: async () => {
                                log.updates.push({ sql, values });
                                return { meta: { changes } };
                            }
                        };
                    }
                };
            },
            async batch(statements) {
                log.batches += 1;
                statements.forEach((statement) => log.inserts.push(statement));
                return statements.map(() => ({ meta: { changes } }));
            }
        };
    };

    const batchBody = (events) => JSON.stringify({ events });

    await checkAsync('fetch inserts a valid batch with server fields', async () => {
        const db = stubDB();
        const response = await Worker.default.fetch(
            stubRequest({ origin: 'https://alex-just.github.io', ip: '203.0.113.7', cf: { country: 'ES' }, body: batchBody([validEvent()]) }),
            { DB: db }
        );
        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { inserted: 1, ignored: 0, rejected: 0 });
        assert.strictEqual(db.log.inserts.length, 1);
        const statement = db.log.inserts[0];
        assert.ok(statement.sql.includes('INSERT OR IGNORE INTO answers'));
        assert.deepStrictEqual(statement.values.slice(0, 5), ['e-0123456789', 'time-calculations', 1, NOW, 'dev-1']);
        assert.strictEqual(statement.values[5], '203.0.113.7');
        assert.strictEqual(statement.values[6], 'ES');
        assert.ok(Number.isInteger(statement.values[7]));
    });

    await checkAsync('fetch counts ignored rows from meta.changes', async () => {
        const db = stubDB({ changes: 0 });
        const response = await Worker.default.fetch(
            stubRequest({ body: batchBody([validEvent()]) }),
            { DB: db }
        );
        assert.deepStrictEqual(await response.json(), { inserted: 0, ignored: 1, rejected: 0 });
    });

    await checkAsync('fetch drops invalid events without failing the batch', async () => {
        const db = stubDB();
        const response = await Worker.default.fetch(
            stubRequest({ body: batchBody([validEvent(), validEvent({ game: 'nope' })]) }),
            { DB: db }
        );
        assert.deepStrictEqual(await response.json(), { inserted: 1, ignored: 0, rejected: 1 });
    });

    await checkAsync('fetch chunks large batches', async () => {
        const db = stubDB();
        const events = Array.from({ length: 120 }, (_, index) => validEvent({ id: 'e-01234567' + String(index).padStart(2, '0') }));
        const response = await Worker.default.fetch(stubRequest({ body: batchBody(events) }), { DB: db });
        assert.strictEqual((await response.json()).inserted, 120);
        assert.strictEqual(db.log.inserts.length, 120);
        assert.strictEqual(db.log.batches, 3); // 50 + 50 + 20
    });

    await checkAsync('fetch rejects malformed requests', async () => {
        const db = stubDB();
        assert.strictEqual((await Worker.default.fetch(stubRequest({ body: 'not json' }), { DB: db })).status, 400);
        assert.strictEqual((await Worker.default.fetch(stubRequest({ body: batchBody(new Array(201).fill(validEvent())) }), { DB: db })).status, 400);
        assert.strictEqual((await Worker.default.fetch(stubRequest({ body: 'x'.repeat(70000) }), { DB: db })).status, 400);
    });

    await checkAsync('fetch rejects other routes and methods', async () => {
        const db = stubDB();
        assert.strictEqual((await Worker.default.fetch(stubRequest({ method: 'GET', path: '/ingest' }), { DB: db })).status, 405);
        assert.strictEqual((await Worker.default.fetch(stubRequest({ path: '/other' }), { DB: db })).status, 405);
    });

    await checkAsync('fetch rate-limits by server-side arrival', async () => {
        const db = stubDB({ count: 5000 });
        const response = await Worker.default.fetch(
            stubRequest({ ip: '203.0.113.7', body: batchBody([validEvent()]) }),
            { DB: db }
        );
        assert.strictEqual(response.status, 429);
        assert.strictEqual(db.log.inserts.length, 0);
    });

    await checkAsync('fetch answers OPTIONS and scopes CORS to allowed origins', async () => {
        const db = stubDB();
        const preflight = await Worker.default.fetch(stubRequest({ method: 'OPTIONS', origin: 'https://alex-just.github.io' }), { DB: db });
        assert.strictEqual(preflight.status, 204);
        assert.strictEqual(preflight.headers.get('Access-Control-Allow-Origin'), 'https://alex-just.github.io');

        const evil = await Worker.default.fetch(stubRequest({ origin: 'http://localhost.evil.com', body: batchBody([]) }), { DB: db });
        assert.strictEqual(evil.headers.get('Access-Control-Allow-Origin'), null);
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node test-analytics.js`
Expected: FAIL — `Worker.default` is undefined.

- [ ] **Step 3: Implement the ingest pipeline**

Append to `analytics-worker/worker.mjs`:

```js
function corsHeaders(origin) {
    if (!origin) return {};
    let url;
    try {
        url = new URL(origin);
    } catch (error) {
        return {};
    }
    const allowed = ALLOWED_HOSTS.includes(url.hostname) || LOCAL_HOSTS.includes(url.hostname);
    if (!allowed) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
    };
}

function json(body, status, headers) {
    return new Response(JSON.stringify(body), {
        status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
    });
}

export default {
    async fetch(request, env) {
        const cors = corsHeaders(request.headers.get('Origin') || '');
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }
        if (request.method !== 'POST' || url.pathname !== '/ingest') {
            return json({ error: 'not_found' }, 405, cors);
        }

        const body = await request.text();
        if (body.length > BODY_MAX_BYTES) {
            return json({ error: 'too_large' }, 400, cors);
        }
        let payload = null;
        try {
            payload = JSON.parse(body);
        } catch (error) {
            payload = null;
        }
        const now = Date.now();
        const checked = payload && validateEvents(payload.events, now);
        if (!checked) {
            return json({ error: 'invalid' }, 400, cors);
        }

        const ip = request.headers.get('CF-Connecting-IP') || null;
        const country = (request.cf && request.cf.country) || null;

        if (ip) {
            const row = await env.DB.prepare(
                'SELECT COUNT(*) AS n FROM answers WHERE ip = ? AND received_at > ?'
            ).bind(ip, now - RATE_WINDOW_MS).first();
            if ((row ? row.n : 0) + checked.valid.length > RATE_LIMIT) {
                return json({ error: 'rate_limit' }, 429, cors);
            }
        }

        let inserted = 0;
        for (let start = 0; start < checked.valid.length; start += INSERT_CHUNK) {
            const chunk = checked.valid.slice(start, start + INSERT_CHUNK);
            const statements = chunk.map((event) => env.DB.prepare(
                'INSERT OR IGNORE INTO answers (id, game, correct, ts, device, ip, country, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(event.id, event.game, event.correct, event.ts, event.device, ip, country, now));
            const results = await env.DB.batch(statements);
            inserted += results.reduce((sum, result) => sum + (result.meta ? result.meta.changes : 0), 0);
        }

        return json({
            inserted,
            ignored: checked.valid.length - inserted,
            rejected: checked.rejected
        }, 200, cors);
    }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-analytics.js`
Expected: `All 26 checks passed.` (18 + 8)

- [ ] **Step 5: Commit**

```bash
git add analytics-worker/worker.mjs test-analytics.js
git commit -m "Add the answers analytics worker ingest pipeline"
```

---

### Task 4: Scheduled IP cleanup, schema, and worker README

**Files:**
- Modify: `analytics-worker/worker.mjs` (add `scheduled` to the default export)
- Modify: `test-analytics.js` (append the scheduled check)
- Create: `analytics-worker/schema.sql`
- Create: `analytics-worker/README.md`

**Interfaces:**
- Consumes: the default export from Task 3.
- Produces: `default.scheduled(event, env, ctx)` — clears `ip` for rows older than 90 days, in batches of 500, up to 20 rounds per run.

- [ ] **Step 1: Write the failing test**

Insert this block into `test-analytics.js` inside the async main, just before the final `console.log`:

```js
    await checkAsync('scheduled clears old IPs in bounded batches', async () => {
        const db = stubDB({ changes: 1 });
        await Worker.default.scheduled({}, { DB: db }, {});
        assert.strictEqual(db.log.updates.length, 1);
        const statement = db.log.updates[0];
        assert.ok(statement.sql.includes('UPDATE answers SET ip = NULL'));
        const cutoff = statement.values[0];
        const now = Date.now();
        assert.ok(cutoff <= now - 90 * 24 * 60 * 60 * 1000 && cutoff >= now - 90 * 24 * 60 * 60 * 1000 - 5000);
        assert.strictEqual(statement.values[1], 500);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-analytics.js`
Expected: FAIL — `Worker.default.scheduled` is not a function.

- [ ] **Step 3: Implement the scheduled cleanup**

In `analytics-worker/worker.mjs`, add `scheduled` to the default export (after the `fetch` method, inside the same object):

```js
    async scheduled(event, env) {
        const cutoff = Date.now() - RETENTION_MS;
        for (let round = 0; round < CLEANUP_ROUNDS; round++) {
            const result = await env.DB.prepare(
                'UPDATE answers SET ip = NULL WHERE id IN (SELECT id FROM answers WHERE received_at < ? AND ip IS NOT NULL LIMIT ?)'
            ).bind(cutoff, CLEANUP_BATCH).run();
            if (!result.meta || result.meta.changes < CLEANUP_BATCH) break;
        }
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-analytics.js`
Expected: `All 27 checks passed.`

- [ ] **Step 5: Write the schema**

Create `analytics-worker/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    ts INTEGER NOT NULL,
    device TEXT,
    ip TEXT,
    country TEXT,
    received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_ts ON answers (ts);
CREATE INDEX IF NOT EXISTS idx_answers_device ON answers (device);
CREATE INDEX IF NOT EXISTS idx_answers_ip_received ON answers (ip, received_at);
CREATE INDEX IF NOT EXISTS idx_answers_country_ts ON answers (country, ts);
```

- [ ] **Step 6: Write the worker README**

Create `analytics-worker/README.md`:

````markdown
# Answers analytics worker

Ingest endpoint for Brain Wars answer events. One record per answer attempt; duplicate event ids
are ignored, so the client may resend any batch safely.

## Deploy

1. Create a D1 database named `brain-wars-answers`.
2. Run `schema.sql` in the D1 console.
3. Create a Worker, paste `worker.mjs`, and bind the database as `DB` (Settings → Bindings).
4. Add a daily Cron Trigger for the retention cleanup.
5. Copy `https://<name>.<account>.workers.dev/ingest` into `ENDPOINT` in `../analytics.js`.

Keep the pasted copy and `worker.mjs` in sync — edit one, update the other.

## Manual checks

```bash
URL=https://<name>.<account>.workers.dev/ingest
EVENT='{"events":[{"id":"e-manual-0001","game":"time-calculations","correct":true,"ts":'$(date +%s000)',"device":"dev-test"}]}'

curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"   # 200, inserted:1
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"   # 200, inserted:0 (idempotent)
curl -i "$URL"                                                     # 405
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d 'garbage'  # 400
```

Backdated timestamps must not bypass the rate limit: send events with `"ts":0` in a loop; once the
IP passes 5000 events in 24 h, the response is `429`.

## Capture matrix

Run once before enabling `ENDPOINT`, with the browser console open (zero errors expected):

| Game | Wrong attempt | Solved problem | Expected rows |
| --- | --- | --- | --- |
| operations | tap a wrong operator | solve one | one `false`, one `true` |
| telling-time | tap a wrong time | solve one | one `false`, one `true` (never a `true` after a wrong tap) |
| follow-the-leader | miss a square | finish one | one `false`, one `true` |
| unfollow-the-leader | miss a square | finish one | one `false`, one `true` |
| long-division | type a wrong digit | solve one | one `false`, one `true` |
| long-multiplication | type a wrong digit | solve one | one `false`, one `true` |
| long-addition | type a wrong digit | solve one | one `false`, one `true` |
| long-subtraction | type a wrong digit | solve one | one `false`, one `true` |
| money-problems | answer a step wrong | solve one | one `false`, one `true` |
| elapsed-time | answer wrong | solve one | one `false`, one `true` |
| time-calculations | answer a step wrong | solve one | one `false`, one `true` |
| money-calculations | answer a step wrong | solve one | one `false`, one `true` |

Then: play offline (DevTools) → no console errors; go online → rows appear with `ip`, `country`,
`device`.

## Identifying your kid's rows

```sql
SELECT * FROM answers WHERE country = 'ES' ORDER BY ts DESC;          -- coarse
SELECT * FROM answers WHERE device IN ('…', '…') ORDER BY ts DESC;    -- confirmed devices
```

After a few days, list recent rows from Spain and copy the `device` values into your notes. An
installed iOS PWA and Safari on the same phone keep separate storage, so one phone can produce two
ids. IP addresses are cleared after 90 days by the daily cron; results are kept.
````

- [ ] **Step 7: Run all tests and commit**

Run: `node test-analytics.js && node test-i18n.js && node test-sw.js`
Expected: all green (27 + 49 + 12 checks).

```bash
git add analytics-worker/worker.mjs analytics-worker/schema.sql analytics-worker/README.md test-analytics.js
git commit -m "Add the answers analytics cleanup, schema and worker guide"
```

---

### Task 5: Browser bootstrap — capture, outbox, flush

**Files:**
- Modify: `analytics.js` (add the guarded bootstrap after the core)
- Modify: `test-analytics.js` (no new checks; the require-safety is already covered)

**Interfaces:**
- Consumes: the Task 1 core (`buildEvent`, `enqueue`, `takeBatch`, `ack`, `risingEdges`, `captureEvent`, `flushOnce`) and `BrainWarsGames.byFile`, `I18n.t`.
- Produces: no new exports; the module side effect runs only in a browser with a non-empty `ENDPOINT` on a game page.

- [ ] **Step 1: Implement the bootstrap**

In `analytics.js`, insert before the closing `})(typeof window !== 'undefined' ? window : globalThis);`:

```js
    /* ---------- browser bootstrap ---------- */

    function signalHit(signal) {
        if (!signal) return false;
        if (signal.kind === 'class') {
            return [...document.querySelectorAll(signal.selector)].some((element) => element.classList.contains(signal.value));
        }
        const element = document.querySelector(signal.selector);
        if (!element) return false;
        if (signal.kind === 'style') return element.style[signal.property] === signal.value;
        if (signal.kind === 'text') return element.textContent.trim() === global.I18n.t(signal.key);
        return false;
    }

    function safeStorage() {
        try {
            return global.localStorage;
        } catch (error) {
            return null;
        }
    }

    function readQueue(storage) {
        try {
            const parsed = storage ? JSON.parse(storage.getItem(QUEUE_KEY) || '[]') : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function deviceId(storage) {
        try {
            const existing = storage && storage.getItem(DEVICE_KEY);
            if (existing) return existing;
            const created = randomId('d-');
            if (storage) storage.setItem(DEVICE_KEY, created);
            return created;
        } catch (error) {
            return randomId('d-');
        }
    }

    function start(game) {
        const storage = safeStorage();
        const device = deviceId(storage);
        const captureState = { mistakeSeen: false };
        let hits = { mistake: false, completion: false };
        let queue = readQueue(storage);
        let flushState = { backoff: 0, nextTryAt: 0, permanentTries: 0 };
        let flushing = false;
        let lastFlushAt = 0;

        const persist = () => {
            try {
                if (storage) storage.setItem(QUEUE_KEY, JSON.stringify(queue));
            } catch (error) {
                // Storage full or unavailable: the in-memory queue still works.
            }
        };

        const evaluate = () => {
            const next = { mistake: signalHit(game.mistake), completion: signalHit(game.completion) };
            risingEdges(hits, next).forEach((edge) => {
                const correct = captureEvent(captureState, edge, game.id);
                if (correct !== null) {
                    queue = enqueue(queue, buildEvent(game.id, correct, Date.now(), device), QUEUE_MAX);
                    persist();
                    scheduleFlush(true);
                }
            });
            hits = next;
        };

        const post = async (batch) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
            try {
                const response = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ events: batch }),
                    signal: controller.signal
                });
                await response.json(); // An unparseable body counts as a failure.
                return response.status;
            } finally {
                clearTimeout(timer);
            }
        };

        const flush = async () => {
            if (flushing) return;
            flushing = true;
            try {
                while (queue.length && Date.now() >= flushState.nextTryAt) {
                    const result = await flushOnce(queue, post, flushState, Date.now());
                    queue = result.queue;
                    flushState = result;
                    persist();
                    if (flushState.nextTryAt > 0) break;
                }
            } finally {
                flushing = false;
            }
        };

        function scheduleFlush(onlyIfIdle) {
            const now = Date.now();
            if (onlyIfIdle && now - lastFlushAt < MIN_FLUSH_GAP_MS) return;
            lastFlushAt = now;
            flush();
        }

        hits = { mistake: signalHit(game.mistake), completion: signalHit(game.completion) }; // baseline, no events
        new MutationObserver(evaluate).observe(document.documentElement, {
            subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
        global.addEventListener('online', () => scheduleFlush(false));
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleFlush(false);
        });
        scheduleFlush(false);
    }

    if (typeof document !== 'undefined' && ENDPOINT) {
        const file = global.location.pathname.split('/').pop() || 'index.html';
        const game = global.BrainWarsGames && global.BrainWarsGames.byFile(file);
        if (game) start(game);
    }
```

- [ ] **Step 2: Verify the module stays require-safe and all tests pass**

Run: `node test-analytics.js && node test-i18n.js && node test-sw.js`
Expected: all green (27 + 49 + 12 checks) — the bootstrap must not run in Node.

- [ ] **Step 3: Commit**

```bash
git add analytics.js
git commit -m "Add the answers analytics capture and flush bootstrap"
```

---

### Task 6: Wire the game pages

**Files:**
- Modify: `test-i18n.js` (new page-wiring check)
- Modify: 12 game pages: `follow-the-leader.html`, `unfollow-the-leader.html`, `operations.html`, `telling-time-es.html`, `long-division.html`, `long-multiplication.html`, `long-addition.html`, `long-subtraction.html`, `money-problems.html`, `elapsed-time.html`, `time-calculations.html`, `money-calculations.html`

**Interfaces:**
- Consumes: `analytics.js` from Task 5.
- Produces: every game page loads the module; the check iterates `INTEGRATED_PAGES` (hidden games included), unlike the existing `Games.all()` loop.

- [ ] **Step 1: Write the failing check**

In `test-i18n.js`, after the `check('the hub renders its grid from the registry', ...)` block, add:

```js
check('every game page loads the analytics module', () => {
    INTEGRATED_PAGES.forEach((file) => {
        if (!Games.byFile(file)) return;
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.ok(html.includes('src="analytics.js"'), file + ' must load analytics.js');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-i18n.js`
Expected: FAIL — `follow-the-leader.html must load analytics.js`.

- [ ] **Step 3: Add the script tag to all 12 pages**

In each page, insert a new line immediately after the `games.js` script tag:

```html
    <script src="analytics.js" defer></script>
```

Example for `money-calculations.html` (same pattern in every page):

```html
    <script src="i18n.js" defer></script>
    <script src="games.js" defer></script>
    <script src="analytics.js" defer></script>
    <script src="money-calculations.js" defer></script>
    <script src="challenge.js" defer></script>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-i18n.js && node test-analytics.js`
Expected: all green (50 + 27 checks).

- [ ] **Step 5: Commit**

```bash
git add test-i18n.js follow-the-leader.html unfollow-the-leader.html operations.html telling-time-es.html long-division.html long-multiplication.html long-addition.html long-subtraction.html money-problems.html elapsed-time.html time-calculations.html money-calculations.html
git commit -m "Load the answers analytics module on every game page"
```

---

### Task 7: Precache, version bump, and documentation

**Files:**
- Modify: `sw.js` (precache entry, `VERSION`)
- Modify: `test-sw.js` (precache and core-files expectations)
- Modify: `README.md` (tests list, structure, Analytics section, intro wording)

**Interfaces:**
- Consumes: `analytics.js` (Task 5) and the page wiring (Task 6).
- Produces: offline availability of the module; docs.

- [ ] **Step 1: Update the failing expectations**

In `test-sw.js`, add `'./analytics.js'` to the core runtime files list in the
`check('core runtime files are precached', ...)` array (after `'./challenge.js'`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-sw.js`
Expected: FAIL — `./analytics.js is missing from PRECACHE`.

- [ ] **Step 3: Update the service worker**

In `sw.js`: add `'./analytics.js',` to `PRECACHE` after `'./games.js',` and change
`const VERSION = 'v5';` to `const VERSION = 'v6';`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node test-sw.js`
Expected: all green (12 checks).

- [ ] **Step 5: Update the README**

- Intro (the "no frameworks, no build step, no accounts, no trackers" sentence): replace
  "no trackers" with "no third-party trackers".
- Tests section: add the line `node test-analytics.js # analytics client core and worker`.
- Project structure: add `analytics.js`, `analytics-worker/`, and `test-analytics.js` entries.
- Add a new section after **Features**:

```markdown
## Analytics (self-hosted)

The live app records one event per answer attempt in the author's own Cloudflare database: the
game, the result, the time, a random device id, and the request's IP address and country (set by
Cloudflare's edge). IP addresses are cleared after 90 days. Nothing is sent when no endpoint is
configured — the repository ships disabled. No cookies, no third parties, no accounts. To run your
own, see [`analytics-worker/README.md`](analytics-worker/README.md).
```

- [ ] **Step 6: Run everything and commit**

Run: `node test-analytics.js && node test-i18n.js && node test-sw.js`
Expected: all green (27 + 50 + 12 checks).

```bash
git add sw.js test-sw.js README.md
git commit -m "Precache the analytics module and document the feature"
```

---

### Task 8: Deploy, enable, and verify end-to-end

**Files:**
- Modify: `analytics.js` (`ENDPOINT`)
- Modify: `sw.js` (`VERSION` `v6` → `v7` — same commit as enabling)

**Interfaces:**
- Consumes: everything above.
- Produces: the deployed pipeline; no new code interfaces.

- [ ] **Step 1: Deploy the worker (user-assisted)**

Follow `analytics-worker/README.md`: create the D1 database, run `schema.sql`, deploy the Worker,
bind `DB`, add the daily cron trigger, and note the `/ingest` URL.

- [ ] **Step 2: Run the curl checks**

Run the README's curl block. Expected: first POST `inserted:1`, second `inserted:0`, `GET` 405,
garbage 400, backdated-`ts` loop ends in `429`.

- [ ] **Step 3: Enable the endpoint**

Set `ENDPOINT` in `analytics.js` to the deployed `/ingest` URL and bump `VERSION` to `v7` in
`sw.js` — one commit:

```bash
git add analytics.js sw.js
git commit -m "Enable the answers analytics endpoint"
```

- [ ] **Step 4: Verify in the browser**

Run `python3 -m http.server 8000`, then run the worker README's capture matrix (12 games, wrong
attempt + solved problem) and the offline check: play offline → zero console errors; go online →
rows appear in D1 with `ip`, `country`, `device`; replay a batch → no duplicates.

- [ ] **Step 5: Push**

```bash
git push
```
