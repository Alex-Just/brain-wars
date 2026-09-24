'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const I18n = require('./i18n.js');

const LANGS = ['en', 'es', 'ru'];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Grows by one entry as each page is integrated (Tasks 3-7).
const INTEGRATED_PAGES = ['index.html', 'long-division.html', 'long-multiplication.html', 'long-addition.html', 'long-subtraction.html', 'operations.html', 'follow-the-leader.html', 'telling-time-es.html', 'money-problems.html', 'challenge.html'];
const INTEGRATED_SCRIPTS = ['challenge.js'];
const Games = require('./games.js');

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

console.log('\nAll ' + passed + ' checks passed.');
