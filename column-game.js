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

    function bindEvents(ctx) {
        const { elements, hooks } = ctx;
                // Numpad clicks
                elements.numpadGrid.addEventListener('click', (e) => {
                    const btn = e.target.closest('.numpad-btn');
                    if (!btn) return;
                    BrainWarsColumnGame.handleKeyPress(btn.dataset.key, ctx);
                });

                // Physical keyboard support
                window.addEventListener('keydown', (e) => {
                    if (elements.customModal.classList.contains('open')) {
                        if (e.key === 'Escape') hooks.toggleCustomModal(false);
                        return;
                    }
                    if (elements.levelMenu.classList.contains('open')) {
                        if (e.key === 'Escape') {
                            BrainWarsColumnGame.toggleLevelMenu(false, ctx);
                            elements.levelDisplay.focus();
                        }
                        return;
                    }
                    if (elements.completionOverlay.classList.contains('show')) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            BrainWarsColumnGame.startNewRound(ctx);
                        }
                        return;
                    }

                    const isControlFocused = e.target instanceof HTMLElement &&
                        (e.target.tagName === 'BUTTON' || e.target.tagName === 'A');
                    if (isControlFocused && (e.key === 'Enter' || e.key === ' ')) {
                        return; // Let the focused control handle its own activation
                    }

                    if (e.key >= '0' && e.key <= '9') {
                        BrainWarsColumnGame.handleKeyPress(e.key, ctx);
                    } else if (e.key === 'Backspace') {
                        BrainWarsColumnGame.handleKeyPress('backspace', ctx);
                    } else if (e.key === 'Enter') {
                        BrainWarsColumnGame.handleKeyPress('enter', ctx);
                    }
                });

                // Terminology badge interactive highlights
                document.querySelectorAll('.term-badge').forEach(badge => {
                    badge.addEventListener('click', () => {
                        hooks.highlightTerm(badge.dataset.term);
                    });
                });

                // Window resize for comma alignment
                window.addEventListener('resize', () => {
                    BrainWarsColumnGame.applyCellSize(elements, state);
                    hooks.renderCommas();
                });


                // Completion next button
                elements.nextProblemBtn.addEventListener('click', () => BrainWarsColumnGame.startNewRound(ctx));

                // Custom equation modal
                elements.customEqBtn.addEventListener('click', () => hooks.toggleCustomModal(true));
                elements.customCloseBtn.addEventListener('click', () => hooks.toggleCustomModal(false));
                elements.customCancelBtn.addEventListener('click', () => hooks.toggleCustomModal(false));
                elements.customModal.addEventListener('click', (e) => {
                    if (e.target === elements.customModal) hooks.toggleCustomModal(false);
                });
                elements.customForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    hooks.submitCustomProblem();
                });

                // Level picker
                elements.levelDisplay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BrainWarsColumnGame.toggleLevelMenu(ctx);
                });
                elements.levelMenu.addEventListener('click', (e) => {
                    const item = e.target.closest('.level-menu-item');
                    if (!item) return;
                    e.stopPropagation();
                    BrainWarsColumnGame.selectLevel(Number(item.dataset.level), ctx);
                });
                elements.levelMenu.addEventListener('keydown', (e) => {
                    const items = Array.from(elements.levelMenu.querySelectorAll('.level-menu-item'));
                    const index = items.indexOf(document.activeElement);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = items[Math.min(items.length - 1, index + 1)];
                        if (next) next.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = items[Math.max(0, index - 1)];
                        if (prev) prev.focus();
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        items[0].focus();
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        items[items.length - 1].focus();
                    }
                });
                document.addEventListener('click', (e) => {
                    if (!elements.levelMenu.classList.contains('open')) return;
                    if (e.target.closest('.level-picker')) return;
                    BrainWarsColumnGame.toggleLevelMenu(false, ctx);
                });
    }

    function handleKeyPress(key, ctx) {
        const { elements, state } = ctx;
                if (key === 'backspace') {
                    state.currentInput = state.currentInput.slice(0, -1);
                    BrainWarsColumnGame.renderTypingPreview(state);
                    return;
                }

                if (key === 'enter') {
                    BrainWarsColumnGame.submitCurrentInput(ctx);
                    return;
                }

                if (key >= '0' && key <= '9') {
                    if (state.currentInput.length >= state.expectedAnswer.length) return;
                    elements.instructionHint.classList.remove('is-error');
                    state.currentInput += key;
                    BrainWarsColumnGame.renderTypingPreview(state);

                    if (state.currentInput.length === state.expectedAnswer.length) {
                        setTimeout(() => BrainWarsColumnGame.submitCurrentInput(ctx), 80);
                    }
                }
    }

    function renderGridDOM(ctx) {
        const { elements, state } = ctx;
                const grid = elements.mathGrid;
                grid.innerHTML = '';

                BrainWarsColumnGame.applyCellSize(elements, state);

                grid.style.gridTemplateColumns = `repeat(${state.numCols}, var(--cell-size))`;
                grid.style.gridTemplateRows = `repeat(${state.numRows}, var(--cell-size))`;

                for (let r = 0; r < state.numRows; r++) {
                    for (let c = 0; c < state.numCols; c++) {
                        const cellData = state.gridMatrix[r][c];
                        const cellEl = document.createElement('div');
                        cellEl.className = `grid-cell ${cellData.classes.join(' ')}`;
                        cellEl.id = `cell-${r}-${c}`;
                        cellEl.textContent = cellData.char;
                        grid.appendChild(cellEl);
                    }
                }
    }

    function syncActiveCell(ctx) {
        const { state } = ctx;
                const step = state.steps[state.stepIndex];
                const previous = state.activeTargetCells;
                previous.forEach(({ r, c }) => {
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    if (cell) {
                        cell.classList.remove('active-input', 'typing-preview', 'multi');
                        cell.textContent = state.gridMatrix[r][c].char;
                    }
                });

                state.activeTargetCells = [{ r: step.row, c: step.col }];
                const cell = document.getElementById(`cell-${step.row}-${step.col}`);
                if (cell) {
                    cell.classList.add('active-input');
                    BrainWarsColumnGame.scrollCellIntoView(cell, elements);
                }
    }

    function toggleLevelMenu(open, ctx) {
        const { elements } = ctx;
                const menu = elements.levelMenu;
                const willOpen = (open !== undefined) ? open : !menu.classList.contains('open');
                menu.classList.toggle('open', willOpen);
                elements.levelDisplay.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

                if (willOpen) {
                    BrainWarsColumnGame.renderLevelMenu(elements, state, config);
                    BrainWarsColumnGame.positionLevelMenu(elements);
                    const current = menu.querySelector('.level-menu-item.current');
                    if (current) current.focus();
                }
    }

    function handleLanguageChange(ctx) {
        const { elements, hooks } = ctx;
                BrainWarsColumnGame.renderLevelBadge(elements, state);
                if (elements.levelMenu.classList.contains('open')) {
                    BrainWarsColumnGame.renderLevelMenu(elements, state, config);
                }
                hooks.renderCommas();
                hooks.renderCompletionEquation();
                if (!elements.completionOverlay.classList.contains('show')) {
                    hooks.promptCurrentStep();
                }
    }

    function submitCurrentInput(ctx) {
        const { state, hooks } = ctx;
                const userVal = state.currentInput.trim();
                if (!userVal) return;

                if (userVal === state.expectedAnswer) {
                    hooks.handleCorrectInput();
                } else {
                    hooks.handleWrongInput();
                }
    }

    function selectLevel(level, ctx) {
        const { state, config } = ctx;
                state.level = Math.min(Math.max(level, 1), config.maxLevel);
                BrainWarsColumnGame.toggleLevelMenu(false, ctx);
                BrainWarsColumnGame.startNewRound(ctx);
    }

    function subscribeToLanguageChanges(ctx) {
                I18n.subscribe(() => BrainWarsColumnGame.handleLanguageChange(ctx));
    }

    function startNewRound(ctx) {
        const { state, hooks } = ctx;
                hooks.beginRound(hooks.createProblem(state.level), false);
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
        bindEvents,
        handleKeyPress,
        renderGridDOM,
        syncActiveCell,
        toggleLevelMenu,
        handleLanguageChange,
        submitCurrentInput,
        selectLevel,
        subscribeToLanguageChanges,
        startNewRound,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsColumnGame;
    }
})(typeof window !== 'undefined' ? window : globalThis);
