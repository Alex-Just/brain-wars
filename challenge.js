/**
 * Brain Wars challenge mode.
 *
 * Two roles in one file:
 *  1. Run model (create / load / save) used by challenge.html.
 *  2. Engine: when a game page is opened with ?challenge=1 it draws the top progress bar,
 *     pins the level, watches the game's completion and mistake signals and takes the
 *     player to the next game. Outside a challenge it is a no-op.
 *
 * Browser: window.BrainWarsChallenge. Depends on i18n.js and games.js.
 */
(function (global) {
    'use strict';

    const RUN_KEY = 'brainwars_challenge_v1';
    // Language chosen on the challenge page before a run exists
    const LANG_KEY = 'brainwars_challenge_lang_v1';
    const PAGE = 'challenge.html';
    const PARAM = 'challenge';
    const LIMITS = { games: [1, 50], level: [1, 20] };
    const DEFAULTS = { games: 10, level: 10 };
    // The game pages own their DOM; polling their two signals is simpler and steadier
    // than re-binding observers per game, and the signals stay up for hundreds of ms.
    const SIGNAL_POLL_MS = 250;
    // Time to let the game's own success screen play before moving on
    const ADVANCE_MS = 1500;

    /* ------------------------------ run model ------------------------------ */

    function clamp(value, limits) {
        return Math.min(Math.max(Math.round(Number(value) || 0), limits[0]), limits[1]);
    }

    function loadRun() {
        try {
            const run = JSON.parse(global.localStorage.getItem(RUN_KEY));
            return run && typeof run === 'object' && Array.isArray(run.queue) ? run : null;
        } catch (error) {
            return null; // private mode or corrupted value
        }
    }

    function saveRun(run) {
        try {
            global.localStorage.setItem(RUN_KEY, JSON.stringify(run));
        } catch (error) {
            /* private mode: the run simply will not survive a reload */
        }
    }

    function clearRun() {
        try {
            global.localStorage.removeItem(RUN_KEY);
        } catch (error) {
            /* private mode */
        }
    }

    // A language picked by hand sticks for the run, or for the next one when no run exists yet
    function rememberManualLanguage(lang) {
        const current = loadRun();
        if (current) {
            current.lang = lang;
            saveRun(current);
            return;
        }
        try {
            global.localStorage.setItem(LANG_KEY, lang);
        } catch (error) {
            /* private mode */
        }
    }

    function takePendingLanguage() {
        try {
            const lang = global.localStorage.getItem(LANG_KEY);
            if (lang) global.localStorage.removeItem(LANG_KEY);
            return lang || null;
        } catch (error) {
            return null;
        }
    }

    function watchLanguageChoice() {
        // Capture phase: the language buttons stop propagation of their own clicks
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.lang-btn');
            if (!button || !button.dataset.lang) return;
            rememberManualLanguage(button.dataset.lang);
        }, true);
    }

    function shuffle(list) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Game order is dealt like cards: every game type is played once before any of
    // them comes back, so similar games never pile up.
    function buildQueue(total) {
        const ids = global.BrainWarsGames.all().map((game) => game.id);
        const queue = [];
        let last = null;
        while (queue.length < total) {
            const round = shuffle(ids.filter((id) => id !== last));
            queue.push(...round);
            last = round[round.length - 1];
        }
        return queue.slice(0, total);
    }

    function createRun(games, level) {
        const queue = buildQueue(clamp(games, LIMITS.games));
        const run = {
            total: queue.length,
            level: clamp(level, LIMITS.level),
            lang: takePendingLanguage(),
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
    let run = inChallenge ? loadRun() : null;
    const active = Boolean(inChallenge && run);

    const Challenge = {
        limits: LIMITS,
        defaults: DEFAULTS,
        clamp: clamp,
        loadRun: loadRun,
        clearRun: clearRun,
        createRun: createRun,
        stepUrl: stepUrl,
        // Remember a language the player picks by hand, on the setup page or in a step
        watchLanguageChoice: watchLanguageChoice,
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

    // Each step reads in a random language, never the same one twice, unless a language
    // was picked by hand: that one then sticks for the rest of the run.
    function applyStepLanguage() {
        if (run.lang) {
            global.I18n.setLang(run.lang);
            return;
        }
        const others = global.I18n.supportedLangs.filter((lang) => lang !== global.I18n.getLang());
        if (others.length) {
            global.I18n.setLang(others[Math.floor(Math.random() * others.length)]);
        }
    }

    applyStepLanguage();

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
                align-items: center; gap: 8px; box-sizing: border-box;
                padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-left)) 8px;
                background: rgba(255, 255, 255, 0.97); border-bottom: 1px solid #e2e8f0;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); font-family: inherit; }
            .ch-track { flex: 1 1 auto; display: flex; gap: 2px; height: 10px; min-width: 40px; }
            .ch-seg { flex: 1 1 0; min-width: 2px; border-radius: 3px; background: #e2e8f0; }
            .ch-seg.is-done { background: #4CAF50; }
            .ch-flag { flex: 0 0 auto; font-size: 14px; }
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
        `;
        document.head.appendChild(style);
    }

    function mountBar() {
        const bar = document.createElement('div');
        bar.className = 'ch-bar';
        bar.setAttribute('role', 'status');
        bar.setAttribute('data-i18n-aria-label', 'ch_progress_aria');
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
        return flag;
    }

    function pointBackLink() {
        const back = document.getElementById('backBtn');
        if (!back) return;
        // Leaving a step goes back to the challenge, not to the hub
        back.setAttribute('href', PAGE);
        back.setAttribute('data-i18n-aria-label', 'ch_title');
        back.setAttribute('aria-label', global.I18n.t('ch_title'));
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

    // The games show their own success screen; the run just moves straight on.
    // A step with mistakes only lights the warning dot in the bar.
    function finishStep(flag) {
        if (run.dirty && flag) flag.hidden = false;
        global.setTimeout(() => { global.location.href = completeStep(); }, ADVANCE_MS);
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
        pointBackLink();
        hideLevelPicker();
        watchLanguageChoice();
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
