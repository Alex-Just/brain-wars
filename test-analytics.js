'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

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

check('reconcileQueue keeps events captured during the send', () => {
    const snapshot = [{ id: 'a' }, { id: 'b' }];
    const live = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const acked = Analytics.ack(snapshot, ['a', 'b']);
    assert.deepStrictEqual(Analytics.reconcileQueue(live, snapshot, acked), [{ id: 'c' }]);
});

check('reconcileQueue keeps the live queue when the send fails', () => {
    const snapshot = [{ id: 'a' }];
    const live = [{ id: 'a' }, { id: 'c' }];
    assert.deepStrictEqual(Analytics.reconcileQueue(live, snapshot, snapshot), [{ id: 'a' }, { id: 'c' }]);
});

check('the worker guide documents the live ingest and the rate limit', () => {
    const readme = fs.readFileSync(path.join(__dirname, 'analytics-worker', 'README.md'), 'utf8');
    assert.ok(readme.includes('https://brain-wars-answers.alex-just.workers.dev/ingest'), 'the guide names the live ingest URL');
    assert.ok(readme.includes('received_at'), 'the count uses received_at');
    assert.ok(readme.includes('wrangler deploy'), 'deploy uses Wrangler');
    assert.ok(readme.includes('v10'), 'the guide names the current service worker version');
    assert.ok(!readme.includes('"ts":0'), 'ts 0 is outside the validation window');
});

console.log('analytics worker');

const Games = require('./games.js');

