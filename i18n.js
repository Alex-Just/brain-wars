/**
 * Brain Wars shared i18n subsystem.
 * Pure vanilla ES6+, no dependencies. Works over HTTP(S) and file:// URLs.
 * Browser: window.I18n. Node (tests): module.exports = { I18n, createI18n }.
 */
((global) => {
    'use strict';

    const STORAGE_KEY = 'brain_wars_lang';
    const SUPPORTED_LANGS = ['en', 'es', 'ru'];
    const DEFAULT_LANG = 'es';
    const FLAGS = { en: '🇬🇧', es: '🇪🇸', ru: '🇷🇺' };

    // One row per key, in reading order, with the three languages side by side:
    //   [key, English, Español, Русский]
    // Building the three dictionaries from one table keeps every language in sync;
    // the i18n tests check that the languages still share exactly the same keys.
    const TRANSLATION_ROWS = [

        // ---- Common ----
        [
            'lang_selector_aria',
            'Language selector',
            'Selección de idioma',
            'Выбор языка'
        ],
        [
            'level_label',
            'Level {n}',
            'Nivel {n}',
            'Уровень {n}'
        ],
        [
            'decimal_separator',
            '.',
            ',',
            ','
        ],

        // ---- Hub and game names ----
        [
            'hub_title',
            'Choose Game',
            'Elige un juego',
            'Выбор игры'
        ],
        [
            'nav_back',
            'Back to the games',
            'Volver a los juegos',
            'Назад к играм'
        ],
        [
            'game_follow',
            'Follow the Leader',
            'Sigue al líder',
            'Повтори за мной'
        ],
        [
            'game_unfollow',
            'Unfollow the Leader',
            'No sigas al líder',
            'Повтори наоборот'
        ],
        [
            'game_operations',
            'Mental Math',
            'Matemáticas',
            'Математика'
        ],
        [
            'game_time',
            'What time is it?',
            '¿Qué hora es?',
            'Который час?'
        ],
        [
            'game_division',
            'Long Division',
            'División larga',
            'Деление в столбик'
        ],
        [
            'game_multiplication',
            'Long Multiplication',
            'Multiplicación larga',
            'Умножение в столбик'
        ],
        [
            'game_addition',
            'Long Addition',
            'Suma en columna',
            'Сложение в столбик'
        ],
        [
            'game_subtraction',
            'Long Subtraction',
            'Resta en columna',
            'Вычитание в столбик'
        ],

        // ---- Mental math (ops_*) ----
        [
            'ops_choose_sign',
            'Choose the correct sign',
            'Elige el signo correcto',
            'Выбери правильный знак'
        ],
        [
            'ops_operators_aria',
            'Math operators',
            'Operadores matemáticos',
            'Математические операторы'
        ],
        [
            'ops_plus',
            'plus',
            'más',
            'плюс'
        ],
        [
            'ops_minus',
            'minus',
            'menos',
            'минус'
        ],
        [
            'ops_times',
            'times',
            'por',
            'умножить'
        ],
        [
            'ops_divide',
            'divided by',
            'entre',
            'разделить'
        ],

        // ---- Follow / unfollow the leader (ftl_*, uftl_*) ----
        [
            'ftl_remember',
            'Remember the sequence',
            'Recuerda la secuencia',
            'Запомни порядок появления квадратов'
        ],
        [
            'ftl_your_turn',
            'Your turn!',
            '¡Tu turno!',
            'Твоя очередь!'
        ],
        [
            'ftl_great_job',
            'Great job!',
            '¡Excelente!',
            'Отлично!'
        ],
        [
            'ftl_try_again',
            'Try again!',
            '¡Inténtalo de nuevo!',
            'Попробуй ещё раз!'
        ],
        [
            'ftl_remember_next',
            'Level {n}: Remember the sequence',
            'Nivel {n}: Recuerda la secuencia',
            'Уровень {n}: Запомни последовательность'
        ],
        [
            'ftl_square_aria',
            'Square {n}',
            'Casilla {n}',
            'Квадрат {n}'
        ],
        [
            'uftl_remember',
            'Remember the sequence, then tap the squares in reverse order',
            'Recuerda la secuencia y toca los cuadros al revés',
            'Запомни порядок появления квадратов и нажми их в обратном порядке'
        ],
        [
            'uftl_your_turn',
            'Now tap them backwards!',
            '¡Ahora al revés!',
            'Теперь наоборот!'
        ],
        [
            'uftl_great_job',
            'Great job!',
            '¡Excelente!',
            'Отлично!'
        ],
        [
            'uftl_try_again',
            'Try again!',
            '¡Inténtalo de nuevo!',
            'Попробуй ещё раз!'
        ],
        [
            'uftl_remember_next',
            'Level {n}: Remember the sequence, then tap it backwards',
            'Nivel {n}: Recuerda la secuencia y tócala al revés',
            'Уровень {n}: Запомни последовательность — и повтори наоборот'
        ],
        [
            'uftl_square_aria',
            'Square {n}',
            'Casilla {n}',
            'Квадрат {n}'
        ],

        // ---- What time is it? (tt_*) ----
        [
            'tt_choose_time',
            'Choose the correct time',
            'Elige la hora correcta',
            'Выбери правильное время'
        ],
        [
            'tt_tap_continue',
            'Tap to continue',
            'Toca para continuar',
            'Нажмите, чтобы продолжить'
        ],
        [
            'tt_correct',
            'Correct!',
            '¡Correcto!',
            'Верно!'
        ],
        [
            'tt_correct_answer',
            'Correct:',
            'Correcto:',
            'Правильно:'
        ],
        [
            'tt_choices_aria',
            'Time options',
            'Opciones de hora',
            'Варианты времени'
        ],

        // ---- Column games: long division, multiplication, addition, subtraction ----
        [
            'ld_level_menu_aria',
            'Choose level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'ld_term_dividend',
            'Dividend',
            'Dividendo',
            'Делимое'
        ],
        [
            'ld_term_dividend_title',
            'The number we are dividing',
            'El número que dividimos',
            'Число, которое мы делим'
        ],
        [
            'ld_term_divisor',
            'Divisor',
            'Divisor',
            'Делитель'
        ],
        [
            'ld_term_divisor_title',
            'The number we divide by',
            'El número por el que dividimos',
            'Число, на которое мы делим'
        ],
        [
            'ld_term_quotient',
            'Quotient',
            'Cociente',
            'Частное'
        ],
        [
            'ld_term_quotient_title',
            'The result of division',
            'El resultado de la división',
            'Результат деления'
        ],
        [
            'ld_term_incomplete',
            'Partial dividend',
            'Dividendo parcial',
            'Неполное делимое'
        ],
        [
            'ld_term_incomplete_title',
            'The part of the dividend divided at this step',
            'La parte del dividendo que se divide en este paso',
            'Часть делимого, которую делим на данном шаге'
        ],
        [
            'ld_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'ld_q_digit_text',
            'Divide the partial dividend <strong>{incVal}</strong> by the divisor <strong>{d}</strong>',
            'Divide el dividendo parcial <strong>{incVal}</strong> entre el divisor <strong>{d}</strong>',
            'Раздели неполное делимое <strong>{incVal}</strong> на делитель <strong>{d}</strong>'
        ],
        [
            'ld_q_digit_hint',
            'Which digit goes in the quotient? ({incVal} ÷ {d} = ?)',
            '¿Qué cifra escribimos en el cociente? ({incVal} : {d} = ?)',
            'Какую цифру пишем в частное? ({incVal} : {d} = ?)'
        ],
        [
            'ld_product_text',
            'Multiply the divisor <strong>{d}</strong> by the quotient digit <strong>{qDigit}</strong>',
            'Multiplica el divisor <strong>{d}</strong> por la cifra del cociente <strong>{qDigit}</strong>',
            'Умножь делитель <strong>{d}</strong> на цифру частного <strong>{qDigit}</strong>'
        ],
        [
            'ld_product_hint',
            'What do we write under {incVal}? ({d} × {qDigit} = ?)',
            '¿Qué escribimos debajo de {incVal}? ({d} × {qDigit} = ?)',
            'Сколько запишем под {incVal}? ({d} × {qDigit} = ?)'
        ],
        [
            'ld_rem_text',
            'Find the remainder by subtracting: <strong>{incVal} − {prod}</strong>',
            'Halla el resto restando: <strong>{incVal} − {prod}</strong>',
            'Найди остаток вычитанием: <strong>{incVal} − {prod}</strong>'
        ],
        [
            'ld_rem_hint',
            'What is the remainder?',
            '¿Cuál es el resto?',
            'Чему равен остаток?'
        ],
        [
            'ld_bring_text',
            'Remainder {rem} &lt; {d}. Bring down the next digit of the dividend: <strong>{nextDigit}</strong>',
            'El resto {rem} &lt; {d}. Bajamos la siguiente cifra del dividendo: <strong>{nextDigit}</strong>',
            'Остаток {rem} &lt; {d}. Сносим следующую цифру делимого: <strong>{nextDigit}</strong>'
        ],
        [
            'ld_bring_hint',
            'Write the digit {nextDigit} next to the remainder',
            'Escribe la cifra {nextDigit} junto al resto',
            'Запиши цифру {nextDigit} рядом с остатком'
        ],
        [
            'ld_wrong_hint',
            'Not quite. Try again!',
            'No exactamente. ¡Inténtalo de nuevo!',
            'Не совсем так. Попробуй ещё раз!'
        ],
        [
            'ld_done_title',
            'Well done!',
            '¡Bien hecho!',
            'Отлично решено!'
        ],
        [
            'ld_done_next',
            'Next problem →',
            'Siguiente ejemplo →',
            'Следующий пример →'
        ],
        [
            'lm_level_menu_aria',
            'Choose level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'lm_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'lm_term_multiplicand',
            'Multiplicand',
            'Multiplicando',
            'Множимое'
        ],
        [
            'lm_term_multiplicand_title',
            'The number being multiplied',
            'El número que se multiplica',
            'Число, которое умножаем'
        ],
        [
            'lm_term_multiplier',
            'Multiplier',
            'Multiplicador',
            'Множитель'
        ],
        [
            'lm_term_multiplier_title',
            'The number we multiply by',
            'El número por el que multiplicamos',
            'Число, на которое умножаем'
        ],
        [
            'lm_term_product',
            'Product',
            'Producto',
            'Произведение'
        ],
        [
            'lm_term_product_title',
            'The result of multiplication',
            'El resultado de la multiplicación',
            'Результат умножения'
        ],
        [
            'lm_term_partial',
            'Partial product',
            'Producto parcial',
            'Неполное произведение'
        ],
        [
            'lm_term_partial_title',
            'The product row for one digit of the multiplier',
            'La fila del producto para una cifra del multiplicador',
            'Строка произведения для одной цифры множителя'
        ],
        [
            'lm_mul_hint',
            'What do you get? ({a} × {b} = ?)',
            '¿Cuánto sale? ({a} × {b} = ?)',
            'Сколько получится? ({a} × {b} = ?)'
        ],
        [
            'lm_mul_hint_carry',
            'What do you get? ({a} × {b} + {carry} = ?)',
            '¿Cuánto sale? ({a} × {b} + {carry} = ?)',
            'Сколько получится? ({a} × {b} + {carry} = ?)'
        ],
        [
            'lm_carry_hint',
            'A carry {carry} is left over. Which digit do we write?',
            'Queda una reserva {carry}. ¿Qué cifra escribimos?',
            'Остался перенос {carry}. Какую цифру пишем?'
        ],
        [
            'lm_add_hint',
            'What do you get? ({expr} = ?)',
            '¿Cuánto sale? ({expr} = ?)',
            'Сколько получится? ({expr} = ?)'
        ],
        [
            'lm_wrong_hint',
            'Not quite. Try again!',
            'No exactamente. ¡Inténtalo de nuevo!',
            'Не совсем так. Попробуй ещё раз!'
        ],
        [
            'lm_done_title',
            'Well done!',
            '¡Bien hecho!',
            'Отлично решено!'
        ],
        [
            'lm_done_next',
            'Next problem →',
            'Siguiente ejemplo →',
            'Следующий пример →'
        ],
        [
            'lm_custom_btn',
            '✏️ Custom equation',
            '✏️ Ecuación propia',
            '✏️ Своё выражение'
        ],
        [
            'lm_custom_title',
            'Custom equation',
            'Ecuación propia',
            'Своё выражение'
        ],
        [
            'lm_custom_factor1',
            'First factor',
            'Primer factor',
            'Первый множитель'
        ],
        [
            'lm_custom_factor2',
            'Second factor',
            'Segundo factor',
            'Второй множитель'
        ],
        [
            'lm_custom_solve',
            'Solve',
            'Resolver',
            'Решить'
        ],
        [
            'lm_custom_cancel',
            'Cancel',
            'Cancelar',
            'Отмена'
        ],
        [
            'lm_custom_close_aria',
            'Close dialog',
            'Cerrar la ventana',
            'Закрыть окно'
        ],
        [
            'lm_custom_err_factor',
            'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            'Введи число: целое или десятичную дробь, например 123 или 1,5'
        ],
        [
            'lm_custom_err_too_big',
            'The numbers are too big. The product must have at most 8 digits.',
            'Los números son demasiado grandes. El producto debe tener como máximo 8 cifras.',
            'Слишком большие числа. В произведении должно быть не больше 8 цифр.'
        ],
        [
            'la_level_menu_aria',
            'Choose level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'la_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'la_term_addend',
            'Addend',
            'Sumando',
            'Слагаемое'
        ],
        [
            'la_term_addend_title',
            'A number we add',
            'Un número que sumamos',
            'Число, которое складываем'
        ],
        [
            'la_term_sum',
            'Sum',
            'Suma',
            'Сумма'
        ],
        [
            'la_term_sum_title',
            'The result of addition',
            'El resultado de la suma',
            'Результат сложения'
        ],
        [
            'la_term_carry',
            'Carry',
            'Reserva',
            'Перенос'
        ],
        [
            'la_term_carry_title',
            'The ten carried to the next column',
            'La decena que se lleva a la siguiente columna',
            'Десяток, который переносим в следующий разряд'
        ],
        [
            'la_add_hint',
            'What do you get? ({expr} = ?)',
            '¿Cuánto sale? ({expr} = ?)',
            'Сколько получится? ({expr} = ?)'
        ],
        [
            'la_carry_hint',
            'A carry {carry} is left over. Which digit do we write?',
            'Queda una reserva {carry}. ¿Qué cifra escribimos?',
            'Остался перенос {carry}. Какую цифру пишем?'
        ],
        [
            'la_wrong_hint',
            'Not quite. Try again!',
            'No exactamente. ¡Inténtalo de nuevo!',
            'Не совсем так. Попробуй ещё раз!'
        ],
        [
            'la_done_title',
            'Well done!',
            '¡Bien hecho!',
            'Отлично решено!'
        ],
        [
            'la_done_next',
            'Next problem →',
            'Siguiente ejemplo →',
            'Следующий пример →'
        ],
        [
            'la_custom_btn',
            '✏️ Custom equation',
            '✏️ Ecuación propia',
            '✏️ Своё выражение'
        ],
        [
            'la_custom_title',
            'Custom equation',
            'Ecuación propia',
            'Своё выражение'
        ],
        [
            'la_custom_addend1',
            'First addend',
            'Primer sumando',
            'Первое слагаемое'
        ],
        [
            'la_custom_addend2',
            'Second addend',
            'Segundo sumando',
            'Второе слагаемое'
        ],
        [
            'la_custom_solve',
            'Solve',
            'Resolver',
            'Решить'
        ],
        [
            'la_custom_cancel',
            'Cancel',
            'Cancelar',
            'Отмена'
        ],
        [
            'la_custom_close_aria',
            'Close dialog',
            'Cerrar la ventana',
            'Закрыть окно'
        ],
        [
            'la_custom_err_addend',
            'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            'Введи число: целое или десятичную дробь, например 123 или 1,5'
        ],
        [
            'la_custom_err_too_big',
            'The numbers are too big. The result must have at most 8 digits.',
            'Los números son demasiado grandes. El resultado debe tener como máximo 8 cifras.',
            'Слишком большие числа. В сумме должно быть не больше 8 цифр.'
        ],
        [
            'ls_level_menu_aria',
            'Choose level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'ls_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'ls_term_minuend',
            'Minuend',
            'Minuendo',
            'Уменьшаемое'
        ],
        [
            'ls_term_minuend_title',
            'The number we subtract from',
            'El número del que restamos',
            'Число, из которого вычитаем'
        ],
        [
            'ls_term_subtrahend',
            'Subtrahend',
            'Sustraendo',
            'Вычитаемое'
        ],
        [
            'ls_term_subtrahend_title',
            'The number we subtract',
            'El número que restamos',
            'Число, которое вычитаем'
        ],
        [
            'ls_term_difference',
            'Difference',
            'Diferencia',
            'Разность'
        ],
        [
            'ls_term_difference_title',
            'The result of subtraction',
            'El resultado de la resta',
            'Результат вычитания'
        ],
        [
            'ls_term_borrow',
            'Borrow',
            'Préstamo',
            'Заём'
        ],
        [
            'ls_term_borrow_title',
            'A ten taken from the next column',
            'Una decena que se toma de la siguiente columna',
            'Десяток, который занимаем у следующего разряда'
        ],
        [
            'ls_sub_hint',
            'What do you get? ({expr} = ?)',
            '¿Cuánto sale? ({expr} = ?)',
            'Сколько получится? ({expr} = ?)'
        ],
        [
            'ls_borrow_hint',
            'We borrow a ten. What do you get? ({expr} = ?)',
            'Tomamos una decena. ¿Cuánto sale? ({expr} = ?)',
            'Занимаем десяток. Сколько получится? ({expr} = ?)'
        ],
        [
            'ls_wrong_hint',
            'Not quite. Try again!',
            'No exactamente. ¡Inténtalo de nuevo!',
            'Не совсем так. Попробуй ещё раз!'
        ],
        [
            'ls_done_title',
            'Well done!',
            '¡Bien hecho!',
            'Отлично решено!'
        ],
        [
            'ls_done_next',
            'Next problem →',
            'Siguiente ejemplo →',
            'Следующий пример →'
        ],
        [
            'ls_custom_btn',
            '✏️ Custom equation',
            '✏️ Ecuación propia',
            '✏️ Своё выражение'
        ],
        [
            'ls_custom_title',
            'Custom equation',
            'Ecuación propia',
            'Своё выражение'
        ],
        [
            'ls_custom_minuend',
            'Minuend',
            'Minuendo',
            'Уменьшаемое'
        ],
        [
            'ls_custom_subtrahend',
            'Subtrahend',
            'Sustraendo',
            'Вычитаемое'
        ],
        [
            'ls_custom_solve',
            'Solve',
            'Resolver',
            'Решить'
        ],
        [
            'ls_custom_cancel',
            'Cancel',
            'Cancelar',
            'Отмена'
        ],
        [
            'ls_custom_close_aria',
            'Close dialog',
            'Cerrar la ventana',
            'Закрыть окно'
        ],
        [
            'ls_custom_err_subtrahend',
            'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            'Введи число: целое или десятичную дробь, например 123 или 1,5'
        ],
        [
            'ls_custom_err_order',
            'The minuend must be greater than or equal to the subtrahend.',
            'El minuendo debe ser mayor o igual que el sustraendo.',
            'Уменьшаемое должно быть больше или равно вычитаемому.'
        ],
        [
            'ls_custom_err_too_big',
            'The numbers are too big. The result must have at most 8 digits.',
            'Los números son demasiado grandes. El resultado debe tener como máximo 8 cifras.',
            'Слишком большие числа. В разности должно быть не больше 8 цифр.'
        ],
        [
            'ld_custom_btn',
            '✏️ Custom equation',
            '✏️ Ecuación propia',
            '✏️ Своё выражение'
        ],
        [
            'ld_custom_title',
            'Custom equation',
            'Ecuación propia',
            'Своё выражение'
        ],
        [
            'ld_custom_dividend',
            'Dividend',
            'Dividendo',
            'Делимое'
        ],
        [
            'ld_custom_divisor',
            'Divisor',
            'Divisor',
            'Делитель'
        ],
        [
            'ld_custom_solve',
            'Solve',
            'Resolver',
            'Решить'
        ],
        [
            'ld_custom_cancel',
            'Cancel',
            'Cancelar',
            'Отмена'
        ],
        [
            'ld_custom_close_aria',
            'Close dialog',
            'Cerrar la ventana',
            'Закрыть окно'
        ],
        [
            'ld_custom_err_dividend',
            'Enter a dividend: a whole number or a decimal, e.g. 124 or 12.5',
            'Introduce el dividendo: un número entero o decimal, por ejemplo 124 o 12,5',
            'Введи делимое: целое число или десятичную дробь, например 124 или 12,5'
        ],
        [
            'ld_custom_err_divisor',
            'The divisor must be a whole number from 2 to 99',
            'El divisor debe ser un número entero entre 2 y 99',
            'Делитель — целое число от 2 до 99'
        ],
        [
            'ld_custom_err_too_big',
            'The number is too big: maximum 8 digits, and the whole example must fit in 12 columns.',
            'El número es demasiado grande: máximo 8 cifras, y el ejemplo completo debe caber en 12 columnas.',
            'Слишком большое число: максимум 8 цифр, и весь пример должен умещаться в 12 столбцов.'
        ],
        [
            'ld_custom_err_not_exact',
            'This division does not come out even. Try another equation.',
            'Esta división no es exacta. Prueba otra ecuación.',
            'Такой пример не делится нацело. Попробуй другое выражение.'
        ],

        // ---- Money word problems (mp_*) ----
        [
            'game_money',
            'Money Word Problems',
            'Problemas con dinero',
            'Задачи про деньги'
        ],
        [
            'mp_intro',
            '{name} has in her purse:',
            '{name} tiene en su cartera:',
            'У {name} в кошельке:'
        ],
        [
            'mp_wallet_aria',
            'Money in the purse',
            'Dinero en la cartera',
            'Деньги в кошельке'
        ],
        [
            'mp_unit_eur',
            '€',
            '€',
            '€'
        ],
        [
            'mp_unit_cts',
            'cents',
            'cts',
            'центов'
        ],
        [
            'mp_letter_a',
            'a)',
            'a)',
            'а)'
        ],
        [
            'mp_letter_b',
            'b)',
            'b)',
            'б)'
        ],
        [
            'mp_letter_c',
            'c)',
            'c)',
            'в)'
        ],
        [
            'mp_short_a',
            'Total',
            'Total',
            'Всего'
        ],
        [
            'mp_short_b',
            'Can she buy it?',
            '¿Puede comprar?',
            'Хватит ли?'
        ],
        [
            'mp_short_c_over',
            'Left over',
            'Le sobra',
            'Останется'
        ],
        [
            'mp_short_c_short',
            'Missing',
            'Le falta',
            'Не хватает'
        ],
        [
            'mp_q_a',
            'How much money does {name} have in total?',
            '¿Cuántos euros tiene {name} en total?',
            'Сколько всего денег у {name}?'
        ],
        [
            'mp_q_b',
            'Can she buy this for {price}?',
            '¿Puede comprar esto por {price}?',
            'Сможет ли она купить это за {price}?'
        ],
        [
            'mp_q_c_over',
            'How much money will be left over?',
            '¿Cuánto dinero le sobra?',
            'Сколько денег останется?'
        ],
        [
            'mp_q_c_short',
            'How much money is missing?',
            '¿Cuánto dinero le falta?',
            'Сколько денег не хватает?'
        ],
        [
            'mp_hint_a',
            'Add up every bill and coin.',
            'Suma todos los billetes y monedas.',
            'Сложи все купюры и монеты.'
        ],
        [
            'mp_hint_b',
            'Compare the total with the price.',
            'Compara el total con el precio.',
            'Сравни сумму с ценой.'
        ],
        [
            'mp_hint_c_over',
            'Subtract the price from the total.',
            'Resta el precio del total.',
            'Вычти цену из суммы.'
        ],
        [
            'mp_hint_c_short',
            'Subtract the total from the price.',
            'Resta el total del precio.',
            'Вычти сумму из цены.'
        ],
        [
            'mp_yes',
            'Yes',
            'Sí',
            'Да'
        ],
        [
            'mp_no',
            'No',
            'No',
            'Нет'
        ],
        [
            'mp_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'mp_wrong',
            'Not quite. Try again!',
            'No exactamente. ¡Inténtalo de nuevo!',
            'Не совсем так. Попробуй ещё раз!'
        ],
        [
            'mp_done_title',
            'Well done!',
            '¡Bien hecho!',
            'Отлично!'
        ],
        [
            'mp_done_next',
            'Next problem →',
            'Siguiente problema →',
            'Следующая задача →'
        ],
        [
            'mp_level_menu_aria',
            'Choose the level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'mp_item_chocolate',
            'chocolate',
            'chocolate',
            'шоколад'
        ],
        [
            'mp_item_notebook',
            'notebook',
            'cuaderno',
            'тетрадь'
        ],
        [
            'mp_item_icecream',
            'ice cream',
            'helado',
            'мороженое'
        ],
        [
            'mp_item_pizza',
            'pizza',
            'pizza',
            'пицца'
        ],
        [
            'mp_item_book',
            'book',
            'libro',
            'книга'
        ],
        [
            'mp_item_ball',
            'ball',
            'balón',
            'мяч'
        ],
        [
            'mp_item_teddy',
            'teddy bear',
            'peluche',
            'мишка'
        ],
        [
            'mp_item_backpack',
            'backpack',
            'mochila',
            'рюкзак'
        ],
        [
            'mp_item_headphones',
            'headphones',
            'auriculares',
            'наушники'
        ],

        // ---- Name pool: 20 girls, one is picked at random for every problem ----
        [
            'mp_name_1',
            'Lucy',
            'Lucía',
            'Люси'
        ],
        [
            'mp_name_2',
            'Emma',
            'Marta',
            'Маши'
        ],
        [
            'mp_name_3',
            'Mia',
            'Sara',
            'Саши'
        ],
        [
            'mp_name_4',
            'Sophie',
            'Elena',
            'Кати'
        ],
        [
            'mp_name_5',
            'Anna',
            'Carmen',
            'Насти'
        ],
        [
            'mp_name_6',
            'Ella',
            'Paula',
            'Даши'
        ],
        [
            'mp_name_7',
            'Chloe',
            'Julia',
            'Поли'
        ],
        [
            'mp_name_8',
            'Zoe',
            'Alba',
            'Ани'
        ],
        [
            'mp_name_9',
            'Lily',
            'Nuria',
            'Лизы'
        ],
        [
            'mp_name_10',
            'Grace',
            'Irene',
            'Веры'
        ],
        [
            'mp_name_11',
            'Nina',
            'Laura',
            'Тани'
        ],
        [
            'mp_name_12',
            'Ava',
            'Ana',
            'Оли'
        ],
        [
            'mp_name_13',
            'Ruby',
            'Clara',
            'Юли'
        ],
        [
            'mp_name_14',
            'Daisy',
            'Vega',
            'Сони'
        ],
        [
            'mp_name_15',
            'Holly',
            'Aitana',
            'Алисы'
        ],
        [
            'mp_name_16',
            'Ivy',
            'Daniela',
            'Ксюши'
        ],
        [
            'mp_name_17',
            'Rose',
            'Valeria',
            'Кристины'
        ],
        [
            'mp_name_18',
            'Bella',
            'Rocío',
            'Дианы'
        ],
        [
            'mp_name_19',
            'Clara',
            'Pilar',
            'Наташи'
        ],
        [
            'mp_name_20',
            'Maya',
            'Inés',
            'Иры'
        ],

        // ---- Elapsed time (et_*) ----
        [
            'game_elapsed',
            'Elapsed Time',
            'Tiempo transcurrido',
            'Сколько времени прошло?'
        ],
        [
            'game_time_calc',
            'Time Calculations',
            'Cálculo con tiempo',
            'Вычисления со временем'
        ],
        [
            'et_level_menu_aria',
            'Choose the level',
            'Elige el nivel',
            'Выберите уровень'
        ],
        [
            'et_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'et_answer_aria',
            'Your answer',
            'Tu respuesta',
            'Твой ответ'
        ],
        [
            'et_hours_aria',
            'Hours',
            'Horas',
            'Часы'
        ],
        [
            'et_minutes_aria',
            'Minutes',
            'Minutos',
            'Минуты'
        ],
        [
            'et_box_hours',
            'h',
            'h',
            'ч'
        ],
        [
            'et_box_minutes',
            'min',
            'min',
            'мин'
        ],
        [
            'et_clock_aria',
            'The clock shows {time}',
            'El reloj marca {time}',
            'Часы показывают {time}'
        ],
        [
            'et_span_aria',
            'From {start} to {end}',
            'De {start} a {end}',
            'С {start} до {end}'
        ],
        [
            'et_format_minutes',
            'Answer in minutes',
            'Responde en minutos',
            'Ответь в минутах'
        ],
        [
            'et_format_hours_minutes',
            'Answer in hours and minutes',
            'Responde en horas y minutos',
            'Ответь в часах и минутах'
        ],
        [
            'et_correct',
            'Correct!',
            '¡Correcto!',
            'Верно!'
        ],
        [
            'et_wrong',
            'Not quite, try again',
            'Casi, inténtalo otra vez',
            'Не совсем, попробуй ещё раз'
        ],
        [
            'et_fill',
            'Type the answer first',
            'Escribe primero la respuesta',
            'Сначала впиши ответ'
        ],
        [
            'et_range_hours',
            'Hours go from 1 to 12',
            'Las horas van del 1 al 12',
            'Часы — от 1 до 12'
        ],
        [
            'et_range_hours_time',
            'Hours go from 0 to 23',
            'Las horas van del 0 al 23',
            'Часы — от 0 до 23'
        ],
        [
            'et_range_minutes',
            'Minutes go from 0 to 59',
            'Los minutos van del 0 al 59',
            'Минуты — от 0 до 59'
        ],
        [
            'et_q_end_plain',
            'It\'s {time}. What time will it be in {duration}?',
            'Son las {time}. ¿Qué hora será en {duration}?',
            'Сейчас {time}. Какое время будет через {duration}?'
        ],
        [
            'et_q_end_1',
            'The cake goes into the oven at {time} and bakes for {duration}. When is it ready?',
            'El pastel entra al horno a las {time} y se hornea {duration}. ¿Cuándo estará listo?',
            'Пирог ставят в духовку в {time}, он печётся {duration}. Когда он будет готов?'
        ],
        [
            'et_q_end_2',
            'The bus leaves at {time} and the ride takes {duration}. What time does it arrive?',
            'El autobús sale a las {time} y el viaje dura {duration}. ¿A qué hora llega?',
            'Автобус отправляется в {time}, поездка длится {duration}. В какое время он приедет?'
        ],
        [
            'et_q_end_3',
            'Football practice starts at {time} and lasts {duration}. What time does it end?',
            'El entrenamiento empieza a las {time} y dura {duration}. ¿A qué hora termina?',
            'Тренировка начинается в {time} и длится {duration}. Во сколько она закончится?'
        ],
        [
            'et_q_start_plain',
            'It\'s {time}. What time was it {duration} ago?',
            'Son las {time}. ¿Qué hora era hace {duration}?',
            'Сейчас {time}. Какое время было {duration} назад?'
        ],
        [
            'et_q_start_1',
            'The cake comes out of the oven at {time}. It baked for {duration}. When did it go in?',
            'El pastel sale del horno a las {time}. Se horneó {duration}. ¿Cuándo entró?',
            'Пирог достают из духовки в {time}. Он пёкся {duration}. Когда его поставили?'
        ],
        [
            'et_q_start_2',
            'The bus arrives at {time}. The ride took {duration}. What time did it leave?',
            'El autobús llega a las {time}. El viaje duró {duration}. ¿A qué hora salió?',
            'Автобус прибывает в {time}. Поездка длилась {duration}. Во сколько он уехал?'
        ],
        [
            'et_q_start_3',
            'The film ends at {time}. It lasts {duration}. What time did it start?',
            'La película termina a las {time}. Dura {duration}. ¿A qué hora empezó?',
            'Фильм заканчивается в {time}. Он идёт {duration}. Во сколько он начался?'
        ],
        [
            'et_q_dur_plain',
            'How much time passes between the two times?',
            '¿Cuánto tiempo pasa entre las dos horas?',
            'Сколько времени проходит между двумя моментами?'
        ],
        [
            'et_q_dur_1',
            'Maria read her book. How long did she read?',
            'María leyó su libro. ¿Cuánto tiempo leyó?',
            'Мария читала книгу. Сколько времени она читала?'
        ],
        [
            'et_q_dur_2',
            'The cake was in the oven. How long was it baking?',
            'El pastel estuvo en el horno. ¿Cuánto tiempo se horneó?',
            'Пирог был в духовке. Сколько времени он пёкся?'
        ],
        [
            'et_q_dur_3',
            'The bus was on the road. How long was the ride?',
            'El autobús estuvo en camino. ¿Cuánto duró el viaje?',
            'Автобус был в пути. Сколько длилась поездка?'
        ],

        // ---- Time calculations (tc_*) ----
        [
            'tc_unit_hours',
            'h',
            'h',
            'ч'
        ],
        [
            'tc_unit_minutes',
            'min',
            'min',
            'мин'
        ],
        [
            'tc_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'tc_level_menu_aria',
            'Choose level',
            'Elige un nivel',
            'Выберите уровень'
        ],
        [
            'tc_board_aria',
            'The calculation',
            'La operación',
            'Пример'
        ],
        [
            'tc_scratch_aria',
            'Working minutes',
            'Minutos de trabajo',
            'Рабочие минуты'
        ],
        [
            'tc_carry_aria',
            'Carried hour',
            'Hora que llevas',
            'Перенос часов'
        ],
        [
            'tc_result_hours_aria',
            'Result hours',
            'Horas del resultado',
            'Часы ответа'
        ],
        [
            'tc_result_minutes_aria',
            'Result minutes',
            'Minutos del resultado',
            'Минуты ответа'
        ],
        [
            'tc_hint_minutes_sum',
            'Add the minutes: {a} + {b} = ?',
            'Suma los minutos: {a} + {b} = ?',
            'Складываю минуты: {a} + {b} = ?'
        ],
        [
            'tc_hint_write_minutes',
            'How many minutes are left? {sum} − 60 = ?',
            '¿Cuántos minutos quedan? {sum} − 60 = ?',
            'Сколько минут останется? {sum} − 60 = ?'
        ],
        [
            'tc_hint_carry',
            '1 h = 60 min. How many whole hours are in {sum} min? Write the carry.',
            '1 h = 60 min. ¿Cuántas horas enteras hay en {sum} min? Escribe lo que llevas.',
            '1 ч = 60 мин. Сколько целых часов в {sum} мин? Впиши перенос.'
        ],
        [
            'tc_hint_borrow',
            'You cannot take {b} min from {a} min. Borrow 1 hour: {a} + 60 = ?',
            'No puedes quitar {b} min de {a} min. Pide 1 hora: {a} + 60 = ?',
            'Из {a} мин нельзя вычесть {b} мин. Занимаю 1 час: {a} + 60 = ?'
        ],
        [
            'tc_hint_subtract_minutes',
            'Subtract the minutes: {a} − {b} = ?',
            'Resta los minutos: {a} − {b} = ?',
            'Вычитаю минуты: {a} − {b} = ?'
        ],
        [
            'tc_hint_minutes_from',
            'Subtract the minutes: {total} − {b} = ?',
            'Resta los minutos: {total} − {b} = ?',
            'Вычитаю минуты: {total} − {b} = ?'
        ],
        [
            'tc_hint_add_hours',
            'Add the hours: {a} + {b} = ?',
            'Suma las horas: {a} + {b} = ?',
            'Складываю часы: {a} + {b} = ?'
        ],
        [
            'tc_hint_add_hours_carry',
            'Add the hours: {a} + {b} + 1 = ?',
            'Suma las horas: {a} + {b} + 1 = ?',
            'Складываю часы: {a} + {b} + 1 = ?'
        ],
        [
            'tc_hint_subtract_hours',
            'Subtract the hours: {a} − {b} = ?',
            'Resta las horas: {a} − {b} = ?',
            'Вычитаю часы: {a} − {b} = ?'
        ],
        [
            'tc_hint_subtract_hours_borrow',
            'Subtract the hours: {a} − 1 − {b} = ?',
            'Resta las horas: {a} − 1 − {b} = ?',
            'Вычитаю часы: {a} − 1 − {b} = ?'
        ],
        [
            'tc_wrong',
            'Not quite, try again',
            'Casi, inténtalo otra vez',
            'Не совсем, попробуй ещё раз'
        ],
        [
            'tc_done_title',
            'Well done!',
            '¡Muy bien!',
            'Молодец!'
        ],
        [
            'tc_done_next',
            'Next problem →',
            'Siguiente problema →',
            'Следующая задача →'
        ],

        // ---- Money calculations (mc_*) ----
        [
            'game_money_calc',
            'Money Calculations',
            'Cálculo con dinero',
            'Вычисления с деньгами'
        ],
        [
            'mc_unit_euros',
            '€',
            '€',
            '€'
        ],
        [
            'mc_unit_cents',
            'cents',
            'cts',
            'центов'
        ],
        [
            'mc_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'mc_level_menu_aria',
            'Choose level',
            'Elige un nivel',
            'Выберите уровень'
        ],
        [
            'mc_board_aria',
            'The calculation',
            'La operación',
            'Пример'
        ],
        [
            'mc_scratch_aria',
            'Working cents',
            'Cts de trabajo',
            'Рабочие центы'
        ],
        [
            'mc_carry_aria',
            'Carried euro',
            'Euro que llevas',
            'Перенос евро'
        ],
        [
            'mc_result_euros_aria',
            'Result euros',
            'Euros del resultado',
            'Евро ответа'
        ],
        [
            'mc_result_cents_aria',
            'Result cents',
            'Cts del resultado',
            'Центы ответа'
        ],
        [
            'mc_hint_cents_sum',
            'Add the cents: {a} + {b} = ?',
            'Suma los cts: {a} + {b} = ?',
            'Складываю центы: {a} + {b} = ?'
        ],
        [
            'mc_hint_write_cents',
            'How many cents are left? {sum} − 100 = ?',
            '¿Cuántos cts quedan? {sum} − 100 = ?',
            'Сколько центов останется? {sum} − 100 = ?'
        ],
        [
            'mc_hint_carry',
            '1 € = 100 cents. How many whole euros are in {sum} cents? Write the carry.',
            '1 € = 100 cts. ¿Cuántos euros enteros hay en {sum} cts? Escribe lo que llevas.',
            '1 € = 100 центов. Сколько целых евро в {sum} центах? Впиши перенос.'
        ],
        [
            'mc_hint_borrow',
            'You cannot take {b} cents from {a} cents. Borrow 1 euro: {a} + 100 = ?',
            'No puedes quitar {b} cts de {a} cts. Pide 1 euro: {a} + 100 = ?',
            'Из {a} центов нельзя вычесть {b} центов. Занимаю 1 евро: {a} + 100 = ?'
        ],
        [
            'mc_hint_subtract_cents',
            'Subtract the cents: {a} − {b} = ?',
            'Resta los cts: {a} − {b} = ?',
            'Вычитаю центы: {a} − {b} = ?'
        ],
        [
            'mc_hint_cents_from',
            'Subtract the cents: {total} − {b} = ?',
            'Resta los cts: {total} − {b} = ?',
            'Вычитаю центы: {total} − {b} = ?'
        ],
        [
            'mc_hint_add_euros',
            'Add the euros: {a} + {b} = ?',
            'Suma los euros: {a} + {b} = ?',
            'Складываю евро: {a} + {b} = ?'
        ],
        [
            'mc_hint_add_euros_carry',
            'Add the euros: {a} + {b} + 1 = ?',
            'Suma los euros: {a} + {b} + 1 = ?',
            'Складываю евро: {a} + {b} + 1 = ?'
        ],
        [
            'mc_hint_subtract_euros',
            'Subtract the euros: {a} − {b} = ?',
            'Resta los euros: {a} − {b} = ?',
            'Вычитаю евро: {a} − {b} = ?'
        ],
        [
            'mc_hint_subtract_euros_borrow',
            'Subtract the euros: {a} − 1 − {b} = ?',
            'Resta los euros: {a} − 1 − {b} = ?',
            'Вычитаю евро: {a} − 1 − {b} = ?'
        ],
        [
            'mc_wrong',
            'Not quite, try again',
            'Casi, inténtalo otra vez',
            'Не совсем, попробуй ещё раз'
        ],
        [
            'mc_done_title',
            'Well done!',
            '¡Muy bien!',
            'Молодец!'
        ],
        [
            'mc_done_next',
            'Next problem →',
            'Siguiente problema →',
            'Следующая задача →'
        ],

        // ---- Unit conversions (uc_*) ----
        [
            'game_units',
            'Unit Conversions',
            'Conversión de unidades',
            'Перевод единиц'
        ],
        [
            'uc_level_menu_aria',
            'Choose the level',
            'Elige un nivel',
            'Выберите уровень'
        ],
        [
            'uc_numpad_aria',
            'Number pad',
            'Teclado numérico',
            'Цифровая клавиатура'
        ],
        [
            'uc_answer_aria',
            'Your answer',
            'Tu respuesta',
            'Твой ответ'
        ],
        [
            'uc_check_aria',
            'Check the answer',
            'Comprobar la respuesta',
            'Проверить ответ'
        ],
        [
            'uc_decimal_aria',
            'Decimal separator',
            'Separador decimal',
            'Десятичный разделитель'
        ],
        [
            'uc_backspace_aria',
            'Delete',
            'Borrar',
            'Удалить'
        ],
        [
            'uc_convert',
            'Convert {value} {from} to {to}',
            'Convierte {value} {from} a {to}',
            'Переведи {value} {from} в {to}'
        ],
        [
            'uc_table_hint',
            'Fill in the table: how many of each smaller unit make one bigger unit?',
            'Completa la tabla: ¿cuántas unidades pequeñas forman una unidad grande?',
            'Заполни таблицу: сколько меньших единиц в одной большей?'
        ],
        [
            'uc_chain_hint',
            'Two steps: the first answer becomes the next measurement.',
            'Dos pasos: el primer resultado pasa a la siguiente medida.',
            'Два шага: первый ответ становится следующим числом.'
        ],
        [
            'uc_table_aria',
            'Unit conversion table',
            'Tabla de conversión de unidades',
            'Таблица перевода единиц'
        ],
        [
            'uc_hint_down',
            'Going to a smaller unit: the number gets bigger.',
            'Vas a una unidad más pequeña: el número se hace más grande.',
            'Переходишь к меньшей единице: число растёт.'
        ],
        [
            'uc_hint_up',
            'Going to a bigger unit: the number gets smaller.',
            'Vas a una unidad más grande: el número se hace más pequeño.',
            'Переходишь к большей единице: число уменьшается.'
        ],
        [
            'uc_correct',
            'Correct!',
            '¡Correcto!',
            'Верно!'
        ],
        [
            'uc_wrong',
            'Not quite, try again',
            'Casi, inténtalo otra vez',
            'Не совсем, попробуй ещё раз'
        ],
        [
            'uc_fill',
            'Type the answer first',
            'Escribe primero la respuesta',
            'Сначала введи ответ'
        ],
        [
            'uc_rule_hint',
            '1 {from} = {factor} {to}',
            '1 {from} = {factor} {to}',
            '1 {from} = {factor} {to}'
        ],
        [
            'uc_unit_kg',
            'kg',
            'kg',
            'кг'
        ],
        [
            'uc_unit_g',
            'g',
            'g',
            'г'
        ],
        [
            'uc_unit_km',
            'km',
            'km',
            'км'
        ],
        [
            'uc_unit_m',
            'm',
            'm',
            'м'
        ],
        [
            'uc_unit_cm',
            'cm',
            'cm',
            'см'
        ],
        [
            'uc_unit_mm',
            'mm',
            'mm',
            'мм'
        ],
        [
            'uc_unit_l',
            'l',
            'l',
            'л'
        ],
        [
            'uc_unit_ml',
            'ml',
            'ml',
            'мл'
        ],

        // ---- Challenge mode (ch_*) ----
        [
            'ch_title',
            'Challenge',
            'Desafío',
            'Челлендж'
        ],
        [
            'ch_games_label',
            'Games',
            'Juegos',
            'Игр'
        ],
        [
            'ch_difficulty_label',
            'Difficulty',
            'Dificultad',
            'Сложность'
        ],
        [
            'ch_start',
            'Start',
            'Empezar',
            'Начать'
        ],
        [
            'ch_continue_run',
            'Continue run ({solved}/{total})',
            'Continuar ({solved}/{total})',
            'Продолжить ({solved}/{total})'
        ],
        [
            'ch_decrease',
            'Fewer',
            'Menos',
            'Меньше'
        ],
        [
            'ch_increase',
            'More',
            'Más',
            'Больше'
        ],
        [
            'ch_progress_aria',
            'Challenge progress',
            'Progreso del desafío',
            'Прогресс челленджа'
        ],
        [
            'ch_right_count',
            'Correct answers: {n}',
            'Respuestas correctas: {n}',
            'Верных ответов: {n}'
        ],
        [
            'ch_wrong_count',
            'Wrong answers: {n}',
            'Respuestas incorrectas: {n}',
            'Неверных ответов: {n}'
        ],
        [
            'ch_dirty_title',
            'Solved with mistakes',
            'Resuelto con errores',
            'Решено с ошибками'
        ],
        [
            'ch_done_title',
            'Challenge complete!',
            '¡Desafío completado!',
            'Челлендж пройден!'
        ],
        [
            'ch_done_line',
            'Games solved: {total}',
            'Juegos resueltos: {total}',
            'Пройдено игр: {total}'
        ],
        [
            'ch_retries',
            'Retries: {n}',
            'Repeticiones: {n}',
            'Повторов: {n}'
        ],
        [
            'ch_stars_aria',
            '{n} of 3 stars',
            '{n} de 3 estrellas',
            '{n} из 3 звёзд'
        ],
        [
            'ch_play_again',
            'Play again',
            'Jugar otra vez',
            'Играть снова'
        ],
    ];

    function buildTranslations() {
        const dictionaries = { en: {}, es: {}, ru: {} };
        TRANSLATION_ROWS.forEach((row) => {
            dictionaries.en[row[0]] = row[1];
            dictionaries.es[row[0]] = row[2];
            dictionaries.ru[row[0]] = row[3];
        });
        return dictionaries;
    }

    const translations = buildTranslations();

    // ---- Time phrase word tables ----
    const EN_HOURS = {
        1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six',
        7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve'
    };
    // Past/to minute words for 1–29. Fixed forms (quarter, half) are handled separately.
    const EN_MINUTES = {
        1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
        8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
        14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
        19: 'nineteen', 20: 'twenty', 21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three',
        24: 'twenty-four', 25: 'twenty-five', 26: 'twenty-six', 27: 'twenty-seven',
        28: 'twenty-eight', 29: 'twenty-nine'
    };

    const ES_HOURS = {
        1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis',
        7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce'
    };
    const ES_MINUTES = {
        1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete',
        8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece',
        14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho',
        19: 'diecinueve', 20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés',
        24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete',
        28: 'veintiocho', 29: 'veintinueve'
    };

    const RU_HOURS_NOM = {
        1: 'час', 2: 'два', 3: 'три', 4: 'четыре', 5: 'пять', 6: 'шесть',
        7: 'семь', 8: 'восемь', 9: 'девять', 10: 'десять', 11: 'одиннадцать', 12: 'двенадцать'
    };
    const RU_HOURS_GEN = {
        1: 'первого', 2: 'второго', 3: 'третьего', 4: 'четвёртого', 5: 'пятого',
        6: 'шестого', 7: 'седьмого', 8: 'восьмого', 9: 'девятого', 10: 'десятого',
        11: 'одиннадцатого', 12: 'двенадцатого'
    };
    // Nominative count used in "N минут седьмого".
    const RU_MINUTES = {
        1: 'Одна', 2: 'Две', 3: 'Три', 4: 'Четыре', 5: 'Пять', 6: 'Шесть', 7: 'Семь',
        8: 'Восемь', 9: 'Девять', 10: 'Десять', 11: 'Одиннадцать', 12: 'Двенадцать',
        13: 'Тринадцать', 14: 'Четырнадцать', 15: 'Пятнадцать', 16: 'Шестнадцать',
        17: 'Семнадцать', 18: 'Восемнадцать', 19: 'Девятнадцать', 20: 'Двадцать',
        21: 'Двадцать одна', 22: 'Двадцать две', 23: 'Двадцать три', 24: 'Двадцать четыре',
        25: 'Двадцать пять', 26: 'Двадцать шесть', 27: 'Двадцать семь', 28: 'Двадцать восемь',
        29: 'Двадцать девять'
    };
    // Genitive count used in "Без N семь".
    const RU_MINUTES_GEN = {
        1: 'одной', 2: 'двух', 3: 'трёх', 4: 'четырёх', 5: 'пяти', 6: 'шести', 7: 'семи',
        8: 'восьми', 9: 'девяти', 10: 'десяти', 11: 'одиннадцати', 12: 'двенадцати',
        13: 'тринадцати', 14: 'четырнадцати', 15: 'пятнадцати', 16: 'шестнадцати',
        17: 'семнадцати', 18: 'восемнадцати', 19: 'девятнадцати', 20: 'двадцати',
        21: 'двадцати одной', 22: 'двадцати двух', 23: 'двадцати трёх', 24: 'двадцати четырёх',
        25: 'двадцати пяти', 26: 'двадцати шести', 27: 'двадцати семи', 28: 'двадцати восьми',
        29: 'двадцати девяти'
    };

    function ruMinuteUnit(minute) {
        const last = minute % 10;
        const lastTwo = minute % 100;
        if (last === 1 && lastTwo !== 11) return 'минута';
        if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'минуты';
        return 'минут';
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

    // Minute phrasings that are fixed rather than read from ES_MINUTES.
    const ES_FIXED_MINUTES = {
        0: { connector: null, word: 'en punto' },
        15: { connector: 'y', word: 'cuarto' },
        30: { connector: 'y', word: 'media' },
        45: { connector: 'menos', word: 'cuarto' }
    };

    function esTokens(hour, minute) {
        const nextHour = (hour % 12) + 1;
        const subjectHour = minute > 30 ? nextHour : hour;
        const isSingular = subjectHour === 1;
        const verb = isSingular ? 'Es' : 'Son';
        const article = isSingular ? 'la' : 'las';

        const fixed = ES_FIXED_MINUTES[minute];
        let connector = null;
        let minuteWord;
        if (fixed) {
            connector = fixed.connector;
            minuteWord = fixed.word;
        } else if (minute > 30) {
            connector = 'menos';
            minuteWord = ES_MINUTES[60 - minute];
        } else {
            connector = 'y';
            minuteWord = ES_MINUTES[minute];
        }

        const tokens = [
            { text: verb, type: 'verb' },
            { text: `${article} ${ES_HOURS[subjectHour]}`, type: 'hour' }
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
                { text: `${RU_MINUTES[minute]} ${ruMinuteUnit(minute)}`, type: 'minute' },
                { text: RU_HOURS_GEN[nextHour], type: 'hour' }
            ];
        }
        if (minute === 45) {
            return [
                { text: 'Без четверти', type: 'minute' },
                { text: RU_HOURS_NOM[nextHour], type: 'hour' }
            ];
        }
        const remaining = 60 - minute;
        let minuteText = `Без ${RU_MINUTES_GEN[remaining]}`;
        if (remaining === 5) minuteText += ' минут';
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

    // ---- Duration words ----
    // Spans read as "1 hour and 25 minutes", "2 часа 2 минуты", "45 minutos".
    // Russian keeps three plural forms; English and Spanish need one and many.
    const DURATION_FORMS = {
        en: { hours: ['hour', 'hours'], minutes: ['minute', 'minutes'], join: ' and ' },
        es: { hours: ['hora', 'horas'], minutes: ['minuto', 'minutos'], join: ' y ' },
        ru: { hours: ['час', 'часа', 'часов'], minutes: ['минута', 'минуты', 'минут'], join: ' ' }
    };

    function pluralIndex(lang, value) {
        if (lang === 'ru') {
            const last = value % 10;
            const lastTwo = value % 100;
            if (last === 1 && lastTwo !== 11) return 0;
            if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 1;
            return 2;
        }
        return value === 1 ? 0 : 1;
    }

    function durationWords(lang, minutes) {
        const language = DURATION_FORMS[lang] ? lang : DEFAULT_LANG;
        const forms = DURATION_FORMS[language];
        const total = Math.max(0, Math.round(minutes));
        const hours = Math.floor(total / 60);
        const rest = total % 60;
        const parts = [];
        if (hours > 0) parts.push(hours + ' ' + forms.hours[pluralIndex(language, hours)]);
        if (rest > 0 || hours === 0) parts.push(rest + ' ' + forms.minutes[pluralIndex(language, rest)]);
        return parts.join(forms.join);
    }

    // ---- Device state and page wiring ----
    // One page load = one device: the chosen language, its listeners and the
    // storage all live per instance, so tests can stand in for several devices.
    function createI18n(storage) {
        function isSupported(lang) {
            return SUPPORTED_LANGS.indexOf(lang) !== -1;
        }

        // The language picked on this device wins; a fresh device always starts in Spanish
        function detectInitialLang() {
            try {
                const saved = storage ? storage.getItem(STORAGE_KEY) : null;
                if (isSupported(saved)) return saved;
            } catch { /* storage unavailable: ignore */ }
            return DEFAULT_LANG;
        }

        let currentLang = detectInitialLang();
        const listeners = new Set();

        function getLang() {
            return currentLang;
        }

        function setLang(lang) {
            if (!isSupported(lang) || lang === currentLang) return;
            currentLang = lang;
            try {
                if (storage) storage.setItem(STORAGE_KEY, lang);
            } catch { /* storage unavailable: ignore */ }
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

        // ---- DOM application ----
        function applyTranslations(root) {
            if (typeof document === 'undefined') return;
            const scope = root || document;
            scope.querySelectorAll('[data-i18n]').forEach((el) => {
                el.textContent = t(el.dataset.i18n);
            });
            scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
                el.innerHTML = t(el.dataset.i18nHtml);
            });
            scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
                el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
            });
            scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
                el.setAttribute('title', t(el.dataset.i18nTitle));
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
            if (typeof document === 'undefined') return;
            document.documentElement.lang = getLang();
            applyTranslations(document);
            document.querySelectorAll('[data-lang-toggle]').forEach((container) => {
                renderLanguageToggle(container);
            });
        }

        return {
            getLang,
            setLang,
            t,
            subscribe,
            applyTranslations,
            renderLanguageToggle,
            initPage,
            timePhraseTokens,
            timePhrase,
            durationWords,
            translations,
            supportedLangs: SUPPORTED_LANGS.slice()
        };
    }

    // Storage can be missing (Node) or throw when the browser blocks it
    function resolveDeviceStorage() {
        try {
            return typeof localStorage !== 'undefined' ? localStorage : null;
        } catch {
            return null;
        }
    }

    const I18n = createI18n(resolveDeviceStorage());

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { I18n, createI18n };
    }
    global.I18n = I18n;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => I18n.initPage());
        } else {
            I18n.initPage();
        }
        I18n.subscribe(() => I18n.applyTranslations(document));
    }
})(typeof window !== 'undefined' ? window : globalThis);
