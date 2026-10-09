/**
 * Money calculation problems: add and subtract euros and cents in columns.
 * 100 cents make a euro, so cents may carry or borrow a euro.
 *
 * Each problem carries its step plan, in the order the child works:
 *   add: centsSum -> carry -> cents -> euros when the cents reach 100, else cents -> euros
 *   sub: borrow -> cents -> euros when the cents must borrow, else cents -> euros
 * Every step's `answer` is exactly what the child types.
 *
 * Browser: window.BrainWarsMoney. Node (tests): module.exports.
 */
(function (global) {
    'use strict';

    const ATTEMPTS = 50; // retries when a pick misses the level's mode

    // One row per level. `mode` sets the idea:
    // plain — no regroup; carry — cents carry a euro; exact — cents sum to 100;
    // borrow — cents borrow a euro; equal — same cents; regroup — carry/borrow by op;
    // any — free. `step` is the cents grid (5 or 1); `maxEuros` caps operands.
    const LEVELS = [
        // 1-5: adding, one idea at a time
        { ops: ['add'], mode: 'plain', maxEuros: 9, step: 5 },
        { ops: ['add'], mode: 'plain', maxEuros: 49, step: 5 },
        { ops: ['add'], mode: 'carry', maxEuros: 9, step: 5 },
        { ops: ['add'], mode: 'carry', maxEuros: 49, step: 5 },
        { ops: ['add'], mode: 'exact', maxEuros: 49, step: 5 },
        // 6-10: subtracting
        { ops: ['sub'], mode: 'plain', maxEuros: 9, step: 5 },
        { ops: ['sub'], mode: 'plain', maxEuros: 89, step: 5 },
        { ops: ['sub'], mode: 'borrow', maxEuros: 9, step: 5 },
        { ops: ['sub'], mode: 'borrow', maxEuros: 89, step: 5 },
        { ops: ['sub'], mode: 'equal', maxEuros: 89, step: 5 },
        // 11-14: both directions
        { ops: ['add', 'sub'], mode: 'plain', maxEuros: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxEuros: 9, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxEuros: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', maxEuros: 49, step: 1 },
        // 15-20: full cent precision, larger amounts
        { ops: ['add', 'sub'], mode: 'regroup', maxEuros: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxEuros: 49, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxEuros: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxEuros: 69, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxEuros: 79, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', maxEuros: 89, step: 1 }
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

    // Pick both cents values for the level's mode
    function pickCents(rng, op, config) {
        const step = config.step;
        const last = Math.floor(99 / step);
        const mode = config.mode === 'regroup' ? (op === 'add' ? 'carry' : 'borrow') : config.mode;

        if (op === 'add') {
            if (mode === 'carry' || mode === 'exact') {
                // Keep room for a second value below 100
                const first = step * randomInt(rng, 2, last - 1);
                if (mode === 'exact') return { first, second: 100 - first };
                const minSecond = step * (Math.floor((100 - first) / step) + 1);
                return { first, second: step * randomInt(rng, minSecond / step, last) };
            }
            if (mode === 'plain') {
                const first = step * randomInt(rng, 1, last - 1);
                return { first, second: step * randomInt(rng, 1, Math.floor((99 - first) / step)) };
            }
            return { first: randomInt(rng, 1, 99), second: randomInt(rng, 1, 99) };
        }

        if (mode === 'borrow') {
            const first = step * randomInt(rng, 1, last - 1);
            return { first, second: first + step * randomInt(rng, 1, Math.floor((99 - first) / step)) };
        }
        if (mode === 'equal') {
            const first = step * randomInt(rng, 1, last);
            return { first, second: first };
        }
        if (mode === 'plain') {
            const first = step * randomInt(rng, 1, last);
            return { first, second: step * randomInt(rng, 1, Math.floor(first / step)) };
        }
        return { first: randomInt(rng, 1, 99), second: randomInt(rng, 1, 99) };
    }

    // Both amounts for one operation; the euro caps keep results at two digits.
    function makeProblem(rng, op, config) {
        const { first, second } = pickCents(rng, op, config);

        if (op === 'add') {
            const carry = first + second >= 100 ? 1 : 0;
            const firstEuros = randomInt(rng, 1, config.maxEuros);
            const secondEuros = randomInt(rng, 1, Math.min(config.maxEuros, 99 - firstEuros - carry));
            return { op, a: { euros: firstEuros, cents: first }, b: { euros: secondEuros, cents: second } };
        }

        const borrow = first < second ? 1 : 0;
        const firstEuros = randomInt(rng, borrow + 1, config.maxEuros);
        const secondEuros = randomInt(rng, 1, firstEuros - borrow);
        return { op, a: { euros: firstEuros, cents: first }, b: { euros: secondEuros, cents: second } };
    }

    function withResult(problem) {
        const { op, a, b } = problem;
        const cents = op === 'add' ? a.cents + b.cents : a.cents - b.cents;
        const carry = cents >= 100 ? 1 : 0;
        const borrow = cents < 0 ? 1 : 0;
        return {
            ...problem,
            result: {
                euros: op === 'add' ? a.euros + b.euros + carry : a.euros - b.euros - borrow,
                cents: op === 'add' ? cents - carry * 100 : cents + borrow * 100
            },
            steps: buildSteps(problem)
        };
    }

    // One step: `answer` is what the column shows; `accepted` lists valid typed forms.
    // Cents accept "5" or "05"; everything else is typed as it reads.
    function step(kind, answer, accepted) {
        return { kind, answer, accepted: accepted || [answer] };
    }

    function centsStep(value) {
        const padded = String(value).padStart(2, '0');
        return step('cents', padded, value < 10 ? [padded, String(value)] : [padded]);
    }

    function buildSteps(problem) {
        const { op, a, b } = problem;
        const steps = [];

        if (op === 'add') {
            const sum = a.cents + b.cents;
            if (sum >= 100) {
                steps.push(step('centsSum', String(sum)));
                steps.push(step('carry', '1'));
                steps.push(centsStep(sum - 100));
                steps.push(step('euros', String(a.euros + b.euros + 1)));
            } else {
                steps.push(centsStep(sum));
                steps.push(step('euros', String(a.euros + b.euros)));
            }
            return steps;
        }

        if (a.cents < b.cents) {
            steps.push(step('borrow', String(a.cents + 100)));
            steps.push(centsStep(a.cents + 100 - b.cents));
            steps.push(step('euros', String(a.euros - 1 - b.euros)));
        } else {
            steps.push(centsStep(a.cents - b.cents));
            steps.push(step('euros', String(a.euros - b.euros)));
        }
        return steps;
    }

    function questionKey(problem) {
        return [problem.op, problem.a.euros, problem.a.cents, problem.b.euros, problem.b.cents].join(':');
    }

    /**
     * Build one problem for a level (1..20).
     * rng — random source, Math.random by default; avoid — the previous problem.
     */
    function build(level, rng, avoid) {
        const config = LEVELS[clampLevel(level) - 1];
        const random = typeof rng === 'function' ? rng : Math.random;
        const avoidKey = avoid ? questionKey(avoid) : null;

        let problem = null;
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            const op = pick(random, config.ops);
            problem = withResult(makeProblem(random, op, config));
            const empty = problem.result.euros === 0 && problem.result.cents === 0;
            if (!empty && (!avoidKey || questionKey(problem) !== avoidKey)) return problem;
        }
        // Tiny pool: repeat rather than loop forever
        return problem;
    }

    global.BrainWarsMoney = {
        maxLevel: LEVELS.length,
        build
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsMoney;
    }
})(typeof window !== 'undefined' ? window : globalThis);