(async () => {
    const Worker = await import('./analytics-worker/worker.mjs');
    const Report = await import('./analytics-worker/report.mjs');
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
        const compareStrings = (a, b) => a.localeCompare(b);
        const expected = Games.all().map((game) => game.id)
            .concat(['follow-the-leader', 'unfollow-the-leader']).sort(compareStrings);
        assert.deepStrictEqual([...Worker.GAME_IDS].sort(compareStrings), expected);
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

    const stubRequest = ({ method = 'POST', path = '/ingest', origin, body = '', cf, ip, headers = {} }) => ({
        method,
        url: 'https://worker.example' + path,
        headers: new Headers(Object.assign(
            origin ? { Origin: origin } : {},
            ip ? { 'CF-Connecting-IP': ip } : {},
            headers
        )),
        cf,
        text: async () => body
    });

    const stubDB = ({ count = 0, changes = 1, totalsRow = null, gamesRows = [] } = {}) => {
        const log = { inserts: [], updates: [], batches: [] };
        return {
            log,
            prepare(sql) {
                return {
                    bind(...values) {
                        return {
                            sql,
                            values,
                            first: async () => {
                                if (sql.includes('COUNT(*) AS n FROM answers WHERE ip = ?')) return { n: count };
                                if (sql.includes('COUNT(*) AS total')) return totalsRow || { total: 0, correct_count: 0, wrong_count: 0, active_days: 0, device_count: 0 };
                                return { n: count };
                            },
                            all: async () => {
                                if (sql.includes('GROUP BY game')) return { results: gamesRows };
                                return { results: [] };
                            },
                            run: async () => {
                                log.updates.push({ sql, values });
                                return { meta: { changes } };
                            }
                        };
                    }
                };
            },
            async batch(statements) {
                log.batches.push(statements);
                statements.forEach((statement) => {
                    log.inserts.push(statement);
                });
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
        assert.strictEqual(db.log.batches.length, 3); // 50 + 50 + 20
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

        const evil = await Worker.default.fetch(stubRequest({ origin: 'https://localhost.evil.com', body: batchBody([]) }), { DB: db });
        assert.strictEqual(evil.headers.get('Access-Control-Allow-Origin'), null);
    });

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

    console.log('weekly email reporter');

    await checkAsync('generateWeeklySummary calculates metrics and ranks top 3 skills needing practice', async () => {
        const db = stubDB({
            totalsRow: { total: 15, correct_count: 10, wrong_count: 5, active_days: 3, device_count: 1 },
            gamesRows: [
                { game: 'money-calculations', total: 6, correct_count: 3, wrong_count: 3, accuracy_pct: 50.0 },
                { game: 'long-multiplication', total: 4, correct_count: 2, wrong_count: 2, accuracy_pct: 50.0 },
                { game: 'time-calculations', total: 3, correct_count: 2, wrong_count: 1, accuracy_pct: 66.7 },
                { game: 'operations', total: 2, correct_count: 2, wrong_count: 0, accuracy_pct: 100.0 }
            ]
        });

        const summary = await Report.generateWeeklySummary(db, { now: NOW });
        assert.strictEqual(summary.total, 15);
        assert.strictEqual(summary.correct, 10);
        assert.strictEqual(summary.wrong, 5);
        assert.strictEqual(summary.accuracyPct, 66.7);
        assert.strictEqual(summary.activeDays, 3);
        assert.strictEqual(summary.topPractice.length, 3);
        assert.strictEqual(summary.topPractice[0].name, 'Money Calculations');
        assert.strictEqual(summary.topPractice[0].wrong, 3);
        assert.ok(summary.topPractice[0].tip.includes('100 cents'));
        assert.strictEqual(summary.topPractice[1].name, 'Long Multiplication');
        assert.strictEqual(summary.topPractice[2].name, 'Time Calculations');
        assert.strictEqual(summary.mastered.length, 1);
        assert.strictEqual(summary.mastered[0].name, 'Mental Math');
    });

    await checkAsync('generateWeeklySummary handles empty periods cleanly', async () => {
        const db = stubDB();
        const summary = await Report.generateWeeklySummary(db, { now: NOW });
        assert.strictEqual(summary.total, 0);
        assert.strictEqual(summary.accuracyPct, 0);
        assert.strictEqual(summary.topPractice.length, 0);
        assert.strictEqual(summary.mastered.length, 0);
    });

    await checkAsync('renderReportHtml and renderReportText contain key metrics, tips and links', () => {
        const mockSummary = {
            period: { sinceFormatted: 'Oct 3, 2026', nowFormatted: 'Oct 10, 2026' },
            total: 10,
            correct: 8,
            wrong: 2,
            accuracyPct: 80,
            activeDays: 2,
            topPractice: [{
                name: 'Money Calculations',
                wrong: 2,
                total: 5,
                accuracyPct: 60,
                skill: 'Column addition of euros and cents',
                tip: 'Remember 100 cents make 1 euro'
            }],
            mastered: [{ name: 'Mental Math', total: 5 }],
            games: [
                { name: 'Money Calculations', total: 5, correct: 3, wrong: 2, accuracyPct: 60 },
                { name: 'Mental Math', total: 5, correct: 5, wrong: 0, accuracyPct: 100 }
            ]
        };

        const html = Report.renderReportHtml(mockSummary);
        assert.ok(html.includes('Brain Wars'), 'html contains title');
        assert.ok(html.includes('Money Calculations'), 'html contains top practice game');
        assert.ok(html.includes('Remember 100 cents make 1 euro'), 'html contains specific tip');
        assert.ok(html.includes('https://alex-just.github.io/brain-wars/'), 'html contains game link');

        const text = Report.renderReportText(mockSummary);
        assert.ok(text.includes('BRAIN WARS - WEEKLY MATH REPORT'));
        assert.ok(text.includes('Money Calculations'));
        assert.ok(text.includes('Remember 100 cents make 1 euro'));
    });

    await checkAsync('sendReportEmail sends via Resend with Bearer auth and recipient', async () => {
        const originalFetch = globalThis.fetch;
        let sentUrl = null;
        let sentHeaders = null;
        let sentBody = null;

        globalThis.fetch = async (url, options) => {
            sentUrl = url;
            sentHeaders = options.headers;
            sentBody = JSON.parse(options.body);
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ id: 'resend-123' })
            };
        };

        try {
            const env = { RESEND_API_KEY: 're_test_key_123', REPORT_EMAIL: 'parent@example.com' };
            const summary = {
                period: { sinceFormatted: 'Oct 3, 2026', nowFormatted: 'Oct 10, 2026' },
                total: 5, correct: 4, wrong: 1, accuracyPct: 80, activeDays: 1,
                topPractice: [], mastered: [], games: []
            };
            const result = await Report.sendReportEmail(env, summary);
            assert.strictEqual(result.ok, true);
            assert.strictEqual(result.provider, 'resend');
            assert.strictEqual(sentUrl, 'https://api.resend.com/emails');
            assert.strictEqual(sentHeaders.Authorization, 'Bearer re_test_key_123');
            assert.deepStrictEqual(sentBody.to, ['parent@example.com']);
            assert.ok(sentBody.subject.includes('Brain Wars Weekly'));
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    await checkAsync('sendReportEmail gracefully reports missing configuration', async () => {
        const summary = {
            period: { sinceFormatted: 'Oct 3, 2026', nowFormatted: 'Oct 10, 2026' },
            total: 0, correct: 0, wrong: 0, accuracyPct: 0, activeDays: 0,
            topPractice: [], mastered: [], games: []
        };
        const noRecipient = await Report.sendReportEmail({}, summary);
        assert.strictEqual(noRecipient.ok, false);
        assert.ok(noRecipient.error.includes('No recipient configured'));

        const noProvider = await Report.sendReportEmail({ REPORT_EMAIL: 'parent@example.com' }, summary);
        assert.strictEqual(noProvider.ok, false);
        assert.strictEqual(noProvider.provider, 'none');
        assert.ok(noProvider.error.includes('No email provider configured'));
    });

    await checkAsync('fetch serves /report/preview as HTML or JSON with token validation', async () => {
        const db = stubDB({
            totalsRow: { total: 5, correct_count: 3, wrong_count: 2, active_days: 1, device_count: 1 },
            gamesRows: [{ game: 'operations', total: 5, correct_count: 3, wrong_count: 2, accuracy_pct: 60 }]
        });
        const env = { DB: db, REPORT_TOKEN: 'secret123' };

        // Missing token -> 401
        const resUnauth = await Worker.default.fetch(stubRequest({ method: 'GET', path: '/report/preview' }), env);
        assert.strictEqual(resUnauth.status, 401);

        // With valid token header -> 200 HTML
        const resHtml = await Worker.default.fetch(stubRequest({
            method: 'GET',
            path: '/report/preview',
            headers: { Authorization: 'Bearer secret123' }
        }), env);
        assert.strictEqual(resHtml.status, 200);
        assert.ok(resHtml.headers.get('Content-Type').includes('text/html'));
        const html = await resHtml.text();
        assert.ok(html.includes('Brain Wars'));

        // With query param token and format=json -> 200 JSON
        const resJson = await Worker.default.fetch(stubRequest({
            method: 'GET',
            path: '/report/preview?token=secret123&format=json'
        }), env);
        assert.strictEqual(resJson.status, 200);
        const data = await resJson.json();
        assert.strictEqual(data.total, 5);
    });

    await checkAsync('scheduled triggers weekly report on Sunday cron', async () => {
        const originalFetch = globalThis.fetch;
        let emailSent = false;
        globalThis.fetch = async () => {
            emailSent = true;
            return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'sent' }) };
        };

        try {
            const db = stubDB({ changes: 1 });
            const env = { DB: db, RESEND_API_KEY: 'test', REPORT_EMAIL: 'parent@example.com' };
            await Worker.default.scheduled({ cron: '0 18 * * SUN' }, env, {});
            assert.strictEqual(emailSent, true, 'weekly email sent on Sunday cron');
            assert.strictEqual(db.log.updates.length, 1, 'IP cleanup also ran');
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    console.log('\nAll ' + passed + ' checks passed.');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
