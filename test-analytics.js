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
