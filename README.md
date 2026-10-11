<p align="center">
  <img src="./icons/icon-512.png" width="128" alt="Brain Wars icon">
</p>

<h1 align="center">Brain Wars</h1>

<p align="center">
  <em>Math practice for children: eleven games, a challenge mode, three languages, and offline play.</em>
</p>

<p align="center">
  <a href="https://alex-just.github.io/brain-wars/"><img src="https://img.shields.io/badge/demo-live-4d8a98?style=flat-square" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square" alt="Installable PWA">
  <img src="https://img.shields.io/badge/languages-EN%20%7C%20ES%20%7C%20RU-4CAF50?style=flat-square" alt="English, Spanish and Russian">
  <img src="https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square" alt="No dependencies">
  <a href="https://qlty.sh/gh/Alex-Just/projects/brain-wars"><img src="https://qlty.sh/gh/Alex-Just/projects/brain-wars/maintainability.svg" alt="Maintainability"></a>
</p>

Brain Wars is a set of small math games for primary-school children. The app is plain HTML, CSS, and JavaScript. It has no `package.json` and no accounts. A service worker stores the pages on the first visit, so the app installs on a home screen and works offline. The languages are English, Spanish, and Russian. A new device starts in Spanish.

**Play it now → <https://alex-just.github.io/brain-wars/>**

## Games

| Game | What it does |
| --- | --- |
| **Challenge** | A mixed run of 1–50 games at one difficulty from 1 to 20. Each game type appears once before any repeat. A mistake sends that game to the end of the queue. The results screen awards up to three stars. |
| **Follow the Leader** | Watch squares light up, then tap them in the same order. The sequence grows and speeds up. |
| **Unfollow the Leader** | The same game in reverse: tap the last square first. |
| **Mental Math** | Choose the missing operator (`+`, `−`, `×`, `÷`). |
| **What Time Is It?** | Read an analog clock and pick the matching time. |
| **Long Division** | Divide in the Russian bracket layout: quotient digit, product, remainder, bring down. |
| **Long Multiplication** | Multiply in columns, with carries and partial products. |
| **Long Addition** | Add in columns, with carries. |
| **Long Subtraction** | Subtract in columns, with borrowing. |
| **Money Problems** | Euro word problems: add the purchases and find the change. |
| **Elapsed Time** | Find the end time, the start time, or the duration. Type hours and minutes. Story problems start at level 7. |
| **Time Calculations** | Add and subtract hours and minutes in columns. Sixty minutes make one hour. |
| **Money Calculations** | Add and subtract euros and cents in columns. One hundred cents make one euro. |
| **Unit Conversions** | Convert between metric units: mass (kg, g), length (km, m, cm, mm), and capacity (l, ml). Type the converted number. |

Follow the Leader and Unfollow the Leader stay in the repository. The hub and Challenge mode omit them. Open those pages by URL.

## Features

- **Offline app.** The service worker precaches the pages, scripts, and icons. The app installs on a home screen. An unknown page opened offline falls back to the hub.
- **Three languages.** English, Spanish, and Russian share one set of keys. Every page has a language toggle. The choice stays on the device, including in Challenge mode.
- **Levels.** Nine games offer 20 levels. Mental Math and What Time Is It? raise the difficulty during play. Challenge mode uses one difficulty for the whole run.
- **Typed numbers.** The four column games accept numbers you type, including decimals. A result can have up to eight digits.
- **Large targets.** The layout respects the phone safe area and `prefers-reduced-motion`. Controls have ARIA labels.

## Analytics

The live app sends one row per answer attempt to its own Cloudflare Worker. The row stores the game, the result (`1` right or `0` wrong), the device time, a random device id, and the request IP and country. The worker clears the IP after 90 days. The other columns stay. The app sets no cookies and creates no accounts.

Telling-time stores a wrong tap and skips the completion that follows that same tap. Every other game stores the wrong attempt and the solved attempt as two rows.

Read the rows in the Cloudflare D1 console for database `brain-wars-answers`. Every Sunday at 18:00 UTC, the worker aggregates the past week and emails a progress report to the parent. The report lists overall accuracy, active days, and the top three skills that need practice with arithmetic tips. Deploy steps, limits, report configuration, and queries are in [`analytics-worker/README.md`](analytics-worker/README.md).

Capture runs when `ENDPOINT` in `analytics.js` is set. This repository points it at the live ingest URL.

## Getting started

Clone the repository and start a static server:

```bash
git clone https://github.com/Alex-Just/brain-wars.git
cd brain-wars
python3 -m http.server 8000
```

Open <http://localhost:8000>.

`index.html` also opens from disk for play. The service worker needs `http://` or `https://`.

## Git hooks

This repository tracks hooks in `.githooks/`. Enable them in your clone once:

```bash
git config core.hooksPath .githooks
```

- `commit-msg` strips `Co-authored-by` trailers from commit messages.
- `pre-push` runs the Qlty quality check on the commits being pushed and blocks the push when new issues appear.

Neither hook is a guarantee. `--no-verify` skips them, merge commits skip `commit-msg`, and a clone that did not run the `git config` command has no hooks at all.

The GitHub Actions workflow `.github/workflows/commit-message.yml` rejects any push or pull request whose commit messages contain a `Co-authored-by` trailer. That covers GitHub web edits and clones that skip the local hook.

## Code quality

