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

function corsHeaders(origin) {
    if (!origin) return {};
    let url;
    try {
        url = new URL(origin);
    } catch (error) {
        return {};
    }
    const allowed = ALLOWED_HOSTS.includes(url.hostname) || LOCAL_HOSTS.includes(url.hostname);
    if (!allowed) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin'
    };
}

function json(body, status, headers) {
    return new Response(JSON.stringify(body), {
        status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
    });
}

export default {
    async fetch(request, env) {
        const cors = corsHeaders(request.headers.get('Origin') || '');
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }
        if (request.method !== 'POST' || url.pathname !== '/ingest') {
            return json({ error: 'not_found' }, 405, cors);
        }

        const body = await request.text();
        if (body.length > BODY_MAX_BYTES) {
            return json({ error: 'too_large' }, 400, cors);
        }
        let payload = null;
        try {
            payload = JSON.parse(body);
        } catch (error) {
            payload = null;
        }
        const now = Date.now();
        const checked = payload && validateEvents(payload.events, now);
        if (!checked) {
            return json({ error: 'invalid' }, 400, cors);
        }

        const ip = request.headers.get('CF-Connecting-IP') || null;
        const country = (request.cf && request.cf.country) || null;

        if (ip) {
            const row = await env.DB.prepare(
                'SELECT COUNT(*) AS n FROM answers WHERE ip = ? AND received_at > ?'
            ).bind(ip, now - RATE_WINDOW_MS).first();
            if ((row ? row.n : 0) + checked.valid.length > RATE_LIMIT) {
                return json({ error: 'rate_limit' }, 429, cors);
            }
        }

        let inserted = 0;
        for (let start = 0; start < checked.valid.length; start += INSERT_CHUNK) {
            const chunk = checked.valid.slice(start, start + INSERT_CHUNK);
            const statements = chunk.map((event) => env.DB.prepare(
                'INSERT OR IGNORE INTO answers (id, game, correct, ts, device, ip, country, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(event.id, event.game, event.correct, event.ts, event.device, ip, country, now));
            const results = await env.DB.batch(statements);
            inserted += results.reduce((sum, result) => sum + (result.meta ? result.meta.changes : 0), 0);
        }

        return json({
            inserted,
            ignored: checked.valid.length - inserted,
            rejected: checked.rejected
        }, 200, cors);
    },

    async scheduled(event, env) {
        const cutoff = Date.now() - RETENTION_MS;
        for (let round = 0; round < CLEANUP_ROUNDS; round++) {
            const result = await env.DB.prepare(
                'UPDATE answers SET ip = NULL WHERE id IN (SELECT id FROM answers WHERE received_at < ? AND ip IS NOT NULL LIMIT ?)'
            ).bind(cutoff, CLEANUP_BATCH).run();
            if (!result.meta || result.meta.changes < CLEANUP_BATCH) break;
        }
    }
};
