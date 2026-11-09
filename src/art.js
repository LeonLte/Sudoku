// Original illustrations for the "Kleeblatt" design (drawn for this app, inline SVG).

// One heart-shaped leaf pointing up, tip at (0,0).
const LEAF = 'M0 0 C -15 -5 -20 -22 -9 -27 C -4 -29 0 -25 0 -21 C 0 -25 4 -29 9 -27 C 20 -22 15 -5 0 0 Z';

/** Four-leaf clover centred at (x, y). */
export function clover(x, y, scale = 1, fill = 'currentColor', stroke = 'none') {
  const leaves = [0, 90, 180, 270]
    .map((r) => `<path d="${LEAF}" transform="rotate(${r + 45}) translate(0 -3)" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>`)
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M0 0 C 6 14 4 24 12 32" fill="none" stroke="${stroke === 'none' ? fill : stroke}" stroke-width="3.5" stroke-linecap="round"/>
    ${leaves}
  </g>`;
}

function sparkle(x, y, s, color) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 C 1.5 -2 2 -1.5 10 0 C 2 1.5 1.5 2 0 10 C -1.5 2 -2 1.5 -10 0 C -2 -1.5 -1.5 -2 0 -10 Z" fill="${color}"/>`;
}

const FACES = {
  happy: `
    <path d="M70 128 q8 -10 16 0" fill="none" stroke="#3b2a3f" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M114 128 q8 -10 16 0" fill="none" stroke="#3b2a3f" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M90 140 q10 12 20 0 z" fill="#7a2e2e" stroke="#3b2a3f" stroke-width="3" stroke-linejoin="round"/>`,
  normal: `
    <ellipse cx="78" cy="128" rx="9" ry="12" fill="#3b2a3f"/>
    <ellipse cx="122" cy="128" rx="9" ry="12" fill="#3b2a3f"/>
    <circle cx="81" cy="123" r="4" fill="#fff"/><circle cx="75" cy="133" r="2" fill="#fff"/>
    <circle cx="125" cy="123" r="4" fill="#fff"/><circle cx="119" cy="133" r="2" fill="#fff"/>
    <path d="M94 143 q6 6 12 0" fill="none" stroke="#3b2a3f" stroke-width="3.5" stroke-linecap="round"/>`,
  sad: `
    <ellipse cx="78" cy="130" rx="8" ry="10" fill="#3b2a3f"/>
    <ellipse cx="122" cy="130" rx="8" ry="10" fill="#3b2a3f"/>
    <circle cx="81" cy="126" r="3.5" fill="#fff"/><circle cx="125" cy="126" r="3.5" fill="#fff"/>
    <path d="M68 119 l16 -5 M132 119 l-16 -5" stroke="#3b2a3f" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M93 148 q7 -7 14 0" fill="none" stroke="#3b2a3f" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M131 138 q4 8 0 12 q-4 -4 0 -12 z" fill="#7cc4f0"/>`,
};

/**
 * Chibi grimoire mascot: a small living spell book with a four-leaf clover on its cover.
 * mood: 'normal' | 'happy' | 'sad'
 */
export function grimoire(mood = 'normal') {
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="186" rx="58" ry="7" fill="#000" opacity="0.12"/>
    <!-- feet -->
    <ellipse cx="72" cy="178" rx="13" ry="8" fill="#ffb3c7" stroke="#3b2a3f" stroke-width="4"/>
    <ellipse cx="128" cy="178" rx="13" ry="8" fill="#ffb3c7" stroke="#3b2a3f" stroke-width="4"/>
    <!-- back cover and pages -->
    <rect x="44" y="36" width="122" height="142" rx="18" fill="#3b2a3f"/>
    <rect x="50" y="42" width="112" height="132" rx="10" fill="#fffaf0" stroke="#3b2a3f" stroke-width="2"/>
    <path d="M158 56 v104 M154 52 v112" stroke="#e9dcc6" stroke-width="2"/>
    <!-- front cover -->
    <rect x="34" y="28" width="122" height="146" rx="16" fill="#8fdcaa" stroke="#3b2a3f" stroke-width="5"/>
    <rect x="44" y="38" width="102" height="126" rx="10" fill="none" stroke="#ffd76b" stroke-width="3"/>
    <path d="M44 56 a18 18 0 0 0 18 -18 M146 56 a18 18 0 0 1 -18 -18 M44 146 a18 18 0 0 1 18 18 M146 146 a18 18 0 0 0 -18 18"
      fill="none" stroke="#ffd76b" stroke-width="3"/>
    <rect x="34" y="28" width="14" height="146" rx="7" fill="#6cc58f"/>
    <!-- clover emblem -->
    <circle cx="100" cy="76" r="27" fill="#6cc58f" stroke="#3b2a3f" stroke-width="3.5"/>
    ${clover(100, 79, 0.7, '#ffe08a', '#3b2a3f')}
    <!-- face -->
    <ellipse cx="66" cy="142" rx="10" ry="6" fill="#ff8fb3" opacity="0.8"/>
    <ellipse cx="134" cy="142" rx="10" ry="6" fill="#ff8fb3" opacity="0.8"/>
    ${FACES[mood] ?? FACES.normal}
    <!-- sparkles -->
    ${sparkle(176, 34, 1.1, '#f2c94c')}
    ${sparkle(22, 78, 0.8, '#f2c94c')}
    ${sparkle(184, 120, 0.6, '#ff8fb3')}
  </svg>`;
}

/** Decorative magic circle (used faintly behind the menu). */
export function magicCircle() {
  const ticks = Array.from({ length: 36 }, (_, k) => {
    const a = (k * 10 * Math.PI) / 180;
    const r1 = 82;
    const r2 = k % 3 === 0 ? 72 : 77;
    return `<line x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + r2 * Math.cos(a)}" y2="${100 + r2 * Math.sin(a)}"/>`;
  }).join('');
  const square = (offset) => Array.from({ length: 4 }, (_, k) => {
    const a = (((k * 90) + offset) * Math.PI) / 180;
    return `${100 + 62 * Math.cos(a)},${100 + 62 * Math.sin(a)}`;
  }).join(' ');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="100" cy="100" r="94"/><circle cx="100" cy="100" r="88" stroke-dasharray="2 5"/>
    <circle cx="100" cy="100" r="82"/>${ticks}<circle cx="100" cy="100" r="62"/>
    <polygon points="${square(0)}"/><polygon points="${square(45)}"/><circle cx="100" cy="100" r="24"/>
    ${[0, 90, 180, 270].map((r) => `<g transform="rotate(${r} 100 100)">${clover(100, 18, 0.22, 'none', 'currentColor')}</g>`).join('')}
  </svg>`;
}
