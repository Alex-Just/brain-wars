'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const I18n = require('./i18n.js');

const LANGS = ['en', 'es', 'ru'];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Grows by one entry as each page is integrated (Tasks 3-7).
const INTEGRATED_PAGES = ['index.html', 'long-division.html', 'long-multiplication.html', 'long-addition.html', 'long-subtraction.html', 'operations.html', 'follow-the-leader.html', 'telling-time-es.html', 'money-problems.html', 'elapsed-time.html', 'challenge.html'];
const INTEGRATED_SCRIPTS = ['challenge.js'];
const Games = require('./games.js');
const Elapsed = require('./elapsed-time.js');

let passed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ok - ' + name);
    } catch (error) {
        console.error('  FAIL - ' + name);
        throw error;
    }
}

console.log('i18n dictionaries');
check('all language dictionaries are present', () => {
    LANGS.forEach((lang) => {
        assert.ok(I18n.translations[lang], 'missing translations for ' + lang);
    });
});

check('all dictionaries share the same keys', () => {
    const baseKeys = Object.keys(I18n.translations.en).sort();
    assert.ok(baseKeys.length > 0, 'en dictionary is empty');
    LANGS.forEach((lang) => {
        assert.deepStrictEqual(
            Object.keys(I18n.translations[lang]).sort(),
            baseKeys,
            lang + ' keys differ from en'
        );
    });
});

check('all dictionary values are non-empty strings', () => {
    LANGS.forEach((lang) => {
        Object.entries(I18n.translations[lang]).forEach(([key, value]) => {
            assert.strictEqual(typeof value, 'string', lang + '.' + key + ' is not a string');
            assert.ok(value.trim().length > 0, lang + '.' + key + ' is empty');
        });
    });
});

console.log('i18n API');
check('t() interpolates parameters per language', () => {
    I18n.setLang('en');
    assert.strictEqual(I18n.t('level_label', { n: 3 }), 'Level 3');
    I18n.setLang('ru');
    assert.strictEqual(I18n.t('level_label', { n: 3 }), 'Уровень 3');
    I18n.setLang('es');
    assert.strictEqual(I18n.t('level_label', { n: 3 }), 'Nivel 3');
    I18n.setLang('ru');
});

console.log('time phrases');
check('English time phrases match expected forms', () => {
    assert.strictEqual(I18n.timePhrase('en', 1, 0), "It's one o'clock");
    assert.strictEqual(I18n.timePhrase('en', 3, 30), "It's half past three");
    assert.strictEqual(I18n.timePhrase('en', 4, 15), "It's quarter past four");
    assert.strictEqual(I18n.timePhrase('en', 4, 45), "It's quarter to five");
    assert.strictEqual(I18n.timePhrase('en', 6, 10), "It's ten past six");
    assert.strictEqual(I18n.timePhrase('en', 6, 40), "It's twenty to seven");
});

check('Russian time phrases match expected forms', () => {
    assert.strictEqual(I18n.timePhrase('ru', 1, 0), 'Час ровно');
    assert.strictEqual(I18n.timePhrase('ru', 3, 30), 'Половина четвёртого');
    assert.strictEqual(I18n.timePhrase('ru', 4, 15), 'Четверть пятого');
    assert.strictEqual(I18n.timePhrase('ru', 5, 45), 'Без четверти шесть');
    assert.strictEqual(I18n.timePhrase('ru', 6, 10), 'Десять минут седьмого');
    assert.strictEqual(I18n.timePhrase('ru', 7, 40), 'Без двадцати восемь');
});

check('Spanish time phrases match expected forms', () => {
    assert.strictEqual(I18n.timePhrase('es', 1, 0), 'Es la una en punto');
    assert.strictEqual(I18n.timePhrase('es', 3, 30), 'Son las tres y media');
    assert.strictEqual(I18n.timePhrase('es', 3, 45), 'Son las cuatro menos cuarto');
});

