/**
 * Answer analytics: capture game results, queue them offline, upload them idempotently.
 * Disabled unless ENDPOINT is set and the page is not served from a local dev host.
 * Browser: window.BrainWarsAnalytics. Node (tests): module.exports.
 */
((global) => {
    'use strict';

    const ENDPOINT = 'https://brain-wars-answers.alex-just.workers.dev/ingest';
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
    const SUPPRESS_AFTER_MISTAKE = new Set(['telling-time']);

    /* ---------- pure core ---------- */

    // Event ids only have to be unique per attempt, and crypto keeps them
    // unguessable as well. Every browser this app supports has both methods,
    // and so does the Node the tests run on.
    function randomId(prefix) {
        if (crypto.randomUUID) return crypto.randomUUID();
        const buffer = new Uint32Array(2);
        crypto.getRandomValues(buffer);
        return `${prefix}${buffer[0].toString(36)}${buffer[1].toString(36)}`;
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

    function reconcileQueue(liveQueue, snapshot, resultQueue) {
        const kept = new Set(resultQueue.map((event) => event.id));
        const removed = new Set(snapshot.filter((event) => !kept.has(event.id)).map((event) => event.id));
        return liveQueue.filter((event) => !removed.has(event.id));
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
            const suppress = state.mistakeSeen && SUPPRESS_AFTER_MISTAKE.has(gameId);
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
        } catch {
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

    // The shared worker holds real players' data. A local dev server must never
    // upload its test runs, so loopback and file:// pages are not tracked.
    function isLocalHost(hostname) {
        const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
        if (host === 'localhost' || host.endsWith('.localhost')) return true;
        if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;
        return /^127(?:\.\d{1,3}){3}$/.test(host);
    }

    function shouldTrack(location) {
        if (!location) return false;
        if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
        return !isLocalHost(location.hostname);
    }

    // The reporter is created lazily: the browser bootstrap flushes the queue on
    // load, and the answer hook records into the same instance.
    let reporter = null;

    // The random device id the uploader uses, exposed so Challenge mode can ask the
    // worker for this device's practice history.
    function getDeviceId() {
        return deviceId(safeStorage());
    }

    const core = {
        buildEvent, enqueue, takeBatch, ack, reconcileQueue, risingEdges, captureEvent,
        classifyResponse, nextBackoff, flushOnce, getDeviceId, isLocalHost, shouldTrack,
        createReporter, recordAnswer,
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
        } catch {
            return null;
        }
    }

    function readQueue(storage) {
        try {
            const parsed = storage ? JSON.parse(storage.getItem(QUEUE_KEY) || '[]') : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function deviceId(storage) {
        try {
            const existing = storage?.getItem(DEVICE_KEY);
            if (existing) return existing;
            const created = randomId('d-');
            if (storage) storage.setItem(DEVICE_KEY, created);
            return created;
        } catch {
            return randomId('d-');
        }
    }

    async function postBatch(batch) {
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
    }

    // One shared queue for every answer. `post` and the clock are injectable so the
    // reporter can be tested without a browser or a network.
    function createReporter(options = {}) {
        const storage = options.storage !== undefined ? options.storage : safeStorage();
        const now = options.now || (() => Date.now());
        const post = options.post || postBatch;
        const device = options.device || deviceId(storage);
        let queue = readQueue(storage);
        let flushState = { backoff: 0, nextTryAt: 0, permanentTries: 0 };
        let flushing = false;
        let flushPromise = Promise.resolve();
        let lastFlushAt = 0;
        let started = false;

        const persist = () => {
            try {
                if (storage) storage.setItem(QUEUE_KEY, JSON.stringify(queue));
            } catch {
                // Storage full or unavailable: the in-memory queue still works.
            }
        };

        const flush = () => {
            if (flushing) return flushPromise;
            flushing = true;
            flushPromise = (async () => {
                try {
                    while (queue.length && now() >= flushState.nextTryAt) {
                        const snapshot = queue;
                        const result = await flushOnce(snapshot, post, flushState, now());
                        queue = reconcileQueue(queue, snapshot, result.queue);
                        flushState = {
                            backoff: result.backoff,
                            nextTryAt: result.nextTryAt,
                            permanentTries: result.permanentTries
                        };
                        persist();
                        if (flushState.nextTryAt > 0) break;
                    }
                } finally {
                    flushing = false;
                }
            })();
            return flushPromise;
        };

        const scheduleFlush = (onlyIfIdle) => {
            const current = now();
            if (onlyIfIdle && current - lastFlushAt < MIN_FLUSH_GAP_MS) return;
            lastFlushAt = current;
            if (!queue.length) return;
            void flush().catch(() => {});
        };

        const record = (game, correct) => {
            queue = enqueue(queue, buildEvent(game, correct, now(), device), QUEUE_MAX);
            persist();
            scheduleFlush(true);
        };

        const start = () => {
            if (started) return;
            started = true;
            if (typeof global.addEventListener === 'function') {
                global.addEventListener('online', () => scheduleFlush(false));
            }
            if (typeof document !== 'undefined' && document.addEventListener) {
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) scheduleFlush(false);
                });
            }
            scheduleFlush(false);
        };

        return { record, flush, start };
    }

    function ensureReporter() {
        if (!reporter) {
            reporter = createReporter();
            reporter.start();
        }
        return reporter;
    }

    // The shared answer hook: every game reports each graded tap here. A page on
    // loopback or file:// is never tracked, and analytics never breaks gameplay.
    function recordAnswer(game, correct) {
        if (!shouldTrack(global.location)) return false;
        try {
            ensureReporter().record(game, correct);
        } catch {
            return false;
        }
        return true;
    }

    function start(game) {
        const collector = ensureReporter();
        const captureState = { mistakeSeen: false };
        let hits = { mistake: signalHit(game.mistake), completion: signalHit(game.completion) };

        const evaluate = () => {
            const next = { mistake: signalHit(game.mistake), completion: signalHit(game.completion) };
            risingEdges(hits, next).forEach((edge) => {
                const correct = captureEvent(captureState, edge, game.id);
                if (correct !== null) collector.record(game.id, correct);
            });
            hits = next;
        };

        new MutationObserver(evaluate).observe(document.documentElement, {
            subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
    }

    if (typeof document !== 'undefined' && ENDPOINT && shouldTrack(global.location)) {
        const file = global.location.pathname.split('/').pop() || 'index.html';
        const game = global.BrainWarsGames?.byFile(file);
        if (game) {
            try {
                start(game);
            } catch {
                // Analytics must never break a game.
            }
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
