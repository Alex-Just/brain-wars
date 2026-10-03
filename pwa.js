/**
 * Registers the service worker that makes Brain Wars installable and playable
 * offline. Failure is silent: games must keep working if this never runs.
 *
 * When an updated worker takes over, the page reloads once so an installed app
 * shows the new version without waiting for every window to close. A first-ever
 * install is left alone: the page it just loaded is already current.
 */
'use strict';

(function () {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!wasControlled || reloading) return;
        reloading = true;
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
        }).catch(() => {});
    });
})();
