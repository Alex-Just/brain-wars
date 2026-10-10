# Answers analytics worker

This worker stores one row per answer attempt in the D1 database `brain-wars-answers`.

The live ingest URL is `https://brain-wars-answers.alex-just.workers.dev/ingest`.

The worker ignores a repeated event id. The client can send the same batch again.

## Limits

- A request can hold 200 events and 65536 bytes.
- One IP can add 5000 events in 24 hours. The count uses `received_at`.
- `ts` must fall within the last two years or the next two days. The worker still counts an accepted old `ts` by arrival time.
- The cron at 04:00 UTC clears `ip` on rows older than 90 days. The other columns stay.
- CORS allows `alex-just.github.io`, `localhost`, and `127.0.0.1`.

## Weekly progress email

Every Sunday at 18:00 UTC, the worker aggregates answer attempts from the last seven days and emails a progress report to the configured recipient.

The report includes:

- Total attempts, correct answers, and overall accuracy percentage.
- Active practice days out of seven.
- Top three skills that need practice, ranked by mistake count and error rate.
- Practical practice tips for each skill.
- Full activity breakdown across all games played.

### Free email sending (Resend)

Sending is free via [Resend](https://resend.com):

- Free plan: 3000 emails per month (100 per day).
- When sending to your registered account email, Resend allows `onboarding@resend.dev` as the sender without needing a custom domain or DNS records.

Add the secrets in Wrangler:

```bash
npx wrangler secret put RESEND_API_KEY --name brain-wars-answers
npx wrangler secret put REPORT_EMAIL --name brain-wars-answers
```

Optional settings (secrets or environment variables):

- `REPORT_EMAIL`: recipient email address.
- `REPORT_TOKEN`: bearer token to protect the preview and send endpoints.
- `REPORT_DEVICE`: filter stats to one device id.

### Preview and test endpoints

Preview the HTML summary in the browser:

```bash
curl https://brain-wars-answers.alex-just.workers.dev/report/preview
```

Add `?format=json` for JSON data.

Trigger sending the email immediately:

```bash
curl -X POST https://brain-wars-answers.alex-just.workers.dev/report/send
```

When `REPORT_TOKEN` is set, pass `-H 'Authorization: Bearer <token>'` or `?token=<token>`.

## Deploy

From this directory, run:

```bash
npx wrangler deploy
```

`wrangler.toml` names the worker, binds the database as `DB`, and sets the crons. Deploy `worker.mjs`.

When you change `analytics.js` or the precache list, bump `VERSION` in `sw.js` in the same commit and push `master`. The service worker caches `analytics.js`. The installed app loads the new file on the next visit. The current `VERSION` is `v8`.

## Read the rows

Open the Cloudflare D1 console for database `brain-wars-answers`.

```sql
SELECT datetime(ts / 1000, 'unixepoch') AS when_utc,
       game,
       correct,
       device,
       country
FROM answers
WHERE country = 'ES'
ORDER BY ts DESC
LIMIT 50;
```

`correct` is `1` for a right attempt and `0` for a wrong attempt. `ts` is the device clock, in milliseconds.

When you know the device, query that id:

```sql
SELECT datetime(ts / 1000, 'unixepoch') AS when_utc, game, correct
FROM answers
WHERE device IN ('paste-id-here')
ORDER BY ts DESC;
```

The installed app and Safari on one phone keep separate storage. One phone can produce two device ids.

From this directory, the same query runs in the terminal:

```bash
npx wrangler d1 execute brain-wars-answers --remote --command "SELECT datetime(ts / 1000, 'unixepoch') AS when_utc, game, correct, device, country FROM answers ORDER BY ts DESC LIMIT 50"
```

## Check the endpoint

```bash
URL=https://brain-wars-answers.alex-just.workers.dev/ingest
EVENT='{"events":[{"id":"e-manual-0001","game":"time-calculations","correct":true,"ts":'$(date +%s000)',"device":"dev-test"}]}'

curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d "$EVENT"
curl -i "$URL"
curl -i -X POST "$URL" -H 'Content-Type: text/plain' -d 'garbage'
```

The first POST returns `inserted: 1`. The second POST returns `inserted: 0`. GET returns 405. A body that is not JSON returns 400.

Use a new event id and a `ts` inside the last two years. A timestamp of zero is older than two years. The worker rejects that event, and the `received_at` count stays the same.
