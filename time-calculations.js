/**
 * Time calculation problems engine.
 * The engine lives in quantity-calculations.js, which registers
 * window.BrainWarsTime. This file stays in the precache and test lists so
 * service workers and Node tests can require it by name.
 */
'use strict';

if (typeof module !== 'undefined' && module.exports) {
    module.exports = require('./quantity-calculations.js').time;
}