The `pre-push` hook runs [Qlty](https://qlty.sh) over the files in the commits being pushed. It compares them with the upstream branch, so existing issues never block a push. Only new issues in changed files do. The check is free, runs locally, and needs no account.

```bash
curl https://qlty.sh | sh
git config core.hooksPath .githooks
```

`.qlty/qlty.toml` holds the configuration. It enables `biome` for JavaScript, JSON, and CSS, `markdownlint` for Markdown, and `trufflehog` for secrets. Add a linter with `qlty plugins enable <name>` and commit the change. `qlty check --all` runs the same checks over the whole repository.

Qlty Cloud offers a score-based block and works without pull requests: `qlty slop-one` fails a push that lowers the score of the changed files. It needs a `TYPESAFE_API_KEY` and spends API credit per run, so it is not in the hook.

## Tests

```bash
node test-i18n.js      # translations, pages, registry, challenge queue, question generators
node test-sw.js        # manifest, page wiring, service worker precache
node test-analytics.js # analytics client and worker
```

These scripts use Node's standard library only.

## Project structure

```text
brain-wars/
├── index.html            # Hub: renders the game grid from games.js
├── challenge.html        # Challenge setup and results
├── challenge.js          # Challenge run model and the engine on game pages
├── games.js              # Game registry: pages, levels, signals, icons
├── analytics.js          # Captures attempts, queues them, and sends them
├── i18n.js               # EN / ES / RU text, language toggle, number format
├── memory-game.js        # Follow / Unfollow the Leader behaviour (both pages share it)
├── memory-game.css       # Their shared styling; each page sets its own palette
├── column-game.css       # Shared styling for the four column games
├── column-game.js        # Shared half of those pages (grid, keypad, menus)
├── elapsed-time.js       # Elapsed-time questions, shared with the tests
├── time-calculations.js  # Time add and subtract problems, shared with the tests
├── money-calculations.js # Money add and subtract problems, shared with the tests
├── unit-conversions.js   # Unit conversion questions, shared with the tests
├── *.html                # One page per game: follow-the-leader, unfollow-the-leader,
│                         #   operations, telling-time-es, long-division,
│                         #   long-multiplication, long-addition, long-subtraction,
│                         #   money-problems, elapsed-time, time-calculations,
│                         #   money-calculations, unit-conversions
├── pwa.js                # Registers the service worker on http and https
├── sw.js                 # Precache and fetch rules. VERSION is v16
├── manifest.json         # PWA name and icons
├── icons/                # App icons
├── analytics-worker/     # Worker, D1 schema, and Wrangler config
├── test-i18n.js          # Node tests for pages, text, and generators
├── test-sw.js            # Node tests for the service worker
├── test-analytics.js     # Node tests for the client and the worker
├── .githooks/            # commit-msg and pre-push hooks, enabled per clone
├── .qlty/                # Qlty code-quality configuration
└── clock/, transformers-logo.svg   # Spare artwork
```

## How it works

```mermaid
flowchart LR
    Hub["index.html<br/>(hub grid)"] --> Registry["games.js<br/>(one registry)"]
    Challenge["challenge.html<br/>(run setup)"] --> Registry
    Registry --> Game["game page<br/>?challenge=1"]
    Game --> Engine["challenge.js engine<br/>(signals → next step)"]
```

**Registry.** `games.js` is the list of games. The hub draws its tiles from that list. Challenge mode builds its queue from the same list. `picker` means the page has a level menu. `startup` means the page reads the challenge level when a round starts. Each game names the DOM signal for a finished round and the signal for a mistake.

**Challenge.** `challenge.js` saves the run for `challenge.html`. The same file runs inside a game opened with `?challenge=1`. It draws the progress bar, pins the level, and reads the game signals four times a second. Each step replaces the history entry, so Back returns to the hub. A solved game that had mistakes returns later in the queue and marks the run with ⚠. The results screen awards 1–3 stars.

**Languages.** `i18n.js` holds three dictionaries with the same keys. A new device starts in Spanish. The chosen language stays in `localStorage`.

**Offline.** `sw.js` precaches the app on install and deletes old caches on activate. A page load uses the network, then the cache, then the hub. Other files come from the cache and refresh in the background. A new worker takes over when its precache is ready, and the open page reloads once. Bump `VERSION` when you change the precache list.

## Deploy

GitHub Pages publishes the repository root from `master` to <https://alex-just.github.io/brain-wars/>. Any static host works the same way. There is no build command.

The answers worker deploys separately. See [`analytics-worker/README.md`](analytics-worker/README.md).

## Add a game

1. Create `<game>.html`. Copy the shared head (manifest, icons, `pwa.js`), the back arrow, and the language toggle. Load the scripts in this order: `i18n.js`, `games.js`, `analytics.js`, the game script, `challenge.js`.
2. Add the game to `games.js`: `id`, `file`, `titleKey`, level mode (`picker` or `startup`), completion signal, mistake signal, and hub icon.
3. Add the new keys to all three dictionaries in `i18n.js`.
4. Add the page to `PRECACHE` in `sw.js` and bump `VERSION`.
5. Add the page to `INTEGRATED_PAGES` in `test-i18n.js` and update the page count in `test-sw.js`.
6. Run `node test-i18n.js && node test-sw.js && node test-analytics.js`, then play one round.

---

Report bugs and ideas in the [issues](https://github.com/Alex-Just/brain-wars/issues).
