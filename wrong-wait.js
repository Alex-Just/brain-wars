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
    const FILL_ACTIVE_CLASS = 'is-active';
    const LABEL_FALLBACK = 'Wait to try again';
    const LABEL_KEY = 'ww_wait_retry';

    let inflight = null;
    let activeNodes = null;

    function resolveDocument(options) {
        return options.document || global.document;
    }

    function resolveMount(doc, options) {
        if (options.mount) return options.mount;
        return doc.getElementById('game') || doc.body;
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
        if (doc.getElementById && doc.getElementById(STYLE_ID)) return;
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
    width: 0%;
    height: 100%;
    border-radius: 999px;
    background: #D32F2F;
    transition: width linear;
}
.${FILL_CLASS}.${FILL_ACTIVE_CLASS} {
    width: 100%;
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
        if (!mount || !mount.style) return;
        const view = mount.ownerDocument && mount.ownerDocument.defaultView;
        if (view && view.getComputedStyle) {
            const position = view.getComputedStyle(mount).position;
            if (position === 'static' || !position) {
                mount.style.position = 'relative';
            }
            return;
        }
        if (!mount.style.position) mount.style.position = 'relative';
    }

    function cleanup() {
        if (!activeNodes) return;
        const { capture, panel } = activeNodes;
        if (capture && typeof capture.remove === 'function') capture.remove();
        if (panel && typeof panel.remove === 'function') panel.remove();
        activeNodes = null;
    }

    function mountUi(doc, mount, durationMs) {
        ensureStyles(doc);
        ensureMountPosition(mount);

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
        activeNodes = { capture, panel, fill };

        // Next frame so the width transition runs from 0 → 100%.
        const start = () => {
            fill.className = `${FILL_CLASS} ${FILL_ACTIVE_CLASS}`;
        };
        if (typeof global.requestAnimationFrame === 'function') {
            global.requestAnimationFrame(start);
        } else {
            start();
        }
    }

    function runLock(options) {
        const doc = resolveDocument(options);
        if (!doc || !doc.createElement) {
            return Promise.resolve();
        }
        const durationMs = Math.max(0, Number(options.durationMs) || WRONG_WAIT_MS);
        const mount = resolveMount(doc, options);
        mountUi(doc, mount, durationMs);

        return new Promise((resolve) => {
            global.setTimeout(() => {
                cleanup();
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
        cleanup();
        inflight = null;
    }

    const api = { WRONG_WAIT_MS, lock, _resetForTests };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    global.BrainWarsWrongWait = api;
})(typeof window !== 'undefined' ? window : global);
