/**
 * Weekly summary generator and email reporter for Brain Wars analytics.
 */

export const SKILL_INFO = {
    'follow-the-leader': {
        name: 'Follow the Leader',
        skill: 'Visual working memory & sequence recall',
        tip: 'Watch the full pattern before starting to tap; break longer sequences into chunks of 2 or 3.'
    },
    'unfollow-the-leader': {
        name: 'Unfollow the Leader',
        skill: 'Reverse working memory & cognitive control',
        tip: 'Keep the final square in mind first; visualize the sequence unfolding backwards.'
    },
    'operations': {
        name: 'Mental Math',
        skill: 'Basic arithmetic operators (+, −, ×, ÷)',
        tip: 'Compare the size of the result against the inputs to quickly determine if addition, multiplication, subtraction, or division is required.'
    },
    'telling-time': {
        name: 'What Time Is It?',
        skill: 'Analog clock reading',
        tip: 'Check the short hour hand first to find the current hour, then count by 5s around the dial with the long minute hand.'
    },
    'long-division': {
        name: 'Long Division',
        skill: 'Column division with brackets & remainders',
        tip: 'Work one digit at a time: estimate the quotient digit, multiply back, subtract to find the remainder, then bring down the next digit.'
    },
    'long-multiplication': {
        name: 'Long Multiplication',
        skill: 'Column multiplication & partial products',
        tip: 'Multiply column by column from right to left; write the carried tens on top and remember to add them to the next product.'
    },
    'long-addition': {
        name: 'Long Addition',
        skill: 'Column addition with carries',
        tip: 'Line up units and tens carefully; whenever the column sum reaches 10 or more, carry the 1 to the next column on the left.'
    },
    'long-subtraction': {
        name: 'Long Subtraction',
        skill: 'Column subtraction with borrowing',
        tip: 'If the top digit is smaller than the bottom digit, borrow 1 ten from the column to the left before subtracting.'
    },
    'money-problems': {
        name: 'Money Problems',
        skill: 'Euro word problems & change calculation',
        tip: 'Add the purchased items together first to find the total bill, then subtract that total from the money given to find the change.'
    },
    'elapsed-time': {
        name: 'Elapsed Time',
        skill: 'Time intervals & elapsed duration',
        tip: 'Jump forward to the next whole hour first, then add the remaining minutes to bridge across hour boundaries.'
    },
    'time-calculations': {
        name: 'Time Calculations',
        skill: 'Column addition & subtraction of hours/minutes',
        tip: 'Remember that 60 minutes = 1 hour (base 60, not base 100). When borrowing or carrying across columns, convert 1 hour to 60 minutes.'
    },
    'money-calculations': {
        name: 'Money Calculations',
        skill: 'Column addition & subtraction of euros and cents',
        tip: 'Remember that 100 cents = 1 euro. In column math, carry 1 euro when cents reach 100 or more, and borrow 100 cents when subtracting.'
    },
    'unit-conversions': {
        name: 'Unit Conversions',
        skill: 'Metric units of mass, length and capacity',
        tip: 'Going to a smaller unit makes the number bigger (multiply by 10 for each step); going to a bigger unit makes it smaller (divide). 1 kg = 1000 g, 1 m = 100 cm, 1 l = 1000 ml.'
    }
};

// Stable colours keep a game recognisable when the range changes.
const GAME_COLORS = {
    'unit-conversions': '#2563eb',
    'money-calculations': '#7c3aed',
    'money-problems': '#db2777',
    'long-division': '#0891b2',
    'telling-time': '#ea580c',
    'time-calculations': '#65a30d',
    'long-multiplication': '#dc2626',
    'elapsed-time': '#d97706',
    'long-addition': '#059669',
    'operations': '#4f46e5',
    'long-subtraction': '#0d9488',
    'follow-the-leader': '#9333ea',
    'unfollow-the-leader': '#be123c'
};
const FALLBACK_COLOR = '#64748b';
const MIN_TREND_ATTEMPTS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_MS = 3 * HOUR_MS;

// The weekly email window. The browser preview opens narrower (three days); the
// worker picks each surface's default and passes it in.
export const DEFAULT_REPORT_DAYS = 7;

