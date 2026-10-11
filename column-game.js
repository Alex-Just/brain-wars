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
	"use strict";

	function initElements() {
		const elements = {
			levelDisplay: document.getElementById("levelDisplay"),
			levelText: document.getElementById("levelText"),
			levelMenu: document.getElementById("levelMenu"),
			boardContainer: document.querySelector(".board-container"),
			instructionHint: document.getElementById("instructionHint"),
			mathGrid: document.getElementById("mathGrid"),
			commaLayer: document.getElementById("commaLayer"),
			numpadGrid: document.getElementById("numpadGrid"),
			completionOverlay: document.getElementById("completionOverlay"),
			completionEquation: document.getElementById("completionEquation"),
			nextProblemBtn: document.getElementById("nextProblemBtn"),
			customEqBtn: document.getElementById("customEqBtn"),
			customModal: document.getElementById("customModal"),
			customCloseBtn: document.getElementById("customCloseBtn"),
			customCancelBtn: document.getElementById("customCancelBtn"),
			customForm: document.getElementById("customForm"),
			customFactor1: document.getElementById("customFactor1"),
			customFactor2: document.getElementById("customFactor2"),
			customError: document.getElementById("customError"),
		};
		return elements;
	}

	function positionLevelMenu(elements) {
		const menu = elements.levelMenu;
		const triggerRect = elements.levelDisplay.getBoundingClientRect();
		const menuWidth = menu.offsetWidth;
		const viewportWidth = document.documentElement.clientWidth;
		const margin = 8;

		menu.style.maxWidth = "";
		if (triggerRect.right - menuWidth >= margin) {
			menu.style.left = "auto";
			menu.style.right = "0";
		} else {
			menu.style.left = "0";
			menu.style.right = "auto";
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
				cell.classList.add("typing-preview");
				cell.classList.toggle("multi", input.length > 1);
			} else {
				cell.textContent = state.gridMatrix[pos.r][pos.c].char;
				cell.classList.remove("typing-preview", "multi");
			}
		});
	}

	function renderLevelMenu(elements, state, config) {
		const menu = elements.levelMenu;
		menu.innerHTML = "";
		for (let level = 1; level <= config.maxLevel; level++) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = `level-menu-item${level === state.level ? " current" : ""}`;
			item.dataset.level = String(level);
			item.setAttribute("role", "option");
			item.setAttribute(
				"aria-selected",
				level === state.level ? "true" : "false",
			);
			item.setAttribute("aria-label", I18n.t("level_label", { n: level }));
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
			container.scrollLeft -= containerRect.left + margin - cellRect.left;
		} else if (cellRect.right > containerRect.right - margin) {
			container.scrollLeft += cellRect.right - containerRect.right + margin;
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
		grid.style.setProperty("--cell-size", `${cell}px`);
		grid.style.setProperty(
			"--cell-font-size",
			`${Math.max(14, Math.min(26, Math.round(cell * 0.58)))}px`,
		);
	}

	function setCellValue(r, c, char, state, additionalClasses = []) {
		state.gridMatrix[r][c].char = String(char);
		const cell = document.getElementById(`cell-${r}-${c}`);
		if (cell) {
			cell.textContent = String(char);
			cell.classList.remove("active-input", "typing-preview", "multi");
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
		return (
			digits.slice(0, cut) + I18n.t("decimal_separator") + digits.slice(cut)
		);
	}

	function randomInt(min, max) {
		return Math.floor(BrainWarsGames.random() * (max - min + 1)) + min;
	}

	function renderLevelBadge(elements, state) {
		elements.levelText.textContent = I18n.t("level_label", { n: state.level });
	}

	function showCustomError(key, elements) {
		elements.customError.textContent = I18n.t(key);
	}

	// While a modal or the completion banner is up the keyboard belongs to it,
	// not to the notebook. Returns true when the key was consumed here.
	function handleCapturedKeydown(e, ctx) {
		const { elements, hooks } = ctx;
		if (elements.customModal.classList.contains("open")) {
			if (e.key === "Escape") hooks.toggleCustomModal(false);
			return true;
		}
		if (elements.levelMenu.classList.contains("open")) {
			if (e.key === "Escape") {
				BrainWarsColumnGame.toggleLevelMenu(false, ctx);
				elements.levelDisplay.focus();
			}
			return true;
		}
		if (elements.completionOverlay.classList.contains("show")) {
			if (e.key === "Enter" || e.key === " ") {
				BrainWarsColumnGame.startNewRound(ctx);
			}
			return true;
		}
		return false;
	}

	function bindEvents(ctx) {
		const { elements, state, hooks } = ctx;
		// Numpad clicks
		elements.numpadGrid.addEventListener("click", (e) => {
			const btn = e.target.closest(".numpad-btn");
			if (!btn) return;
			BrainWarsColumnGame.handleKeyPress(btn.dataset.key, ctx);
		});

		// Physical keyboard support
		window.addEventListener("keydown", (e) => {
			if (handleCapturedKeydown(e, ctx)) return;

			const isControlFocused =
				e.target instanceof HTMLElement &&
				(e.target.tagName === "BUTTON" || e.target.tagName === "A");
			if (isControlFocused && (e.key === "Enter" || e.key === " ")) {
				return; // Let the focused control handle its own activation
			}

			if (e.key >= "0" && e.key <= "9") {
				BrainWarsColumnGame.handleKeyPress(e.key, ctx);
			} else if (e.key === "Backspace") {
				BrainWarsColumnGame.handleKeyPress("backspace", ctx);
			} else if (e.key === "Enter") {
				BrainWarsColumnGame.handleKeyPress("enter", ctx);
			}
		});

		// Terminology badge interactive highlights
		document.querySelectorAll(".term-badge").forEach((badge) => {
			badge.addEventListener("click", () => {
				hooks.highlightTerm(badge.dataset.term);
			});
		});

		// Window resize for comma alignment
		window.addEventListener("resize", () => {
			BrainWarsColumnGame.applyCellSize(elements, state);
			hooks.renderCommas();
		});

		// Completion next button
		elements.nextProblemBtn.addEventListener("click", () =>
			BrainWarsColumnGame.startNewRound(ctx),
		);

		// Custom equation modal
		elements.customEqBtn.addEventListener("click", () =>
			hooks.toggleCustomModal(true),
		);
		elements.customCloseBtn.addEventListener("click", () =>
			hooks.toggleCustomModal(false),
		);
		elements.customCancelBtn.addEventListener("click", () =>
			hooks.toggleCustomModal(false),
		);
		elements.customModal.addEventListener("click", (e) => {
			if (e.target === elements.customModal) hooks.toggleCustomModal(false);
		});
		elements.customForm.addEventListener("submit", (e) => {
			e.preventDefault();
			hooks.submitCustomProblem();
		});

		// Level picker
		elements.levelDisplay.addEventListener("click", (e) => {
			e.stopPropagation();
			BrainWarsColumnGame.toggleLevelMenu(undefined, ctx);
		});
		elements.levelMenu.addEventListener("click", (e) => {
			const item = e.target.closest(".level-menu-item");
			if (!item) return;
			e.stopPropagation();
			BrainWarsColumnGame.selectLevel(Number(item.dataset.level), ctx);
		});
		elements.levelMenu.addEventListener("keydown", (e) => {
			const items = Array.from(
				elements.levelMenu.querySelectorAll(".level-menu-item"),
			);
			const index = items.indexOf(document.activeElement);
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				const next = items[Math.min(items.length - 1, index + 1)];
				if (next) next.focus();
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				const prev = items[Math.max(0, index - 1)];
				if (prev) prev.focus();
			} else if (e.key === "Home") {
				e.preventDefault();
				items[0].focus();
			} else if (e.key === "End") {
				e.preventDefault();
				items[items.length - 1].focus();
			}
		});
		document.addEventListener("click", (e) => {
			if (!elements.levelMenu.classList.contains("open")) return;
			if (e.target.closest(".level-picker")) return;
			BrainWarsColumnGame.toggleLevelMenu(false, ctx);
		});
	}

	function handleKeyPress(key, ctx) {
		const { elements, state } = ctx;
		if (key === "backspace") {
			state.currentInput = state.currentInput.slice(0, -1);
			BrainWarsColumnGame.renderTypingPreview(state);
			return;
		}

		if (key === "enter") {
			BrainWarsColumnGame.submitCurrentInput(ctx);
			return;
		}

		if (key >= "0" && key <= "9") {
			if (state.currentInput.length >= state.expectedAnswer.length) return;
			elements.instructionHint.classList.remove("is-error");
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
		grid.innerHTML = "";

		BrainWarsColumnGame.applyCellSize(elements, state);

		grid.style.gridTemplateColumns = `repeat(${state.numCols}, var(--cell-size))`;
		grid.style.gridTemplateRows = `repeat(${state.numRows}, var(--cell-size))`;

		for (let r = 0; r < state.numRows; r++) {
			for (let c = 0; c < state.numCols; c++) {
				const cellData = state.gridMatrix[r][c];
				const cellEl = document.createElement("div");
				cellEl.className = `grid-cell ${cellData.classes.join(" ")}`;
				cellEl.id = `cell-${r}-${c}`;
				cellEl.textContent = cellData.char;
				grid.appendChild(cellEl);
			}
		}
	}

	function syncActiveCell(ctx) {
		const { elements, state } = ctx;
		const step = state.steps[state.stepIndex];
		const previous = state.activeTargetCells;
		previous.forEach(({ r, c }) => {
			const cell = document.getElementById(`cell-${r}-${c}`);
			if (cell) {
				cell.classList.remove("active-input", "typing-preview", "multi");
				cell.textContent = state.gridMatrix[r][c].char;
			}
		});

		state.activeTargetCells = [{ r: step.row, c: step.col }];
		const cell = document.getElementById(`cell-${step.row}-${step.col}`);
		if (cell) {
			cell.classList.add("active-input");
			BrainWarsColumnGame.scrollCellIntoView(cell, elements);
		}
	}

	function toggleLevelMenu(open, ctx) {
		const { elements, state, config } = ctx;
		const menu = elements.levelMenu;
		const willOpen =
			open !== undefined ? open : !menu.classList.contains("open");
		menu.classList.toggle("open", willOpen);
		elements.levelDisplay.setAttribute(
			"aria-expanded",
			willOpen ? "true" : "false",
		);

		if (willOpen) {
			BrainWarsColumnGame.renderLevelMenu(elements, state, config);
			BrainWarsColumnGame.positionLevelMenu(elements);
			const current = menu.querySelector(".level-menu-item.current");
			if (current) current.focus();
		}
	}

	function handleLanguageChange(ctx) {
		const { elements, state, config, hooks } = ctx;
		BrainWarsColumnGame.renderLevelBadge(elements, state);
		if (elements.levelMenu.classList.contains("open")) {
			BrainWarsColumnGame.renderLevelMenu(elements, state, config);
		}
		hooks.renderCommas();
		hooks.renderCompletionEquation();
		if (!elements.completionOverlay.classList.contains("show")) {
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
	/**
	 * The column game behind long addition, subtraction and multiplication.
	 *
	 * The three pages are one game: a notebook grid, a plan of steps, a keypad and
	 * a level menu. They differ in the maths and in the wording, so each page
	 * subclasses this and overrides the methods where it differs: createProblem
	 * and computePlan for its arithmetic, buildGrid for its layout, and so on.
	 *
	 * The members are public rather than #private because a subclass cannot reach
	 * another class's private members and the overrides need the state, the
	 * elements and the helpers.
	 *
	 * The BrainWarsColumnGame functions above are the primitives; long-division is
	 * a different game and delegates to those directly.
	 */
	class ColumnGame {
		state;
		elements;
		config;

		constructor(options = {}) {
			this.options = options;
			this.initConfig();
			this.initElements();
			this.initState();
			this.bindEvents();
			this.subscribeToLanguageChanges();
			this.startNewRound();
		}

		ctx() {
			return {
				elements: this.elements,
				state: this.state,
				config: this.config,
				hooks: {
					initConfig: () => this.initConfig(),
					initState: () => this.initState(),
					beginRound: (problem, isCustom) => this.beginRound(problem, isCustom),
					createProblem: (level) => this.createProblem(level),
					promptCurrentStep: () => this.promptCurrentStep(),
					renderCommas: () => this.renderCommas(),
					renderCompletionEquation: () => this.renderCompletionEquation(),
					handleCorrectInput: () => this.handleCorrectInput(),
					handleWrongInput: () => this.handleWrongInput(),
					highlightTerm: (term) => this.highlightTerm(term),
					toggleCustomModal: (open) => this.toggleCustomModal(open),
					submitCustomProblem: () => this.submitCustomProblem(),
				},
			};
		}

		initConfig() {
			this.config = {
				maxLevel: 20,
				maxResultDigits: 8,
				// The notebook grid never uses more than this many columns: with
				// more the cells and digits get too small to read on a phone.
				maxGridColumns: 12,
			};
		}

		initElements() {
			this.elements = BrainWarsColumnGame.initElements();
		}

		initState() {
			this.state = {
				level: 1,
				isCustomRound: false,
				hadErrorThisRound: false,
				firstDigits: "12",
				firstDecimals: 0,
				secondDigits: "8",
				secondDecimals: 0,
				resultDigits: "20",
				resultDecimals: 0,
				steps: [],
				stepIndex: 0,
				currentInput: "",
				expectedAnswer: "",
				gridMatrix: [],
				numRows: 0,
				numCols: 0,
				baseCol: 0,
				resultRow: 0,
				activeTargetCells: [],
			};
		}

		bindEvents() {
			BrainWarsColumnGame.bindEvents(this.ctx());
		}

		subscribeToLanguageChanges() {
			BrainWarsColumnGame.subscribeToLanguageChanges(this.ctx());
		}

		handleLanguageChange() {
			BrainWarsColumnGame.handleLanguageChange(this.ctx());
		}

		randomInt(min, max) {
			return BrainWarsColumnGame.randomInt(min, max);
		}

		randomNumberString(integerDigits, decimals, big) {
			let digits = "";
			for (let i = 0; i < integerDigits; i++) {
				const leadingMin = i === 0 ? 1 : 0;
				digits += String(this.randomInt(big ? 4 : leadingMin, 9));
			}
			for (let i = 0; i < decimals; i++) {
				const lastFractionDigit = i === decimals - 1;
				digits += String(this.randomInt(lastFractionDigit ? 1 : 0, 9));
			}
			return digits;
		}

		scaledDigits(digits, decimals, scale) {
			return digits + "0".repeat(scale - decimals);
		}

		columnSums(firstDigits, firstDecimals, secondDigits, secondDecimals) {
			const scale = Math.max(firstDecimals, secondDecimals);
			const a = this.scaledDigits(firstDigits, firstDecimals, scale);
			const b = this.scaledDigits(secondDigits, secondDecimals, scale);
			const length = Math.max(a.length, b.length);
			const sums = [];
			for (let i = 0; i < length; i++) {
				const aDigit = i < a.length ? Number(a[a.length - 1 - i]) : 0;
				const bDigit = i < b.length ? Number(b[b.length - 1 - i]) : 0;
				sums.push(aDigit + bDigit);
			}
			return sums;
		}

		getLevelConfig(level) {
			const table = [
				{ iMin: 2, iMax: 2, jMin: 1, jMax: 1, noCarry: true },
				{ iMin: 2, iMax: 2, jMin: 1, jMax: 1, hasCarry: true },
				{ iMin: 2, iMax: 2, jMin: 2, jMax: 2, noCarry: true },
				{ iMin: 2, iMax: 2, jMin: 2, jMax: 2, hasCarry: true },
				{ iMin: 3, iMax: 3, jMin: 2, jMax: 2 },
				{ iMin: 3, iMax: 3, jMin: 3, jMax: 3 },
				{ iMin: 3, iMax: 3, jMin: 3, jMax: 3, bigDigits: true },
				{ iMin: 4, iMax: 4, jMin: 3, jMax: 3 },
				{ iMin: 4, iMax: 4, jMin: 4, jMax: 4 },
				{ iMin: 5, iMax: 5, jMin: 4, jMax: 4, bigDigits: true },
				{ iMin: 2, iMax: 3, jMin: 2, jMax: 3, k1: 1, k2: 1 },
				{ iMin: 2, iMax: 3, jMin: 2, jMax: 3, k1: 1 },
				{ iMin: 2, iMax: 3, jMin: 2, jMax: 3, k1: 1, k2: 2 },
				{ iMin: 2, iMax: 3, jMin: 2, jMax: 3, k1: 2, k2: 1 },
				{ iMin: 2, iMax: 3, jMin: 2, jMax: 3, k1: 2, k2: 2 },
				{ iMin: 3, iMax: 3, jMin: 3, jMax: 3, k1: 1, k2: 2 },
				{ iMin: 3, iMax: 4, jMin: 3, jMax: 3, k1: 2, k2: 2 },
				{ iMin: 4, iMax: 4, jMin: 3, jMax: 4, k1: 2, k2: 1 },
				{ iMin: 4, iMax: 4, jMin: 4, jMax: 4, k1: 2, k2: 2 },
				{ iMin: 4, iMax: 5, jMin: 4, jMax: 4, k1: 2, k2: 2, bigDigits: true },
			];
			const index = Math.min(Math.max(level, 1), table.length) - 1;
			return table[index];
		}

		createProblem(level) {
			const cfg = this.getLevelConfig(level);
			const k1 = cfg.k1 || 0;
			const k2 = cfg.k2 || 0;

			for (let attempt = 0; attempt < 600; attempt++) {
				const firstIntegerDigits = this.randomInt(cfg.iMin, cfg.iMax);
				const secondIntegerDigits = this.randomInt(cfg.jMin, cfg.jMax);
				const firstDigits = this.randomNumberString(
					firstIntegerDigits,
					k1,
					cfg.bigDigits,
				);
				const secondDigits = this.randomNumberString(
					secondIntegerDigits,
					k2,
					cfg.bigDigits,
				);

				const scale = Math.max(k1, k2);
				const sum =
					Number(this.scaledDigits(firstDigits, k1, scale)) +
					Number(this.scaledDigits(secondDigits, k2, scale));
				if (String(sum).length > this.config.maxResultDigits) continue;

				const sums = this.columnSums(firstDigits, k1, secondDigits, k2);
				const hasCarry = sums.some((value) => value >= 10);
				if (cfg.noCarry && hasCarry) continue;
				if (cfg.hasCarry && !hasCarry) continue;

				// Keep the notebook grid inside the column budget, otherwise the
				// cells get too small to read on a phone.
				if (
					this.geometry(firstDigits, k1, secondDigits, k2).numCols >
					this.config.maxGridColumns
				)
					continue;

				return {
					firstDigits,
					firstDecimals: k1,
					secondDigits,
					secondDecimals: k2,
				};
			}

			return {
				firstDigits: "12",
				firstDecimals: 0,
				secondDigits: "8",
				secondDecimals: 0,
			};
		}

		startNewRound() {
			BrainWarsColumnGame.startNewRound(this.ctx());
		}

		beginRound(problem, isCustomRound) {
			this.elements.completionOverlay.classList.remove("show");
			this.state.isCustomRound = !!isCustomRound;
			this.state.hadErrorThisRound = false;
			this.state.currentInput = "";
			this.state.firstDigits = problem.firstDigits;
			this.state.firstDecimals = problem.firstDecimals;
			this.state.secondDigits = problem.secondDigits;
			this.state.secondDecimals = problem.secondDecimals;

			this.renderLevelBadge();
			this.computeGeometry();
			this.computePlan();
			this.buildGrid();
			this.renderCommas();

			this.state.stepIndex = 0;
			this.promptCurrentStep();
		}

		// The three games add, subtract and multiply; the page says which.
		combine(a, b) {
			const x = Number(a);
			const y = Number(b);
			if (this.options.operator === "−") return x - y;
			if (this.options.operator === "×") return x * y;
			return x + y;
		}

		// Addition and multiplication leave carry badges, subtraction borrow marks.
		clearMarks() {
			this.clearCarryBadges();
		}

		geometry(firstDigits, firstDecimals, secondDigits, secondDecimals) {
			const scale = Math.max(firstDecimals, secondDecimals);
			const firstScaled = this.scaledDigits(firstDigits, firstDecimals, scale);
			const secondScaled = this.scaledDigits(
				secondDigits,
				secondDecimals,
				scale,
			);
			const resultDigits = String(this.combine(firstScaled, secondScaled));
			const integerColumns = Math.max(
				firstScaled.length - scale,
				secondScaled.length - scale,
				resultDigits.length - scale,
			);

			// Column 0 is the single sign/carry gutter: the operands start there.
			return {
				scale,
				resultDigits,
				baseCol: integerColumns,
				numCols: integerColumns + 1 + scale,
			};
		}

		computeGeometry() {
			const s = this.state;
			const geometry = this.geometry(
				s.firstDigits,
				s.firstDecimals,
				s.secondDigits,
				s.secondDecimals,
			);

			s.resultDecimals = geometry.scale;
			s.resultDigits = geometry.resultDigits;
			s.baseCol = geometry.baseCol;
			s.numCols = geometry.numCols;
			// Operands on rows 0-1 and the result right below the line on row 2.
			s.numRows = 3;
			s.resultRow = 2;
		}

		computePlan() {
			const s = this.state;
			const scale = s.resultDecimals;
			const a = this.scaledDigits(s.firstDigits, s.firstDecimals, scale);
			const b = this.scaledDigits(s.secondDigits, s.secondDecimals, scale);
			const steps = [];
			let carry = 0;

			for (let c = 0; c < s.resultDigits.length; c++) {
				const col = s.baseCol - c + scale;
				const addends = [];
				if (c < a.length) addends.push(Number(a[a.length - 1 - c]));
				if (c < b.length) addends.push(Number(b[b.length - 1 - c]));
				const carryBefore = carry;

				if (addends.length === 0) {
					// Only the carry is left
					steps.push({
						type: "CARRY",
						expected: carryBefore,
						writeDigit: carryBefore,
						row: s.resultRow,
						col,
						badge: null,
						carryAfter: 0,
					});
					carry = 0;
				} else {
					const value =
						addends.reduce((sum, digit) => sum + digit, 0) + carryBefore;
					const writeDigit = value % 10;
					carry = Math.floor(value / 10);
					steps.push({
						type: "ADD",
						addends,
						carryBefore,
						expected: value,
						writeDigit,
						row: s.resultRow,
						col,
						badge: carry > 0 ? { row: 0, col: col - 1 } : null,
						carryAfter: carry,
					});
				}
			}

			s.steps = steps;
		}

		buildGrid() {
			const s = this.state;
			const scale = s.resultDecimals;
			const firstLength = s.firstDigits.length;
			const secondLength = s.secondDigits.length;
			const firstIntegerColumns = firstLength - s.firstDecimals;
			const secondIntegerColumns = secondLength - s.secondDecimals;

			const matrix = [];
			for (let r = 0; r < s.numRows; r++) {
				const row = [];
				for (let c = 0; c < s.numCols; c++) {
					row.push({ char: "", classes: [] });
				}
				matrix.push(row);
			}

			// Operands, placed by place value so the decimal points align
			for (let i = 0; i < firstLength; i++) {
				matrix[0][s.baseCol - i + s.firstDecimals].char =
					s.firstDigits[firstLength - 1 - i];
			}
			for (let i = 0; i < secondLength; i++) {
				matrix[1][s.baseCol - i + s.secondDecimals].char =
					s.secondDigits[secondLength - 1 - i];
			}
			matrix[1][s.baseCol - secondIntegerColumns].char = this.options.operator;
			matrix[1][s.baseCol - secondIntegerColumns].classes.push("operator-sign");

			// Line under the operands
			const leftmost =
				s.baseCol - Math.max(firstIntegerColumns, secondIntegerColumns) + 1;
			for (let c = leftmost; c <= s.baseCol + scale; c++) {
				matrix[1][c].classes.push("subtraction-line");
			}

			s.gridMatrix = matrix;
			this.renderGridDOM();
		}

		renderGridDOM() {
			BrainWarsColumnGame.renderGridDOM(this.ctx());
		}

		applyCellSize() {
			BrainWarsColumnGame.applyCellSize(this.elements, this.state);
		}

		renderCommas() {
			const layer = this.elements.commaLayer;
			layer.innerHTML = "";

			const grid = this.elements.mathGrid;
			const gridRect = grid.getBoundingClientRect();
			const separator = I18n.t("decimal_separator");

			const place = (row, decimals) => {
				if (!decimals) return;
				const cell = document.getElementById(
					`cell-${row}-${this.state.baseCol}`,
				);
				if (!cell) return;
				const rect = cell.getBoundingClientRect();
				const span = document.createElement("span");
				span.className = "comma-overlay";
				span.textContent = separator;
				span.style.left = `${rect.left - gridRect.left}px`;
				span.style.top = `${rect.top - gridRect.top}px`;
				span.style.height = `${rect.height}px`;
				layer.appendChild(span);
			};

			place(0, this.state.firstDecimals);
			place(1, this.state.secondDecimals);
			place(this.state.resultRow, this.state.resultDecimals);
		}

		promptCurrentStep() {
			// Steps with nothing to compute are filled in automatically
			const step = this.state.steps[this.state.stepIndex];
			if (!step) {
				this.finishRound();
				return;
			}

			this.state.currentInput = "";
			this.state.expectedAnswer = String(step.expected);
			this.elements.instructionHint.classList.remove("is-error");
			this.syncActiveCell();

			if (step.type === "ADD") {
				const carry = step.carryBefore > 0 ? ` + ${step.carryBefore}` : "";
				const expression = step.addends.join(" + ") + carry;
				this.elements.instructionHint.textContent = I18n.t("la_add_hint", {
					expr: expression,
				});
			} else {
				this.elements.instructionHint.textContent = I18n.t("la_carry_hint", {
					carry: step.expected,
				});
			}
		}

		writeStep(step) {
			this.setCellValue(step.row, step.col, String(step.writeDigit), [
				"correct-flash",
			]);
			this.clearCarryBadges();
			if (step.badge) {
				this.setCarryBadge(step.badge.row, step.badge.col, step.carryAfter);
			}
		}

		syncActiveCell() {
			BrainWarsColumnGame.syncActiveCell(this.ctx());
		}

		scrollCellIntoView(cell) {
			BrainWarsColumnGame.scrollCellIntoView(cell, this.elements);
		}

		handleKeyPress(key) {
			BrainWarsColumnGame.handleKeyPress(key, this.ctx());
		}

		renderTypingPreview() {
			BrainWarsColumnGame.renderTypingPreview(this.state);
		}

		submitCurrentInput() {
			BrainWarsColumnGame.submitCurrentInput(this.ctx());
		}

		handleCorrectInput() {
			const step = this.state.steps[this.state.stepIndex];

			this.writeStep(step);
			this.state.stepIndex++;
			this.promptCurrentStep();
		}

		handleWrongInput() {
			this.state.hadErrorThisRound = true;

			this.state.activeTargetCells.forEach(({ r, c }) => {
				const cell = document.getElementById(`cell-${r}-${c}`);
				if (!cell) return;
				cell.classList.add("error-shake");
				setTimeout(() => cell.classList.remove("error-shake"), 600);
			});

			this.elements.instructionHint.classList.add("is-error");
			this.elements.instructionHint.textContent = I18n.t(
				this.options.keys.wrongHint,
			);

			setTimeout(() => {
				this.elements.instructionHint.classList.remove("is-error");
			}, 1200);

			this.state.currentInput = "";
			this.renderTypingPreview();
		}

		setCellValue(r, c, char, additionalClasses = []) {
			BrainWarsColumnGame.setCellValue(
				r,
				c,
				char,
				this.state,
				additionalClasses,
			);
		}

		setCarryBadge(r, c, value) {
			const cell = document.getElementById(`cell-${r}-${c}`);
			if (!cell) return;
			const badge = document.createElement("span");
			badge.className = "carry-badge";
			badge.textContent = `+${value}`;
			cell.appendChild(badge);
		}

		clearCarryBadges() {
			document.querySelectorAll(".carry-badge").forEach((badge) => {
				badge.remove();
			});
		}

		paint(cls, collect) {
			BrainWarsColumnGame.paint(cls, collect);
		}

		addendCells() {
			const cells = [];
			[this.state.firstDigits, this.state.secondDigits].forEach(
				(digits, row) => {
					const decimals =
						row === 0 ? this.state.firstDecimals : this.state.secondDecimals;
					for (let i = 0; i < digits.length; i++) {
						cells.push(
							document.getElementById(
								`cell-${row}-${this.state.baseCol - i + decimals}`,
							),
						);
					}
				},
			);
			return cells.filter(Boolean);
		}

		sumCells() {
			const cells = [];
			for (let c = 0; c < this.state.resultDigits.length; c++) {
				const cell = document.getElementById(
					`cell-${this.state.resultRow}-${this.state.baseCol - c + this.state.resultDecimals}`,
				);
				if (cell?.textContent) cells.push(cell);
			}
			return cells;
		}

		carryCells() {
			const badge = document.querySelector(".carry-badge");
			const step =
				this.state.steps[
					Math.min(this.state.stepIndex, this.state.steps.length - 1)
				];
			let target = null;
			if (badge) target = badge.parentElement;
			else if (step) target = document.getElementById(`cell-0-${step.col - 1}`);
			return target ? [target] : [];
		}

		highlightTerm(term) {
			if (term === "addend")
				return this.paint("term-highlight-blue", () => this.addendCells());
			if (term === "sum")
				return this.paint("term-highlight-green", () => this.sumCells());
			if (term === "carry")
				return this.paint("term-highlight-purple", () => this.carryCells());
		}

		formatNumberText(digits, decimals) {
			return BrainWarsColumnGame.formatNumberText(digits, decimals);
		}

		renderCompletionEquation() {
			this.elements.completionEquation.textContent =
				`${this.formatNumberText(this.state.firstDigits, this.state.firstDecimals)}` +
				` + ${this.formatNumberText(this.state.secondDigits, this.state.secondDecimals)}` +
				` = ${this.formatNumberText(this.state.resultDigits, this.state.resultDecimals)}`;
		}

		finishRound() {
			this.state.activeTargetCells = [];
			this.clearMarks();

			// Custom equations don't affect the level progression
			if (!this.state.isCustomRound) {
				if (this.state.hadErrorThisRound) {
					this.state.level = Math.max(1, this.state.level - 1);
				} else {
					this.state.level = Math.min(
						this.config.maxLevel,
						this.state.level + 1,
					);
				}
			}

			this.renderCompletionEquation();

			setTimeout(() => {
				this.elements.completionOverlay.classList.add("show");
			}, 400);
		}

		renderLevelBadge() {
			BrainWarsColumnGame.renderLevelBadge(this.elements, this.state);
		}

		renderLevelMenu() {
			BrainWarsColumnGame.renderLevelMenu(
				this.elements,
				this.state,
				this.config,
			);
		}

		toggleLevelMenu(open) {
			BrainWarsColumnGame.toggleLevelMenu(open, this.ctx());
		}

		positionLevelMenu() {
			BrainWarsColumnGame.positionLevelMenu(this.elements);
		}

		selectLevel(level) {
			BrainWarsColumnGame.selectLevel(level, this.ctx());
		}

		toggleCustomModal(open) {
			this.elements.customModal.classList.toggle("open", open);
			this.elements.customError.textContent = "";
			if (open) {
				this.elements.customFactor1.value = this.formatNumberText(
					this.state.firstDigits,
					this.state.firstDecimals,
				);
				this.elements.customFactor2.value = this.formatNumberText(
					this.state.secondDigits,
					this.state.secondDecimals,
				);
				this.elements.customFactor1.focus();
				this.elements.customFactor1.select();
			}
		}

		showCustomError(key) {
			BrainWarsColumnGame.showCustomError(key, this.elements);
		}

		parseNumberInput(raw) {
			// Accept generous input here: the result and column budgets below
			// decide what can be shown, and they report their own "too big" message.
			const match = String(raw)
				.trim()
				.replace(/\s+/g, "")
				.match(/^(\d{1,12})(?:[.,](\d{1,2}))?$/);
			if (!match || Number(match[1]) < 1) return null;
			let fraction = match[2] || "";
			while (fraction.endsWith("0")) fraction = fraction.slice(0, -1);
			return { digits: match[1] + fraction, decimals: fraction.length };
		}

		submitCustomProblem() {
			const first = this.parseNumberInput(this.elements.customFactor1.value);
			const second = this.parseNumberInput(this.elements.customFactor2.value);
			if (!first || !second) {
				this.showCustomError("la_custom_err_addend");
				return;
			}

			const scale = Math.max(first.decimals, second.decimals);
			const sum =
				Number(this.scaledDigits(first.digits, first.decimals, scale)) +
				Number(this.scaledDigits(second.digits, second.decimals, scale));
			if (String(sum).length > this.config.maxResultDigits) {
				this.showCustomError("la_custom_err_too_big");
				return;
			}

			// Same column budget as the generated levels: a longer example would
			// shrink the grid cells until the digits are unreadable.
			if (
				this.geometry(
					first.digits,
					first.decimals,
					second.digits,
					second.decimals,
				).numCols > this.config.maxGridColumns
			) {
				this.showCustomError("la_custom_err_too_big");
				return;
			}

			this.toggleCustomModal(false);
			this.beginRound(
				{
					firstDigits: first.digits,
					firstDecimals: first.decimals,
					secondDigits: second.digits,
					secondDecimals: second.decimals,
				},
				true,
			);
		}

		hasBorrow(firstDigits, firstDecimals, secondDigits, secondDecimals) {
			const scale = Math.max(firstDecimals, secondDecimals);
			const a = this.scaledDigits(firstDigits, firstDecimals, scale);
			const b = this.scaledDigits(secondDigits, secondDecimals, scale);
			const length = Math.max(a.length, b.length);
			let borrow = 0;
			let any = false;

			for (let i = 0; i < length; i++) {
				const aDigit = i < a.length ? Number(a[a.length - 1 - i]) : 0;
				const bDigit = i < b.length ? Number(b[b.length - 1 - i]) : 0;
				if (aDigit - borrow < bDigit) {
					borrow = 1;
					any = true;
				} else {
					borrow = 0;
				}
			}
			return any;
		}

		hasInnerZero(digits, decimals) {
			const integerDigits = digits.slice(0, digits.length - decimals);
			return integerDigits.slice(1).includes("0");
		}

		setBorrowMark(r, c) {
			const cell = document.getElementById(`cell-${r}-${c}`);
			if (!cell) return;
			const mark = document.createElement("span");
			mark.className = "borrow-mark";
			mark.textContent = "−1";
			cell.appendChild(mark);
		}

		clearBorrowMarks() {
			document.querySelectorAll(".borrow-mark").forEach((mark) => {
				mark.remove();
			});
		}

		digitCells(row, digits, decimals) {
			const cells = [];
			for (let i = 0; i < digits.length; i++) {
				cells.push(
					document.getElementById(
						`cell-${row}-${this.state.baseCol - i + decimals}`,
					),
				);
			}
			return cells.filter(Boolean);
		}

		differenceCells() {
			const state = this.state;
			return this.digitCells(
				state.resultRow,
				state.resultDigits,
				state.resultDecimals,
			).filter((cell) => cell.textContent);
		}

		borrowCells() {
			const mark = document.querySelector(".borrow-mark");
			const step =
				this.state.steps[
					Math.min(this.state.stepIndex, this.state.steps.length - 1)
				];
			let target = null;
			if (mark) target = mark.parentElement;
			else if (step) target = document.getElementById(`cell-0-${step.col - 1}`);
			return target ? [target] : [];
		}

		randomDigits(length, big) {
			let digits = "";
			for (let i = 0; i < length; i++) {
				const leadingMin = i === 0 ? 1 : 0;
				const min = big ? 4 : leadingMin;
				digits += String(this.randomInt(min, 9));
			}
			return digits;
		}

		hasCarry(multiplicand, multiplier) {
			for (let j = 0; j < multiplier.length; j++) {
				const b = Number(multiplier[multiplier.length - 1 - j]);
				for (let i = 0; i < multiplicand.length; i++) {
					const a = Number(multiplicand[multiplicand.length - 1 - i]);
					if (a * b >= 10) return true;
				}
			}
			return false;
		}

		partialCells() {
			const step =
				this.state.steps[
					Math.min(this.state.stepIndex, this.state.steps.length - 1)
				];
			if (!step) return [];
			const singleDigitMultiplier = this.state.multiplierDigits.length === 1;
			let partialRow = this.state.resultRow - 1;
			if (singleDigitMultiplier) partialRow = this.state.resultRow;
			else if (step.row < this.state.resultRow) partialRow = step.row;
			const cells = [];
			for (let c = 0; c < this.state.numCols; c++) {
				const cell = document.getElementById(`cell-${partialRow}-${c}`);
				if (cell?.textContent) cells.push(cell);
			}
			return cells;
		}
	}

	global.BrainWarsColumnGame = {
		ColumnGame,
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

	if (typeof module !== "undefined" && module.exports) {
		module.exports = global.BrainWarsColumnGame;
	}
})(typeof window !== "undefined" ? window : globalThis);
