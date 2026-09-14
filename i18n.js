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
            game_multiplication: 'Long Multiplication',
            game_addition: 'Long Addition',
            game_subtraction: 'Long Subtraction',

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
            lm_terms_btn_aria: 'Show hints and algorithm',
            lm_level_menu_aria: 'Choose level',
            lm_numpad_aria: 'Number pad',
            lm_modal_title: '📖 Guide: Long Multiplication',
            lm_hint_terms_h3: 'Multiplication terms',
            lm_term_multiplicand: 'Multiplicand',
            lm_term_multiplicand_title: 'The number being multiplied',
            lm_term_multiplier: 'Multiplier',
            lm_term_multiplier_title: 'The number we multiply by',
            lm_term_product: 'Product',
            lm_term_product_title: 'The result of multiplication',
            lm_term_partial: 'Partial product',
            lm_term_partial_title: 'The product row for one digit of the multiplier',
            lm_hint_partial_h3: 'Partial products',
            lm_hint_partial_p1: '<strong>Partial products</strong> are the results of multiplying by each digit of the multiplier. Each next partial product is written one place to the left.',
            lm_hint_algo_h3: 'Column multiplication algorithm',
            lm_algo_1: '<strong>Write the factors</strong> one under another and align the digits on the right.',
            lm_algo_2: '<strong>Multiply by the units digit</strong> of the multiplier from right to left, remembering the carry.',
            lm_algo_3: '<strong>Multiply by the next digit</strong> and write the row shifted one place to the left.',
            lm_algo_4: '<strong>Add the partial products</strong> column by column.',
            lm_algo_5: '<strong>Check the result.</strong>',
            lm_mul_hint: 'What do you get? ({a} × {b} = ?)',
            lm_mul_hint_carry: 'What do you get? ({a} × {b} + {carry} = ?)',
            lm_carry_hint: 'A carry {carry} is left over. Which digit do we write?',
            lm_add_hint: 'What do you get? ({expr} = ?)',
            lm_wrong_hint: 'Not quite. Try again!',
            lm_done_title: 'Well done!',
            lm_done_next: 'Next problem →',
            lm_custom_btn: '✏️ Custom equation',
            lm_custom_title: 'Custom equation',
            lm_custom_factor1: 'First factor',
            lm_custom_factor2: 'Second factor',
            lm_custom_solve: 'Solve',
            lm_custom_cancel: 'Cancel',
            lm_custom_close_aria: 'Close dialog',
            lm_custom_err_factor: 'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            lm_custom_err_too_big: 'The numbers are too big. The product must have at most 8 digits.',
            la_terms_btn_aria: 'Show hints and algorithm',
            la_level_menu_aria: 'Choose level',
            la_numpad_aria: 'Number pad',
            la_modal_title: '📖 Guide: Long Addition',
            la_hint_terms_h3: 'Addition terms',
            la_term_addend: 'Addend',
            la_term_addend_title: 'A number we add',
            la_term_sum: 'Sum',
            la_term_sum_title: 'The result of addition',
            la_term_carry: 'Carry',
            la_term_carry_title: 'The ten carried to the next column',
            la_hint_carry_h3: 'Carry',
            la_hint_carry_p1: '<strong>A carry</strong> is a ten moved to the next column on the left when a column adds up to 10 or more. It is written small above the next digit.',
            la_hint_algo_h3: 'Column addition algorithm',
            la_algo_1: '<strong>Write the numbers</strong> one under another, aligning the digits on the right.',
            la_algo_2: '<strong>Add the digits</strong> column by column, starting from the right.',
            la_algo_3: '<strong>If a column gives 10 or more</strong>, write the ones digit and carry the ten to the next column.',
            la_algo_4: '<strong>Check the result.</strong>',
            la_add_hint: 'What do you get? ({expr} = ?)',
            la_carry_hint: 'A carry {carry} is left over. Which digit do we write?',
            la_wrong_hint: 'Not quite. Try again!',
            la_done_title: 'Well done!',
            la_done_next: 'Next problem →',
            la_custom_btn: '✏️ Custom equation',
            la_custom_title: 'Custom equation',
            la_custom_addend1: 'First addend',
            la_custom_addend2: 'Second addend',
            la_custom_solve: 'Solve',
            la_custom_cancel: 'Cancel',
            la_custom_close_aria: 'Close dialog',
            la_custom_err_addend: 'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            la_custom_err_too_big: 'The numbers are too big. The result must have at most 8 digits.',
            ls_terms_btn_aria: 'Show hints and algorithm',
            ls_level_menu_aria: 'Choose level',
            ls_numpad_aria: 'Number pad',
            ls_modal_title: '📖 Guide: Long Subtraction',
            ls_hint_terms_h3: 'Subtraction terms',
            ls_term_minuend: 'Minuend',
            ls_term_minuend_title: 'The number we subtract from',
            ls_term_subtrahend: 'Subtrahend',
            ls_term_subtrahend_title: 'The number we subtract',
            ls_term_difference: 'Difference',
            ls_term_difference_title: 'The result of subtraction',
            ls_term_borrow: 'Borrow',
            ls_term_borrow_title: 'A ten taken from the next column',
            ls_hint_borrow_h3: 'Borrowing',
            ls_hint_borrow_p1: 'If the top digit is smaller than the digit below it, <strong>borrow a ten</strong> from the next column on the left and mark it with a dot.',
            ls_hint_algo_h3: 'Column subtraction algorithm',
            ls_algo_1: '<strong>Write the numbers</strong> one under another, aligning the digits on the right.',
            ls_algo_2: '<strong>Subtract the digits</strong> column by column, starting from the right.',
            ls_algo_3: '<strong>If the top digit is smaller</strong>, borrow a ten from the next column and put a dot above it.',
            ls_algo_4: '<strong>Check the result:</strong> add the difference and the subtrahend.',
            ls_sub_hint: 'What do you get? ({expr} = ?)',
            ls_borrow_hint: 'We borrow a ten. What do you get? ({expr} = ?)',
            ls_wrong_hint: 'Not quite. Try again!',
            ls_done_title: 'Well done!',
            ls_done_next: 'Next problem →',
            ls_custom_btn: '✏️ Custom equation',
            ls_custom_title: 'Custom equation',
            ls_custom_minuend: 'Minuend',
            ls_custom_subtrahend: 'Subtrahend',
            ls_custom_solve: 'Solve',
            ls_custom_cancel: 'Cancel',
            ls_custom_close_aria: 'Close dialog',
            ls_custom_err_subtrahend: 'Enter a number: a whole number or a decimal, e.g. 123 or 1.5',
            ls_custom_err_order: 'The minuend must be greater than or equal to the subtrahend.',
            ls_custom_err_too_big: 'The numbers are too big. The result must have at most 8 digits.',
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
            game_multiplication: 'Multiplicación larga',
            game_addition: 'Suma en columna',
            game_subtraction: 'Resta en columna',

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
            lm_terms_btn_aria: 'Mostrar pistas y algoritmo',
            lm_level_menu_aria: 'Elige el nivel',
            lm_numpad_aria: 'Teclado numérico',
            lm_modal_title: '📖 Guía: Multiplicación larga',
            lm_hint_terms_h3: 'Términos de la multiplicación',
            lm_term_multiplicand: 'Multiplicando',
            lm_term_multiplicand_title: 'El número que se multiplica',
            lm_term_multiplier: 'Multiplicador',
            lm_term_multiplier_title: 'El número por el que multiplicamos',
            lm_term_product: 'Producto',
            lm_term_product_title: 'El resultado de la multiplicación',
            lm_term_partial: 'Producto parcial',
            lm_term_partial_title: 'La fila del producto para una cifra del multiplicador',
            lm_hint_partial_h3: 'Productos parciales',
            lm_hint_partial_p1: '<strong>Los productos parciales</strong> son los resultados de multiplicar por cada cifra del multiplicador. Cada producto parcial siguiente se escribe un lugar más a la izquierda.',
            lm_hint_algo_h3: 'Algoritmo de la multiplicación en columna',
            lm_algo_1: '<strong>Escribe los factores</strong> uno debajo del otro alineando las cifras a la derecha.',
            lm_algo_2: '<strong>Multiplica por la cifra de las unidades</strong> del multiplicador de derecha a izquierda, recordando la reserva.',
            lm_algo_3: '<strong>Multiplica por la siguiente cifra</strong> y escribe la fila desplazada un lugar a la izquierda.',
            lm_algo_4: '<strong>Suma los productos parciales</strong> columna a columna.',
            lm_algo_5: '<strong>Comprueba el resultado.</strong>',
            lm_mul_hint: '¿Cuánto sale? ({a} × {b} = ?)',
            lm_mul_hint_carry: '¿Cuánto sale? ({a} × {b} + {carry} = ?)',
            lm_carry_hint: 'Queda una reserva {carry}. ¿Qué cifra escribimos?',
            lm_add_hint: '¿Cuánto sale? ({expr} = ?)',
            lm_wrong_hint: 'No exactamente. ¡Inténtalo de nuevo!',
            lm_done_title: '¡Bien hecho!',
            lm_done_next: 'Siguiente ejemplo →',
            lm_custom_btn: '✏️ Ecuación propia',
            lm_custom_title: 'Ecuación propia',
            lm_custom_factor1: 'Primer factor',
            lm_custom_factor2: 'Segundo factor',
            lm_custom_solve: 'Resolver',
            lm_custom_cancel: 'Cancelar',
            lm_custom_close_aria: 'Cerrar la ventana',
            lm_custom_err_factor: 'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            lm_custom_err_too_big: 'Los números son demasiado grandes. El producto debe tener como máximo 8 cifras.',
            la_terms_btn_aria: 'Mostrar pistas y algoritmo',
            la_level_menu_aria: 'Elige el nivel',
            la_numpad_aria: 'Teclado numérico',
            la_modal_title: '📖 Guía: Suma en columna',
            la_hint_terms_h3: 'Términos de la suma',
            la_term_addend: 'Sumando',
            la_term_addend_title: 'Un número que sumamos',
            la_term_sum: 'Suma',
            la_term_sum_title: 'El resultado de la suma',
            la_term_carry: 'Reserva',
            la_term_carry_title: 'La decena que se lleva a la siguiente columna',
            la_hint_carry_h3: 'Reserva',
            la_hint_carry_p1: '<strong>La reserva</strong> es una decena que pasa a la columna de la izquierda cuando la suma de una columna es 10 o más. Se escribe pequeña encima de la siguiente cifra.',
            la_hint_algo_h3: 'Algoritmo de la suma en columna',
            la_algo_1: '<strong>Escribe los números</strong> uno debajo del otro alineando las cifras a la derecha.',
            la_algo_2: '<strong>Suma las cifras</strong> columna a columna, empezando por la derecha.',
            la_algo_3: '<strong>Si una columna da 10 o más</strong>, escribe la cifra de las unidades y lleva la decena a la siguiente columna.',
            la_algo_4: '<strong>Comprueba el resultado.</strong>',
            la_add_hint: '¿Cuánto sale? ({expr} = ?)',
            la_carry_hint: 'Queda una reserva {carry}. ¿Qué cifra escribimos?',
            la_wrong_hint: 'No exactamente. ¡Inténtalo de nuevo!',
            la_done_title: '¡Bien hecho!',
            la_done_next: 'Siguiente ejemplo →',
            la_custom_btn: '✏️ Ecuación propia',
            la_custom_title: 'Ecuación propia',
            la_custom_addend1: 'Primer sumando',
            la_custom_addend2: 'Segundo sumando',
            la_custom_solve: 'Resolver',
            la_custom_cancel: 'Cancelar',
            la_custom_close_aria: 'Cerrar la ventana',
            la_custom_err_addend: 'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            la_custom_err_too_big: 'Los números son demasiado grandes. El resultado debe tener como máximo 8 cifras.',
            ls_terms_btn_aria: 'Mostrar pistas y algoritmo',
            ls_level_menu_aria: 'Elige el nivel',
            ls_numpad_aria: 'Teclado numérico',
            ls_modal_title: '📖 Guía: Resta en columna',
            ls_hint_terms_h3: 'Términos de la resta',
            ls_term_minuend: 'Minuendo',
            ls_term_minuend_title: 'El número del que restamos',
            ls_term_subtrahend: 'Sustraendo',
            ls_term_subtrahend_title: 'El número que restamos',
            ls_term_difference: 'Diferencia',
            ls_term_difference_title: 'El resultado de la resta',
            ls_term_borrow: 'Préstamo',
            ls_term_borrow_title: 'Una decena que se toma de la siguiente columna',
            ls_hint_borrow_h3: 'Préstamo',
            ls_hint_borrow_p1: 'Si la cifra de arriba es menor que la de abajo, <strong>toma una decena</strong> de la columna de la izquierda y márcala con un punto.',
            ls_hint_algo_h3: 'Algoritmo de la resta en columna',
            ls_algo_1: '<strong>Escribe los números</strong> uno debajo del otro alineando las cifras a la derecha.',
            ls_algo_2: '<strong>Resta las cifras</strong> columna a columna, empezando por la derecha.',
            ls_algo_3: '<strong>Si la cifra de arriba es menor</strong>, toma una decena de la siguiente columna y pon un punto encima.',
            ls_algo_4: '<strong>Comprueba el resultado:</strong> suma la diferencia y el sustraendo.',
            ls_sub_hint: '¿Cuánto sale? ({expr} = ?)',
            ls_borrow_hint: 'Tomamos una decena. ¿Cuánto sale? ({expr} = ?)',
            ls_wrong_hint: 'No exactamente. ¡Inténtalo de nuevo!',
            ls_done_title: '¡Bien hecho!',
            ls_done_next: 'Siguiente ejemplo →',
            ls_custom_btn: '✏️ Ecuación propia',
            ls_custom_title: 'Ecuación propia',
            ls_custom_minuend: 'Minuendo',
            ls_custom_subtrahend: 'Sustraendo',
            ls_custom_solve: 'Resolver',
            ls_custom_cancel: 'Cancelar',
            ls_custom_close_aria: 'Cerrar la ventana',
            ls_custom_err_subtrahend: 'Introduce un número: entero o decimal, por ejemplo 123 o 1,5',
            ls_custom_err_order: 'El minuendo debe ser mayor o igual que el sustraendo.',
            ls_custom_err_too_big: 'Los números son demasiado grandes. El resultado debe tener como máximo 8 cifras.',
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
            game_multiplication: 'Умножение в столбик',
            game_addition: 'Сложение в столбик',
            game_subtraction: 'Вычитание в столбик',

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
            lm_terms_btn_aria: 'Показать подсказки и алгоритм',
            lm_level_menu_aria: 'Выберите уровень',
            lm_numpad_aria: 'Цифровая клавиатура',
            lm_modal_title: '📖 Памятка: Умножение в столбик',
            lm_hint_terms_h3: 'Термины при умножении',
            lm_term_multiplicand: 'Множимое',
            lm_term_multiplicand_title: 'Число, которое умножаем',
            lm_term_multiplier: 'Множитель',
            lm_term_multiplier_title: 'Число, на которое умножаем',
            lm_term_product: 'Произведение',
            lm_term_product_title: 'Результат умножения',
            lm_term_partial: 'Неполное произведение',
            lm_term_partial_title: 'Строка произведения для одной цифры множителя',
            lm_hint_partial_h3: 'Неполные произведения',
            lm_hint_partial_p1: '<strong>Неполные произведения</strong> — это результаты умножения на каждую цифру множителя. Каждое следующее неполное произведение записывают на одну позицию левее.',
            lm_hint_algo_h3: 'Алгоритм умножения в столбик',
            lm_algo_1: '<strong>Запиши множители</strong> друг под другом, выравнивая цифры справа.',
            lm_algo_2: '<strong>Умножь на цифру единиц</strong> множителя справа налево, запоминая перенос.',
            lm_algo_3: '<strong>Умножь на следующую цифру</strong> и запиши строку со сдвигом на одну позицию влево.',
            lm_algo_4: '<strong>Сложи неполные произведения</strong> по столбикам.',
            lm_algo_5: '<strong>Проверь результат.</strong>',
            lm_mul_hint: 'Сколько получится? ({a} × {b} = ?)',
            lm_mul_hint_carry: 'Сколько получится? ({a} × {b} + {carry} = ?)',
            lm_carry_hint: 'Остался перенос {carry}. Какую цифру пишем?',
            lm_add_hint: 'Сколько получится? ({expr} = ?)',
            lm_wrong_hint: 'Не совсем так. Попробуй ещё раз!',
            lm_done_title: 'Отлично решено!',
            lm_done_next: 'Следующий пример →',
            lm_custom_btn: '✏️ Своё выражение',
            lm_custom_title: 'Своё выражение',
            lm_custom_factor1: 'Первый множитель',
            lm_custom_factor2: 'Второй множитель',
            lm_custom_solve: 'Решить',
            lm_custom_cancel: 'Отмена',
            lm_custom_close_aria: 'Закрыть окно',
            lm_custom_err_factor: 'Введи число: целое или десятичную дробь, например 123 или 1,5',
            lm_custom_err_too_big: 'Слишком большие числа. В произведении должно быть не больше 8 цифр.',
            la_terms_btn_aria: 'Показать подсказки и алгоритм',
            la_level_menu_aria: 'Выберите уровень',
            la_numpad_aria: 'Цифровая клавиатура',
            la_modal_title: '📖 Памятка: Сложение в столбик',
            la_hint_terms_h3: 'Термины при сложении',
            la_term_addend: 'Слагаемое',
            la_term_addend_title: 'Число, которое складываем',
            la_term_sum: 'Сумма',
            la_term_sum_title: 'Результат сложения',
            la_term_carry: 'Перенос',
            la_term_carry_title: 'Десяток, который переносим в следующий разряд',
            la_hint_carry_h3: 'Перенос',
            la_hint_carry_p1: '<strong>Перенос</strong> — это десяток, который переходит в следующий разряд, если сумма цифр в столбике больше 9. Его записывают маленькой цифрой над следующим разрядом.',
            la_hint_algo_h3: 'Алгоритм сложения в столбик',
            la_algo_1: '<strong>Запиши числа</strong> друг под другом, выравнивая цифры справа.',
            la_algo_2: '<strong>Складывай цифры</strong> по столбикам, начиная справа.',
            la_algo_3: '<strong>Если в столбике получилось 10 или больше</strong>, запиши цифру единиц, а десяток перенеси в следующий разряд.',
            la_algo_4: '<strong>Проверь результат.</strong>',
            la_add_hint: 'Сколько получится? ({expr} = ?)',
            la_carry_hint: 'Остался перенос {carry}. Какую цифру пишем?',
            la_wrong_hint: 'Не совсем так. Попробуй ещё раз!',
            la_done_title: 'Отлично решено!',
            la_done_next: 'Следующий пример →',
            la_custom_btn: '✏️ Своё выражение',
            la_custom_title: 'Своё выражение',
            la_custom_addend1: 'Первое слагаемое',
            la_custom_addend2: 'Второе слагаемое',
            la_custom_solve: 'Решить',
            la_custom_cancel: 'Отмена',
            la_custom_close_aria: 'Закрыть окно',
            la_custom_err_addend: 'Введи число: целое или десятичную дробь, например 123 или 1,5',
            la_custom_err_too_big: 'Слишком большие числа. В сумме должно быть не больше 8 цифр.',
            ls_terms_btn_aria: 'Показать подсказки и алгоритм',
            ls_level_menu_aria: 'Выберите уровень',
            ls_numpad_aria: 'Цифровая клавиатура',
            ls_modal_title: '📖 Памятка: Вычитание в столбик',
            ls_hint_terms_h3: 'Термины при вычитании',
            ls_term_minuend: 'Уменьшаемое',
            ls_term_minuend_title: 'Число, из которого вычитаем',
            ls_term_subtrahend: 'Вычитаемое',
            ls_term_subtrahend_title: 'Число, которое вычитаем',
            ls_term_difference: 'Разность',
            ls_term_difference_title: 'Результат вычитания',
            ls_term_borrow: 'Заём',
            ls_term_borrow_title: 'Десяток, который занимаем у следующего разряда',
            ls_hint_borrow_h3: 'Заём',
            ls_hint_borrow_p1: 'Если верхняя цифра меньше нижней, <strong>занимаем десяток</strong> у следующего разряда слева и ставим над ним точку.',
            ls_hint_algo_h3: 'Алгоритм вычитания в столбик',
            ls_algo_1: '<strong>Запиши числа</strong> друг под другом, выравнивая цифры справа.',
            ls_algo_2: '<strong>Вычитай цифры</strong> по столбикам, начиная справа.',
            ls_algo_3: '<strong>Если верхняя цифра меньше</strong>, займи десяток у следующего разряда и поставь над ним точку.',
            ls_algo_4: '<strong>Проверь результат:</strong> сложи разность и вычитаемое.',
            ls_sub_hint: 'Сколько получится? ({expr} = ?)',
            ls_borrow_hint: 'Занимаем десяток. Сколько получится? ({expr} = ?)',
            ls_wrong_hint: 'Не совсем так. Попробуй ещё раз!',
            ls_done_title: 'Отлично решено!',
            ls_done_next: 'Следующий пример →',
            ls_custom_btn: '✏️ Своё выражение',
            ls_custom_title: 'Своё выражение',
            ls_custom_minuend: 'Уменьшаемое',
            ls_custom_subtrahend: 'Вычитаемое',
            ls_custom_solve: 'Решить',
            ls_custom_cancel: 'Отмена',
            ls_custom_close_aria: 'Закрыть окно',
            ls_custom_err_subtrahend: 'Введи число: целое или десятичную дробь, например 123 или 1,5',
            ls_custom_err_order: 'Уменьшаемое должно быть больше или равно вычитаемому.',
            ls_custom_err_too_big: 'Слишком большие числа. В разности должно быть не больше 8 цифр.',
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
