/**
 * Registers the service worker that makes Brain Wars installable and playable
 * offline. Failure is silent: games must keep working if this never runs.
 */
'use strict';

(function () {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
        }).catch(() => {});
    });
})();
