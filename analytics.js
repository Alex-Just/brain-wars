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
    const BACKOFF_START_MS = 30000;
    const BACKOFF_CAP_MS = 300000;

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
        return current === 0 ? BACKOFF_START_MS : Math.min(current * 2, BACKOFF_CAP_MS);
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
        // A 429 waits the full five minutes immediately.
        const backoff = status === 429 ? BACKOFF_CAP_MS : nextBackoff(state.backoff);
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
