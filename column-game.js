/**
 * The half of the four column games that is identical in all of them: the
 * element lookup, the grid DOM, the keypad preview, the level menu and the
 * small formatting helpers.
 *
 * Each page keeps its own class, its own maths and its own private methods.
 * These functions take the game's elements, state and config as arguments;
 * the page's method of the same name delegates to them.
 *
 * Browser: window.BrainWarsColumnGame.
 */
((global) => {
  'use strict';

    function initElements() {
        const elements = {
            levelDisplay: document.getElementById('levelDisplay'),
            levelText: document.getElementById('levelText'),
            levelMenu: document.getElementById('levelMenu'),
            boardContainer: document.querySelector('.board-container'),
            instructionHint: document.getElementById('instructionHint'),
            mathGrid: document.getElementById('mathGrid'),
            commaLayer: document.getElementById('commaLayer'),
            numpadGrid: document.getElementById('numpadGrid'),
            completionOverlay: document.getElementById('completionOverlay'),
            completionEquation: document.getElementById('completionEquation'),
            nextProblemBtn: document.getElementById('nextProblemBtn'),
            customEqBtn: document.getElementById('customEqBtn'),
            customModal: document.getElementById('customModal'),
            customCloseBtn: document.getElementById('customCloseBtn'),
            customCancelBtn: document.getElementById('customCancelBtn'),
            customForm: document.getElementById('customForm'),
            customFactor1: document.getElementById('customFactor1'),
            customFactor2: document.getElementById('customFactor2'),
            customError: document.getElementById('customError')
        };
        return elements;
            }

    function positionLevelMenu(elements) {
        const menu = elements.levelMenu;
        const triggerRect = elements.levelDisplay.getBoundingClientRect();
        const menuWidth = menu.offsetWidth;
        const viewportWidth = document.documentElement.clientWidth;
        const margin = 8;

        menu.style.maxWidth = '';
        if (triggerRect.right - menuWidth >= margin) {
            menu.style.left = 'auto';
            menu.style.right = '0';
        } else {
            menu.style.left = '0';
            menu.style.right = 'auto';
            if (triggerRect.left + menuWidth > viewportWidth - margin) {
                menu.style.maxWidth = `${viewportWidth - margin * 2}px`;
            }
        }
            }

    function renderTypingPreview(state) {
        const input = state.currentInput;
        const cells = state.activeTargetCells;
        if (!cells || cells.length === 0) return;

        cells.forEach((pos) => {
            const cell = document.getElementById(`cell-${pos.r}-${pos.c}`);
            if (!cell) return;
            if (input.length > 0) {
                cell.textContent = input;
                cell.classList.add('typing-preview');
                cell.classList.toggle('multi', input.length > 1);
            } else {
                cell.textContent = state.gridMatrix[pos.r][pos.c].char;
                cell.classList.remove('typing-preview', 'multi');
            }
        });
            }

    function renderLevelMenu(elements, state, config) {
        const menu = elements.levelMenu;
        menu.innerHTML = '';
        for (let level = 1; level <= config.maxLevel; level++) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `level-menu-item${level === state.level ? ' current' : ''}`;
            item.dataset.level = String(level);
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', level === state.level ? 'true' : 'false');
            item.setAttribute('aria-label', I18n.t('level_label', { n: level }));
            item.textContent = String(level);
            menu.appendChild(item);
        }
            }

    function scrollCellIntoView(cell, elements) {
        const container = elements.boardContainer;
        if (!cell || !container) return;
        const cellRect = cell.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const margin = 24;
        if (cellRect.left < containerRect.left + margin) {
            container.scrollLeft -= (containerRect.left + margin - cellRect.left);
        } else if (cellRect.right > containerRect.right - margin) {
            container.scrollLeft += (cellRect.right - containerRect.right + margin);
        }
            }

    function applyCellSize(elements, state) {
        const grid = elements.mathGrid;
        const board = elements.boardContainer;
        const cols = state.numCols || 1;
        // 6px reserve for the grid border (1px) + padding (1px) plus slack,
        // so the board never needs a horizontal scrollbar.
        const available = (board ? board.clientWidth : 360) - 6;
        const cell = Math.max(20, Math.min(48, Math.floor(available / cols)));
        grid.style.setProperty('--cell-size', `${cell}px`);
        grid.style.setProperty('--cell-font-size', `${Math.max(14, Math.min(26, Math.round(cell * 0.58)))}px`);
            }

    function setCellValue(r, c, char, additionalClasses = [], state) {
        state.gridMatrix[r][c].char = String(char);
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (cell) {
            cell.textContent = String(char);
            cell.classList.remove('active-input', 'typing-preview', 'multi');
            additionalClasses.forEach((cls) => {
                cell.classList.add(cls);
            });
        }
            }

    function paint(cls, collect) {
        const clear = () => {
            document.querySelectorAll(`.${cls}`).forEach((el) => {
                el.classList.remove(cls);
            });
        };
        clear();
        collect().forEach((el) => {
                el.classList.add(cls);
            });
        setTimeout(clear, 1000);
            }

    function formatNumberText(digits, decimals) {
        if (!decimals) return digits;
        const cut = digits.length - decimals;
        return digits.slice(0, cut) + I18n.t('decimal_separator') + digits.slice(cut);
            }

    function randomInt(min, max) {
        return Math.floor(BrainWarsGames.random() * (max - min + 1)) + min;
            }

    function renderLevelBadge(elements, state) {
        elements.levelText.textContent = I18n.t('level_label', { n: state.level });
            }

    function showCustomError(key, elements) {
        elements.customError.textContent = I18n.t(key);
            }

    global.BrainWarsColumnGame = {
        initElements,
        positionLevelMenu,
        renderTypingPreview,
        renderLevelMenu,
        scrollCellIntoView,
        applyCellSize,
        setCellValue,
        paint,
        formatNumberText,
        randomInt,
        renderLevelBadge,
        showCustomError,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsColumnGame;
    }
})(typeof window !== 'undefined' ? window : globalThis);
