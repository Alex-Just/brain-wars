# Answers Analytics — Design

Date: 2026-10-10
Status: Draft for review

## Goal

Store one record per answer attempt from Brain Wars in a free, self-hosted store; identify the
owner's child's records apart from anonymous visitors; uploads survive offline and slow networks
and are idempotent.

## Requirements

- R1 Per-answer events: a wrong attempt → `correct: false`; a solved problem → `correct: true`.
- R2 Fields: game id, correct flag, timestamp, device id (client), IP and country (server).
- R3 Offline/slow network: capture never blocks or throws; the queue persists; uploads resume when
  the network returns.
- R4 Idempotent uploads: resending never duplicates rows.
- R5 $0/month; no build step; the app stays dependency-free.
- R6 Security: strict validation, rate limiting, closed read path, CORS allowlist; honest trust
  model.
- R7 Always-on in the deployed app; the source ships disabled until an endpoint is configured.
- R8 Privacy: IP addresses are cleared after 90 days; the README states what is stored and for how
  long.

## Non-goals

- Read/stats UI — the Cloudflare dashboard is the viewing tool for now.
- An explicit kid flag (`?kid=1`) — deferred; geo + device cover the requirement.
- Auth/accounts, Background Sync as the primary sync mechanism, multi-user rosters.
- Fixing `challenge.js`'s first-match signal evaluation (a separate, pre-existing limitation;
  analytics does not depend on it).

## Architecture

```
game page (any of the 12)
  └─ analytics.js
       ├─ capture: registry completion/mistake signals via MutationObserver
       │           (rising edges, per-game policy)
       ├─ outbox: localStorage queue (append-only, capped)
       └─ flush: batched POST /ingest (8 s timeout, backoff)
                 │
                 ▼
        Cloudflare Worker (brain-wars-answers)
          ├─ validate → rate-limit → INSERT OR IGNORE via D1 batch
          ├─ daily cron: clear IPs older than 90 days
          └─ no read path
                 │
                 ▼
        D1: answers table  ←  queried in the Cloudflare dashboard
```

The challenge engine and analytics observe the same DOM signals independently. Analytics uses a
MutationObserver, so its event is enqueued at mutation time — before the challenge engine's next
250 ms poll can navigate away. Events are recorded in standalone play and challenge mode alike.

## Data contract

Event (client → worker):

```json
{ "id": "uuid", "game": "time-calculations", "correct": true, "ts": 1791700000000, "device": "uuid" }
```

Batch request: `POST /ingest`, body `{ "events": [ … ] }`,
`Content-Type: text/plain;charset=utf-8` (JSON text as a simple request — no CORS preflight).

Response `200`: `{ "inserted": n, "ignored": n, "rejected": n }`.
Errors: `400` malformed body, `405` other routes/methods, `429` rate limit. CORS headers on every
response. `ip`, `country`, and `received_at` are added server-side and never sent by the client.

## Client module — `analytics.js`

Require-safe in Node: no `window`/`document`/`localStorage` access at module scope; the browser
bootstrap runs only when `document` exists, `ENDPOINT` is non-empty, and the page is a game page.

Config constants (top of file):

| Constant | Value | Meaning |
| --- | --- | --- |
| `ENDPOINT` | `''` | Worker URL; empty disables everything |
| `QUEUE_KEY` | `'brain_wars_answers'` | Outbox storage key |
| `DEVICE_KEY` | `'brain_wars_device'` | Device id storage key |
| `QUEUE_MAX` | `1000` | Queue cap; oldest events dropped beyond it |
| `BATCH_MAX` | `200` | Events per request |
| `TIMEOUT_MS` | `8000` | Request timeout |
| `MIN_FLUSH_GAP_MS` | `30000` | Minimum gap for after-capture flushes |
| `MAX_PERMANENT_TRIES` | `3` | Attempts before a permanently rejected batch is dropped |

### Capture

- On load, find the game with `BrainWarsGames.byFile(<current file>)`; no game → no-op (hub,
  challenge pages).
- One `MutationObserver` on `document.documentElement`
  (`subtree`, `childList`, `characterData`, `attributes` filtered to `class` and `style`).
  The callback re-evaluates both signals and emits events on rising edges; the initial state is
  evaluated once as a baseline with no events.