// The progress chart keeps roughly 24-30 points per range: hourly for a day,
// three-hourly for three days, and daily for a week or a month.
export function bucketMsForDays(days) {
    if (days <= 1) return HOUR_MS;
    if (days <= 3) return THREE_HOURS_MS;
    return DAY_MS;
}

// "1 day" / "3 days" / "30 days".
function daysLabel(days) {
    return `${days} day${days === 1 ? '' : 's'}`;
}

// The window a summary covers. A caller that omits it reads as the weekly default,
// so the wording is never "undefined days".
function periodDays(period) {
    const days = period?.days;
    return Number.isInteger(days) && days > 0 ? days : DEFAULT_REPORT_DAYS;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(ms) {
    const d = new Date(ms);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Chart labels stay short: a time for a day, weekday and time for three days,
// and a date for a week or a month.
function bucketLabel(start, bucketMs) {
    const d = new Date(start);
    if (bucketMs >= DAY_MS) return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    const time = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
    if (bucketMs >= THREE_HOURS_MS) return `${WEEKDAYS[d.getUTCDay()]} ${time}`;
    return time;
}

function accuracyPct(correct, total) {
    return total > 0 ? Math.round((correct * 1000) / total) / 10 : 0;
}

/**
 * Queries D1 for weekly summary statistics.
 */
export async function generateWeeklySummary(db, options = {}) {
    const now = typeof options.now === 'number' ? options.now : Date.now();
    const days = typeof options.days === 'number' ? options.days : DEFAULT_REPORT_DAYS;
    const since = now - days * DAY_MS;
    const device = options.device || null;

    let totalsQuery = `
        SELECT 
            COUNT(*) AS total,
            COALESCE(SUM(correct), 0) AS correct_count,
            COALESCE(SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END), 0) AS wrong_count,
            COUNT(DISTINCT date(ts / 1000, 'unixepoch')) AS active_days,
            COUNT(DISTINCT device) AS device_count
        FROM answers
        WHERE ts >= ? AND ts <= ?
    `;
    const totalsArgs = [since, now];

    let gamesQuery = `
        SELECT 
            game,
            COUNT(*) AS total,
            COALESCE(SUM(correct), 0) AS correct_count,
            COALESCE(SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END), 0) AS wrong_count,
            ROUND(COALESCE(SUM(correct), 0) * 100.0 / COUNT(*), 1) AS accuracy_pct
        FROM answers
        WHERE ts >= ? AND ts <= ?
    `;
    const gamesArgs = [since, now];

    if (device) {
        totalsQuery += ' AND device = ?';
        totalsArgs.push(device);
        gamesQuery += ' AND device = ?';
        gamesArgs.push(device);
    }

    gamesQuery += ' GROUP BY game ORDER BY wrong_count DESC, accuracy_pct ASC, total DESC';

    const totalsRow = await db.prepare(totalsQuery).bind(...totalsArgs).first();
    const gamesResult = await db.prepare(gamesQuery).bind(...gamesArgs).all();

    const total = totalsRow?.total || 0;
    const correct = totalsRow?.correct_count || 0;
    const wrong = totalsRow?.wrong_count || 0;
    const activeDays = totalsRow?.active_days || 0;
    const deviceCount = totalsRow?.device_count || 0;
    const overallAccuracy = accuracyPct(correct, total);

    const rawGames = gamesResult?.results || [];
    const games = rawGames.map((row) => {
        const info = SKILL_INFO[row.game] || { name: row.game, skill: row.game, tip: '' };
        return {
            game: row.game,
            name: info.name,
            skill: info.skill,
            tip: info.tip,
            total: row.total,
            correct: row.correct_count,
            wrong: row.wrong_count,
            accuracyPct: row.accuracy_pct
        };
    });

    const needsPractice = games.filter((g) => g.wrong > 0);
    const topPractice = needsPractice.slice(0, 3);
    const mastered = games.filter((g) => g.wrong === 0 && g.total > 0);

    return {
        period: {
            since,
            now,
            days,
            sinceFormatted: formatDate(since),
            nowFormatted: formatDate(now)
        },
        total,
        correct,
        wrong,
        accuracyPct: overallAccuracy,
        activeDays,
        deviceCount,
        games,
        topPractice,
        mastered
    };
}

/**
 * Queries D1 for one accuracy point per game and time bucket. Empty buckets stay
 * null so the chart can break a line instead of drawing a false zero.
 */
export async function generateProgressSeries(db, options = {}) {
    const now = typeof options.now === 'number' ? options.now : Date.now();
    const days = Number.isInteger(options.days) && options.days > 0 ? options.days : DEFAULT_REPORT_DAYS;
    const device = options.device || null;
    const bucketMs = bucketMsForDays(days);
    const since = now - days * DAY_MS;
    const firstBucket = Math.floor(since / bucketMs);
    const lastBucket = Math.floor((now - 1) / bucketMs);

    let sql = `
        SELECT game,
               CAST(ts / ? AS INTEGER) AS bucket,
               COUNT(*) AS total,
               COALESCE(SUM(correct), 0) AS correct_count
        FROM answers
        WHERE ts >= ? AND ts <= ?
    `;
    const args = [bucketMs, since, now];
    if (device) {
        sql += ' AND device = ?';
        args.push(device);
    }
    sql += ' GROUP BY game, bucket ORDER BY bucket';

    const result = await db.prepare(sql).bind(...args).all();
    const buckets = [];
    for (let bucket = firstBucket; bucket <= lastBucket; bucket++) {
        const start = bucket * bucketMs;
        buckets.push({ start, label: bucketLabel(start, bucketMs) });
    }

    const byGame = new Map();
    for (const row of result?.results || []) {
        let game = byGame.get(row.game);
        if (!game) {
            const info = SKILL_INFO[row.game] || { name: row.game };
            game = {
                game: row.game,
                name: info.name,
                color: GAME_COLORS[row.game] || FALLBACK_COLOR,
                total: 0,
                correct: 0,
                points: new Array(buckets.length).fill(null)
            };
            byGame.set(row.game, game);
        }
        const index = row.bucket - firstBucket;
        if (index < 0 || index >= buckets.length) continue;
        game.points[index] = {
            total: row.total,
            correct: row.correct_count,
            accuracyPct: accuracyPct(row.correct_count, row.total)
        };
        game.total += row.total;
        game.correct += row.correct_count;
    }

    const games = [...byGame.values()]
        .map((game) => ({ ...game, accuracyPct: accuracyPct(game.correct, game.total) }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const midpoint = since + (now - since) / 2;
    for (const game of games) {
        let firstTotal = 0;
        let firstCorrect = 0;
        let secondTotal = 0;
        let secondCorrect = 0;
        game.points.forEach((point, index) => {
            if (!point) return;
            if (buckets[index].start < midpoint) {
                firstTotal += point.total;
                firstCorrect += point.correct;
            } else {
                secondTotal += point.total;
                secondCorrect += point.correct;
            }
        });
        game.delta = firstTotal >= MIN_TREND_ATTEMPTS && secondTotal >= MIN_TREND_ATTEMPTS
            ? Math.round((accuracyPct(secondCorrect, secondTotal) - accuracyPct(firstCorrect, firstTotal)) * 10) / 10
            : null;
    }

    return {
        period: { since, now, days },
        bucketMs,
        buckets,
        games
    };
}

/**
 * Queries D1 for the per-game totals Challenge mode weighs its queue with.
 * One device only; no event details leave the database.
 */
export async function generatePracticeStats(db, options = {}) {
    const now = typeof options.now === 'number' ? options.now : Date.now();
    const days = Number.isInteger(options.days) && options.days > 0 ? options.days : 3;
    const device = options.device || null;
    const period = { since: now - days * DAY_MS, now, days };
    if (!device) return { period, games: [] };

    const result = await db.prepare(`
        SELECT game,
               COUNT(*) AS total,
               COALESCE(SUM(correct), 0) AS correct_count,
               COALESCE(SUM(CASE WHEN correct = 0 THEN 1 ELSE 0 END), 0) AS wrong_count,
               ROUND(COALESCE(SUM(correct), 0) * 100.0 / COUNT(*), 1) AS accuracy_pct
        FROM answers
        WHERE ts >= ? AND ts <= ? AND device = ?
        GROUP BY game
        ORDER BY wrong_count DESC, accuracy_pct ASC, total DESC
    `).bind(period.since, now, device).all();

    const games = (result?.results || []).map((row) => ({
        game: row.game,
        total: row.total,
        correct: row.correct_count,
        wrong: row.wrong_count,
        accuracyPct: row.accuracy_pct
    }));
    return { period, games };
}

// The range tabs for the browser preview. Plain links: a GET keeps the page simple
// and works before any script runs.
function renderRangeNav(nav) {
    const tabs = nav.map((tab) => {
        const current = tab.active ? ' aria-current="page"' : '';
        const skin = tab.active
            ? ' background-color: #0f172a; border-color: #0f172a; color: #ffffff;'
            : ' background-color: #ffffff; border-color: #cbd5e1; color: #334155;';
        return `<a href="${escapeHtml(tab.href)}"${current} style="display: inline-block; padding: 6px 16px; margin: 0 3px; border: 1px solid; border-radius: 999px; font-size: 13px; font-weight: 600; text-decoration: none;${skin}">${escapeHtml(daysLabel(tab.days))}</a>`;
    }).join('');
    return `
                <div style="max-width: 560px; margin: 0 auto 14px auto; text-align: center;">
                    ${tabs}
                </div>`;
}

// Preview-only styles. The email keeps inline styles and never receives this block.
const PREVIEW_CSS = `
.pw-section { margin-bottom: 26px; }
.pw-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.pw-eyebrow { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
.pw-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
.pw-actions { display: flex; gap: 12px; }
.pw-action { border: 0; background: none; padding: 0; font: inherit; font-size: 12px; font-weight: 600; color: #2563eb; cursor: pointer; }
.pw-action:hover { text-decoration: underline; }
.pw-chart-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px 12px 16px; background-color: #ffffff; }
.pw-chart-scroll { overflow-x: auto; max-width: 100%; }
.pw-chart { display: block; width: 100%; min-width: 640px; height: auto; }
.pw-chart text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.pw-series.is-hidden { display: none; }
.pw-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.pw-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border: 1px solid #e2e8f0; border-radius: 999px; background-color: #ffffff; font-size: 12px; color: #334155; cursor: pointer; user-select: none; }
.pw-chip:hover { background-color: #f8fafc; }
.pw-chip input { margin: 0; accent-color: #0f172a; }
.pw-swatch { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.pw-trend { white-space: nowrap; font-weight: 600; }
.pw-trend-up { color: #16a34a; }
.pw-trend-down { color: #dc2626; }
.pw-trend-flat { color: #64748b; }
.pw-trend-none { color: #94a3b8; font-weight: 500; }
.pw-table-scroll { overflow-x: auto; max-width: 100%; }
@media (max-width: 640px) {
    .pw-section-head { align-items: flex-start; }
    .pw-body { padding-left: 18px !important; padding-right: 18px !important; }
    .pw-chart-card { padding: 10px; }
    .pw-chip { padding: 4px 7px; gap: 5px; font-size: 11px; }
}
`;

// Small, dependency-free behaviour: checkboxes show or hide pre-rendered series.
const PREVIEW_SCRIPT = `
(() => {
    const root = document.querySelector('[data-progress]');
    if (!root) return;
    const boxes = Array.from(root.querySelectorAll('input[data-game]'));
    const series = new Map(Array.from(root.querySelectorAll('[data-series]')).map((node) => [node.getAttribute('data-series'), node]));
    const sync = () => {
        for (const box of boxes) {
            const node = series.get(box.getAttribute('data-game'));
            if (node) node.classList.toggle('is-hidden', !box.checked);
        }
    };
    for (const box of boxes) box.addEventListener('change', sync);
    const all = root.querySelector('[data-progress-all]');
    const none = root.querySelector('[data-progress-none]');
    if (all) all.addEventListener('click', () => {
        for (const box of boxes) box.checked = true;
        sync();
    });
    if (none) none.addEventListener('click', () => {
        for (const box of boxes) box.checked = false;
        sync();
    });
    sync();
})();
`;

function renderProgressSection(progress) {
    const { buckets, games, bucketMs } = progress;
    const width = 760;
    const height = 280;
    const margin = { top: 18, right: 18, bottom: 30, left: 44 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const x = (index) => buckets.length <= 1
        ? margin.left + plotWidth / 2
        : margin.left + (index / (buckets.length - 1)) * plotWidth;
    const y = (value) => margin.top + plotHeight - (value / 100) * plotHeight;
    const plottedPoints = (game) => game.points.filter(Boolean).length;
    const visible = new Set(games.filter((game) => plottedPoints(game) > 1).map((game) => game.game));
    const bucketDescription = bucketMs >= DAY_MS ? 'per day' : bucketMs >= THREE_HOURS_MS ? 'per 3 hours' : 'per hour';

    const grid = [0, 25, 50, 75, 100].map((value) => {
        const lineY = y(value);
        return `<line x1="${margin.left}" x2="${width - margin.right}" y1="${lineY}" y2="${lineY}" stroke="#e2e8f0" stroke-width="1"/>` +
            `<text x="${margin.left - 8}" y="${lineY + 4}" text-anchor="end" font-size="11" fill="#64748b">${value}%</text>`;
    }).join('');

    const labelStep = Math.max(1, Math.ceil((buckets.length - 1) / 5));
    const labelIndexes = [];
    for (let index = 0; index < buckets.length; index += labelStep) labelIndexes.push(index);
    if (labelIndexes[labelIndexes.length - 1] !== buckets.length - 1) labelIndexes.push(buckets.length - 1);
    const xLabels = labelIndexes.map((index) => {
        const first = index === 0;
        const last = index === buckets.length - 1;
        const anchor = first && !last ? 'start' : last && !first ? 'end' : 'middle';
        const labelX = first && !last ? margin.left : last && !first ? width - margin.right : x(index);
        return `<text x="${labelX.toFixed(1)}" y="${height - 8}" text-anchor="${anchor}" font-size="11" fill="#64748b">${escapeHtml(buckets[index].label)}</text>`;
    }).join('');

    const series = games.map((game) => {
        let path = '';
        let drawing = false;
        const dots = [];
        game.points.forEach((point, index) => {
            if (!point) return;
            const px = x(index).toFixed(1);
            const py = y(point.accuracyPct).toFixed(1);
            path += `${drawing ? 'L' : 'M'}${px},${py} `;
            drawing = true;
            dots.push(`<circle cx="${px}" cy="${py}" r="2.5" fill="currentColor"/>`);
        });
        const hidden = visible.has(game.game) ? '' : ' is-hidden';
        return `<g class="pw-series${hidden}" data-series="${escapeHtml(game.game)}" style="color: ${game.color}">` +
            `<path d="${path.trim()}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
            dots.join('') +
            '</g>';
    }).join('');

    const legend = games.map((game) => {
        const note = plottedPoints(game) <= 1 ? ' title="Only one point in this range"' : '';
        return `<label class="pw-chip"${note}>` +
            `<input type="checkbox" data-game="${escapeHtml(game.game)}"${visible.has(game.game) ? ' checked' : ''}>` +
            `<span class="pw-swatch" style="background-color: ${game.color}"></span>` +
            `<span>${escapeHtml(game.name)}</span>` +
            '</label>';
    }).join('');

    return `
        <div class="pw-section" data-progress>
            <div class="pw-section-head">
                <div>
                    <div class="pw-eyebrow">Progress by Game</div>
                    <div class="pw-sub">Accuracy ${bucketDescription} · lines connect all points, even across gaps</div>
                </div>
                <div class="pw-actions">
                    <button type="button" class="pw-action" data-progress-all>Show all</button>
                    <button type="button" class="pw-action" data-progress-none>Hide all</button>
                </div>
            </div>
            <div class="pw-chart-card">
                <div class="pw-chart-scroll">
                    <svg class="pw-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Accuracy by game over the selected period">
                        ${grid}
                        ${xLabels}
                        ${series}
                    </svg>
                </div>
                <div class="pw-legend">${legend}</div>
            </div>
        </div>`;
}

function renderTrend(delta) {
    if (delta === null || delta === undefined) {
        return '<span class="pw-trend pw-trend-none" title="Not enough attempts in both halves of the range">—</span>';
    }
    if (delta > 0) return `<span class="pw-trend pw-trend-up">↑ +${delta} pts</span>`;
    if (delta < 0) return `<span class="pw-trend pw-trend-down">↓ −${Math.abs(delta)} pts</span>`;
    return '<span class="pw-trend pw-trend-flat">→ 0 pts</span>';
}

/**
 * Builds responsive, high-contrast, minimal modern HTML email.
 */
export function renderReportHtml(summary, options = {}) {
    const { period, total, correct, accuracyPct, activeDays, topPractice, mastered, games } = summary;
    const range = daysLabel(periodDays(period));
    // The range tabs turn the same report into the interactive preview. The email
    // passes no nav, so it keeps its weekly wording and carries no links.
    const preview = Array.isArray(options.nav) && options.nav.length > 0;
    const progress = preview && options.progress && Array.isArray(options.progress.games) && options.progress.games.length > 0
        ? options.progress
        : null;
    const showTrend = Boolean(progress);
    const progressSection = showTrend ? renderProgressSection(progress) : '';
    const trendByGame = new Map((progress?.games || []).map((game) => [game.game, game.delta]));
    const colorByGame = new Map((progress?.games || []).map((game) => [game.game, game.color]));
    const cardWidth = preview ? 880 : 560;
    const navHtml = preview ? renderRangeNav(options.nav) : '';
    const pageTitle = preview ? 'Brain Wars Progress Report' : 'Brain Wars Weekly Report';
    const heading = preview ? 'Math Progress' : 'Weekly Math Progress';
    const masteredHeading = preview ? 'Mastered' : 'Mastered This Week';
    const perfectHeading = preview ? '🌟 100% Accuracy' : '🌟 100% Accuracy This Week';

    let practiceSection = '';
    if (topPractice.length > 0) {
        practiceSection = `
        <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                Focus Areas for Practice
            </div>
            ${topPractice.map((item, index) => `
                <div style="padding: 14px 0; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                        <span style="font-size: 15px; font-weight: 600; color: #0f172a;">
                            ${index + 1}. ${escapeHtml(item.name)}
                        </span>
                        <span style="font-size: 12px; font-weight: 500; color: #dc2626; background-color: #fef2f2; padding: 2px 8px; border-radius: 4px;">
                            ${item.wrong} mistake${item.wrong === 1 ? '' : 's'} (${item.accuracyPct}%)
                        </span>
                    </div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 3px;">
                        ${escapeHtml(item.skill)}
                    </div>
                    ${item.tip ? `
                        <div style="font-size: 13px; color: #334155; margin-top: 6px; padding-left: 10px; border-left: 2px solid #cbd5e1; line-height: 1.4;">
                            <strong>Tip:</strong> ${escapeHtml(item.tip)}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>`;
    } else if (total > 0) {
        practiceSection = `
        <div style="margin-bottom: 24px; padding: 14px 16px; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #dcfce7;">
            <div style="font-size: 14px; font-weight: 600; color: #166534;">
                ${perfectHeading}
            </div>
            <div style="font-size: 13px; color: #15803d; margin-top: 2px;">
                All ${total} attempts were solved correctly without mistakes.
            </div>
        </div>`;
    } else {
        practiceSection = `
        <div style="margin-bottom: 24px; padding: 14px 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-size: 14px; font-weight: 600; color: #334155;">
                No Practice Recorded
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                No questions were solved between ${period.sinceFormatted} and ${period.nowFormatted}.
            </div>
        </div>`;
    }

    let masteredSection = '';
    if (mastered.length > 0) {
        masteredSection = `
        <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                ${masteredHeading}
            </div>
            <div style="font-size: 13px; color: #166534; line-height: 1.6;">
                ${mastered.map((item) => `✓ ${escapeHtml(item.name)} (${item.total} solved)`).join(' &nbsp;•&nbsp; ')}
            </div>
        </div>`;
    }

    let breakdownTable = '';
    if (games.length > 0) {
        const trendHeader = showTrend
            ? '<th style="padding: 6px 0; text-align: right; font-weight: 500;" title="Second half vs first half of the selected range">Trend</th>'
            : '';
        const table = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
                        <th style="padding: 6px 0; text-align: left; font-weight: 500;">Game</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Attempts</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Correct</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Mistakes</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Accuracy</th>
                        ${trendHeader}
                    </tr>
                </thead>
                <tbody>
                    ${games.map((item) => {
                        const trendCell = showTrend
                            ? `<td style="padding: 8px 0; text-align: right;">${renderTrend(trendByGame.get(item.game))}</td>`
                            : '';
                        const color = colorByGame.get(item.game);
                        const gameLabel = showTrend && color
                            ? `<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${color}; margin-right: 7px; vertical-align: 1px;"></span>${escapeHtml(item.name)}`
                            : escapeHtml(item.name);
                        return `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${gameLabel}</td>
                            <td style="padding: 8px 0; text-align: right; color: #64748b;">${item.total}</td>
                            <td style="padding: 8px 0; text-align: right; color: #16a34a; font-weight: 600;">${item.correct}</td>
                            <td style="padding: 8px 0; text-align: right; color: ${item.wrong > 0 ? '#dc2626' : '#94a3b8'}; font-weight: 600;">${item.wrong}</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${item.accuracyPct}%</td>
                            ${trendCell}
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
        breakdownTable = `
        <div style="margin-top: 24px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                Activity Breakdown
            </div>
            ${showTrend ? `<div class="pw-table-scroll">${table}</div>` : table}
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    ${preview ? `<style>${PREVIEW_CSS}</style>` : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
            <td align="center">${navHtml}
                <table role="presentation" width="100%" style="max-width: ${cardWidth}px; table-layout: fixed; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <!-- Brand & Date Header (Solid background & high contrast for all email clients) -->
                    <tr>
                        <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                            <div style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                                🧠 Brain Wars
                            </div>
                            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                ${heading} • ${period.sinceFormatted} – ${period.nowFormatted}
                            </div>
                        </td>
                    </tr>

                    <!-- Key Metrics Row -->
                    <tr>
                        <td style="padding: 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #fafafa;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="33%" style="text-align: left;">
                                        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Solved</div>
                                        <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${total}</div>
                                        <div style="font-size: 12px; color: #16a34a; margin-top: 1px;">${correct} correct</div>
                                    </td>
                                    <td width="33%" style="text-align: left; border-left: 1px solid #e2e8f0; padding-left: 20px;">
                                        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Accuracy</div>
                                        <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${accuracyPct}%</div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 1px;">past ${range}</div>
                                    </td>
                                    <td width="34%" style="text-align: left; border-left: 1px solid #e2e8f0; padding-left: 20px;">
                                        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Active Days</div>
                                        <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${activeDays}</div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 1px;">of ${range}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td class="pw-body" style="padding: 24px 32px 32px 32px;">
                            ${progressSection}
                            ${practiceSection}
                            ${masteredSection}
                            ${breakdownTable}

                            <!-- CTA -->
                            <div style="text-align: center; margin-top: 32px;">
                                <a href="https://alex-just.github.io/brain-wars/" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                    Start Practice Session →
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Minimal Footer -->
                    <tr>
                        <td style="padding: 18px 32px; background-color: #fafafa; border-top: 1px solid #f1f5f9; text-align: center;">
                            <div style="font-size: 12px; color: #94a3b8;">
                                Brain Wars Analytics • Automated weekly summary
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    ${preview ? `<script>${PREVIEW_SCRIPT}</script>` : ''}
</body>
</html>`;
}

/**
 * Builds plain-text version for email fallback.
 */
export function renderReportText(summary) {
    const { period, total, correct, wrong, accuracyPct, activeDays, topPractice, mastered, games } = summary;

    const lines = [
        'BRAIN WARS - WEEKLY MATH REPORT',
        `Period: ${period.sinceFormatted} - ${period.nowFormatted}`,
        '----------------------------------------',
        `Total Solved: ${total} questions`,
        `Correct: ${correct} (${accuracyPct}% accuracy)`,
        `Mistakes: ${wrong}`,
        `Active Days: ${activeDays} / ${periodDays(period)}`,
        '----------------------------------------',
        ''
    ];

    if (topPractice.length > 0) {
        lines.push('FOCUS AREAS FOR PRACTICE:');
        topPractice.forEach((item, index) => {
            const block = [
                `${index + 1}. ${item.name}`,
                `   Mistakes: ${item.wrong} (${item.accuracyPct}% accuracy)`,
                `   Core skill: ${item.skill}`
            ];
            if (item.tip) block.push(`   Tip: ${item.tip}`);
            block.push('');
            lines.push(...block);
        });
    } else if (total > 0) {
        lines.push('🌟 100% accuracy across all games this week.', '');
    } else {
        lines.push('No practice recorded this week.', '');
    }

    if (mastered.length > 0) {
        lines.push('MASTERED THIS WEEK (100% Correct):');
        mastered.forEach((item) => {
            lines.push(`- ${item.name} (${item.total} solved)`);
        });
        lines.push('');
    }

    if (games.length > 0) {
        lines.push('ACTIVITY BREAKDOWN:');
        games.forEach((item) => {
            lines.push(`- ${item.name}: ${item.correct}/${item.total} correct (${item.accuracyPct}%)`);
        });
        lines.push('');
    }

    lines.push('Play online: https://alex-just.github.io/brain-wars/');
    return lines.join('\n');
}

/**
 * Dispatches the email through Resend, Brevo, or native Cloudflare Email Routing.
 */
async function postJson(url, headers, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const status = response.status;
    const responseText = await response.text();
    let payload;
    try { payload = JSON.parse(responseText); } catch { payload = { raw: responseText }; }
    return { ok: response.ok, status, payload };
}

async function sendViaResend(env, message) {
    const { ok, status, payload } = await postJson(
        'https://api.resend.com/emails',
        {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        {
            from: message.from,
            to: Array.isArray(message.to) ? message.to : [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text
        }
    );
    return ok
        ? { ok: true, provider: 'resend', status, data: payload }
        : { ok: false, provider: 'resend', status, error: payload };
}

async function sendViaBrevo(env, message) {
    const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map((email) => ({ email }));
    const { ok, status, payload } = await postJson(
        'https://api.brevo.com/v3/smtp/email',
        {
            'api-key': env.BREVO_API_KEY,
            'Content-Type': 'application/json'
        },
        {
            sender: { name: 'Brain Wars', email: env.EMAIL_FROM_BREVO || (Array.isArray(message.to) ? message.to[0] : message.to) },
            to: recipients,
            subject: message.subject,
            htmlContent: message.html,
            textContent: message.text
        }
    );
    return ok
        ? { ok: true, provider: 'brevo', status, data: payload }
        : { ok: false, provider: 'brevo', status, error: payload };
}

export async function sendReportEmail(env, summary, options = {}) {
    const to = options.to || env?.REPORT_EMAIL;
    if (!to) {
        return {
            ok: false,
            provider: 'none',
            status: 0,
            error: 'No recipient configured. Set REPORT_EMAIL with: npx wrangler secret put REPORT_EMAIL --name brain-wars-answers'
        };
    }

    const message = {
        to,
        from: options.from || env?.EMAIL_FROM || 'Brain Wars <onboarding@resend.dev>',
        subject: options.subject || `Brain Wars Weekly: ${summary.total} questions (${summary.accuracyPct}% accuracy)`,
        html: renderReportHtml(summary),
        text: renderReportText(summary)
    };

    if (env?.RESEND_API_KEY) return sendViaResend(env, message);
    if (env?.BREVO_API_KEY) return sendViaBrevo(env, message);

    // Dry run or no provider configured
    return {
        ok: false,
        provider: 'none',
        status: 0,
        error: 'No email provider configured. Set RESEND_API_KEY with: npx wrangler secret put RESEND_API_KEY --name brain-wars-answers'
    };
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
