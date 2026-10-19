/**
 * Brain Wars challenge mode.
 *
 * Two roles in one file:
 *  1. Run model (create / load / save) used by challenge.html.
 *  2. Engine: when a game page is opened with ?challenge=1 it draws the top progress bar,
 *     pins the level, watches the game's completion and mistake signals and takes the
 *     player to the next step. Every step replaces the current history entry, so Back
 *     always exits to the hub instead of replaying earlier rounds. Outside a challenge
 *     it is a no-op.
 *
 * Browser: window.BrainWarsChallenge. Depends on i18n.js and games.js.
 */
((global) => {
    'use strict';

    const RUN_KEY = 'brainwars_challenge_v1';
    const PAGE = 'challenge.html';
    const PARAM = 'challenge';
    const LIMITS = { games: [1, 50], level: [1, 20] };
    const DEFAULTS = { games: 10, level: 10 };
    // The game pages own their DOM; polling their two signals is simpler and steadier
    // than re-binding observers per game, and the signals stay up for hundreds of ms.
    const SIGNAL_POLL_MS = 250;

    /* ------------------------------ run model ------------------------------ */

    function clamp(value, limits) {
        return Math.min(Math.max(Math.round(Number(value) || 0), limits[0]), limits[1]);
    }

    function loadRun() {
        try {
            const run = JSON.parse(global.localStorage.getItem(RUN_KEY));
            return run && typeof run === 'object' && Array.isArray(run.queue) ? run : null;
        } catch {
            return null; // private mode or corrupted value
        }
    }

    function saveRun(run) {
        try {
            global.localStorage.setItem(RUN_KEY, JSON.stringify(run));
        } catch {
            /* private mode: the run simply will not survive a reload */
        }
    }

    function clearRun() {
        try {
            global.localStorage.removeItem(RUN_KEY);
        } catch {
            /* private mode */
        }
    }

    function shuffle(list, randomFn = () => global.BrainWarsGames.random()) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(randomFn() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Smoothed recent-error rate: 2.0 with no history, near 1.0 for a clean record,
    // near 3.0 for an all-wrong record.
    function weightFor(row) {
        const total = row ? Math.max(0, Number(row.total) || 0) : 0;
        const wrong = row ? Math.min(total, Math.max(0, Number(row.wrong) || 0)) : 0;
        return 1 + 2 * ((wrong + 1) / (total + 2));
    }

    function parsePracticeHistory(payload) {
        const rows = payload && Array.isArray(payload.games) ? payload.games : null;
        if (!rows) return null;
        const history = {};
        rows.forEach((row) => {
            if (!row || typeof row.game !== 'string' || !row.game) return;
            const total = Math.max(0, Number(row.total) || 0);
            history[row.game] = { total, wrong: Math.min(total, Math.max(0, Number(row.wrong) || 0)) };
        });
        return Object.keys(history).length ? history : null;
    }

    function weightedPick(items, weights, randomFn) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let roll = randomFn() * total;
        for (let i = 0; i < items.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    // Efraimidis-Spirakis: a weighted draw without replacement.
    function weightedSample(items, weights, count, randomFn) {
        return items
            .map((item, index) => ({ item, key: Math.pow(Math.max(randomFn(), Number.MIN_VALUE), 1 / weights[index]) }))
            .sort((a, b) => b.key - a.key)
            .slice(0, count)
            .map((entry) => entry.item);
    }

    // The original deal: every game type is played once before any of them comes
    // back. Used when no recent practice history is available.
    function buildUniformQueue(total, randomFn) {
        const ids = global.BrainWarsGames.all().map((game) => game.id);
        const queue = [];
        let last = null;
        while (queue.length < total) {
            const round = shuffle(ids.filter((id) => id !== last), randomFn);
            queue.push(...round);
            last = round[round.length - 1];
        }
        return queue.slice(0, total);
    }

    function buildQueue(total, history, randomFn = () => global.BrainWarsGames.random()) {
        const ids = global.BrainWarsGames.all().map((game) => game.id);
        const known = ids.some((id) => history && history[id]);
        if (!known) return buildUniformQueue(total, randomFn);

        const weightOf = (id) => weightFor(history[id]);
        const first = Math.min(total, ids.length);
        // Every game gets one turn when the run is long enough; the weighted draw
        // decides which strongest game is left out when the run is shorter.
        const queue = shuffle(weightedSample(ids, ids.map(weightOf), first, randomFn), randomFn);

        const appearances = new Map();
        queue.forEach((id) => appearances.set(id, (appearances.get(id) || 0) + 1));
        const cap = Math.max(2, Math.ceil(total / ids.length) + 1);

        // Practice turns: weighted repeats, never back-to-back, with a cap so one
        // weak game cannot crowd out the rest of a long run.
        while (queue.length < total) {
            const last = queue[queue.length - 1];
            let candidates = ids.filter((id) => id !== last && (appearances.get(id) || 0) < cap);
            if (!candidates.length) candidates = ids.filter((id) => id !== last);
            if (!candidates.length) candidates = ids;
            const pick = weightedPick(candidates, candidates.map(weightOf), randomFn);
            queue.push(pick);
            appearances.set(pick, (appearances.get(pick) || 0) + 1);
        }
        return queue;
    }

    const PRACTICE_DAYS = 3;
    const PRACTICE_TIMEOUT_MS = 3000;

    function practiceUrl(device, endpoint) {
        const ingest = typeof endpoint === 'string' ? endpoint : global.BrainWarsAnalytics?.ENDPOINT;
        if (!device || !ingest) return null;
        return ingest.replace(/\/ingest\/?$/, '') +
            '/practice?days=' + PRACTICE_DAYS + '&device=' + encodeURIComponent(device);
    }

    // Never rejects: the setup page races this against a short timer and starts with
    // the uniform queue when the worker is unreachable or has no history.
    function loadPracticeHistory(options = {}) {
        const Analytics = global.BrainWarsAnalytics;
        const fetchFn = options.fetch || global.fetch;
        const device = typeof options.device === 'string' ? options.device : Analytics?.getDeviceId?.();
        const url = practiceUrl(device, options.endpoint);
        if (!device || !url || typeof fetchFn !== 'function') return Promise.resolve(null);

        const timeoutMs = options.timeoutMs || PRACTICE_TIMEOUT_MS;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

        return Promise.resolve()
            .then(() => fetchFn(url, { headers: { Accept: 'application/json' }, signal: controller?.signal }))
            .then((response) => (response && response.ok ? response.json() : null))
            .then(parsePracticeHistory)
            .catch(() => null)
            .finally(() => { if (timer) clearTimeout(timer); });
    }

    function createRun(games, level, history) {
        const queue = buildQueue(clamp(games, LIMITS.games), history);
        const run = {
            total: queue.length,
            level: clamp(level, LIMITS.level),
            queue: queue.slice(1),
            current: queue[0],
            solved: 0,
            retries: 0,
            dirty: false
        };
        saveRun(run);
        return run;
    }

    function stepUrl(run) {
        return global.BrainWarsGames.byId(run.current).file + '?' + PARAM + '=1';
    }

    const inChallenge = typeof global.location !== 'undefined' &&
        new URLSearchParams(global.location.search).has(PARAM);
    const run = inChallenge ? loadRun() : null;
    const active = Boolean(inChallenge && run);

    const Challenge = {
        limits: LIMITS,
        defaults: DEFAULTS,
        clamp: clamp,
        loadRun: loadRun,
        clearRun: clearRun,
        createRun: createRun,
        stepUrl: stepUrl,
        weightFor: weightFor,
        parsePracticeHistory: parsePracticeHistory,
        buildQueue: buildQueue,
        practiceUrl: practiceUrl,
        loadPracticeHistory: loadPracticeHistory,
        // Starting level for games that read it while setting up their round
        startLevel: () => (active ? run.level : 1)
    };
    global.BrainWarsChallenge = Challenge;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Challenge;
    }

    if (!active) {
        return;
    }

    const game = global.BrainWarsGames.byFile(global.location.pathname.split('/').pop());

    // A stale tab, an abandoned run or a hand-typed URL: send the player where the run is
    if (!game || game.id !== run.current) {
        const expected = global.BrainWarsGames.byId(run.current);
        if (expected) {
            global.location.replace(stepUrl(run));
        } else {
            clearRun();
            global.location.replace(PAGE);
        }
        return;
    }

    /* ------------------------------- helpers ------------------------------- */

    function signalHit(signal) {
        if (!signal) return false;
        const element = document.querySelector(signal.selector);
        if (!element) return false;
        if (signal.kind === 'class') return element.classList.contains(signal.value);
        if (signal.kind === 'style') return element.style[signal.property] === signal.value;
        if (signal.kind === 'text') return element.textContent.trim() === global.I18n.t(signal.key);
        return false;
    }

    function completeStep() {
        if (run.dirty) {
            run.retries++;
            // The same game comes back, but only after the other types had their turn
            run.queue = run.queue.filter((id) => id !== run.current);
            run.queue.push(run.current);
        } else {
            run.solved++;
        }
        run.current = run.queue.shift() || null;
        run.dirty = false;
        saveRun(run);
        return run.current ? stepUrl(run) : PAGE + '?done=1';
    }

    /* -------------------------------- top bar ------------------------------ */

    function injectStyles() {
        if (document.getElementById('challenge-styles')) return;
        const style = document.createElement('style');
        style.id = 'challenge-styles';
        style.textContent = `
            .ch-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 400; display: flex;
                align-items: center; gap: 8px; box-sizing: border-box; min-height: 30px;
                padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-left)) 8px;
                background: rgba(255, 255, 255, 0.97); border-bottom: 1px solid #e2e8f0;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); font-family: inherit; }
            .ch-track { flex: 1 1 auto; display: flex; gap: 2px; height: 10px; min-width: 40px; }
            .ch-seg { flex: 1 1 0; min-width: 2px; border-radius: 3px; background: #e2e8f0; }
            .ch-seg.is-done { background: #4CAF50; }
            .ch-flag { flex: 0 0 auto; font-size: 14px; line-height: 1; }
            body.has-challenge {
                --ch-bar-offset: calc(34px + env(safe-area-inset-top, 0px));
                padding-top: var(--ch-bar-offset);
            }
            /* Some games position their header with position: fixed (operations,
               follow-the-leader, telling-time), where page padding does nothing, so the
               header has to be moved down by the same amount as the padding. */
            body.has-challenge .top-left-nav,
            body.has-challenge #levelDisplay {
                transform: translateY(var(--ch-bar-offset));
            }
            /* The custom-equation form has no place inside a challenge run */
            body.has-challenge #customEqBtn {
                display: none;
            }
            /* Nor do the games' own "solved!" screens: the run moves straight on.
               Hidden with CSS so they never flash before the step advances. */
            body.has-challenge .completion-overlay,
            body.has-challenge #instructions {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function mountBar() {
        const bar = document.createElement('div');
        bar.className = 'ch-bar';
        bar.setAttribute('role', 'status');
        bar.dataset.i18nAriaLabel = 'ch_progress_aria';
        bar.setAttribute('aria-label', global.I18n.t('ch_progress_aria'));

        const track = document.createElement('div');
        track.className = 'ch-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', String(run.total));
        track.setAttribute('aria-valuenow', String(run.solved));
        track.setAttribute('aria-valuetext', run.solved + ' / ' + run.total);
        for (let i = 0; i < run.total; i++) {
            const segment = document.createElement('span');
            segment.className = 'ch-seg' + (i < run.solved ? ' is-done' : '');
            track.appendChild(segment);
        }

        const flag = document.createElement('span');
        flag.className = 'ch-flag';
        flag.textContent = '⚠';
        flag.hidden = true;
        flag.setAttribute('aria-label', global.I18n.t('ch_dirty_title'));

        bar.append(track, flag);
        document.body.appendChild(bar);
        document.body.classList.add('has-challenge');

        // Reserve the bar's real height plus the same gap the games put under their header
        // row (10px), so the space above and below the flags stays equal on every device,
        // notch or not.
        const headerGap = 10;
        document.body.style.setProperty(
            '--ch-bar-offset',
            Math.ceil(bar.getBoundingClientRect().height) + headerGap + 'px'
        );

        return flag;
    }

    function hideLevelPicker() {
        const picker = document.querySelector('.level-picker');
        if (picker) picker.style.display = 'none';
    }

    // Picker games: choose the level through their own menu, which also starts a round.
    // The games render their menu items when the badge opens it, so open it first.
    function pinLevel() {
        if (game.level !== 'picker') return;
        const badge = document.getElementById('levelDisplay');
        if (!badge) return;
        badge.click();
        const item = document.querySelector('.level-menu-item[data-level="' + run.level + '"]');
        if (item) item.click();
    }

    /* ------------------------------ step flow ------------------------------ */

    // The game's own success screen is hidden during a run, so move on the moment the
    // step registers: waiting here only looks like a freeze. Replacing the entry (not
    // pushing one) keeps Back meaning "leave the challenge" on every step.
    function finishStep(flag) {
        if (run.dirty && flag) flag.hidden = false;
        document.body.style.pointerEvents = 'none';
        global.location.replace(completeStep());
    }

    function watchSignals(flag) {
        const tick = () => {
            if (!run.dirty && signalHit(game.mistake)) {
                run.dirty = true;
                saveRun(run);
                flag.hidden = false;
            }
            if (signalHit(game.completion)) {
                global.clearInterval(timer);
                finishStep(flag);
            }
        };
        const timer = global.setInterval(tick, SIGNAL_POLL_MS);
        tick();
    }

    function init() {
        injectStyles();
        const flag = mountBar();
        hideLevelPicker();
        watchSignals(flag);
        // The game builds its own DOM (level menu, board) in its own DOMContentLoaded handler
        global.addEventListener('load', pinLevel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : globalThis);