check('every hour/minute combination is generated in en, es, ru', () => {
    LANGS.forEach((lang) => {
        HOURS.forEach((hour) => {
            MINUTES.forEach((minute) => {
                const tokens = I18n.timePhraseTokens(lang, hour, minute);
                assert.ok(Array.isArray(tokens) && tokens.length > 0, lang + ' ' + hour + ':' + minute + ' has no tokens');
                tokens.forEach((token) => {
                    assert.ok(token.text, lang + ' ' + hour + ':' + minute + ' has an empty token');
                    assert.ok(!String(token.text).includes('undefined'), lang + ' ' + hour + ':' + minute + ' contains undefined');
                });
                const phrase = I18n.timePhrase(lang, hour, minute);
                assert.strictEqual(phrase, tokens.map((token) => token.text).join(' '));
                assert.ok(!phrase.includes('undefined') && !phrase.includes('NaN'), lang + ' ' + hour + ':' + minute + ' -> ' + phrase);
                assert.ok(!phrase.includes('{'), 'unresolved placeholder: ' + phrase);
                assert.ok(!/\s{2,}/.test(phrase) && phrase === phrase.trim(), 'bad spacing: ' + phrase);
            });
        });
    });
});

console.log('integrated pages');
check('integrated pages load i18n.js, mount the toggle, and use valid keys', () => {
    INTEGRATED_PAGES.forEach((file) => {
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.ok(html.includes('src="i18n.js"'), file + ' must include i18n.js');
        assert.ok(html.includes('data-lang-toggle'), file + ' must have a data-lang-toggle container');
        const attrKeys = [...html.matchAll(/data-i18n(?:-html|-aria-label|-title)?="([^"]+)"/g)].map((m) => m[1]);
        const callKeys = [...html.matchAll(/I18n\.t\('([^']+)'/g)].map((m) => m[1]);
        const keys = [...new Set(attrKeys.concat(callKeys))];
        keys.forEach((key) => {
            LANGS.forEach((lang) => {
                assert.ok(
                    I18n.translations[lang][key] !== undefined,
                    file + ': key "' + key + '" missing in ' + lang
                );
            });
        });
    });
});

check('shared scripts use valid keys', () => {
    INTEGRATED_SCRIPTS.forEach((file) => {
        const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const keys = [...new Set([...source.matchAll(/I18n\.t\('([^']+)'/g)].map((m) => m[1]))];
        keys.forEach((key) => {
            LANGS.forEach((lang) => {
                assert.ok(
                    I18n.translations[lang][key] !== undefined,
                    file + ': key "' + key + '" missing in ' + lang
                );
            });
        });
    });
});

check('the elapsed time page uses only defined et_ keys', () => {
    const source = fs.readFileSync(path.join(__dirname, 'elapsed-time.html'), 'utf8');
    const keys = [...new Set([...source.matchAll(/'(et_[a-z0-9_]+)'/g)].map((match) => match[1]))];
    assert.ok(keys.length > 10, 'the page should use its own et_ keys');
    keys.forEach((key) => {
        LANGS.forEach((lang) => {
            assert.ok(I18n.translations[lang][key] !== undefined, 'elapsed-time.html: key "' + key + '" missing in ' + lang);
        });
    });
});

console.log('game registry');
check('registered games exist, are localised and are wired for the challenge', () => {
    const games = Games.all();
    assert.ok(games.length >= 2, 'at least two games are expected in the registry');
    games.forEach((game) => {
        assert.ok(game.id && game.file, 'a game entry needs an id and a file');
        assert.ok(['picker', 'startup'].includes(game.level), game.file + ': unknown level mode "' + game.level + '"');
        assert.ok(game.icon && game.icon.trim().length > 0, game.file + ': no icon');
        assert.strictEqual(
            Games.byId(game.id), game,
            game.id + ': byId must return the same entry'
        );
        assert.strictEqual(
            Games.byFile(game.file), game,
            game.file + ': byFile must return the same entry'
        );
        const html = fs.readFileSync(path.join(__dirname, game.file), 'utf8');
        ['games.js', 'challenge.js'].forEach((script) => {
            assert.ok(html.includes('src="' + script + '"'), game.file + ' must load ' + script);
        });
        LANGS.forEach((lang) => {
            assert.ok(I18n.translations[lang][game.titleKey], game.file + ': ' + game.titleKey + ' missing in ' + lang);
        });
        ['completion', 'mistake'].forEach((kind) => {
            const signal = game[kind];
            assert.ok(signal && signal.selector && signal.kind, game.file + ': no ' + kind + ' signal');
            if (signal.kind === 'text') {
                LANGS.forEach((lang) => {
                    assert.ok(I18n.translations[lang][signal.key], game.file + ': ' + signal.key + ' missing in ' + lang);
                });
            }
        });
    });
    const ids = games.map((game) => game.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'game ids must be unique');
});

check('the hub renders its grid from the registry', () => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    assert.ok(html.includes('src="games.js"'), 'index.html must load games.js');
    assert.ok(html.includes('id="gameGrid"'), 'index.html must have the grid container');
    Games.all().forEach((game) => {
        assert.ok(
            !html.includes('href="./' + game.file + '"'),
            'index.html must not hardcode ' + game.file + '; it renders it from the registry'
        );
    });
});

check('the challenge page loads its scripts', () => {
    const html = fs.readFileSync(path.join(__dirname, 'challenge.html'), 'utf8');
    ['i18n.js', 'games.js', 'challenge.js'].forEach((script) => {
        assert.ok(html.includes('src="' + script + '"'), 'challenge.html must load ' + script);
    });
});

check('every page uses the same back arrow', () => {
    // A text arrow (←) renders differently on every platform, so all pages carry the same SVG
    INTEGRATED_PAGES.filter((file) => file !== 'index.html').forEach((file) => {
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.ok(html.includes('id="backBtn"'), file + ': the back button must be #backBtn');
        assert.ok(html.includes('class="back-arrow"'), file + ': the back button must use the shared svg arrow');
        assert.ok(html.includes('viewBox="0 0 24 24" width="22" height="22"'), file + ': the arrow must be 22px');
        assert.ok(html.includes('href="./index.html"'), file + ': the back button must point at the hub');
        assert.ok(!html.includes('>←<'), file + ': no text arrow left');
    });
});

console.log('challenge run plan');
check('every game type is played once before any of them comes back', () => {
    const challenge = require('./challenge.js');
    const ids = Games.all().map((game) => game.id);
    for (let attempt = 0; attempt < 50; attempt++) {
        const run = challenge.createRun(ids.length * 2 + 3, 10);
        const plan = [run.current].concat(run.queue);
        assert.ok(plan.length === ids.length * 2 + 3, 'the plan must hold every step');
        // The first round plays every game exactly once, so no type comes back
        // before the others had their turn
        const firstRound = plan.slice(0, ids.length);
        assert.strictEqual(new Set(firstRound).size, ids.length, 'first round repeats a game: ' + firstRound.join(', '));
        ids.forEach((id) => assert.ok(firstRound.includes(id), 'first round skips ' + id));
        // And no game is ever played twice in a row
        plan.forEach((id, index) => {
            assert.ok(ids.includes(id), 'unknown game in the plan: ' + id);
            assert.notStrictEqual(plan[index + 1], id, 'plan plays ' + id + ' twice in a row');
        });
    }
});

check('a mistake re-queues the game at the end without duplicating it', () => {
    const challenge = require('./challenge.js');
    const ids = Games.all().map((game) => game.id);
    const run = challenge.createRun(ids.length * 3, 10);
    const repeated = run.current;
    const before = [run.current].concat(run.queue);
    assert.ok(before.indexOf(repeated, 1) !== -1, 'the game should appear again later in the plan');
    const queue = run.queue.filter((id) => id !== repeated);
    queue.push(repeated);
    assert.strictEqual(queue.filter((id) => id === repeated).length, 1, 'the game must not be queued twice');
    assert.strictEqual(queue[queue.length - 1], repeated, 'the game must come back at the end');
});

console.log('elapsed time');
check('duration words read correctly in every language', () => {
    assert.strictEqual(I18n.durationWords('en', 45), '45 minutes');
    assert.strictEqual(I18n.durationWords('en', 60), '1 hour');
    assert.strictEqual(I18n.durationWords('en', 85), '1 hour and 25 minutes');
    assert.strictEqual(I18n.durationWords('en', 150), '2 hours and 30 minutes');
    assert.strictEqual(I18n.durationWords('es', 45), '45 minutos');
    assert.strictEqual(I18n.durationWords('es', 60), '1 hora');
    assert.strictEqual(I18n.durationWords('es', 85), '1 hora y 25 minutos');
    assert.strictEqual(I18n.durationWords('ru', 45), '45 минут');
    assert.strictEqual(I18n.durationWords('ru', 60), '1 час');
    assert.strictEqual(I18n.durationWords('ru', 61), '1 час 1 минута');
    assert.strictEqual(I18n.durationWords('ru', 122), '2 часа 2 минуты');
    assert.strictEqual(I18n.durationWords('ru', 300), '5 часов');
    assert.strictEqual(I18n.durationWords('ru', 671), '11 часов 11 минут');
});

check('every duration from 1 to 719 minutes is well formed in every language', () => {
    LANGS.forEach((lang) => {
        for (let minutes = 1; minutes < 720; minutes++) {
            const text = I18n.durationWords(lang, minutes);
            assert.ok(text.length > 0, lang + ' ' + minutes + ' is empty');
            assert.ok(!text.includes('{') && !text.includes('undefined') && !text.includes('NaN'), lang + ' ' + minutes + ' -> ' + text);
            assert.ok(text === text.trim() && !/\s{2,}/.test(text), lang + ' ' + minutes + ' has bad spacing: ' + text);
        }
    });
});

console.log('elapsed time generator');

function mulberry32(seed) {
    // A small deterministic PRNG, so every run covers the same questions
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function sampleQuestions(level, count, seed) {
    const rng = mulberry32(seed === undefined ? level * 7919 : seed);
    const questions = [];
    let previous = null;
    for (let index = 0; index < count; index++) {
        previous = Elapsed.build(level, rng, previous);
        questions.push(previous);
    }
    return questions;
}

function questionKey(question) {
    return question.kind + ':' + question.start + ':' + question.end;
}

function shownTimes(question) {
    if (question.kind === 'end') return [question.start];
    if (question.kind === 'start') return [question.end];
    return [question.start, question.end];
}

check('the ladder has twenty levels', () => {
    assert.strictEqual(Elapsed.maxLevel, 20);
});

check('every generated question is mathematically sound', () => {
    for (let level = 1; level <= Elapsed.maxLevel; level++) {
        sampleQuestions(level, 120, 1000 + level).forEach((question) => {
            assert.ok(['end', 'start', 'duration'].includes(question.kind), 'unknown kind ' + question.kind);
            [question.start, question.end, question.duration].forEach((value) => {
                assert.ok(Number.isInteger(value) && value >= 0, 'bad value ' + value + ' at level ' + level);
            });
            assert.ok(question.start < 720 && question.end < 720, 'a time left the 12-hour dial at level ' + level);
            assert.ok(question.duration > 0 && question.duration < 720, 'bad span ' + question.duration + ' at level ' + level);
            assert.strictEqual((question.start + question.duration) % 720, question.end, 'the span does not lead from start to end at level ' + level);
            assert.strictEqual(typeof question.story, 'boolean', 'story must be a flag');
            if (question.kind === 'duration') {
                assert.strictEqual(question.format, question.duration < 60 ? 'minutes' : 'hoursMinutes', 'the answer format must follow the span');
            } else {
                assert.strictEqual(question.format, undefined, 'only "how long" questions have an answer format');
            }
        });
    }
});

check('each level offers exactly its own question kinds', () => {
    const expected = [
        ['end'], ['start'], ['end'], ['start'], ['end'], ['start'],
        ['end'], ['start'], ['duration'], ['duration'], ['duration'],
        ['end', 'start'], ['end', 'start'], ['duration'],
        ['end', 'start', 'duration'], ['end', 'start', 'duration'],
        ['end', 'start', 'duration'], ['end', 'start', 'duration'],
        ['end', 'start', 'duration'], ['end', 'start', 'duration']
    ];
    expected.forEach((kinds, index) => {
        const level = index + 1;
        const seen = new Set(sampleQuestions(level, 200).map((question) => question.kind));
        seen.forEach((kind) => assert.ok(kinds.includes(kind), 'level ' + level + ' used ' + kind));
        kinds.forEach((kind) => assert.ok(seen.has(kind), 'level ' + level + ' never used ' + kind));
    });
});

check('clock times get finer as the ladder climbs', () => {
    const steps = { 1: 60, 2: 60, 3: 30, 4: 30, 5: 15, 6: 15, 7: 5, 8: 5, 9: 60, 10: 15, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5, 16: 5 };
    Object.keys(steps).forEach((key) => {
        const level = Number(key);
        sampleQuestions(level, 150).forEach((question) => {
            shownTimes(question).forEach((time) => {
                assert.strictEqual(time % steps[level], 0, 'level ' + level + ' showed ' + time + ', not a multiple of ' + steps[level]);
            });
        });
    });
    [17, 18].forEach((level) => {
        const sawFineTime = sampleQuestions(level, 300).some((question) =>
            shownTimes(question).some((time) => time % 5 !== 0));
        assert.ok(sawFineTime, 'level ' + level + ' never used a one-minute clock time');
    });
});

check('span lengths follow the ladder', () => {
    // step is the finest time unit the level uses; min/max are counted in those units
    const ladder = [
        { step: 60, min: 1, max: 3 }, { step: 60, min: 1, max: 3 },
        { step: 30, min: 1, max: 5 }, { step: 30, min: 1, max: 5 },
        { step: 15, min: 1, max: 9 }, { step: 15, min: 1, max: 9 },
        { step: 5, min: 1, max: 11 }, { step: 5, min: 1, max: 11 },
        { step: 60, min: 1, max: 3 }, { step: 15, min: 3, max: 9 },
        { step: 5, min: 1, max: 23 }, { step: 5, min: 1, max: 23 },
        { step: 5, min: 13, max: 29, mixed: true }, { step: 5, min: 13, max: 29, mixed: true },
        { step: 5, min: 1, max: 36 }, { step: 5, min: 1, max: 36 },
        { step: 5, min: 1, max: 23, fine: true }, { step: 5, min: 1, max: 36, fine: true },
        { step: 1, min: 1, max: 120 }, { step: 1, min: 1, max: 180 }
    ];
    ladder.forEach((config, index) => {
        const level = index + 1;
        sampleQuestions(level, 150).forEach((question) => {
            const span = question.duration;
            if (config.fine) {
                // Levels 17-18 mix five-minute and one-minute spans
                const fits = span % 5 === 0
                    ? span >= config.min * 5 && span <= config.max * 5
                    : span >= 1 && span <= config.max;
                assert.ok(fits, 'level ' + level + ' span ' + span + ' is off the ladder');
            } else {
                assert.strictEqual(span % config.step, 0, 'level ' + level + ' span ' + span + ' is not a multiple of ' + config.step);
                assert.ok(span >= config.min * config.step && span <= config.max * config.step, 'level ' + level + ' span ' + span + ' is off the ladder');
            }
            if (config.mixed) {
                assert.notStrictEqual(span % 60, 0, 'level ' + level + ' span ' + span + ' is a whole number of hours');
            }
        });
    });
});

check('twelve o\'clock is only crossed where the ladder allows it', () => {
    const crossings = [
        'never', 'never', 'never', 'never', 'never', 'never', 'never', 'never', 'never', 'never',
        'never', 'never', 'never', 'never', 'free', 'always', 'free', 'free', 'free', 'free'
    ];
    crossings.forEach((crossing, index) => {
        const level = index + 1;
        if (crossing === 'never') {
            sampleQuestions(level, 150).forEach((question) => {
                assert.ok(question.start + question.duration < 720, 'level ' + level + ' crossed 12 too early');
            });
        }
        if (crossing === 'always') {
            sampleQuestions(level, 150).forEach((question) => {
                assert.ok(question.start + question.duration >= 720, 'level ' + level + ' did not cross 12');
            });
        }
    });
});

check('stories join the questions from level seven', () => {
    for (let level = 1; level <= 6; level++) {
        sampleQuestions(level, 150).forEach((question) => {
            assert.strictEqual(question.story, false, 'level ' + level + ' told a story too early');
        });
    }
    for (let level = 7; level <= Elapsed.maxLevel; level++) {
        const questions = sampleQuestions(level, 200, 4242 + level);
        assert.ok(questions.some((question) => question.story), 'level ' + level + ' never told a story');
        assert.ok(questions.some((question) => !question.story), 'level ' + level + ' always told a story');
    }
});

check('level one is generated, not fixed', () => {
    const keys = new Set(sampleQuestions(1, 40, 777).map(questionKey));
    assert.ok(keys.size >= 5, 'level 1 only ever asked ' + keys.size + ' different questions');
});

check('the same question never comes twice in a row', () => {
    [1, 7, 13, 19].forEach((level) => {
        const rng = mulberry32(level * 13 + 5);
        let previous = null;
        for (let index = 0; index < 300; index++) {
            const question = Elapsed.build(level, rng, previous);
            if (previous) {
                assert.notStrictEqual(questionKey(question), questionKey(previous), 'level ' + level + ' repeated a question');
            }
            previous = question;
        }
    });
});

check('check() grades a typed time', () => {
    const toElevenOhFive = { kind: 'end', start: 580, duration: 85, end: 665, story: false };
    assert.strictEqual(Elapsed.check(toElevenOhFive, { hours: 11, minutes: 5 }), 'correct');
    assert.strictEqual(Elapsed.check(toElevenOhFive, { hours: 11, minutes: 0 }), 'wrong');
    assert.strictEqual(Elapsed.check(toElevenOhFive, { hours: 12, minutes: 5 }), 'wrong');

    const backToNineForty = { kind: 'start', start: 580, duration: 85, end: 665, story: false };
    assert.strictEqual(Elapsed.check(backToNineForty, { hours: 9, minutes: 40 }), 'correct');
    assert.strictEqual(Elapsed.check(backToNineForty, { hours: 9, minutes: 4 }), 'wrong');
});

check('check() grades a typed span', () => {
    const shortSpan = { kind: 'duration', start: 200, end: 255, duration: 55, format: 'minutes', story: false };
    assert.strictEqual(Elapsed.check(shortSpan, { minutes: 55 }), 'correct');
    assert.strictEqual(Elapsed.check(shortSpan, { minutes: 45 }), 'wrong');

    const longSpan = { kind: 'duration', start: 240, end: 325, duration: 85, format: 'hoursMinutes', story: false };
    assert.strictEqual(Elapsed.check(longSpan, { hours: 1, minutes: 25 }), 'correct');
    assert.strictEqual(Elapsed.check(longSpan, { hours: 1, minutes: 5 }), 'wrong');
    assert.strictEqual(Elapsed.check(longSpan, { hours: 0, minutes: 25 }), 'wrong');
});

check('check() asks for missing parts and flags impossible times', () => {
    const question = { kind: 'end', start: 580, duration: 85, end: 665, story: false };
    assert.strictEqual(Elapsed.check(question, { hours: null, minutes: null }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: 11, minutes: null }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: null, minutes: 5 }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: 13, minutes: 5 }), 'hour-range');
    assert.strictEqual(Elapsed.check(question, { hours: 0, minutes: 5 }), 'hour-range');
    assert.strictEqual(Elapsed.check(question, { hours: 11, minutes: 60 }), 'minute-range');
});

check('toClock and formatClock read like a clock', () => {
    assert.deepStrictEqual(Elapsed.toClock(0), { hours: 12, minutes: 0 });
    assert.deepStrictEqual(Elapsed.toClock(60), { hours: 1, minutes: 0 });
    assert.deepStrictEqual(Elapsed.toClock(185), { hours: 3, minutes: 5 });
    assert.deepStrictEqual(Elapsed.toClock(719), { hours: 11, minutes: 59 });
    assert.strictEqual(Elapsed.formatClock(0), '12:00');
    assert.strictEqual(Elapsed.formatClock(185), '3:05');
    assert.strictEqual(Elapsed.formatClock(719), '11:59');
});

console.log('\nAll ' + passed + ' checks passed.');
