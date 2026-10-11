'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { I18n, createI18n } = require('./i18n.js');

const LANGS = ['en', 'es', 'ru'];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Spoken phrases must work for every clock minute, not only the 5-minute teaching grid.
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const FIVE_MINUTE_GRID = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Pages wired for i18n and the shared checks.
const INTEGRATED_PAGES = ['index.html', 'long-division.html', 'long-multiplication.html', 'long-addition.html', 'long-subtraction.html', 'operations.html', 'follow-the-leader.html', 'unfollow-the-leader.html', 'telling-time-es.html', 'money-problems.html', 'elapsed-time.html', 'time-calculations.html', 'money-calculations.html', 'unit-conversions.html', 'challenge.html'];
const INTEGRATED_SCRIPTS = ['challenge.js'];
const Games = require('./games.js');
const Elapsed = require('./elapsed-time.js');
const TimeCalc = require('./time-calculations.js');
const MoneyCalc = require('./money-calculations.js');
const Units = require('./unit-conversions.js');

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
    const compareStrings = (a, b) => a.localeCompare(b);
    const baseKeys = Object.keys(I18n.translations.en).sort(compareStrings);
    assert.ok(baseKeys.length > 0, 'en dictionary is empty');
    LANGS.forEach((lang) => {
        assert.deepStrictEqual(
            Object.keys(I18n.translations[lang]).sort(compareStrings),
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

check('Spanish is the default and a chosen language sticks to the device', () => {
    // A tiny device: two page loads over the same pretend localStorage
    const store = new Map();
    const load = () => createI18n({
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key)
    });

    const fresh = load();
    assert.strictEqual(fresh.getLang(), 'es', 'a fresh device starts in Spanish');
    fresh.setLang('ru');
    assert.strictEqual(store.get('brain_wars_lang'), 'ru', 'the choice is stored on the device');

    const reloaded = load();
    assert.strictEqual(reloaded.getLang(), 'ru', 'the stored choice survives a reload');

    store.set('brain_wars_lang', 'de');
    assert.strictEqual(load().getLang(), 'es', 'an unsupported saved language falls back to Spanish');
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

check('off-grid minutes still produce real words in every language', () => {
    assert.strictEqual(I18n.timePhrase('en', 6, 7), "It's seven past six");
    assert.strictEqual(I18n.timePhrase('en', 6, 53), "It's seven to seven");
    assert.strictEqual(I18n.timePhrase('es', 6, 7), 'Son las seis y siete');
    assert.strictEqual(I18n.timePhrase('es', 6, 53), 'Son las siete menos siete');
    assert.strictEqual(I18n.timePhrase('ru', 6, 7), 'Семь минут седьмого');
    assert.strictEqual(I18n.timePhrase('ru', 6, 53), 'Без семи семь');
});

check('the five-minute teaching grid still matches the known forms', () => {
    FIVE_MINUTE_GRID.forEach((minute) => {
        LANGS.forEach((lang) => {
            const phrase = I18n.timePhrase(lang, 4, minute);
            assert.ok(phrase && !phrase.includes('undefined'), `${lang} 4:${minute} -> ${phrase}`);
        });
    });
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

check('the memory game pages name only defined keys', () => {
    ['follow-the-leader.html', 'unfollow-the-leader.html'].forEach((file) => {
        const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const keys = [...new Set([...source.matchAll(/'(ftl_[a-z0-9_]+|uftl_[a-z0-9_]+)'/g)].map((m) => m[1]))];
        assert.ok(keys.length >= 6, `${file} must name the keys it hands to the shared module`);
        keys.forEach((key) => {
            LANGS.forEach((lang) => {
                assert.ok(
                    I18n.translations[lang][key] !== undefined,
                    `${file}: key "${key}" missing in ${lang}`
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
            assert.ok(signal?.selector && signal.kind, `${game.file}: no ${kind} signal`);
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

check('the memory games are parked out of the hub and the challenge', () => {
    // Hidden entries keep their pages, labels and signals, but are not offered
    ['follow-the-leader', 'unfollow-the-leader'].forEach((id) => {
        assert.ok(!Games.all().some((game) => game.id === id), id + ' must not be offered');
        assert.ok(Games.byId(id), id + ' must stay reachable by id');
    });
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

check('every game page loads the analytics module', () => {
    INTEGRATED_PAGES.forEach((file) => {
        if (!Games.byFile(file)) return;
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        assert.ok(html.includes('src="analytics.js"'), file + ' must load analytics.js');
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
        ids.forEach((id) => {
            assert.ok(firstRound.includes(id), `first round skips ${id}`);
        });
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

check('challenge navigation replaces history so Back always exits the run', () => {
    // Steps used to push history entries, so Back revisited an earlier round and the
    // stale-tab redirect threw the player forward again: a visible bounce. Replacing
    // the entry keeps Back meaning "leave the challenge"; the engine must also leave
    // the game's own back arrow pointing at the hub.
    const challenge = fs.readFileSync(path.join(__dirname, 'challenge.js'), 'utf8');
    assert.ok(!/(location\.href|location\.assign)/.test(challenge), 'challenge.js must not push step history');
    assert.ok(!challenge.includes('backBtn'), 'challenge.js must not repoint the game back arrow');
    assert.ok(/location\.replace\(/.test(challenge), 'challenge.js must replace the step entry');
    const page = fs.readFileSync(path.join(__dirname, 'challenge.html'), 'utf8');
    assert.ok(!/(location\.href|location\.assign)/.test(page), 'challenge.html must not push step history');
});

check('the challenge keeps the device language instead of rotating it', () => {
    // The language is the player's choice, stored by i18n.js; a run must never
    // switch it (each step used to draw a random language).
    const challenge = fs.readFileSync(path.join(__dirname, 'challenge.js'), 'utf8');
    assert.ok(!challenge.includes('setLang'), 'challenge.js must not switch languages');
    assert.ok(!challenge.includes('LANG_KEY'), 'no run-level language pinning is left');
    assert.ok(!challenge.includes('watchLanguageChoice'), 'no language watching is left');
    const page = fs.readFileSync(path.join(__dirname, 'challenge.html'), 'utf8');
    assert.ok(!page.includes('watchLanguageChoice'), 'challenge.html must not pin languages');
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
    return () => {
        seed = Math.trunc(seed + 0x6D2B79F5); // integral seed; the xors below re-wrap into int32
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
        seen.forEach((kind) => {
            assert.ok(kinds.includes(kind), `level ${level} used ${kind}`);
        });
        kinds.forEach((kind) => {
            assert.ok(seen.has(kind), `level ${level} never used ${kind}`);
        });
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

check('check() reads 24-hour clock times on the dial', () => {
    const oneOClock = { kind: 'end', start: 0, duration: 60, end: 60, story: false };
    assert.strictEqual(Elapsed.check(oneOClock, { hours: 13, minutes: 0 }), 'correct');
    assert.strictEqual(Elapsed.check(oneOClock, { hours: 1, minutes: 0 }), 'correct');
    assert.strictEqual(Elapsed.check(oneOClock, { hours: 13, minutes: 30 }), 'wrong');

    const noon = { kind: 'end', start: 660, duration: 60, end: 0, story: false };
    assert.strictEqual(Elapsed.check(noon, { hours: 0, minutes: 0 }), 'correct');
    assert.strictEqual(Elapsed.check(noon, { hours: 12, minutes: 0 }), 'correct');

    const elevenAm = { kind: 'start', start: 660, duration: 85, end: 25, story: false };
    assert.strictEqual(Elapsed.check(elevenAm, { hours: 23, minutes: 0 }), 'correct');
    assert.strictEqual(Elapsed.check(elevenAm, { hours: 11, minutes: 0 }), 'correct');

    const span = { kind: 'duration', start: 60, end: 180, duration: 120, format: 'hoursMinutes', story: false };
    assert.strictEqual(Elapsed.check(span, { hours: 14, minutes: 0 }), 'hour-range');
});

check('check() asks for missing parts and flags impossible times', () => {
    const question = { kind: 'end', start: 580, duration: 85, end: 665, story: false };
    assert.strictEqual(Elapsed.check(question, { hours: null, minutes: null }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: 11, minutes: null }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: null, minutes: 5 }), 'incomplete');
    assert.strictEqual(Elapsed.check(question, { hours: 24, minutes: 5 }), 'hour-range');
    assert.strictEqual(Elapsed.check(question, { hours: 13, minutes: 5 }), 'wrong');
    assert.strictEqual(Elapsed.check(question, { hours: 0, minutes: 5 }), 'wrong');
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

console.log('time calculations generator');

check('the ladder has twenty levels', () => {
    assert.strictEqual(TimeCalc.maxLevel, 20, 'expected twenty levels');
});

checkMathematicallySound({ module: TimeCalc, title: 'every generated time problem is mathematically sound', major: 'hours', unit: 'minutes', unitMax: 59, scale: 60, seed: 20261007 });

// Both column games build the same four-step plan; only the unit words differ.
function checkStepPlan(opts) {
    const rng = mulberry32(777);
    for (let level = 1; level <= opts.module.maxLevel; level++) {
        for (let i = 0; i < 80; i++) {
            assertStepPlanFor(opts.module.build(level, rng), opts);
        }
    }
}

function assertStepPlanFor(p, opts) {
    const { unit, closing } = opts;
    const steps = p.steps;
    assert.ok(Array.isArray(steps) && steps.length >= 2, `too few steps: ${JSON.stringify(p)}`);
    const kinds = steps.map((step) => step.kind);
    assert.strictEqual(kinds[kinds.length - 1], closing, `the ${closing} step must close the plan`);
    assert.strictEqual(steps[steps.length - 1].answer, String(p.result[closing]), `${closing} answer`);
    const unitStep = steps.find((step) => step.kind === unit);
    assert.ok(unitStep, `a ${unit} step is required`);
    assert.strictEqual(unitStep.answer, String(p.result[unit]).padStart(2, '0'), `${unit} answer`);
    steps.forEach((step) => {
        assert.ok(Array.isArray(step.accepted) && step.accepted.includes(step.answer),
            `every step accepts its own answer: ${JSON.stringify(step)}`);
    });
    assert.ok(unitStep.accepted.includes(String(Number(unitStep.answer))),
        `${unit} accept the short form too: ${JSON.stringify(unitStep)}`);
    if (Number(unitStep.answer) >= 10) {
        assert.deepStrictEqual(unitStep.accepted, [unitStep.answer],
            `two-digit ${unit} keep their natural form only: ${JSON.stringify(unitStep)}`);
    }
    assertCarryOrBorrow(p, kinds, steps, opts);
}

function assertCarryOrBorrow(p, kinds, steps, { unit, closing, closingName, sumKind, scale }) {
    if (p.op === 'add') {
        const sum = p.a[unit] + p.b[unit];
        if (sum >= scale) {
            assert.deepStrictEqual(kinds, [sumKind, 'carry', unit, closing],
                `the conversion asks for the ${closingName}, then the remainder: ${JSON.stringify(p)}`);
            assert.strictEqual(steps[0].answer, String(sum), `raw ${unit} total`);
            assert.strictEqual(steps[1].answer, '1', `the whole ${closingName} that carries`);
        } else {
            assert.ok(!kinds.includes('carry') && !kinds.includes(sumKind),
                `no conversion without ${scale} ${unit}: ${JSON.stringify(p)}`);
        }
        return;
    }
    if (p.a[unit] < p.b[unit]) {
        assert.deepStrictEqual(kinds.slice(0, 2), ['borrow', unit], `borrow before subtracting: ${JSON.stringify(p)}`);
        assert.strictEqual(steps[0].answer, String(p.a[unit] + scale), `borrowed ${unit}`);
    } else {
        assert.ok(!kinds.includes('borrow'), `no borrow needed: ${JSON.stringify(p)}`);
    }
}

// The generator checks below share one shape for money and time; only the unit
// words, the scale and the seed differ, so each pair calls one helper.
function checkMathematicallySound({ module, title, major, unit, unitMax, scale, seed }) {
    check(title, () => {
        const rng = mulberry32(seed);
        for (let level = 1; level <= module.maxLevel; level++) {
            for (let i = 0; i < 120; i++) {
                const p = module.build(level, rng);
                assert.ok(p.op === 'add' || p.op === 'sub', `unknown op ${p.op}`);
                [p.a, p.b].forEach((amount) => {
                    assert.ok(Number.isInteger(amount[major]) && amount[major] >= 1 && amount[major] <= 89, `bad ${major}: ${JSON.stringify(amount)}`);
                    assert.ok(Number.isInteger(amount[unit]) && amount[unit] >= 1 && amount[unit] <= unitMax, `bad ${unit}: ${JSON.stringify(amount)}`);
                });
                assert.ok(p.result[major] >= 0 && p.result[major] <= 99, `result ${major} out of range: ${JSON.stringify(p.result)}`);
                assert.ok(p.result[unit] >= 0 && p.result[unit] <= unitMax, `result ${unit} out of range: ${JSON.stringify(p.result)}`);
                const a = p.a[major] * scale + p.a[unit];
                const b = p.b[major] * scale + p.b[unit];
                const total = p.op === 'add' ? a + b : a - b;
                assert.ok(total > 0, `empty result: ${JSON.stringify(p)}`);
                assert.strictEqual(total, p.result[major] * scale + p.result[unit], `result mismatch: ${JSON.stringify(p)}`);
            }
        }
    });
}

function checkEarlyLevels({ module, title, major, unit, scale, wholeName }) {
    check(title, () => {
        const rng = mulberry32(99);
        const sample = (level, count) => {
            const out = [];
            for (let i = 0; i < count; i++) out.push(module.build(level, rng));
            return out;
        };
        sample(1, 60).forEach((p) => {
            assert.strictEqual(p.op, 'add', 'level 1 adds');
            assert.ok(p.a[unit] + p.b[unit] < scale, 'level 1 never carries');
            assert.ok(p.a[major] <= 9 && p.b[major] <= 9, 'level 1 stays small');
        });
        sample(3, 60).forEach((p) => {
            assert.strictEqual(p.op, 'add', 'level 3 adds');
            assert.ok(p.a[unit] + p.b[unit] > scale, 'level 3 always carries');
        });
        sample(5, 60).forEach((p) => {
            assert.strictEqual(p.op, 'add', 'level 5 adds');
            assert.strictEqual(p.a[unit] + p.b[unit], scale, `level 5 is exactly one ${wholeName}`);
        });
        sample(6, 60).forEach((p) => {
            assert.strictEqual(p.op, 'sub', 'level 6 subtracts');
            assert.ok(p.a[unit] >= p.b[unit], `level 6 subtracts ${unit} directly`);
        });
        sample(8, 60).forEach((p) => {
            assert.strictEqual(p.op, 'sub', 'level 8 subtracts');
            assert.ok(p.a[unit] < p.b[unit], 'level 8 always borrows');
        });
        sample(10, 60).forEach((p) => {
            assert.strictEqual(p.op, 'sub', 'level 10 subtracts');
            assert.strictEqual(p.a[unit], p.b[unit], `level 10 has matching ${unit}`);
        });
    });
}

function checkNoRepeat({ module, title, major, unit }) {
    check(title, () => {
        const key = (p) => [p.op, p.a[major], p.a[unit], p.b[major], p.b[unit]].join(':');
        const rng = mulberry32(4242);
        for (let level = 1; level <= module.maxLevel; level++) {
            let previous = null;
            for (let i = 0; i < 150; i++) {
                const problem = module.build(level, rng, previous);
                if (previous) assert.notStrictEqual(key(problem), key(previous), `level ${level} repeated a problem`);
                previous = problem;
            }
        }
    });
}

check('the step plan mirrors the column method', () => {
    checkStepPlan({ module: TimeCalc, unit: 'minutes', closing: 'hours', closingName: 'hour', sumKind: 'minutesSum', scale: 60 });
});

checkEarlyLevels({ module: TimeCalc, title: 'the early levels teach one idea at a time', major: 'hours', unit: 'minutes', scale: 60, wholeName: 'hour' });

checkNoRepeat({ module: TimeCalc, title: 'the same time problem never comes twice in a row', major: 'hours', unit: 'minutes' });

check('the time calculations page uses only defined tc_ keys', () => {
    const source = fs.readFileSync(path.join(__dirname, 'time-calculations.html'), 'utf8');
    const keys = [...new Set([...source.matchAll(/'(tc_[a-z0-9_]+)'/g)].map((match) => match[1]))];
    assert.ok(keys.length > 10, 'the page should use its own tc_ keys');
    keys.forEach((key) => {
        LANGS.forEach((lang) => {
            assert.ok(I18n.translations[lang][key] !== undefined, 'time-calculations.html: key "' + key + '" missing in ' + lang);
        });
    });
});

console.log('money calculations generator');

check('the money ladder has twenty levels', () => {
    assert.strictEqual(MoneyCalc.maxLevel, 20, 'expected twenty levels');
});

checkMathematicallySound({ module: MoneyCalc, title: 'every generated money problem is mathematically sound', major: 'euros', unit: 'cents', unitMax: 99, scale: 100, seed: 20261009 });

check('the money step plan mirrors the column method', () => {
    checkStepPlan({ module: MoneyCalc, unit: 'cents', closing: 'euros', closingName: 'euro', sumKind: 'centsSum', scale: 100 });
});

checkEarlyLevels({ module: MoneyCalc, title: 'the early money levels teach one idea at a time', major: 'euros', unit: 'cents', scale: 100, wholeName: 'euro' });

checkNoRepeat({ module: MoneyCalc, title: 'the same money problem never comes twice in a row', major: 'euros', unit: 'cents' });

check('the money calculations page uses only defined mc_ keys', () => {
    const source = fs.readFileSync(path.join(__dirname, 'money-calculations.html'), 'utf8');
    const keys = [...new Set([...source.matchAll(/'(mc_[a-z0-9_]+)'/g)].map((match) => match[1]))];
    assert.ok(keys.length > 10, 'the page should use its own mc_ keys');
    keys.forEach((key) => {
        LANGS.forEach((lang) => {
            assert.ok(I18n.translations[lang][key] !== undefined, 'money-calculations.html: key "' + key + '" missing in ' + lang);
        });
    });
});

console.log('unit conversions generator');

// A canonical decimal string as an exact fraction: "1.25" -> 125 / 10^2.
function parseDecimal(text) {
    const [whole, fraction = ''] = text.split('.');
    return { numerator: BigInt(whole + fraction), scale: fraction.length };
}

// Two fractions are equal when their numerators match over a common denominator.
function sameFraction(a, b) {
    const scale = Math.max(a.scale, b.scale);
    return a.numerator * 10n ** BigInt(scale - a.scale) ===
        b.numerator * 10n ** BigInt(scale - b.scale);
}

// value * 10^exp as an exact fraction: multiplying shifts the numerator, dividing
// shifts the scale instead, so no binary float ever touches the check.
function timesPowerOfTen(value, exp) {
    const { numerator, scale } = parseDecimal(value);
    return exp >= 0
        ? { numerator: numerator * 10n ** BigInt(exp), scale }
        : { numerator, scale: scale - exp };
}

function sampleConversions(level, count, seed) {
    const rng = mulberry32(seed === undefined ? level * 104729 : seed);
    const questions = [];
    let previous = null;
    for (let index = 0; index < count; index++) {
        previous = Units.build(level, rng, previous);
        questions.push(previous);
    }
    return questions;
}

check('the unit ladder has twenty levels', () => {
    assert.strictEqual(Units.maxLevel, 20, 'expected twenty levels');
});

check('every generated conversion is mathematically sound', () => {
    for (let level = 1; level <= Units.maxLevel; level++) {
        sampleConversions(level, 150).forEach((question) => {
            const from = Units.units[question.from];
            const to = Units.units[question.to];
            assert.ok(from && to, `unknown unit at level ${level}: ${JSON.stringify(question)}`);
            assert.strictEqual(from.family, to.family, `a conversion must stay in one family: ${JSON.stringify(question)}`);
            assert.strictEqual(question.family, from.family, `family mismatch: ${JSON.stringify(question)}`);
            const exp = from.exp - to.exp;
            assert.strictEqual(question.exp, exp, `wrong step: ${JSON.stringify(question)}`);
            assert.strictEqual(question.direction, exp > 0 ? 'down' : 'up', `wrong direction: ${JSON.stringify(question)}`);
            assert.ok(Number.isInteger(exp) && exp !== 0, `a conversion must move: ${JSON.stringify(question)}`);
            // The answer is exactly the shown value times ten to the step.
            assert.ok(
                sameFraction(parseDecimal(question.answer), timesPowerOfTen(question.value, exp)),
                `value * 10^exp is not the answer: ${JSON.stringify(question)}`
            );
            // Both numbers are canonical: they survive a normalise round trip.
            assert.strictEqual(Units.normalize(question.value), question.value, `value is not canonical: ${JSON.stringify(question)}`);
            assert.strictEqual(Units.normalize(question.answer), question.answer, `answer is not canonical: ${JSON.stringify(question)}`);
            assert.ok(!question.value.startsWith('0') || question.value.startsWith('0.'), `value has a stray leading zero: ${question.value}`);
            assert.ok(!question.answer.startsWith('0') || question.answer.startsWith('0.'), `answer has a stray leading zero: ${question.answer}`);
        });
    }
});

check('every conversion carries the general rule behind it', () => {
    // 1 from = factor to, where the factor is exactly 10^exp: "1 kg = 1000 g"
    // going down, "1 g = 0.001 kg" going up.
    [
        [{ from: 'kg', to: 'g', exp: 3 }, '1000'],
        [{ from: 'g', to: 'kg', exp: -3 }, '0.001'],
        [{ from: 'm', to: 'cm', exp: 2 }, '100'],
        [{ from: 'cm', to: 'm', exp: -2 }, '0.01'],
        [{ from: 'cm', to: 'mm', exp: 1 }, '10'],
        [{ from: 'mm', to: 'cm', exp: -1 }, '0.1'],
        [{ from: 'km', to: 'cm', exp: 5 }, '100000'],
        [{ from: 'cm', to: 'km', exp: -5 }, '0.00001']
    ].forEach(([question, factor]) => {
        assert.deepStrictEqual(Units.rule(question), { from: question.from, factor, to: question.to });
    });
    for (let level = 1; level <= Units.maxLevel; level++) {
        sampleConversions(level, 100).forEach((question) => {
            const { from, factor, to } = Units.rule(question);
            assert.strictEqual(from, question.from, 'the rule starts from the question unit');
            assert.strictEqual(to, question.to, 'the rule ends at the question unit');
            assert.ok(
                sameFraction(parseDecimal(factor), timesPowerOfTen('1', question.exp)),
                `the rule factor is not 10^exp: ${JSON.stringify(question)} -> ${factor}`
            );
            assert.strictEqual(Units.normalize(factor), factor, `the factor is not canonical: ${factor}`);
        });
    }
});

check('the early levels move one family at a time with whole numbers', () => {
    sampleConversions(1, 80).forEach((question) => {
        assert.strictEqual(question.family, 'mass', 'level 1 only weighs things');
        assert.ok(!question.value.includes('.') && !question.answer.includes('.'), `level 1 stays whole: ${JSON.stringify(question)}`);
    });
    for (let level = 1; level <= 5; level++) {
        sampleConversions(level, 80).forEach((question) => {
            assert.strictEqual(question.direction, 'down', 'levels 1-5 only go to the smaller unit');
            assert.ok(!question.value.includes('.') && !question.answer.includes('.'), `levels 1-5 stay whole: ${JSON.stringify(question)}`);
        });
    }
});

check('decimals arrive on the way down before the way up', () => {
    // Level 11 is the first decimal level and it multiplies (down): the shown value
    // carries the decimal. Level 12 is the first one that divides (up): the answer does.
    assert.ok(sampleConversions(11, 120).some((question) => question.value.includes('.')), 'level 11 never showed a decimal');
    sampleConversions(11, 120).forEach((question) => {
        assert.strictEqual(question.direction, 'down', 'level 11 multiplies');
    });
    sampleConversions(12, 120).forEach((question) => {
        assert.strictEqual(question.direction, 'up', 'level 12 divides');
    });
    assert.ok(sampleConversions(12, 120).some((question) => question.answer.includes('.')), 'level 12 never answered with a decimal');
});

check('the same conversion never comes twice in a row', () => {
    const key = (question) => `${question.from}>${question.to}:${question.value}`;
    for (let level = 1; level <= Units.maxLevel; level++) {
        const rng = mulberry32(level * 31 + 7);
        let previous = null;
        for (let index = 0; index < 200; index++) {
            const question = Units.build(level, rng, previous);
            if (previous) assert.notStrictEqual(key(question), key(previous), `level ${level} repeated a conversion`);
            previous = question;
        }
    }
});

check('check() grades a typed conversion', () => {
    const whole = { answer: '2000' };
    assert.strictEqual(Units.check(whole, '2000'), 'correct');
    assert.strictEqual(Units.check(whole, ' 2000 '), 'correct');
    assert.strictEqual(Units.check(whole, '2 000'), 'wrong');
    assert.strictEqual(Units.check(whole, ''), 'incomplete');
    assert.strictEqual(Units.check(whole, '   '), 'incomplete');
    assert.strictEqual(Units.check(whole, null), 'incomplete');

    // The decimal separator is the child's; the point and the comma both count, and
    // trailing or leading zeros never change the value.
    const decimal = { answer: '0.5' };
    ['0.5', '0,5', ',5', '.5', '0.50', '0,500'].forEach((typed) => {
        assert.strictEqual(Units.check(decimal, typed), 'correct', `${typed} should be correct`);
    });
    ['5', '0.05', '0.6', '1.5', '.'].forEach((typed) => {
        assert.strictEqual(Units.check(decimal, typed), 'wrong', `${typed} should be wrong`);
    });
});

check('the unit conversions page uses only defined uc_ keys', () => {
    const source = fs.readFileSync(path.join(__dirname, 'unit-conversions.html'), 'utf8');
    const keys = [...new Set([...source.matchAll(/'(uc_[a-z0-9_]+)'/g)].map((match) => match[1]))];
    assert.ok(keys.length > 10, 'the page should use its own uc_ keys');
    keys.forEach((key) => {
        LANGS.forEach((lang) => {
            assert.ok(I18n.translations[lang][key] !== undefined, `unit-conversions.html: key "${key}" missing in ${lang}`);
        });
    });
});

console.log('\nAll ' + passed + ' checks passed.');
