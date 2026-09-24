/**
 * Brain Wars game registry: the single list of games, used by the hub grid and by
 * challenge mode, so a new game only has to be added here.
 *
 * Browser: window.BrainWarsGames. Node (tests): module.exports.
 *
 * level      'picker'  the page has a level badge and menu; the challenge sets the level there
 *            'startup' the page reads BrainWarsChallenge.startLevel() while starting its round
 * completion / mistake  DOM signals the challenge can watch from outside the game:
 *            { kind: 'class', selector, value }             element gains the class
 *            { kind: 'style', selector, property, value }   inline style equals the value
 *            { kind: 'text',  selector, key }               text equals I18n.t(key)
 */
(function (global) {
    'use strict';

    const games = [
        {
            id: 'follow-the-leader',
            file: 'follow-the-leader.html',
            titleKey: 'game_follow',
            level: 'startup',
            highlight: true,
            completion: { kind: 'text', selector: '#message', key: 'ftl_great_job' },
            mistake: { kind: 'text', selector: '#message', key: 'ftl_try_again' },
            icon: `
                <div class="follow-leader-icon">
                    <div class="square"></div>
                    <div class="square active"></div>
                    <div class="square active"></div>
                    <div class="square active"></div>
                </div>
            `
        },
        {
            id: 'operations',
            file: 'operations.html',
            titleKey: 'game_operations',
            level: 'startup',
            completion: { kind: 'class', selector: '#operators', value: 'hidden' },
            mistake: { kind: 'class', selector: '.operator', value: 'wrong' },
            icon: `
                <div class="operations-icon">
                    <div class="operator">+</div>
                    <div class="operator">−</div>
                    <div class="operator multiply">×</div>
                    <div class="operator">÷</div>
                </div>
            `
        },
        {
            id: 'telling-time',
            file: 'telling-time-es.html',
            titleKey: 'game_time',
            level: 'startup',
            completion: { kind: 'style', selector: '#instructions', property: 'display', value: 'block' },
            mistake: { kind: 'class', selector: '.choice-button', value: 'wrong' },
            icon: `
                <!-- Simple Clock Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%; fill: none; stroke: #60ACBD; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round;">
                    <circle cx="50" cy="50" r="45"/>
                    <path d="M50 25 V50 L75 65"/> <!-- Clock hands pointing roughly to 3:00 -->
                </svg>
            `
        },
        {
            id: 'long-division',
            file: 'long-division.html',
            titleKey: 'game_division',
            level: 'picker',
            completion: { kind: 'class', selector: '#completionOverlay', value: 'show' },
            mistake: { kind: 'class', selector: '#instructionHint', value: 'is-error' },
            icon: `
                <!-- Russian Long Division Bracket Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%;">
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="100" height="100" rx="14" fill="#F8FAFC"/>
                    <rect width="100" height="100" rx="14" fill="url(#grid)"/>
                
                    <!-- Arc over incomplete dividend 12 -->
                    <path d="M 18 30 Q 32 18 46 30" fill="none" stroke="#7B61FF" stroke-width="3.5" stroke-linecap="round"/>
                
                    <!-- Dividend 12 -->
                    <text x="18" y="52" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#334155">12</text>
                
                    <!-- Russian Division Corner Bracket: Vertical & Horizontal -->
                    <path d="M 54 24 L 54 80 M 54 48 L 88 48" fill="none" stroke="#60ACBD" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
                
                    <!-- Divisor 2 -->
                    <text x="64" y="42" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#60ACBD">2</text>
                
                    <!-- Quotient 6 -->
                    <text x="64" y="74" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#4CAF50">6</text>
                </svg>
            `
        },
        {
            id: 'long-multiplication',
            file: 'long-multiplication.html',
            titleKey: 'game_multiplication',
            level: 'picker',
            completion: { kind: 'class', selector: '#completionOverlay', value: 'show' },
            mistake: { kind: 'class', selector: '#instructionHint', value: 'is-error' },
            icon: `
                <!-- Column Multiplication Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%;">
                    <defs>
                        <pattern id="grid-mult" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="100" height="100" rx="14" fill="#F8FAFC"/>
                    <rect width="100" height="100" rx="14" fill="url(#grid-mult)"/>
                
                    <!-- Multiplicand 24 -->
                    <text x="30" y="34" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#334155">24</text>
                
                    <!-- Multiplier × 3 -->
                    <text x="14" y="63" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#60ACBD">× 3</text>
                
                    <!-- Line -->
                    <path d="M 14 70 L 68 70" fill="none" stroke="#60ACBD" stroke-width="4" stroke-linecap="round"/>
                
                    <!-- Product 72 -->
                    <text x="30" y="93" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#4CAF50">72</text>
                </svg>
            `
        },
        {
            id: 'long-addition',
            file: 'long-addition.html',
            titleKey: 'game_addition',
            level: 'picker',
            completion: { kind: 'class', selector: '#completionOverlay', value: 'show' },
            mistake: { kind: 'class', selector: '#instructionHint', value: 'is-error' },
            icon: `
                <!-- Column Addition Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%;">
                    <defs>
                        <pattern id="grid-add" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="100" height="100" rx="14" fill="#F8FAFC"/>
                    <rect width="100" height="100" rx="14" fill="url(#grid-add)"/>
                
                    <!-- First addend 47 -->
                    <text x="34" y="34" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#334155">47</text>
                
                    <!-- Second addend + 25 -->
                    <text x="14" y="62" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#60ACBD">+ 25</text>
                
                    <!-- Line -->
                    <path d="M 14 70 L 68 70" fill="none" stroke="#60ACBD" stroke-width="4" stroke-linecap="round"/>
                
                    <!-- Sum 72 -->
                    <text x="34" y="93" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#4CAF50">72</text>
                </svg>
            `
        },
        {
            id: 'long-subtraction',
            file: 'long-subtraction.html',
            titleKey: 'game_subtraction',
            level: 'picker',
            completion: { kind: 'class', selector: '#completionOverlay', value: 'show' },
            mistake: { kind: 'class', selector: '#instructionHint', value: 'is-error' },
            icon: `
                <!-- Column Subtraction Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%;">
                    <defs>
                        <pattern id="grid-sub" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="100" height="100" rx="14" fill="#F8FAFC"/>
                    <rect width="100" height="100" rx="14" fill="url(#grid-sub)"/>
                
                    <!-- Minuend 72 -->
                    <text x="34" y="34" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#334155">72</text>
                
                    <!-- Subtrahend − 25 -->
                    <text x="14" y="62" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#60ACBD">− 25</text>
                
                    <!-- Line -->
                    <path d="M 14 70 L 68 70" fill="none" stroke="#60ACBD" stroke-width="4" stroke-linecap="round"/>
                
                    <!-- Difference 47 -->
                    <text x="34" y="93" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#4CAF50">47</text>
                </svg>
            `
        },
        {
            id: 'money-problems',
            file: 'money-problems.html',
            titleKey: 'game_money',
            level: 'picker',
            completion: { kind: 'class', selector: '#completionOverlay', value: 'show' },
            mistake: { kind: 'class', selector: '#instructionHint', value: 'is-error' },
            icon: `
                <!-- Money icon: a banknote with a coin -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 80%; height: 80%;">
                    <rect width="100" height="100" rx="14" fill="#F8FAFC"/>
                    <rect x="10" y="24" width="60" height="38" rx="6" fill="#E3F2FD" stroke="#60ACBD" stroke-width="4"/>
                    <text x="40" y="51" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#60ACBD" text-anchor="middle">€</text>
                    <circle cx="72" cy="68" r="17" fill="#FFF6DD" stroke="#E0A800" stroke-width="4"/>
                    <text x="72" y="75" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#B8860B" text-anchor="middle">1</text>
                </svg>
            `
        },
    ];

    const byId = new Map(games.map((game) => [game.id, game]));

    global.BrainWarsGames = {
        all: () => games.slice(),
        byId: (id) => byId.get(id) || null,
        byFile: (file) => games.find((game) => game.file === file) || null
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.BrainWarsGames;
    }
})(typeof window !== 'undefined' ? window : globalThis);
