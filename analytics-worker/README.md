# Answers analytics worker

Ingest endpoint for Brain Wars answer events. One record per answer attempt; duplicate event ids
are ignored, so the client may resend any batch safely.

## Deploy

1. Create a D1 database named `brain-wars-answers`.
2. Run `schema.sql` in the D1 console.
3. Create a Worker, paste `worker.mjs`, and bind the database as `DB` (Settings → Bindings).
4. Add a daily Cron Trigger for the retention cleanup.
5. Copy `https://<name>.<account>.workers.dev/ingest` into `ENDPOINT` in `../analytics.js`.

Keep the pasted copy and `worker.mjs` in sync — edit one, update the other.

## Manual checks

```bash
URL=https://<name>.<account>.workers.dev/ingest
EVENT='{"events":[{"id":"e-manual-0001","game":"time-calculations","correct":true,"ts":'$(date +%s000)',"device":"dev-test"}]}'

curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"   # 200, inserted:1
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"   # 200, inserted:0 (idempotent)
curl -i "$URL"                                                     # 405
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d 'garbage'  # 400
```

Backdated timestamps must not bypass the rate limit: send events with `"ts":0` in a loop; once the
IP passes 5000 events in 24 h, the response is `429`.

## Capture matrix

Run once before enabling `ENDPOINT`, with the browser console open (zero errors expected):

| Game | Wrong attempt | Solved problem | Expected rows |
| --- | --- | --- | --- |
| operations | tap a wrong operator | solve one | one `false`, one `true` |
| telling-time | tap a wrong time | solve one | one `false`, one `true` (never a `true` after a wrong tap) |
| follow-the-leader | miss a square | finish one | one `false`, one `true` |
| unfollow-the-leader | miss a square | finish one | one `false`, one `true` |
| long-division | type a wrong digit | solve one | one `false`, one `true` |
| long-multiplication | type a wrong digit | solve one | one `false`, one `true` |
| long-addition | type a wrong digit | solve one | one `false`, one `true` |
| long-subtraction | type a wrong digit | solve one | one `false`, one `true` |
| money-problems | answer a step wrong | solve one | one `false`, one `true` |
| elapsed-time | answer wrong | solve one | one `false`, one `true` |
| time-calculations | answer a step wrong | solve one | one `false`, one `true` |
| money-calculations | answer a step wrong | solve one | one `false`, one `true` |

Then: play offline (DevTools) → no console errors; go online → rows appear with `ip`, `country`,
`device`.

## Identifying your kid's rows

```sql
SELECT * FROM answers WHERE country = 'ES' ORDER BY ts DESC;          -- coarse
SELECT * FROM answers WHERE device IN ('…', '…') ORDER BY ts DESC;    -- confirmed devices
```

After a few days, list recent rows from Spain and copy the `device` values into your notes. An
installed iOS PWA and Safari on the same phone keep separate storage, so one phone can produce two
ids. IP addresses are cleared after 90 days by the daily cron; results are kept.
