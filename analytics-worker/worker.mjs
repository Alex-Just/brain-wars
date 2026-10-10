/**
 * Brain Wars answers ingest: validate, rate-limit, and deduplicate events into D1.
 * Deploy from the Cloudflare dashboard; keep the pasted copy in sync with this file.
 */

export const GAME_IDS = [
    'follow-the-leader', 'unfollow-the-leader', 'operations', 'telling-time',
    'long-division', 'long-multiplication', 'long-addition', 'long-subtraction',
    'money-problems', 'elapsed-time', 'time-calculations', 'money-calculations'
];

const BATCH_MAX = 200;
const BODY_MAX_BYTES = 65536;
const RATE_LIMIT = 5000;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const INSERT_CHUNK = 50;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 500;
const CLEANUP_ROUNDS = 20;
const TS_PAST_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const TS_FUTURE_MS = 2 * 24 * 60 * 60 * 1000;
const ALLOWED_HOSTS = ['alex-just.github.io'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// Returns { valid, rejected } for a well-formed batch, or null for a malformed request.
export function validateEvents(events, now) {
    if (!Array.isArray(events) || events.length > BATCH_MAX) return null;
    const valid = [];
    let rejected = 0;
    for (const event of events) {
        const ok = event && typeof event === 'object' &&
            typeof event.id === 'string' && event.id.length >= 8 && event.id.length <= 64 &&
            GAME_IDS.includes(event.game) &&
            typeof event.correct === 'boolean' &&
            Number.isInteger(event.ts) && event.ts >= now - TS_PAST_MS && event.ts <= now + TS_FUTURE_MS &&
            typeof event.device === 'string' && event.device.length >= 1 && event.device.length <= 64;
        if (ok) {
            valid.push({ id: event.id, game: event.game, correct: event.correct ? 1 : 0, ts: event.ts, device: event.device });
        } else {
            rejected += 1;
        }
    }
    return { valid, rejected };
}
