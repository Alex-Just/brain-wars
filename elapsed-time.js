/**
 * Brain Wars elapsed time questions.
 *
 * Pure, language-free question generator: every level builds one question about time
 * passing, and the page turns the numbers into a sentence in the active language.
 *
 * Times live on a 12-hour dial as minutes: 0 is 12:00, 60 is 1:00, 719 is 11:59.
 * A question always knows its start, its end and the span between them; `kind` says
 * which of the three the child is asked for:
 *   'end'      the start and the span are given, the end is the answer
 *   'start'    the end and the span are given, the start is the answer
 *   'duration' both times are given, the span is the answer
 *
 * Browser: window.BrainWarsElapsed. Node (tests): module.exports.
 */
(function (global) {
    'use strict';

    const DIAL = 720;                 // minutes on a 12-hour dial
    const KINDS = ['end', 'start', 'duration'];
    const AVOID_TRIES = 40;           // re-rolls when the previous question must not repeat

    // One row per level. `steps` are the clock granularities a shown time may use (in
    // minutes), `span` is the shortest and longest span counted in those units, `cross`
    // says whether a span may run through 12 o'clock ('never', 'free' or 'always'),
    // `mixed` keeps the span from being a whole number of hours, and `story` is the
    // chance that a small story frames the question.
    const LEVELS = [
        // 1-2: whole hours, one direction at a time
        { kinds: ['end'], steps: [60], span: [1, 3], cross: 'never', story: 0 },
        { kinds: ['start'], steps: [60], span: [1, 3], cross: 'never', story: 0 },
        // 3-4: half hours, so the minute hand starts to carry
        { kinds: ['end'], steps: [30], span: [1, 5], cross: 'never', story: 0 },
        { kinds: ['start'], steps: [30], span: [1, 5], cross: 'never', story: 0 },
        // 5-6: quarter hours
        { kinds: ['end'], steps: [15], span: [1, 9], cross: 'never', story: 0 },
        { kinds: ['start'], steps: [15], span: [1, 9], cross: 'never', story: 0 },
        // 7-8: five-minute steps, spans under an hour
        { kinds: ['end'], steps: [5], span: [1, 11], cross: 'never', story: 0.5 },
        { kinds: ['start'], steps: [5], span: [1, 11], cross: 'never', story: 0.5 },
        // 9-11: "how long?" joins in
        { kinds: ['duration'], steps: [60], span: [1, 3], cross: 'never', story: 0.5 },
        { kinds: ['duration'], steps: [15], span: [3, 9], cross: 'never', story: 0.5 },
        { kinds: ['duration'], steps: [5], span: [1, 23], cross: 'never', story: 0.5 },
        // 12: both directions together
        { kinds: ['end', 'start'], steps: [5], span: [1, 23], cross: 'never', story: 0.5 },
        // 13-14: spans of hours and minutes mixed
        { kinds: ['end', 'start'], steps: [5], span: [13, 29], cross: 'never', story: 0.5, mixed: true },
        { kinds: ['duration'], steps: [5], span: [13, 29], cross: 'never', story: 0.5, mixed: true },
        // 15: all three kinds, longer spans, 12 o'clock may be crossed
        { kinds: KINDS.slice(), steps: [5], span: [1, 36], cross: 'free', story: 0.5 },
        // 16: crossing 12 every time, minutes still carry
        { kinds: KINDS.slice(), steps: [5], span: [1, 36], cross: 'always', story: 0.5 },
        // 17-18: one-minute times join the five-minute ones
        { kinds: KINDS.slice(), steps: [5, 1], span: [1, 23], cross: 'free', story: 0.5 },
        { kinds: KINDS.slice(), steps: [5, 1], span: [1, 36], cross: 'free', story: 0.5 },
        // 19-20: one-minute precision everywhere, the longest spans
        { kinds: KINDS.slice(), steps: [1], span: [1, 120], cross: 'free', story: 0.5 },
        { kinds: KINDS.slice(), steps: [1], span: [1, 180], cross: 'free', story: 0.5 }
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

    // A time the level may show: a multiple of `step` between `min` and `max`
    function alignedTime(rng, step, min, max) {
        const first = Math.ceil(min / step);
        const last = Math.floor(max / step);
        return step * randomInt(rng, first, last);
    }

    function makeQuestion(config, rng) {
        const step = pick(rng, config.steps);
        const units = [];
        for (let unit = config.span[0]; unit <= config.span[1]; unit++) {
            if (!config.mixed || (step * unit) % 60 !== 0) units.push(unit);
        }
        const span = step * pick(rng, units);

        const kind = pick(rng, config.kinds);
        let start;
        let end;
        if (kind === 'start') {
            // The end is shown and the start is the answer
            if (config.cross === 'never') {
                end = alignedTime(rng, step, span, DIAL - 1);
            } else if (config.cross === 'always') {
                end = alignedTime(rng, step, 0, span - 1);
            } else {
                end = alignedTime(rng, step, 0, DIAL - 1);
            }
            start = (end - span + DIAL) % DIAL;
        } else {
            if (config.cross === 'never') {
                start = alignedTime(rng, step, 0, DIAL - 1 - span);
            } else if (config.cross === 'always') {
                start = alignedTime(rng, step, DIAL - span, DIAL - 1);
            } else {
                start = alignedTime(rng, step, 0, DIAL - 1);
            }
            end = (start + span) % DIAL;
        }

        const question = {
            kind,
            start,
            end,
            duration: span,
            story: rng() < config.story
        };
        if (kind === 'duration') {
            question.format = span < 60 ? 'minutes' : 'hoursMinutes';
        }
        return question;
    }

    function questionKey(question) {
        return question.kind + ':' + question.start + ':' + question.end;
    }

    /**
     * One question for a level (1..20).
     * rng    optional random source, Math.random by default
     * avoid  the previous question, so the same one never comes twice in a row
     */
    function build(level, rng, avoid) {
        const config = LEVELS[clampLevel(level) - 1];
        const random = typeof rng === 'function' ? rng : Math.random;
        const avoidKey = avoid ? questionKey(avoid) : null;

        for (let attempt = 0; attempt < AVOID_TRIES; attempt++) {
            const question = makeQuestion(config, random);
            if (!avoidKey || questionKey(question) !== avoidKey) return question;
        }
        // A tiny pool may leave no other question; repeat rather than loop forever
        return makeQuestion(config, random);
    }

    function toClock(minutes) {
        const onDial = ((Math.round(minutes) % DIAL) + DIAL) % DIAL;
        const hour = Math.floor(onDial / 60);
        return { hours: hour === 0 ? 12 : hour, minutes: onDial % 60 };
    }

    function formatClock(minutes) {
        const clock = toClock(minutes);
        return clock.hours + ':' + String(clock.minutes).padStart(2, '0');
    }

    /**
     * Grades what the child typed against the question.
     * entered  { hours, minutes } for a time or a span with hours, { minutes } for a
     *          span under an hour; null/undefined stands for an empty box.
     * Returns 'correct' | 'wrong' | 'incomplete' | 'hour-range' | 'minute-range'.
     */
    function check(question, entered) {
        const answer = entered || {};
        const given = (value) => value !== null && value !== undefined && value !== '';
        const hours = given(answer.hours) ? Number(answer.hours) : null;
        const minutes = given(answer.minutes) ? Number(answer.minutes) : null;

        if (question.kind === 'duration' && question.format === 'minutes') {
            if (minutes === null) return 'incomplete';
            return minutes === question.duration ? 'correct' : 'wrong';
        }
        if (hours === null || minutes === null) return 'incomplete';
        if (minutes > 59) return 'minute-range';
        if (question.kind === 'duration') {
            if (hours > 12) return 'hour-range';
            return hours * 60 + minutes === question.duration ? 'correct' : 'wrong';
        }
        if (hours < 1 || hours > 12) return 'hour-range';
        const expected = toClock(question.kind === 'end' ? question.end : question.start);
        return hours === expected.hours && minutes === expected.minutes ? 'correct' : 'wrong';
    }

    global.BrainWarsElapsed = {
        maxLevel: LEVELS.length,
        build,
        check,
        toClock,
        formatClock
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsElapsed;
    }
})(typeof window !== 'undefined' ? window : globalThis);
