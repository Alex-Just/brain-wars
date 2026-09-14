/**
 * Brain Wars shared i18n subsystem.
 * Pure vanilla ES6+, no dependencies. Works over HTTP(S) and file:// URLs.
 * Browser: window.I18n. Node (tests): module.exports.
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'brain_wars_lang';
    const SUPPORTED_LANGS = ['en', 'es', 'ru'];
    const DEFAULT_LANG = 'ru';
    const FLAGS = { en: '🇬🇧', es: '🇪🇸', ru: '🇷🇺' };

    const translations = {
        en: {
            lang_selector_aria: 'Language selector',
            level_label: 'Level {n}',
            decimal_separator: '.',

            hub_title: 'Choose Game',
            game_follow: 'Follow the Leader',
            game_operations: 'Mental Math',
            game_time: 'What time is it?',
            game_division: 'Long Division',

            ops_choose_sign: 'Choose the correct sign',
            ops_operators_aria: 'Math operators',
            ops_plus: 'plus',
            ops_minus: 'minus',
            ops_times: 'times',
            ops_divide: 'divided by',

            ftl_remember: 'Remember the sequence',
            ftl_your_turn: 'Your turn!',
            ftl_great_job: 'Great job!',
            ftl_try_again: 'Try again!',
            ftl_remember_next: 'Level {n}: Remember the sequence',
            ftl_square_aria: 'Square {n}',

            tt_choose_time: 'Choose the correct time',
            tt_tap_continue: 'Tap to continue',
            tt_correct: 'Correct!',
            tt_correct_answer: 'Correct:',
            tt_choices_aria: 'Time options',

            ld_terms_btn_aria: 'Show hints and algorithm',
            ld_level_menu_aria: 'Choose level',
            ld_term_dividend: 'Dividend',
            ld_term_dividend_title: 'The number we are dividing',
            ld_term_divisor: 'Divisor',
            ld_term_divisor_title: 'The number we divide by',
            ld_term_quotient: 'Quotient',
            ld_term_quotient_title: 'The result of division',
            ld_term_incomplete: 'Partial dividend',
            ld_term_incomplete_title: 'The part of the dividend divided at this step',
            ld_numpad_aria: 'Number pad',
            ld_q_digit_text: 'Divide the partial dividend <strong>{incVal}</strong> by the divisor <strong>{d}</strong>',
            ld_q_digit_hint: 'Which digit goes in the quotient? ({incVal} ÷ {d} = ?)',
            ld_product_text: 'Multiply the divisor <strong>{d}</strong> by the quotient digit <strong>{qDigit}</strong>',
            ld_product_hint: 'What do we write under {incVal}? ({d} × {qDigit} = ?)',
            ld_rem_text: 'Find the remainder by subtracting: <strong>{incVal} − {prod}</strong>',
            ld_rem_hint: 'What is the remainder?',
            ld_bring_text: 'Remainder {rem} &lt; {d}. Bring down the next digit of the dividend: <strong>{nextDigit}</strong>',
            ld_bring_hint: 'Write the digit {nextDigit} next to the remainder',
            ld_wrong_hint: 'Not quite. Try again!',
            ld_modal_title: '📖 Guide: Long Division',
            ld_hint_terms_h3: 'Division terms',
            ld_hint_partial_h3: 'Partial dividend',
            ld_hint_partial_p1: '<strong>A partial dividend</strong> is the part of the dividend that can be divided by the divisor to give a quotient digit.',
            ld_hint_partial_p2: 'For example, in <code>124 : 2</code>:<br>• The first digit <code>1 &lt; 2</code> cannot be divided.<br>• Take the first two digits — we get <code>12 &ge; 2</code> — this is the first partial dividend <strong>12</strong>! We draw an arc over it.',
            ld_hint_algo_h3: 'Long division algorithm',
            ld_algo_1: '<strong>Find the first partial dividend</strong> and count how many digits the quotient will have.',
            ld_algo_2: '<strong>Divide</strong> the partial dividend by the divisor and write the digit in the quotient.',
            ld_algo_3: '<strong>Multiply</strong> the divisor by the quotient digit and write the result under the partial dividend.',
            ld_algo_4: '<strong>Find the remainder</strong> by subtracting.',
            ld_algo_5: '<strong>Check</strong> that the remainder is less than the divisor.',
            ld_algo_6: '<strong>Bring down the next digit</strong> of the dividend next to the remainder. Repeat steps 2–6!',
            ld_done_title: 'Well done!',
            ld_done_next: 'Next problem →',
            ld_custom_btn: '✏️ Custom equation',
            ld_custom_title: 'Custom equation',
            ld_custom_dividend: 'Dividend',
            ld_custom_divisor: 'Divisor',
            ld_custom_solve: 'Solve',
            ld_custom_cancel: 'Cancel',
            ld_custom_close_aria: 'Close dialog',
            ld_custom_err_dividend: 'Enter a dividend: a whole number or a decimal, e.g. 124 or 12.5',
            ld_custom_err_divisor: 'The divisor must be a whole number from 2 to 99',
            ld_custom_err_too_big: 'The number is too big. Maximum 8 digits.',
            ld_custom_err_not_exact: 'This division does not come out even. Try another equation.'
        },
        es: {
            lang_selector_aria: 'Selección de idioma',
            level_label: 'Nivel {n}',
            decimal_separator: ',',

            hub_title: 'Elige un juego',
            game_follow: 'Sigue al líder',
            game_operations: 'Matemáticas',
            game_time: '¿Qué hora es?',
            game_division: 'División larga',

            ops_choose_sign: 'Elige el signo correcto',
            ops_operators_aria: 'Operadores matemáticos',
            ops_plus: 'más',
            ops_minus: 'menos',
            ops_times: 'por',
            ops_divide: 'entre',

            ftl_remember: 'Recuerda la secuencia',
            ftl_your_turn: '¡Tu turno!',
            ftl_great_job: '¡Excelente!',
            ftl_try_again: '¡Inténtalo de nuevo!',
            ftl_remember_next: 'Nivel {n}: Recuerda la secuencia',
            ftl_square_aria: 'Casilla {n}',

            tt_choose_time: 'Elige la hora correcta',
            tt_tap_continue: 'Toca para continuar',
            tt_correct: '¡Correcto!',
            tt_correct_answer: 'Correcto:',
            tt_choices_aria: 'Opciones de hora',

            ld_terms_btn_aria: 'Mostrar pistas y algoritmo',
            ld_level_menu_aria: 'Elige el nivel',
            ld_term_dividend: 'Dividendo',
            ld_term_dividend_title: 'El número que dividimos',
            ld_term_divisor: 'Divisor',
            ld_term_divisor_title: 'El número por el que dividimos',
            ld_term_quotient: 'Cociente',
            ld_term_quotient_title: 'El resultado de la división',
            ld_term_incomplete: 'Dividendo parcial',
            ld_term_incomplete_title: 'La parte del dividendo que se divide en este paso',
            ld_numpad_aria: 'Teclado numérico',
            ld_q_digit_text: 'Divide el dividendo parcial <strong>{incVal}</strong> entre el divisor <strong>{d}</strong>',
            ld_q_digit_hint: '¿Qué cifra escribimos en el cociente? ({incVal} : {d} = ?)',
            ld_product_text: 'Multiplica el divisor <strong>{d}</strong> por la cifra del cociente <strong>{qDigit}</strong>',
            ld_product_hint: '¿Qué escribimos debajo de {incVal}? ({d} × {qDigit} = ?)',
            ld_rem_text: 'Halla el resto restando: <strong>{incVal} − {prod}</strong>',
            ld_rem_hint: '¿Cuál es el resto?',
            ld_bring_text: 'El resto {rem} &lt; {d}. Bajamos la siguiente cifra del dividendo: <strong>{nextDigit}</strong>',
            ld_bring_hint: 'Escribe la cifra {nextDigit} junto al resto',
            ld_wrong_hint: 'No exactamente. ¡Inténtalo de nuevo!',
            ld_modal_title: '📖 Guía: División larga',
            ld_hint_terms_h3: 'Términos de la división',
            ld_hint_partial_h3: 'Dividendo parcial',
            ld_hint_partial_p1: '<strong>El dividendo parcial</strong> es la parte del dividendo que se puede dividir entre el divisor para obtener una cifra del cociente.',
            ld_hint_partial_p2: 'Por ejemplo, en <code>124 : 2</code>:<br>• La primera cifra <code>1 &lt; 2</code> no se puede dividir.<br>• Tomamos las dos primeras cifras — obtenemos <code>12 &ge; 2</code> — ¡este es el primer dividendo parcial <strong>12</strong>! Dibujamos un arco encima.',
            ld_hint_algo_h3: 'Algoritmo de la división larga',
            ld_algo_1: '<strong>Encuentra el primer dividendo parcial</strong> y averigua cuántas cifras tendrá el cociente.',
            ld_algo_2: '<strong>Divide</strong> el dividendo parcial entre el divisor y escribe la cifra en el cociente.',
            ld_algo_3: '<strong>Multiplica</strong> el divisor por la cifra del cociente y escribe el resultado debajo del dividendo parcial.',
            ld_algo_4: '<strong>Halla el resto</strong> restando.',
            ld_algo_5: '<strong>Comprueba</strong> que el resto sea menor que el divisor.',
            ld_algo_6: '<strong>Baja la siguiente cifra</strong> del dividendo junto al resto. ¡Repite los pasos 2–6!',
            ld_done_title: '¡Bien hecho!',
            ld_done_next: 'Siguiente ejemplo →',
            ld_custom_btn: '✏️ Ecuación propia',
            ld_custom_title: 'Ecuación propia',
            ld_custom_dividend: 'Dividendo',
            ld_custom_divisor: 'Divisor',
            ld_custom_solve: 'Resolver',
            ld_custom_cancel: 'Cancelar',
            ld_custom_close_aria: 'Cerrar la ventana',
            ld_custom_err_dividend: 'Introduce el dividendo: un número entero o decimal, por ejemplo 124 o 12,5',
            ld_custom_err_divisor: 'El divisor debe ser un número entero entre 2 y 99',
            ld_custom_err_too_big: 'El número es demasiado grande. Máximo 8 cifras.',
            ld_custom_err_not_exact: 'Esta división no es exacta. Prueba otra ecuación.'
        },
        ru: {
            lang_selector_aria: 'Выбор языка',
            level_label: 'Уровень {n}',
            decimal_separator: ',',

            hub_title: 'Выбор игры',
            game_follow: 'Повтори за мной',
            game_operations: 'Математика',
            game_time: 'Который час?',
            game_division: 'Деление в столбик',

            ops_choose_sign: 'Выбери правильный знак',
            ops_operators_aria: 'Математические операторы',
            ops_plus: 'плюс',
            ops_minus: 'минус',
            ops_times: 'умножить',
            ops_divide: 'разделить',

            ftl_remember: 'Запомни порядок появления квадратов',
            ftl_your_turn: 'Твоя очередь!',
            ftl_great_job: 'Отлично!',
            ftl_try_again: 'Попробуй ещё раз!',
            ftl_remember_next: 'Уровень {n}: Запомни последовательность',
            ftl_square_aria: 'Квадрат {n}',

            tt_choose_time: 'Выбери правильное время',
            tt_tap_continue: 'Нажмите, чтобы продолжить',
            tt_correct: 'Верно!',
            tt_correct_answer: 'Правильно:',
            tt_choices_aria: 'Варианты времени',

            ld_terms_btn_aria: 'Показать подсказки и алгоритм',
            ld_level_menu_aria: 'Выберите уровень',
            ld_term_dividend: 'Делимое',
            ld_term_dividend_title: 'Число, которое мы делим',
            ld_term_divisor: 'Делитель',
            ld_term_divisor_title: 'Число, на которое мы делим',
            ld_term_quotient: 'Частное',
            ld_term_quotient_title: 'Результат деления',
            ld_term_incomplete: 'Неполное делимое',
            ld_term_incomplete_title: 'Часть делимого, которую делим на данном шаге',
            ld_numpad_aria: 'Цифровая клавиатура',
            ld_q_digit_text: 'Раздели неполное делимое <strong>{incVal}</strong> на делитель <strong>{d}</strong>',
            ld_q_digit_hint: 'Какую цифру пишем в частное? ({incVal} : {d} = ?)',
            ld_product_text: 'Умножь делитель <strong>{d}</strong> на цифру частного <strong>{qDigit}</strong>',
            ld_product_hint: 'Сколько запишем под {incVal}? ({d} × {qDigit} = ?)',
            ld_rem_text: 'Найди остаток вычитанием: <strong>{incVal} − {prod}</strong>',
            ld_rem_hint: 'Чему равен остаток?',
            ld_bring_text: 'Остаток {rem} &lt; {d}. Сносим следующую цифру делимого: <strong>{nextDigit}</strong>',
            ld_bring_hint: 'Запиши цифру {nextDigit} рядом с остатком',
            ld_wrong_hint: 'Не совсем так. Попробуй ещё раз!',
            ld_modal_title: '📖 Памятка: Деление в столбик',
            ld_hint_terms_h3: 'Термины при делении',
            ld_hint_partial_h3: 'Неполное делимое',
            ld_hint_partial_p1: '<strong>Неполное делимое</strong> — это часть делимого, которая делится на делитель с образованием цифры частного.',
            ld_hint_partial_p2: 'Например, в примере <code>124 : 2</code>:<br>• Первая цифра <code>1 &lt; 2</code> — разделить не можем.<br>• Берём две первые цифры — получаем число <code>12 &ge; 2</code> — это первое неполное делимое <strong>12</strong>! Над ним ставим дугу.',
            ld_hint_algo_h3: 'Алгоритм деления в столбик',
            ld_algo_1: '<strong>Определить первое неполное делимое</strong> и узнать, сколько будет цифр в частном.',
            ld_algo_2: '<strong>Разделить</strong> неполное делимое на делитель и записать цифру в частное.',
            ld_algo_3: '<strong>Умножить</strong> делитель на цифру частного и записать результат под неполным делимым.',
            ld_algo_4: '<strong>Найти остаток</strong> вычитанием.',
            ld_algo_5: '<strong>Проверить</strong>, что остаток меньше делителя.',
            ld_algo_6: '<strong>Снести следующую цифру</strong> делимого рядом с остатком. Повторять шаги 2–6!',
            ld_done_title: 'Отлично решено!',
            ld_done_next: 'Следующий пример →',
            ld_custom_btn: '✏️ Своё выражение',
            ld_custom_title: 'Своё выражение',
            ld_custom_dividend: 'Делимое',
            ld_custom_divisor: 'Делитель',
            ld_custom_solve: 'Решить',
            ld_custom_cancel: 'Отмена',
            ld_custom_close_aria: 'Закрыть окно',
            ld_custom_err_dividend: 'Введи делимое: целое число или десятичную дробь, например 124 или 12,5',
            ld_custom_err_divisor: 'Делитель — целое число от 2 до 99',
            ld_custom_err_too_big: 'Слишком большое число. Максимум 8 цифр.',
            ld_custom_err_not_exact: 'Такой пример не делится нацело. Попробуй другое выражение.'
        }
    };

    // ---- Time phrase word tables ----
    const EN_HOURS = {
        1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
        7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve'
    };
    const EN_MINUTES = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };

    const ES_HOURS = {
        1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis',
        7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce'
    };
    const ES_MINUTES = { 5: 'cinco', 10: 'diez', 20: 'veinte', 25: 'veinticinco' };

    const RU_HOURS_NOM = {
        1: 'час', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть',
        7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать', 12: 'двенадцать'
    };
    const RU_HOURS_GEN = {
        1: 'первого', 2: 'второго', 3: 'третьего', 4: 'четвёртого', 5: 'пятого',
        6: 'шестого', 7: 'седьмого', 8: 'восьмого', 9: 'девятого', 10: 'десятого',
        11: 'одиннадцатого', 12: 'двенадцатого'
    };
    const RU_MINUTES = { 5: 'Пять', 10: 'Десять', 20: 'Двадцать', 25: 'Двадцать пять' };

    // ---- Language state ----
    const listeners = new Set();

    function isSupported(lang) {
        return SUPPORTED_LANGS.indexOf(lang) !== -1;
    }

    function detectInitialLang() {
        try {
            if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (isSupported(saved)) return saved;
            }
        } catch (error) { /* storage unavailable: ignore */ }
        if (typeof navigator !== 'undefined') {
            const short = String(navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
            if (isSupported(short)) return short;
        }
        return DEFAULT_LANG;
    }

    let currentLang = detectInitialLang();

    function getLang() {
        return currentLang;
    }

    function setLang(lang) {
        if (!isSupported(lang) || lang === currentLang) return;
        currentLang = lang;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, lang);
            }
        } catch (error) { /* storage unavailable: ignore */ }
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
        listeners.forEach((callback) => {
            try {
                callback(lang);
            } catch (error) {
                console.error('I18n listener failed:', error);
            }
        });
    }

    function t(key, params) {
        const dict = translations[currentLang] || {};
        let value = dict[key];
        if (value === undefined) value = translations[DEFAULT_LANG][key];
        if (value === undefined) return key;
        if (params) {
            value = value.replace(/\{(\w+)\}/g, (match, name) => (
                params[name] !== undefined ? String(params[name]) : match
            ));
        }
        return value;
    }

    function subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    }

    // ---- Time phrases ----
    function enTokens(hour, minute) {
        const nextHour = (hour % 12) + 1;
        if (minute === 0) {
            return [
                { text: "It's", type: 'verb' },
                { text: EN_HOURS[hour], type: 'hour' },
                { text: "o'clock", type: 'minute' }
            ];
        }
        if (minute === 15) {
            return [
                { text: "It's", type: 'verb' },
                { text: 'quarter past', type: 'minute' },
                { text: EN_HOURS[hour], type: 'hour' }
            ];
        }
        if (minute === 30) {
            return [
                { text: "It's", type: 'verb' },
                { text: 'half past', type: 'minute' },
                { text: EN_HOURS[hour], type: 'hour' }
            ];
        }
        if (minute === 45) {
            return [
                { text: "It's", type: 'verb' },
                { text: 'quarter to', type: 'minute' },
                { text: EN_HOURS[nextHour], type: 'hour' }
            ];
        }
        if (minute < 30) {
            return [
                { text: "It's", type: 'verb' },
                { text: EN_MINUTES[minute] + ' past', type: 'minute' },
                { text: EN_HOURS[hour], type: 'hour' }
            ];
        }
        const remaining = 60 - minute;
        return [
            { text: "It's", type: 'verb' },
            { text: EN_MINUTES[remaining] + ' to', type: 'minute' },
            { text: EN_HOURS[nextHour], type: 'hour' }
        ];
    }

    function esTokens(hour, minute) {
        const nextHour = (hour % 12) + 1;
        let verb;
        let article;
        let hourWord;
        let connector = null;
        let minuteWord = null;

        if (minute > 30) {
            verb = (nextHour === 1) ? 'Es' : 'Son';
            article = (nextHour === 1) ? 'la' : 'las';
            hourWord = ES_HOURS[nextHour];
        } else {
            verb = (hour === 1) ? 'Es' : 'Son';
            article = (hour === 1) ? 'la' : 'las';
            hourWord = ES_HOURS[hour];
        }

        if (minute === 0) {
            minuteWord = 'en punto';
        } else if (minute === 15) {
            connector = 'y';
            minuteWord = 'cuarto';
        } else if (minute === 30) {
            connector = 'y';
            minuteWord = 'media';
        } else if (minute === 45) {
            connector = 'menos';
            minuteWord = 'cuarto';
        } else if (minute < 30) {
            connector = 'y';
            minuteWord = ES_MINUTES[minute];
        } else {
            connector = 'menos';
            minuteWord = ES_MINUTES[60 - minute];
        }

        const tokens = [
            { text: verb, type: 'verb' },
            { text: article + ' ' + hourWord, type: 'hour' }
        ];
        if (connector) tokens.push({ text: connector, type: 'minute' });
        tokens.push({ text: minuteWord, type: 'minute' });
        return tokens;
    }

    function ruTokens(hour, minute) {
        const nextHour = (hour % 12) + 1;

        if (minute === 0) {
            if (hour === 1) {
                return [
                    { text: 'Час', type: 'hour' },
                    { text: 'ровно', type: 'minute' }
                ];
            }
            const hourText = RU_HOURS_NOM[hour];
            const capitalized = hourText.charAt(0).toUpperCase() + hourText.slice(1);
            const suffix = (hour >= 2 && hour <= 4) ? 'часа' : 'часов';
            return [
                { text: capitalized + ' ' + suffix, type: 'hour' },
                { text: 'ровно', type: 'minute' }
            ];
        }
        if (minute === 30) {
            return [
                { text: 'Половина', type: 'minute' },
                { text: RU_HOURS_GEN[nextHour], type: 'hour' }
            ];
        }
        if (minute === 15) {
            return [
                { text: 'Четверть', type: 'minute' },
                { text: RU_HOURS_GEN[nextHour], type: 'hour' }
            ];
        }
        if (minute < 30) {
            return [
                { text: RU_MINUTES[minute] + ' минут', type: 'minute' },
                { text: RU_HOURS_GEN[nextHour], type: 'hour' }
            ];
        }

        let minuteText;
        if (minute === 45) minuteText = 'Без четверти';
        else if (minute === 55) minuteText = 'Без пяти минут';
        else if (minute === 35) minuteText = 'Без двадцати пяти';
        else if (minute === 40) minuteText = 'Без двадцати';
        else minuteText = 'Без десяти';

        return [
            { text: minuteText, type: 'minute' },
            { text: RU_HOURS_NOM[nextHour], type: 'hour' }
        ];
    }

    function timePhraseTokens(lang, hour, minute) {
        if (lang === 'en') return enTokens(hour, minute);
        if (lang === 'es') return esTokens(hour, minute);
        if (lang === 'ru') return ruTokens(hour, minute);
        return ruTokens(hour, minute);
    }

    function timePhrase(lang, hour, minute) {
        return timePhraseTokens(lang, hour, minute).map((token) => token.text).join(' ');
    }

    // ---- DOM application ----
    function applyTranslations(root) {
        if (typeof document === 'undefined') return;
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach((el) => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
        });
        scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
        });
    }

    const TOGGLE_CSS = [
        '.lang-toggle-mount { display: inline-flex; align-items: center; }',
        '.lang-toggle-group { display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 0, 0, 0.04); border-radius: 26px; padding: 4px; height: 52px; box-sizing: border-box; }',
        '.lang-btn { width: 44px; height: 44px; padding: 0; border: none; border-radius: 22px; background: transparent; cursor: pointer; font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease; -webkit-tap-highlight-color: transparent; }',
        '.lang-btn:active { transform: scale(0.92); }',
        '.lang-btn.active { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18); }',
        '.lang-btn:focus-visible { outline: 3px solid #3B6D78; outline-offset: 2px; }',
        '@media (hover: hover) {',
        '  .lang-btn:hover { background: rgba(255, 255, 255, 0.7); }',
        '}'
    ].join('\n');

    function ensureStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('brain-wars-i18n-styles')) return;
        const style = document.createElement('style');
        style.id = 'brain-wars-i18n-styles';
        style.textContent = TOGGLE_CSS;
        document.head.appendChild(style);
    }

    function renderLanguageToggle(container) {
        if (!container || typeof document === 'undefined') return;
        ensureStyles();
        container.classList.add('lang-toggle-mount');
        container.innerHTML = '';

        const group = document.createElement('div');
        group.className = 'lang-toggle-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', t('lang_selector_aria'));

        const buttons = SUPPORTED_LANGS.map((lang) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lang-btn';
            button.dataset.lang = lang;
            button.setAttribute('aria-label', { en: 'English', es: 'Español', ru: 'Русский' }[lang]);
            button.textContent = FLAGS[lang];
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                setLang(lang);
            });
            group.appendChild(button);
            return button;
        });

        container.appendChild(group);

        const sync = () => {
            const active = getLang();
            group.setAttribute('aria-label', t('lang_selector_aria'));
            buttons.forEach((button) => {
                const isActive = button.dataset.lang === active;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        };
        sync();
        subscribe(sync);
    }

    function initPage() {
        document.documentElement.lang = getLang();
        applyTranslations(document);
        document.querySelectorAll('[data-lang-toggle]').forEach((container) => {
            renderLanguageToggle(container);
        });
    }

    const I18n = {
        getLang,
        setLang,
        t,
        subscribe,
        applyTranslations,
        renderLanguageToggle,
        timePhraseTokens,
        timePhrase,
        translations,
        supportedLangs: SUPPORTED_LANGS.slice()
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = I18n;
    }
    global.I18n = I18n;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPage);
        } else {
            initPage();
        }
        subscribe(() => applyTranslations(document));
    }
})(typeof window !== 'undefined' ? window : globalThis);
