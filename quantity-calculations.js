/**
 * Shared engine for the two "quantity calculations" column games:
 * Brain Wars money calculations (euros and cents) and time calculations
 * (hours and minutes). Both games practise the same column method with a
 * different base — 100 cents make a euro, 60 minutes make an hour — so one
 * parameterised engine drives both.
 *
 * Each problem carries its step plan, in the order the child works:
 *   add  <sum> -> carry -> <unit> -> <major>   (when the small units reach the scale)
 *   add  <unit> -> <major>                     (when they do not)
 *   sub  borrow -> <unit> -> <major>           (when the small units must borrow)
 *   sub  <unit> -> <major>                     (when they must not)
 * Every step's `answer` is exactly what the child types.
 *
 * The shared engine is instantiated twice at the bottom of this file: once as
 * window.BrainWarsMoney (cents, scale 100) and once as window.BrainWarsTime
 * (minutes, scale 60). Browser: window.BrainWarsQuantity / BrainWarsMoney /
 * BrainWarsTime. Node (tests): module.exports = { createEngine, money, time }.
 */
((global) => {
    'use strict';

    const ATTEMPTS = 50; // re-rolls when a random pick lands outside the level's idea

    // One row per level, shared by both games. `mode` is the idea being practised:
    //   plain   - no regrouping; carry - the small units always carry a whole;
    //   exact   - the small units are exactly one whole; borrow - they always
    //             borrow a whole; equal - both operands share the small-unit value;
    //   regroup - carry when adding / borrow when subtracting; any - free.
    // `cap` is the largest leading-column operand (euros for money, hours for
    // time); `step` keeps the early levels on the 5s (or 1s) grid.
    const LEVELS = [
        // 1-5: adding, one idea at a time
        { ops: ['add'], mode: 'plain', cap: 9, step: 5 },
        { ops: ['add'], mode: 'plain', cap: 49, step: 5 },
        { ops: ['add'], mode: 'carry', cap: 9, step: 5 },
        { ops: ['add'], mode: 'carry', cap: 49, step: 5 },
        { ops: ['add'], mode: 'exact', cap: 49, step: 5 },
        // 6-10: subtracting
        { ops: ['sub'], mode: 'plain', cap: 9, step: 5 },
        { ops: ['sub'], mode: 'plain', cap: 89, step: 5 },
        { ops: ['sub'], mode: 'borrow', cap: 9, step: 5 },
        { ops: ['sub'], mode: 'borrow', cap: 89, step: 5 },
        { ops: ['sub'], mode: 'equal', cap: 89, step: 5 },
        // 11-14: both directions
        { ops: ['add', 'sub'], mode: 'plain', cap: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', cap: 9, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', cap: 49, step: 5 },
        { ops: ['add', 'sub'], mode: 'regroup', cap: 49, step: 1 },
        // 15-20: full precision on the small units, larger amounts
        { ops: ['add', 'sub'], mode: 'regroup', cap: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', cap: 49, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', cap: 59, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', cap: 69, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', cap: 79, step: 1 },
        { ops: ['add', 'sub'], mode: 'any', cap: 89, step: 1 }
    ];

    function randomInt(rng, min, max) {
        return min + Math.floor(rng() * (max - min + 1));
    }

    function pick(rng, list) {
        return list[Math.floor(rng() * list.length)];
    }

    // One step of the plan. `answer` is what the column shows; `accepted` lists
    // every typed form that counts as right. The small units may be typed with
    // or without a leading zero ("5" or "05"); everything else is typed as it reads.
    function step(kind, answer, accepted) {
        return { kind, answer, accepted: accepted || [answer] };
    }

    /**
     * Build one calculations engine.
     * unit — the small column ('cents' or 'minutes'); major — the large column
     * ('euros' or 'hours'); scale — how many small units make one big one;
     * sumKind — the step kind that shows the raw small-unit sum.
     */
    function createEngine({ unit, major, scale, sumKind }) {
        function clampLevel(level) {
            const value = Math.trunc(Number(level)) || 1;
            return Math.min(Math.max(value, 1), LEVELS.length);
        }

        // The small-unit values of both operands, honouring the level's idea.
        function pickQuantity(rng, op, config) {
            const step = config.step;
            const last = Math.floor((scale - 1) / step);
            const regroupMode = op === 'add' ? 'carry' : 'borrow';
            const mode = config.mode === 'regroup' ? regroupMode : config.mode;

            if (op === 'add') {
                if (mode === 'carry' || mode === 'exact') {
                    // The first value must leave room for a second below the scale
                    const first = step * randomInt(rng, 2, last - 1);
                    if (mode === 'exact') return { first, second: scale - first };
                    const minSecond = step * (Math.floor((scale - first) / step) + 1);
                    return { first, second: step * randomInt(rng, minSecond / step, last) };
                }
                if (mode === 'plain') {
                    const first = step * randomInt(rng, 1, last - 1);
                    return { first, second: step * randomInt(rng, 1, Math.floor((scale - 1 - first) / step)) };
                }
                return { first: randomInt(rng, 1, scale - 1), second: randomInt(rng, 1, scale - 1) };
            }

            if (mode === 'borrow') {
                const first = step * randomInt(rng, 1, last - 1);
                return { first, second: first + step * randomInt(rng, 1, Math.floor((scale - 1 - first) / step)) };
            }
            if (mode === 'equal') {
                const first = step * randomInt(rng, 1, last);
                return { first, second: first };
            }
            if (mode === 'plain') {
                const first = step * randomInt(rng, 1, last);
                return { first, second: step * randomInt(rng, 1, Math.floor(first / step)) };
            }
            return { first: randomInt(rng, 1, scale - 1), second: randomInt(rng, 1, scale - 1) };
        }

        // Both operands for one operation; the caps keep every result at two digits.
        function makeProblem(rng, op, config) {
            const { first, second } = pickQuantity(rng, op, config);

            if (op === 'add') {
                const carry = first + second >= scale ? 1 : 0;
                const firstMajor = randomInt(rng, 1, config.cap);
                const secondMajor = randomInt(rng, 1, Math.min(config.cap, 99 - firstMajor - carry));
                return { op, a: { [major]: firstMajor, [unit]: first }, b: { [major]: secondMajor, [unit]: second } };
            }

            const borrow = first < second ? 1 : 0;
            const firstMajor = randomInt(rng, borrow + 1, config.cap);
            const secondMajor = randomInt(rng, 1, firstMajor - borrow);
            return { op, a: { [major]: firstMajor, [unit]: first }, b: { [major]: secondMajor, [unit]: second } };
        }

        function withResult(problem) {
            const { op, a, b } = problem;
            const small = op === 'add' ? a[unit] + b[unit] : a[unit] - b[unit];
            const carry = small >= scale ? 1 : 0;
            const borrow = small < 0 ? 1 : 0;
            return {
                ...problem,
                result: {
                    [major]: op === 'add' ? a[major] + b[major] + carry : a[major] - b[major] - borrow,
                    [unit]: op === 'add' ? small - carry * scale : small + borrow * scale
                },
                steps: buildSteps(problem)
            };
        }

        function quantityStep(value) {
            const padded = String(value).padStart(2, '0');
            return step(unit, padded, value < 10 ? [padded, String(value)] : [padded]);
        }

        function buildSteps(problem) {
            const { op, a, b } = problem;
            const steps = [];

            if (op === 'add') {
                const small = a[unit] + b[unit];
                if (small >= scale) {
                    steps.push(
                        step(sumKind, String(small)),
                        step('carry', '1'),
                        quantityStep(small - scale),
                        step(major, String(a[major] + b[major] + 1))
                    );
                } else {
                    steps.push(quantityStep(small), step(major, String(a[major] + b[major])));
                }
                return steps;
            }

            if (a[unit] < b[unit]) {
                steps.push(
                    step('borrow', String(a[unit] + scale)),
                    quantityStep(a[unit] + scale - b[unit]),
                    step(major, String(a[major] - 1 - b[major]))
                );
            } else {
                steps.push(quantityStep(a[unit] - b[unit]), step(major, String(a[major] - b[major])));
            }
            return steps;
        }

        function questionKey(problem) {
            return [problem.op, problem.a[major], problem.a[unit], problem.b[major], problem.b[unit]].join(':');
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
                const empty = problem.result[major] === 0 && problem.result[unit] === 0;
                if (!empty && (!avoidKey || questionKey(problem) !== avoidKey)) return problem;
            }
            // A tiny pool may leave no other problem; repeat rather than loop forever
            return problem;
        }

        return { maxLevel: LEVELS.length, build };
    }

    // The two games this engine drives, configured with their own units.
    const money = createEngine({ unit: 'cents', major: 'euros', scale: 100, sumKind: 'centsSum' });
    const time = createEngine({ unit: 'minutes', major: 'hours', scale: 60, sumKind: 'minutesSum' });

    global.BrainWarsMoney = money;
    global.BrainWarsTime = time;
    global.BrainWarsQuantity = { createEngine, money, time };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsQuantity;
    }
})(typeof window !== 'undefined' ? window : globalThis);