- Signal evaluation:
  - `class`: **all matches** — `[...document.querySelectorAll(selector)].some(el => el.classList.contains(value))`.
    (Not `challenge.js`'s first-match `querySelector`; that would miss most wrong taps on
    `.operator` and `.choice-button`.)
  - `style`: `document.querySelector(selector).style[property] === value`.
  - `text`: `document.querySelector(selector).textContent.trim() === I18n.t(key)`.
- Rising edge on `mistake` → enqueue an event with `correct: false`.
- Rising edge on `completion` → per-game policy (below).
- Granularity follows the games' own signals: a repeated mistake that does not re-raise the error
  state (e.g. a second wrong attempt within `long-*`'s 1200 ms error window) is not a new edge.
  `time-calculations` / `money-calculations` clear the error on the next typed digit, so every
  wrong attempt there is a fresh edge.
- Device id: `crypto.randomUUID()`, fallback `'d-' + Date.now().toString(36) + random`; persisted
  in `localStorage`; per-load fallback when storage is unavailable.
- Event id: `crypto.randomUUID()`, same fallback with an `'e-'` prefix.
- `ts`: `Date.now()`.
- Disabled mode (`ENDPOINT === ''`): no observer, no storage, no listeners.

### Per-game capture policy

`mistakeSeen` is set on a mistake edge and cleared on every completion edge.

| Game | Mistake signal | Completion signal | Completion edge emits |
| --- | --- | --- | --- |
| operations | `.operator` `wrong` | `#operators` `hidden` | `correct: true` |
| telling-time | `.choice-button` `wrong` | `#instructions` display block | `correct: true` **only if `!mistakeSeen`** |
| follow-the-leader | `#message` `ftl_try_again` | `#message` `ftl_great_job` | `correct: true` |
| unfollow-the-leader | `#message` `uftl_try_again` | `#message` `uftl_great_job` | `correct: true` |
| long-division / long-multiplication / long-addition / long-subtraction | `#instructionHint` `is-error` | `#completionOverlay` `show` | `correct: true` |
| money-problems | `#instructionHint` `is-error` | `#instructionHint` `is-correct` | `correct: true` |
| elapsed-time | `#instructionHint` `is-error` | `#instructionHint` `is-correct` | `correct: true` |
| time-calculations / money-calculations | `#instructionHint` `is-error` | `#instructionHint` `is-correct` | `correct: true` |

`telling-time` is the single exception: a wrong tap also sets the completion signal (the
"tap to continue" prompt), so a completion edge after a mistake in the same round is suppressed —
that round's one attempt is already recorded as incorrect. In every other game, a mistake does not
end the round; the eventual completion is a separate, solved attempt and always emits.

### Outbox

- Append the event and persist. If `localStorage` is unavailable, keep the queue in memory for the
  session.
- Pure functions exported for tests: `buildEvent`, `enqueue`, `takeBatch`, `ack`.
- `enqueue`: append; when the length exceeds `QUEUE_MAX`, drop the oldest (documented trade-off:
  an offline session keeps its newest events).

### Flush

- Triggers: page load, `online`, `visibilitychange` → visible, and after each enqueue (respecting
  `MIN_FLUSH_GAP_MS`). Only one flush runs at a time.
- Take the first `BATCH_MAX` events; POST with an 8 s `AbortController` timeout.
- `200` with a parseable body → remove exactly the sent ids (rejected events included — they are
  dropped deliberately), reset backoff, continue with the next batch if any remain. A `200` whose
  body cannot be parsed is treated as a failure (keep everything).
- Transient failure (network error, timeout, `5xx`, `408`, `429`) → keep everything; back off 30 s,
  doubling to a 5 min cap (`429` → 5 min).
- Permanent failure (`4xx` other than `408`/`429`) → keep, retry; after `MAX_PERMANENT_TRIES`
  consecutive permanent failures for the same head batch, drop that batch so the FIFO cannot
  wedge behind a server-side bug.
- Everything is wrapped: nothing throws, gameplay never awaits the network.
- Multi-tab: duplicate sends are possible and harmless (server dedupe); queue write races are
  accepted for this scale.

## Worker — `analytics-worker/worker.mjs`

`.mjs` so Node unit-tests can import it directly; the Cloudflare dashboard accepts the same
content pasted as a worker. Keep the pasted copy and the repository file in sync.

Routes: `POST /ingest` (plus a harmless `OPTIONS` handler); everything else `405`.

Validation — pure `validateEvents(events, now)`, exported for tests:

| Field | Rule |
| --- | --- |
| `id` | string, 8–64 chars |
| `game` | member of `GAME_IDS` (every registry id, hidden ones included) |
| `correct` | boolean |
| `ts` | integer, `now − 2 years` ≤ ts ≤ `now + 2 days` |
| `device` | string, 1–64 chars |
| batch | ≤ 200 events; body ≤ 64 KB |

Invalid events are dropped and counted as `rejected`; they never fail the whole batch (no poison
pill). `ts` is advisory (client clocks can skew); ordering and rate limiting use the server-side
`received_at`. Server-captured fields: `ip` = `CF-Connecting-IP` (edge-set; clients cannot
override it) or null locally, `country` = `request.cf && request.cf.country` or null,
`received_at` = `Date.now()`.

Rate limit: per client IP, **5000 events / 24 h**, counted from `answers` by `received_at`
(`SELECT COUNT(*) … WHERE ip = ? AND received_at > now − 24 h`); beyond it → `429`. The cap is
abuse mitigation, not metering — normal family use is far below it, and the threshold must not
trip on a heavy multi-device day.

Insert: chunks of 50 events; one prepared
`INSERT OR IGNORE INTO answers (id, game, correct, ts, device, ip, country, received_at) VALUES (?,?,?,?,?,?,?,?)`
per event, sent via `env.DB.batch()`. One statement per event keeps well under D1's 100-bound-
parameter-per-statement limit; chunking bounds the transaction size and the failure blast radius.
The sum of `meta.changes` is `inserted`, the rest of the valid events are `ignored`.

CORS: parse the `Origin` header and compare hostnames exactly — allow `alex-just.github.io` and
`localhost` / `127.0.0.1` with any port; echo the origin and set `Vary: Origin`. Other origins get
no CORS headers. (Never match by string prefix: `http://localhost.evil.com` must not pass.)

Scheduled (daily cron trigger): clear IPs older than 90 days —
`UPDATE answers SET ip = NULL WHERE id IN (SELECT id FROM answers WHERE received_at < ? AND ip IS NOT NULL LIMIT 500)`
repeated for a bounded number of batches per run.

## Database — `analytics-worker/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    ts INTEGER NOT NULL,
    device TEXT,
    ip TEXT,
    country TEXT,
    received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_ts ON answers (ts);
CREATE INDEX IF NOT EXISTS idx_answers_device ON answers (device);
CREATE INDEX IF NOT EXISTS idx_answers_ip_received ON answers (ip, received_at);
CREATE INDEX IF NOT EXISTS idx_answers_country_ts ON answers (country, ts);
```

## Identification (kid vs anonymous)

| Field | Source | Trust |
| --- | --- | --- |
| `ip` | `CF-Connecting-IP` (edge) | Edge-set, not client-controllable |
| `country` | `request.cf.country` (edge) | Edge-set |
| `device` | Client `localStorage` id | Client-claimed |

Queries:

```sql
-- coarse: everything from Spain
SELECT * FROM answers WHERE country = 'ES' ORDER BY ts DESC;
-- strict: only confirmed devices
SELECT * FROM answers WHERE device IN ('…', '…') ORDER BY ts DESC;
-- anonymous visitors
SELECT * FROM answers WHERE country IS NULL OR country <> 'ES';
```

Confirming devices: after a few days, list recent rows from Spain / the home IP and copy the
`device` values into your notes; those ids are the kid's devices. Note that an installed iOS PWA
and Safari on the same phone keep separate storage, so one physical device can produce two ids.

Caveats: the geo filter also catches other Spanish visitors; `device` is spoofable; identification
is a heuristic, not a security boundary.

## Security model

Enforced: strict validation before any insert; per-IP rate limiting by server-side arrival time
(client timestamps cannot bypass it); CORS allowlist with exact hostname matching; closed read path
(the worker exposes no read route and the database is reachable only through its binding); HTTPS
only; parameterized SQL only; no secrets in the repo or the client; IP addresses cleared after
90 days.

Not enforced (by design): writes are open because anonymous answers must be stored; any credential
in a static client would be public, so no token is used. Client fields are untrusted input; the
geo/device identification is heuristic.

Privacy: an IP address is personal data. The README discloses exactly what the deployed app stores
and how long IPs are kept.

## Testing

New `test-analytics.js` (plain Node, CommonJS, matching the repo style). Client-core checks run
synchronously via `require('./analytics.js')` (`buildEvent`, `enqueue` append/cap/drop-oldest,
`takeBatch` FIFO/cap, `ack` removes only sent ids). Worker validation runs in an async main:

```js
(async () => {
    const { validateEvents } = await import('./analytics-worker/worker.mjs');
    // check(...) cases: valid, bad id/game/correct/ts/device, batch cap, rejected counting
})().catch((error) => { console.error(error); process.exit(1); });
```

Top-level `await` is not valid in CommonJS — the async wrapper is required, not optional.

- `GAME_IDS` ↔ registry sync: the expected list is
  `Games.all().map((game) => game.id).concat(['follow-the-leader', 'unfollow-the-leader'])`
  (the registry exposes no way to enumerate hidden entries; the hidden ids are already hardcoded
  in `test-i18n.js`).
- `test-i18n.js`: iterate `INTEGRATED_PAGES`, map each file through `Games.byFile`, and require
  `analytics.js` on every page that is a game page (12 pages, hidden ones included — not
  `Games.all()`, which excludes hidden games).
- `test-sw.js`: `./analytics.js` is in `PRECACHE` and in the core runtime files list.

Manual checklist (documented in the worker README):

- Run the per-game capture matrix once before enabling `ENDPOINT`: for each of the 12 games,
  make one wrong attempt and solve one problem; expect one `correct: false` and one
  `correct: true` row (telling-time: one `false` and one `true` across two rounds, never a `true`
  after a wrong tap).
- Play offline (DevTools) → events queue, zero console errors → go online → rows appear in D1 with
  correct `ip`/`country`/`device`.
- POST the same batch twice → second response `inserted: 0`.
- POST events with backdated `ts` in a loop → still `429` once the IP passes 5000/24 h.
- `GET /ingest` → 405; oversized body → 400; over-cap batch → 400.

## Wiring & ops

- Add `<script src="analytics.js" defer></script>` to all 12 game pages, **immediately after
  `games.js` and before the game's own script and `challenge.js`** (defer executes in document
  order; the observer is registered before the challenge engine can navigate).
- `sw.js`: `PRECACHE` += `'./analytics.js'`; `VERSION` `v5` → `v6`. Set `ENDPOINT` in the same
  commit as the version bump (otherwise the first load after enabling runs the cached disabled
  copy).
- README: test list += `node test-analytics.js`; structure += `analytics.js`,
  `analytics-worker/`, `test-analytics.js`; new Analytics section (below); the intro's
  "no trackers" claim becomes "no third-party trackers" pointing at that section.

README Analytics section (draft):

> The live app records one event per answer attempt in the author's own Cloudflare database:
> the game, the result, the time, a random device id, and the request's IP address and country
> (set by Cloudflare's edge). IP addresses are cleared after 90 days. Nothing is sent when no
> endpoint is configured — the repository ships disabled. No cookies, no third parties, no
> accounts. To run your own, see `analytics-worker/README.md`.

`analytics-worker/README.md`: deployment steps (create the `brain-wars-answers` D1 database; run
`schema.sql`; create a Worker, paste `worker.mjs`, bind the database as `DB`, add the daily cron
trigger; copy the `https://<name>.<account>.workers.dev/ingest` URL into `ENDPOINT` in
`analytics.js`; commit and push), the sync note for the pasted copy, the device-confirmation
workflow, and the manual checklist.

## Rollout order

1. `analytics.js` + `test-analytics.js` — client core green in Node.
2. `analytics-worker/worker.mjs` + `schema.sql` + `analytics-worker/README.md` — curl checks
   against a deployed worker.
3. Page wiring + `sw.js` (version bump **and** `ENDPOINT` in the same commit) + existing-test
   extensions + README.
4. Deploy the worker, verify end-to-end (offline → online → dedupe → capture matrix).

## Open questions

None. Approved in chat: Cloudflare Worker + D1; per-attempt events; always-on with device id;
IP and country stored server-side; no kid flag for now.
