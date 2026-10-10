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
})(typeof window !== 'undefined' ? window : globalThis);
