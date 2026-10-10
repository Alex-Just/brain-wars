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
    }
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(ms) {
    const d = new Date(ms);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Queries D1 for weekly summary statistics.
 */
export async function generateWeeklySummary(db, options = {}) {
    const now = typeof options.now === 'number' ? options.now : Date.now();
    const days = typeof options.days === 'number' ? options.days : 7;
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

    const total = (totalsRow && totalsRow.total) || 0;
    const correct = (totalsRow && totalsRow.correct_count) || 0;
    const wrong = (totalsRow && totalsRow.wrong_count) || 0;
    const activeDays = (totalsRow && totalsRow.active_days) || 0;
    const deviceCount = (totalsRow && totalsRow.device_count) || 0;
    const accuracyPct = total > 0 ? Math.round((correct * 1000) / total) / 10 : 0;

    const rawGames = (gamesResult && gamesResult.results) || [];
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
        accuracyPct,
        activeDays,
        deviceCount,
        games,
        topPractice,
        mastered
    };
}

/**
 * Builds responsive, high-contrast, minimal modern HTML email.
 */
export function renderReportHtml(summary) {
    const { period, total, correct, accuracyPct, activeDays, topPractice, mastered, games } = summary;

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
                🌟 100% Accuracy This Week
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
                Mastered This Week
            </div>
            <div style="font-size: 13px; color: #166534; line-height: 1.6;">
                ${mastered.map((item) => `✓ ${escapeHtml(item.name)} (${item.total} solved)`).join(' &nbsp;•&nbsp; ')}
            </div>
        </div>`;
    }

    let breakdownTable = '';
    if (games.length > 0) {
        breakdownTable = `
        <div style="margin-top: 24px;">
            <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                Activity Breakdown
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
                        <th style="padding: 6px 0; text-align: left; font-weight: 500;">Game</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Attempts</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Correct</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Mistakes</th>
                        <th style="padding: 6px 0; text-align: right; font-weight: 500;">Accuracy</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map((item) => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${escapeHtml(item.name)}</td>
                            <td style="padding: 8px 0; text-align: right; color: #64748b;">${item.total}</td>
                            <td style="padding: 8px 0; text-align: right; color: #16a34a; font-weight: 600;">${item.correct}</td>
                            <td style="padding: 8px 0; text-align: right; color: ${item.wrong > 0 ? '#dc2626' : '#94a3b8'}; font-weight: 600;">${item.wrong}</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${item.accuracyPct}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brain Wars Weekly Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <!-- Brand & Date Header (Solid background & high contrast for all email clients) -->
                    <tr>
                        <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                            <div style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                                🧠 Brain Wars
                            </div>
                            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                Weekly Math Progress • ${period.sinceFormatted} – ${period.nowFormatted}
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
                                        <div style="font-size: 12px; color: #64748b; margin-top: 1px;">past 7 days</div>
                                    </td>
                                    <td width="34%" style="text-align: left; border-left: 1px solid #e2e8f0; padding-left: 20px;">
                                        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Active Days</div>
                                        <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${activeDays}</div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 1px;">of 7 days</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 24px 32px 32px 32px;">
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
</body>
</html>`;
}

/**
 * Builds plain-text version for email fallback.
 */
export function renderReportText(summary) {
    const { period, total, correct, wrong, accuracyPct, activeDays, topPractice, mastered, games } = summary;

    let lines = [
        'BRAIN WARS - WEEKLY MATH REPORT',
        `Period: ${period.sinceFormatted} - ${period.nowFormatted}`,
        '----------------------------------------',
        `Total Solved: ${total} questions`,
        `Correct: ${correct} (${accuracyPct}% accuracy)`,
        `Mistakes: ${wrong}`,
        `Active Days: ${activeDays} / 7`,
        '----------------------------------------',
        ''
    ];

    if (topPractice.length > 0) {
        lines.push('FOCUS AREAS FOR PRACTICE:');
        topPractice.forEach((item, index) => {
            lines.push(`${index + 1}. ${item.name}`);
            lines.push(`   Mistakes: ${item.wrong} (${item.accuracyPct}% accuracy)`);
            lines.push(`   Core skill: ${item.skill}`);
            if (item.tip) lines.push(`   Tip: ${item.tip}`);
            lines.push('');
        });
    } else if (total > 0) {
        lines.push('🌟 100% accuracy across all games this week.');
        lines.push('');
    } else {
        lines.push('No practice recorded this week.');
        lines.push('');
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
export async function sendReportEmail(env, summary, options = {}) {
    const to = options.to || (env && env.REPORT_EMAIL);
    if (!to) {
        return {
            ok: false,
            provider: 'none',
            status: 0,
            error: 'No recipient configured. Set REPORT_EMAIL with: npx wrangler secret put REPORT_EMAIL --name brain-wars-answers'
        };
    }

    const from = options.from || (env && env.EMAIL_FROM) || 'Brain Wars <onboarding@resend.dev>';
    const subject = options.subject || `Brain Wars Weekly: ${summary.total} questions (${summary.accuracyPct}% accuracy)`;
    const html = renderReportHtml(summary);
    const text = renderReportText(summary);

    // 1. Resend API
    if (env && env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text
            })
        });

        const status = response.status;
        const responseText = await response.text();
        let payload;
        try { payload = JSON.parse(responseText); } catch (e) { payload = { raw: responseText }; }

        if (!response.ok) {
            return { ok: false, provider: 'resend', status, error: payload };
        }
        return { ok: true, provider: 'resend', status, data: payload };
    }

    // 2. Brevo API
    if (env && env.BREVO_API_KEY) {
        const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Brain Wars', email: env.EMAIL_FROM_BREVO || (Array.isArray(to) ? to[0] : to) },
                to: recipients,
                subject,
                htmlContent: html,
                textContent: text
            })
        });

        const status = response.status;
        const responseText = await response.text();
        let payload;
        try { payload = JSON.parse(responseText); } catch (e) { payload = { raw: responseText }; }

        if (!response.ok) {
            return { ok: false, provider: 'brevo', status, error: payload };
        }
        return { ok: true, provider: 'brevo', status, data: payload };
    }

    // 3. Dry run / not configured
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
