/**
 * Brain Wars answers ingest: validate, rate-limit, and deduplicate events into D1.
 * Also generates and delivers the weekly math progress report to parents.
 * Deploy from the Cloudflare dashboard; keep the pasted copy in sync with this file.
 */

import { generateWeeklySummary, renderReportHtml, sendReportEmail } from './report.mjs';

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
    } catch {
        return {};
    }
    const allowed = ALLOWED_HOSTS.includes(url.hostname) || LOCAL_HOSTS.includes(url.hostname);
    if (!allowed) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

        // Preview weekly report HTML or JSON
        if (request.method === 'GET' && url.pathname === '/report/preview') {
            if (env?.REPORT_TOKEN) {
                const auth = request.headers.get('Authorization');
                const token = url.searchParams.get('token');
                if (auth !== `Bearer ${env.REPORT_TOKEN}` && token !== env.REPORT_TOKEN) {
                    return json({ error: 'unauthorized' }, 401, cors);
                }
            }
            const days = parseInt(url.searchParams.get('days') || '7', 10);
            const device = url.searchParams.get('device') || env?.REPORT_DEVICE || null;
            const summary = await generateWeeklySummary(env.DB, { days, device });
            if (url.searchParams.get('format') === 'json') {
                return json(summary, 200, cors);
            }
            const html = renderReportHtml(summary);
            return new Response(html, {
                status: 200,
                headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, cors)
            });
        }

        // On-demand send weekly report
        if (request.method === 'POST' && url.pathname === '/report/send') {
            if (env?.REPORT_TOKEN) {
                const auth = request.headers.get('Authorization');
                const token = url.searchParams.get('token');
                if (auth !== `Bearer ${env.REPORT_TOKEN}` && token !== env.REPORT_TOKEN) {
                    return json({ error: 'unauthorized' }, 401, cors);
                }
            }
            const days = parseInt(url.searchParams.get('days') || '7', 10);
            const device = url.searchParams.get('device') || env?.REPORT_DEVICE || null;
            const summary = await generateWeeklySummary(env.DB, { days, device });
            const result = await sendReportEmail(env, summary);
            return json(result, result.ok ? 200 : 500, cors);
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
        } catch {
            payload = null;
        }
        const now = Date.now();
        const checked = payload && validateEvents(payload.events, now);
        if (!checked) {
            return json({ error: 'invalid' }, 400, cors);
        }

        const ip = request.headers.get('CF-Connecting-IP') || null;
        const country = request.cf?.country || null;

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
        const isWeeklyCron = event && (event.cron === '0 18 * * SUN' || event.cron === '0 18 * * 1' || event.cron === '0 18 * * 0' || event.cron === 'weekly' || event.type === 'weekly-report');

        // Retention cleanup: runs daily at 04:00 UTC or default trigger
        if (!event?.cron || event.cron === '0 4 * * *' || isWeeklyCron) {
            const cutoff = Date.now() - RETENTION_MS;
            for (let round = 0; round < CLEANUP_ROUNDS; round++) {
                const result = await env.DB.prepare(
                    'UPDATE answers SET ip = NULL WHERE id IN (SELECT id FROM answers WHERE received_at < ? AND ip IS NOT NULL LIMIT ?)'
                ).bind(cutoff, CLEANUP_BATCH).run();
                if (!result.meta || result.meta.changes < CLEANUP_BATCH) break;
            }
        }

        // Weekly progress report: runs on Sunday 18:00 UTC
        if (isWeeklyCron || (env && env.SEND_REPORT_ON_SCHEDULE === 'true')) {
            try {
                const summary = await generateWeeklySummary(env.DB, { device: env?.REPORT_DEVICE || null });
                const sendResult = await sendReportEmail(env, summary);
                console.log('Weekly report delivery result:', JSON.stringify(sendResult));
            } catch (err) {
                console.error('Failed to send weekly report:', err);
            }
        }
    }
};
