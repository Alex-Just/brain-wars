/**
 * The memory game behind "Follow the Leader" and "Unfollow the Leader".
 *
 * The two pages are the same game: squares light up in an order and the player
 * taps them back. They differ in one rule and in their wording, so both are
 * passed in:
 *
 *   reversed  taps must arrive in the reverse of the shown order
 *   keys      the i18n keys for this page (ftl_* or uftl_*)
 *
 * The page keeps its own markup, its own colours and its own key names; this
 * file holds the behaviour. Browser: window.BrainWarsMemoryGame.
 */
((global) => {
  'use strict';

  class MemoryGame {
    constructor(options = {}) {
      this.reversed = Boolean(options.reversed);
      this.keys = options.keys || {};

      // Game constants
      this.INITIAL_SQUARES = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--initial-squares'), 10);
      this.SQUARES_INCREMENT_LEVEL = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--squares-increment-level'), 10);
      this.INITIAL_SPEED = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--initial-speed'), 10);
      this.MIN_SPEED = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--min-speed'), 10);
      this.SPEED_DECREASE = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--speed-decrease'), 10);
      this.MAX_ERRORS = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--max-errors'), 10);
      this.PARTICLE_COUNT = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--particle-count'), 10);

      // Initialize game
      this.initializeGame();
    }

    initializeGame() {
      // Move initialization logic here
      this.squares = document.querySelectorAll('.square');
      this.messageEl = document.getElementById('message');
      this.levelDisplayEl = document.getElementById('levelDisplay');

      this.squares.forEach((square, index) => {
        square.setAttribute('aria-label', I18n.t(this.keys.squareAria, { n: index + 1 }));
        square.tabIndex = -1;
      });

      this.sequence = [];
      this.playerSequence = [];
      this.level = 0;
      this.isPlayerTurn = false;
      this.speed = this.INITIAL_SPEED;
      this.consecutiveErrors = 0;
      this.messageKey = this.keys.remember;
      this.messageParams = null;

      this.bindEventListeners();

      I18n.subscribe(() => {
        this.setMessage(this.messageKey, this.messageParams);
        this.levelDisplayEl.textContent = I18n.t('level_label', { n: Math.max(1, this.level) });
        this.squares.forEach((square, index) => {
          square.setAttribute('aria-label', I18n.t(this.keys.squareAria, { n: index + 1 }));
        });
      });
    }

    bindEventListeners() {
      this.squares.forEach(square => {
          // Remove click listener
          square.removeEventListener('click', this.handleSquareClick);

          // Add touch listener with passive true
          square.addEventListener('touchstart', (e) => {
              // Prevent scrolling by touching coordinates
              if (e.cancelable) {
                  e.preventDefault();
              }
              this.handleSquareClick(e);
          });

          square.addEventListener('mousedown', (e) => {
              e.preventDefault();
              this.handleSquareClick(e);
          });

          square.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.handleSquareClick(e);
              }
          });
      });

      // Start the game directly after initializing listeners
      this.startGameDirectly();
    }

    setMessage(key, params = null) {
      this.messageKey = key;
      this.messageParams = params;
      this.messageEl.textContent = I18n.t(key, params);
    }

    // Update game logic to use constants
    calculateTotalSquares(level) {
      return this.INITIAL_SQUARES + Math.floor((level - 1) / this.SQUARES_INCREMENT_LEVEL);
    }
    resetGame() {
      this.sequence = [];
      this.playerSequence = [];
      this.level = 0;
      this.speed = this.INITIAL_SPEED;
      this.isPlayerTurn = false;
      this.consecutiveErrors = 0;
      this.squares.forEach(square => {
        square.classList.remove('sequence', 'ready');
        square.tabIndex = -1;
      });
      this.levelDisplayEl.textContent = I18n.t('level_label', { n: 1 });
    }

    // Add new helper method for better randomization
    getRandomSquare() {
      // Get all available squares (those not in current sequence)
      const availableSquares = Array.from(Array(9).keys())
        .filter(i => !this.sequence.includes(i));

      // If no squares available, return null (shouldn't happen)
      if (availableSquares.length === 0) return null;

      // Get random index from available squares
      const randomIndex = Math.floor(BrainWarsGames.random() * availableSquares.length);
      return availableSquares[randomIndex];
    }

    // The square the player must tap next. This is the one rule that separates
    // the two games: Follow the Leader takes the shown order, Unfollow the
    // Leader takes it from the end.
    expectedSquare() {
      const taken = this.playerSequence.length;
      return this.reversed
        ? this.sequence[this.sequence.length - 1 - taken]
        : this.sequence[taken];
    }

    // Update startGame method
    async startGameDirectly() {
      const startLevel = Math.max(1, BrainWarsChallenge.startLevel());

      this.resetGame();
      this.setMessage(this.keys.remember);

      const totalSquares = this.calculateTotalSquares(startLevel);
      while (this.sequence.length < totalSquares) {
        const randomIndex = this.getRandomSquare();
        if (randomIndex !== null) {
          this.sequence.push(randomIndex);
        }
      }
      this.level = startLevel;
      this.speed = this.speedForLevel(startLevel);
      this.levelDisplayEl.textContent = I18n.t('level_label', { n: startLevel });
      await this.playSequence();
    }

    // A level that adds a square starts fresh; otherwise the sequence speeds up
    speedForLevel(level) {
      const grew = this.calculateTotalSquares(level - 1) > this.calculateTotalSquares(level - 2);
      if (grew) return this.INITIAL_SPEED;
      const increase = this.SPEED_DECREASE + Math.floor(level / 10) * 5;
      return Math.max(this.MIN_SPEED, this.INITIAL_SPEED - (level - 1) * increase);
    }

    // Update nextLevel method
    async nextLevel() {
      this.level++;
      this.levelDisplayEl.textContent = I18n.t('level_label', { n: this.level });
      this.speed = this.speedForLevel(this.level);
      this.setMessage(this.keys.rememberNext, { n: this.level });
      this.playerSequence = [];

      // Generate completely new sequence
      const totalSquares = this.calculateTotalSquares(this.level);
      this.sequence = []; // Clear existing sequence

      // Fill with new random squares
      while (this.sequence.length < totalSquares) {
        // Get all unused squares
        const availableSquares = Array.from(Array(9).keys())
          .filter(i => !this.sequence.includes(i));

        // Pick random square from available ones
        const randomIndex = Math.floor(BrainWarsGames.random() * availableSquares.length);
        this.sequence.push(availableSquares[randomIndex]);
      }

      // Shuffle the sequence for extra randomness
      this.sequence = this.sequence
        .sort(() => BrainWarsGames.random() - 0.5);

      await this.playSequence();
    }

    async playSequence() {
      this.isPlayerTurn = false;

      // Use Promise-based delay for better async handling
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      // Show sequence
      for (const squareIndex of this.sequence) {
        this.squares[squareIndex].classList.add('sequence');
        await delay(this.speed);
      }

      // Remove gray color and make squares ready immediately
      this.sequence.forEach(squareIndex => {
        this.squares[squareIndex].classList.remove('sequence');
        this.squares[squareIndex].classList.add('ready');
        this.squares[squareIndex].tabIndex = 0;
      });

      this.setMessage(this.keys.yourTurn);
      this.isPlayerTurn = true;
    }

    async handleSquareClick(event) {
      if (!this.isPlayerTurn) return;

      const square = event.currentTarget;
      const index = parseInt(square.dataset.index, 10);

      // Ignore if square is not part of sequence or already tapped
      if (!square.classList.contains('ready')) return;

      // Ignore if this square was just tapped (prevent double-tap)
      if (square.classList.contains('tapped')) return;

      if (this.playerSequence.length >= this.sequence.length ||
          index !== this.expectedSquare()) {
        await this.handleWrongMove(square);
          return;
        }

      await this.handleCorrectMove(square);
    }

    async handleWrongMove(square) {
      this.isPlayerTurn = false;
      this.consecutiveErrors++;
      this.setMessage(this.keys.tryAgain);

      square.classList.add('wrong');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Only animate squares that were part of the sequence
      this.sequence.forEach(squareIndex => {
        const otherSquare = this.squares[squareIndex];
        if (otherSquare !== square) {
          otherSquare.classList.add('tapped');
        }
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      // Clean up all squares
      this.squares.forEach(square => {
        square.classList.remove('wrong', 'tapped', 'ready');
        square.tabIndex = -1;
      });

      // Check if we need to go back a level
      if (this.consecutiveErrors >= this.MAX_ERRORS) {
        this.consecutiveErrors = 0;
        if (this.level > 1) {
          this.level--;
          this.levelDisplayEl.textContent = I18n.t('level_label', { n: this.level });
        }
      }

      // Generate new random sequence for current level
      const totalSquares = this.calculateTotalSquares(this.level);
      this.sequence = []; // Clear existing sequence

      // Fill with new random squares
      while (this.sequence.length < totalSquares) {
        const availableSquares = Array.from(Array(9).keys())
          .filter(i => !this.sequence.includes(i));
        const randomIndex = Math.floor(BrainWarsGames.random() * availableSquares.length);
        this.sequence.push(availableSquares[randomIndex]);
      }

      // Shuffle the sequence for extra randomness
      this.sequence = this.sequence.sort(() => BrainWarsGames.random() - 0.5);

      this.playerSequence = [];
      this.setMessage(this.keys.remember);
      await this.playSequence();
    }

    async handleCorrectMove(square) {
      // Reset consecutive errors on correct move
      this.consecutiveErrors = 0;

      square.classList.add('tapped');
      square.tabIndex = -1;
      setTimeout(() => {
        square.classList.remove('tapped', 'ready');
      }, 300);

      this.playerSequence.push(parseInt(square.dataset.index, 10));

      if (this.playerSequence.length === this.sequence.length) {
        this.isPlayerTurn = false;
        this.setMessage(this.keys.greatJob);

        // Get the position of the last tapped square for the particle effect
        const rect = square.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Create celebration particles
        await this.createParticles(x, y);

        this.squares.forEach(s => {
          if (s !== square) {
            s.classList.remove('ready');
            s.tabIndex = -1;
          }
        });

        // Add a slight delay to appreciate the animation
        setTimeout(() => this.nextLevel(), 1000);
      }
    }

    async createParticles(x, y) {
      const colors = [
        getComputedStyle(document.documentElement).getPropertyValue('--color-success'),
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
        '#FFC107', // Keep some colors for variety
        '#9C27B0',
        '#FF5722'
      ];

      for (let i = 0; i < this.PARTICLE_COUNT; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position around the center
        const angle = (i / this.PARTICLE_COUNT) * 360;
        const distance = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--particle-distance'), 10) +
          BrainWarsGames.random() * parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--particle-distance-random'), 10);

        const tx = Math.cos(angle * Math.PI / 180) * distance;
        const ty = Math.sin(angle * Math.PI / 180) * distance;

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.backgroundColor = colors[Math.floor(BrainWarsGames.random() * colors.length)];

        document.body.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => particle.remove(), parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue('--animation-speed-slow')) * 1000);
      }
    }
  }

  global.BrainWarsMemoryGame = MemoryGame;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.BrainWarsMemoryGame;
  }
})(typeof window !== 'undefined' ? window : globalThis);
