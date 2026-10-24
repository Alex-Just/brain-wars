/**
 * Shared cool-down after a wrong answer: bottom red progress bar, same question
 * stays visible, answer controls blocked for WRONG_WAIT_MS.
 *
 * Browser: window.BrainWarsWrongWait. Node (tests): module.exports.
 */
((global) => {
    'use strict';

    const WRONG_WAIT_MS = 5000;
    const STYLE_ID = 'bw-wrong-wait-style';
    const PANEL_CLASS = 'bw-wrong-wait';
    const CAPTURE_CLASS = 'bw-wrong-wait-capture';
    const LABEL_CLASS = 'bw-wrong-wait-label';
    const TRACK_CLASS = 'bw-wrong-wait-track';
    const FILL_CLASS = 'bw-wrong-wait-fill';
    const FILL_RUNNING_CLASS = 'is-running';
    const LABEL_FALLBACK = 'Wait to try again';
    const LABEL_KEY = 'ww_wait_retry';

    let inflight = null;
    let activeNodes = null;
    let keyGuard = null;

    const NAV_ALLOW_SELECTOR = '.top-nav, .top-left-nav, [data-lang-toggle]';

    function resolveDocument(options) {
        return options.document || global.document;
    }

    function resolveMount(doc, options) {
        if (options.mount) return options.mount;
        // Prefer the game main so the hub top-nav stays usable during the wait.
        return doc.getElementById('game')
            || doc.querySelector?.('main.game')
            || doc.querySelector?.('main.game-card')
            || doc.querySelector?.('main')
            || doc.body;
    }

    function isLocked() {
        return inflight !== null;
    }

    function installKeyGuard(doc) {
        if (keyGuard || !doc?.addEventListener) return;
        keyGuard = (event) => {
            const target = event.target;
            if (target && typeof target.closest === 'function' && target.closest(NAV_ALLOW_SELECTOR)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
        };
        doc.addEventListener('keydown', keyGuard, true);
    }

    function removeKeyGuard(doc) {
        if (!keyGuard || !doc?.removeEventListener) return;
        doc.removeEventListener('keydown', keyGuard, true);
        keyGuard = null;
    }

    function labelText() {
        const i18n = global.I18n;
        if (i18n && typeof i18n.t === 'function') {
            try {
                const text = i18n.t(LABEL_KEY);
                if (text && text !== LABEL_KEY) return text;
            } catch {
                // fall through
            }
        }
        return LABEL_FALLBACK;
    }

    function prefersReducedMotion(doc) {
        const view = doc.defaultView || global;
        if (!view.matchMedia) return false;
        try {
            return view.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            return false;
        }
    }

    function ensureStyles(doc) {
        if (doc.getElementById?.(STYLE_ID)) return;
        if (!doc.head || !doc.createElement) return;
        const style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.${CAPTURE_CLASS} {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: transparent;
    touch-action: none;
}
.${PANEL_CLASS} {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 41;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid #FFCDD2;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(211, 47, 47, 0.15);
    pointer-events: none;
}
.${LABEL_CLASS} {
    margin: 0 0 8px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #D32F2F;
}
.${TRACK_CLASS} {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: #FFEBEE;
}
.${FILL_CLASS} {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: #D32F2F;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform linear;
    will-change: transform;
}
.${FILL_CLASS}.${FILL_RUNNING_CLASS} {
    transform: scaleX(1);
}
@media (prefers-reduced-motion: reduce) {
    .${FILL_CLASS} {
        transition: none;
    }
}
`.trim();
        doc.head.appendChild(style);
    }

    function ensureMountPosition(mount) {
        if (!mount?.style) return;
        const view = mount.ownerDocument?.defaultView;
        if (view?.getComputedStyle) {
            const position = view.getComputedStyle(mount).position;
            if (position === 'static' || !position) {
                mount.style.position = 'relative';
            }
            return;
        }
        if (!mount.style.position) mount.style.position = 'relative';
    }

    function cleanup(doc) {
        removeKeyGuard(doc);
        if (activeNodes?.mount) {
            activeNodes.mount.removeAttribute?.('aria-busy');
        }
        if (!activeNodes) return;
        const { capture, panel } = activeNodes;
        if (typeof capture?.remove === 'function') capture.remove();
        if (typeof panel?.remove === 'function') panel.remove();
        activeNodes = null;
    }

    function mountUi(doc, mount, durationMs) {
        ensureStyles(doc);
        ensureMountPosition(mount);
        installKeyGuard(doc);
        mount.setAttribute?.('aria-busy', 'true');

        const capture = doc.createElement('div');
        capture.className = CAPTURE_CLASS;
        capture.setAttribute('aria-hidden', 'true');

        const panel = doc.createElement('div');
        panel.className = PANEL_CLASS;
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');

        const label = doc.createElement('p');
        label.className = LABEL_CLASS;
        label.textContent = labelText();

        const track = doc.createElement('div');
        track.className = TRACK_CLASS;

        const fill = doc.createElement('div');
        fill.className = FILL_CLASS;
        fill.style.transitionDuration = prefersReducedMotion(doc) ? '0ms' : `${durationMs}ms`;

        track.appendChild(fill);
        panel.appendChild(label);
        panel.appendChild(track);
        mount.appendChild(capture);
        mount.appendChild(panel);
        activeNodes = { capture, panel, fill, mount, doc };

        // Force a layout pass so the initial scaleX(0) is committed before we
        // flip to scaleX(1). A lone rAF is not enough on Mobile Safari: it often
        // paints the running state in the first frame and skips the transition.
        startFillAnimation(fill);
    }

    function startFillAnimation(fill) {
        const run = () => {
            fill.className = `${FILL_CLASS} ${FILL_RUNNING_CLASS}`;
        };
        // Reading layout forces the browser to apply scaleX(0) first.
        void fill.offsetWidth;
        if (typeof global.requestAnimationFrame !== 'function') {
            run();
            return;
        }
        global.requestAnimationFrame(() => {
            global.requestAnimationFrame(run);
        });
    }

    function runLock(options) {
        const doc = resolveDocument(options);
        if (!doc?.createElement) {
            return Promise.resolve();
        }
        const durationMs = Math.max(0, Number(options.durationMs) || WRONG_WAIT_MS);
        const mount = resolveMount(doc, options);
        mountUi(doc, mount, durationMs);

        return new Promise((resolve) => {
            global.setTimeout(() => {
                cleanup(doc);
                resolve();
            }, durationMs);
        });
    }

    function lock(options = {}) {
        if (inflight) return inflight;
        inflight = runLock(options).finally(() => {
            inflight = null;
        });
        return inflight;
    }

    function _resetForTests() {
        const doc = activeNodes?.doc;
        cleanup(doc);
        inflight = null;
    }

    const api = { WRONG_WAIT_MS, lock, isLocked, _resetForTests };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    global.BrainWarsWrongWait = api;
})(typeof window !== 'undefined' ? window : global);
