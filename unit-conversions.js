/**
 * Brain Wars unit conversions.
 *
 * Pure, language-free question generator for the everyday metric units of Europe:
 * mass (kg, g), length (km, m, cm, mm) and capacity (l, ml). One question turns a
 * measurement into another unit of the same family — bigger to smaller multiplies
 * by a power of ten, smaller to bigger divides by one.
 *
 * Every unit is stored as its power of ten against the family's base unit (gram,
 * metre, litre), so a conversion is always the integer step `exp = from - to` and
 * the arithmetic is exact: all numbers are built as digit strings, never as binary
 * floats, so "0.5" is really five tenths.
 *
 * A question carries the canonical strings the page compares against:
 *   value   the measurement as shown, e.g. "1.5"
 *   answer  the same measurement in the target unit, e.g. "1500"
 *   exp     answer = value * 10^exp
 * The page only localises the unit symbols and the decimal separator.
 *
 * Browser: window.BrainWarsUnits. Node (tests): module.exports.
 */
((global) => {
    'use strict';

    const ATTEMPTS = 50; // re-rolls when the previous question must not repeat

    // exp is the power of ten against the family's base unit (g, m, l).
    const UNITS = {
        kg: { family: 'mass', exp: 3 },
        g: { family: 'mass', exp: 0 },
        km: { family: 'length', exp: 3 },
        m: { family: 'length', exp: 0 },
        cm: { family: 'length', exp: -2 },
        mm: { family: 'length', exp: -3 },
        l: { family: 'capacity', exp: 0 },
        ml: { family: 'capacity', exp: -3 }
    };

    // One row per level. A level mixes unit pairs and the shape of their numbers:
    //   pairs        the conversions it may ask, "from>to"
    //   inputPlaces  decimal places on the shown measurement (down conversions)
    //   answerPlaces decimal places on the answer (up conversions)
    //   maxMantissa  cap on the significant digits, so sizes stay readable
    // The early levels move one family at a time, whole numbers only; decimals
    // arrive on the way down (11), then on the way up (12-13), then on both sides
    // (14), and the two-step jumps close the ladder.
    const LEVELS = [
        // 1-4: bigger to smaller, whole numbers, one family at a time
        { pairs: ['kg>g'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['l>ml'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['m>cm'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['km>m'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        // 5: the shorter jumps within length
        { pairs: ['cm>mm', 'm>mm'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        // 6-10: smaller to bigger, whole answers, one family at a time
        { pairs: ['g>kg'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['ml>l'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['cm>m'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 99 },
        { pairs: ['m>km'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['mm>cm', 'mm>m'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 99 },
        // 11: decimals on the way down (multiplying)
        { pairs: ['kg>g', 'l>ml', 'm>cm'], inputPlaces: 1, answerPlaces: 0, maxMantissa: 99 },
        // 12-13: decimals on the way up (dividing), the long and the short jumps
        { pairs: ['g>kg', 'ml>l', 'm>km'], inputPlaces: 0, answerPlaces: 1, maxMantissa: 99 },
        { pairs: ['cm>m', 'mm>cm', 'mm>m'], inputPlaces: 0, answerPlaces: 1, maxMantissa: 99 },
        // 14: decimals on the way down, every family
        { pairs: ['kg>g', 'l>ml', 'm>cm', 'km>m', 'cm>mm'], inputPlaces: 1, answerPlaces: 0, maxMantissa: 99 },
        // 15-16: the two-step jumps (km <-> cm), whole first, then decimal
        { pairs: ['km>cm', 'cm>km'], inputPlaces: 0, answerPlaces: 0, maxMantissa: 9 },
        { pairs: ['km>cm', 'cm>km'], inputPlaces: 1, answerPlaces: 1, maxMantissa: 99 },
        // 17: both directions together, whole and decimal
        {
            pairs: ['kg>g', 'l>ml', 'm>cm', 'km>m', 'cm>mm', 'g>kg', 'ml>l', 'm>km', 'cm>m', 'mm>cm'],
            inputPlaces: 1, answerPlaces: 1, maxMantissa: 99
        },
        // 18: hundredths on the way up
        { pairs: ['g>kg', 'ml>l', 'm>km', 'cm>m'], inputPlaces: 0, answerPlaces: 2, maxMantissa: 999 },
        // 19: hundredths mixed with decimals on the way down
        {
            pairs: ['kg>g', 'l>ml', 'm>cm', 'km>m', 'g>kg', 'ml>l', 'm>km', 'cm>m', 'cm>mm', 'mm>cm'],
            inputPlaces: 1, answerPlaces: 2, maxMantissa: 999
        },
        // 20: everything above, mixed
        {
            pairs: ['kg>g', 'l>ml', 'm>cm', 'km>m', 'cm>mm', 'm>mm', 'g>kg', 'ml>l', 'm>km', 'cm>m', 'mm>cm', 'mm>m'],
            inputPlaces: 1, answerPlaces: 2, maxMantissa: 999
        }
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

    // The significant digits of a value with `places` decimals. A mantissa that
    // ends in zero would quietly drop a place, so those are nudged down: a level
    // that teaches tenths always shows a tenth.
    function chooseMantissa(rng, max, places) {
        const value = randomInt(rng, 1, max);
        return places > 0 && value % 10 === 0 ? value - 1 : value;
    }

    // A mantissa and its decimal places as a canonical string: (25, 1) -> "2.5",
    // (5, 1) -> "0.5", (125, 2) -> "1.25", (7, 0) -> "7".
    function stripTrailingZeros(text) {
        let end = text.length;
        while (end > 0 && text[end - 1] === '0') end--;
        return text.slice(0, end);
    }

    function decimalFromMantissa(mantissa, places) {
        if (places <= 0) return String(mantissa);
        const digits = String(mantissa).padStart(places + 1, '0');
        const whole = digits.slice(0, digits.length - places);
        const fraction = stripTrailingZeros(digits.slice(digits.length - places));
        return fraction ? `${whole}.${fraction}` : whole;
    }

    // One question for a level pair. Down conversions grow: value * 10^exp is a
    // whole number again. Up conversions shrink, so the answer's digits are chosen
    // first and the shown value is that many units of the smaller kind.
    function makeQuestion(rng, pair, config) {
        const [from, to] = pair.split('>');
        const exp = UNITS[from].exp - UNITS[to].exp;
        const family = UNITS[from].family;

        if (exp > 0) {
            // A single step (cm > mm) cannot carry a decimal on the shown side
            const places = Math.min(config.inputPlaces, exp);
            const mantissa = chooseMantissa(rng, config.maxMantissa, places);
            return {
                family, from, to, direction: 'down', exp,
                value: decimalFromMantissa(mantissa, places),
                answer: String(mantissa * 10 ** (exp - places))
            };
        }

        const jump = -exp;
        // The shown value stays a whole number of the smaller unit, so the answer
        // never gains more decimal places than the jump has zeros to give.
        const places = Math.min(config.answerPlaces, jump);
        const mantissa = chooseMantissa(rng, config.maxMantissa, places);
        return {
            family, from, to, direction: 'up', exp,
            value: String(mantissa * 10 ** (jump - places)),
            answer: decimalFromMantissa(mantissa, places)
        };
    }

    function questionKey(question) {
        return `${question.from}>${question.to}:${question.value}`;
    }

    // A typed number as a canonical string, or null when it is not a number.
    // Accepts the point and the comma as the decimal separator and ignores any
    // trailing zeros, so "2,50" and "2.5" compare equal.
    function normalize(text) {
        if (typeof text !== 'string') return null;
        let cleaned = text.trim().replace(',', '.');
        if (cleaned.startsWith('.')) cleaned = `0${cleaned}`;
        if (!/^\d+(\.\d*)?$/.test(cleaned)) return null;
        const [whole, fraction] = cleaned.split('.');
        const head = whole.replace(/^0+(?=\d)/, '');
        const tail = stripTrailingZeros(fraction || '');
        return tail ? `${head}.${tail}` : head;
    }

    /**
     * Grades a typed answer.
     * Returns 'correct' | 'wrong' | 'incomplete'.
     */
    function check(question, typed) {
        if (typed === null || typed === undefined || String(typed).trim() === '') return 'incomplete';
        return normalize(String(typed)) === question.answer ? 'correct' : 'wrong';
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

        let question = null;
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            question = makeQuestion(random, pick(random, config.pairs), config);
            if (!avoidKey || questionKey(question) !== avoidKey) return question;
        }
        // A tiny pool may leave no other question; repeat rather than loop forever
        return question;
    }

    global.BrainWarsUnits = {
        maxLevel: LEVELS.length,
        units: UNITS,
        build,
        check,
        normalize
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsUnits;
    }
})(typeof window !== 'undefined' ? window : globalThis);
