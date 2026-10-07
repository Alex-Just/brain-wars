/**
 * Brain Wars time calculations questions.
 *
 * Pure, language-free problem generator for adding and subtracting times in the
 * school column method: minutes under minutes, hours under hours. Sixty minutes
 * make an hour, so adding minutes may carry an hour and subtracting them may
 * borrow one.
 *
 * A problem carries its own step plan, in the order the child works:
 *   add  minutesSum -> minutes -> carry -> hours   (when the minutes reach 60)
 *   add  minutes -> hours                          (when they do not)
 *   sub  borrow -> minutes -> hours                (when minutes must be borrowed)
 *   sub  minutes -> hours                          (when they must not)
 * Every step's `answer` is exactly what the child types into its cell.
 *
 * Browser: window.BrainWarsTime. Node (tests): module.exports.
 */
(function (global) {
    'use strict';

    const ATTEMPTS = 50; // re-rolls when a random pick lands outside the level's idea

    // One row per level. `mode` is the idea being practised:
    //   plain   — add without carrying / subtract without borrowing
    //   carry   — the minutes always carry an hour
    //   exact   — the minutes are exactly one hour
    //   borrow  — the minutes always borrow an hour
    //   equal   — both times have the same minutes
    //   regroup — carry when adding, borrow when subtracting
    //   any     — no constraint; the numbers decide
    // `step` keeps early minutes on the 5s (or 1s) grid; `maxHours` caps operands.
    const LEVELS = [
        // 1-5: adding, one idea at a time
        { ops: ['add'], mode: 'plain', maxHours: 9, step: 5 },
        { ops: ['add'], mode: 'plain', maxHours: 49, step: 5 },
        { ops: ['add'], mode: 'carry', maxHours: 9, step: 5 },
        { ops: ['add'], mode: 'carry', maxHours: 49, step: 5 },
        { ops: ['add'], mode: 'exact', maxHours: 49, step: 5 },
        // 6-10: subtracting
        { ops: ['sub'], mode: 'plain', maxHours: 9, step: 5 },
        { ops: ['sub'], mode: 'plain', maxHours: 89, step: 5 },
        { ops: ['sub'], mode: 'borrow', maxHours: 9, step: 5 },
        { ops: ['sub'], mode: 'borrow', maxHours: 89, step: 5 },
        { ops: ['sub'], mode: 'equal', maxHours: 89, step: 5 },
        // 11-14: both directions
        { ops: ['add', 'sub'], mode: 'plain', maxHours: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxHours: 9, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxHours: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxHours: 49, step: 1 },
        // 15-20: full minute precision, longer times
        { ops: ['add', 'sub'], mode: 'regroup', maxHours: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxHours: 49, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxHours: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxHours: 69, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxHours: 79, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxHours: 89, step: 1 }
    ];

    function clampLevel(level) {
        const value = Math.trunc(Number(level)) || 1;
        return Math.min(Math.max(value, 1), LEVELS.length);
    }

    function randomInt(rng, min, max) {
        return min + Math.floor(rng() * (max - min + 1));
    }

    function pick(rng, list) {
        return list[Math.floor(rng() * list.length)];
    }

    // The minutes of both times, honouring the level's idea
    function pickMinutes(rng, op, config) {
        const step = config.step;
        const last = Math.floor(59 / step);
        const mode = config.mode === 'regroup' ? (op === 'add' ? 'carry' : 'borrow') : config.mode;

        if (op === 'add') {
            if (mode === 'carry' || mode === 'exact') {
                // The first minutes must leave room for a second value below 60
                const first = step * randomInt(rng, 2, last - 1);
                if (mode === 'exact') return { first, second: 60 - first };
                const minSecond = step * (Math.floor((60 - first) / step) + 1);
                return { first, second: step * randomInt(rng, minSecond / step, last) };
            }
            if (mode === 'plain') {
                const first = step * randomInt(rng, 1, last - 1);
                return { first, second: step * randomInt(rng, 1, Math.floor((59 - first) / step)) };
            }
            return { first: randomInt(rng, 1, 59), second: randomInt(rng, 1, 59) };
        }

        if (mode === 'borrow') {
            const first = step * randomInt(rng, 1, last - 1);
            return { first, second: first + step * randomInt(rng, 1, Math.floor((59 - first) / step)) };
        }
        if (mode === 'equal') {
            const first = step * randomInt(rng, 1, last);
            return { first, second: first };
        }
        if (mode === 'plain') {
            const first = step * randomInt(rng, 1, last);
            return { first, second: step * randomInt(rng, 1, Math.floor(first / step)) };
        }
        return { first: randomInt(rng, 1, 59), second: randomInt(rng, 1, 59) };
    }

    // Both times for one operation. The minds of the level live in `picker`, the
    // hour caps keep every result inside two digits.
    function makeProblem(rng, op, config) {
        const { first, second } = pickMinutes(rng, op, config);

        if (op === 'add') {
            const carry = first + second >= 60 ? 1 : 0;
            const firstHours = randomInt(rng, 1, config.maxHours);
            const secondHours = randomInt(rng, 1, Math.min(config.maxHours, 99 - firstHours - carry));
            return { op, a: { hours: firstHours, minutes: first }, b: { hours: secondHours, minutes: second } };
        }

        const borrow = first < second ? 1 : 0;
        const firstHours = randomInt(rng, borrow + 1, config.maxHours);
        const secondHours = randomInt(rng, 1, firstHours - borrow);
        return { op, a: { hours: firstHours, minutes: first }, b: { hours: secondHours, minutes: second } };
    }

    function withResult(problem) {
        const { op, a, b } = problem;
        const minutes = op === 'add' ? a.minutes + b.minutes : a.minutes - b.minutes;
        const carry = minutes >= 60 ? 1 : 0;
        const borrow = minutes < 0 ? 1 : 0;
        return {
            ...problem,
            result: {
                hours: op === 'add' ? a.hours + b.hours + carry : a.hours - b.hours - borrow,
                minutes: op === 'add' ? minutes - carry * 60 : minutes + borrow * 60
            },
            steps: buildSteps(problem)
        };
    }

    // One step of the plan. `answer` is what the column shows; `accepted` lists every
    // typed form that counts as right. Minutes may be typed with or without the
    // leading zero ("5" or "05"), everything else is typed as it reads.
    function step(kind, answer, accepted) {
        return { kind, answer, accepted: accepted || [answer] };
    }

    function minutesStep(value) {
        const padded = String(value).padStart(2, '0');
        return step('minutes', padded, value < 10 ? [padded, String(value)] : [padded]);
    }

    function buildSteps(problem) {
        const { op, a, b } = problem;
        const steps = [];

        if (op === 'add') {
            const sum = a.minutes + b.minutes;
            if (sum >= 60) {
                steps.push(step('minutesSum', String(sum)));
                steps.push(step('carry', '1'));
                steps.push(minutesStep(sum - 60));
                steps.push(step('hours', String(a.hours + b.hours + 1)));
            } else {
                steps.push(minutesStep(sum));
                steps.push(step('hours', String(a.hours + b.hours)));
            }
            return steps;
        }

        if (a.minutes < b.minutes) {
            steps.push(step('borrow', String(a.minutes + 60)));
            steps.push(minutesStep(a.minutes + 60 - b.minutes));
            steps.push(step('hours', String(a.hours - 1 - b.hours)));
        } else {
            steps.push(minutesStep(a.minutes - b.minutes));
            steps.push(step('hours', String(a.hours - b.hours)));
        }
        return steps;
    }

    function questionKey(problem) {
        return [problem.op, problem.a.hours, problem.a.minutes, problem.b.hours, problem.b.minutes].join(':');
    }

    /**
     * One problem for a level (1..20).
     * rng    optional random source, Math.random by default
     * avoid  the previous problem, so the same one never comes twice in a row
     */
    function build(level, rng, avoid) {
        const config = LEVELS[clampLevel(level) - 1];
        const random = typeof rng === 'function' ? rng : Math.random;
        const avoidKey = avoid ? questionKey(avoid) : null;

        let problem = null;
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            const op = pick(random, config.ops);
            problem = withResult(makeProblem(random, op, config));
            const empty = problem.result.hours === 0 && problem.result.minutes === 0;
            if (!empty && (!avoidKey || questionKey(problem) !== avoidKey)) return problem;
        }
        // A tiny pool may leave no other problem; repeat rather than loop forever
        return problem;
    }

    global.BrainWarsTime = {
        maxLevel: LEVELS.length,
        build
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsTime;
    }
})(typeof window !== 'undefined' ? window : globalThis);
