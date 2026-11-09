// User interface: connects the game logic with the page.

import {
  newGame, selectCell, enterNumber, toggleNote, clearCell, useHint, getHighlights,
  remainingDigits, tick, restartGame, abandonGame, hasProgress, MAX_MISTAKES,
} from './logic/game.js';
import { recordGame, summary, emptyStats } from './logic/stats.js';
import { loadGame, saveGame, loadStats, saveStats, loadSettings, saveSettings, loadImages, saveImages } from './storage.js';
import { grimoire, magicCircle } from './art.js';

const LABEL = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
const $ = (id) => document.getElementById(id);

// ---------- State ----------
let game = loadGame();
if (game && (game.status !== 'playing' || !Array.isArray(game.values))) game = null;
let stats = loadStats();
const settings = loadSettings();

// ---------- Design (Kleeblatt / Klassisch) ----------
const THEMES = { clover: 'Kleeblatt', classic: 'Klassisch' };
// Sprüche des Maskottchens: kleine Chibi-Gags mit viel (übertriebener) Entschlossenheit.
const LINES = {
  menu: [
    'Heute löse ich ALLE Sudokus! …nach einem Snack.',
    'Ich trainiere seit drei Minuten. Ich bin unbesiegbar!',
    'Neun Zahlen? Pah! Ich zähle locker bis zehn!',
    'Ich hab extra meine Glücks-Socken an!',
    'Aufgeben? Kenn ich nicht! …Wie schreibt man das überhaupt?',
    'Psst… ich glaub, die 7 hat Angst vor dir.',
    'Mein Plan: Zahlen reinschreiben. Genial, oder?',
    'Niemals aufgeben! Außer beim Gemüse.',
    'Mein Zahlen-Zauber ist bereit! Glaube ich.',
    'Ich bin klein, aber meine Entschlossenheit ist RIESIG!',
  ],
  correct: [
    'Volltreffer!', 'Hab ich doch gesagt!', 'Die Zahl fühlt sich da sehr wohl!',
    'Ich wusste es! …ungefähr.', 'Genial! Fast so genial wie ich!', 'Zack! Wie ein Profi!',
  ],
  wrong: [
    'AUTSCH! Das war nur ein Test!', 'Die Zahl war bestimmt verkleidet!', 'Ich hab nix gesehen! Gar nix!',
    'Das zählt nicht, ich hab geblinzelt!', 'Ich weine nicht! Mir ist nur ein Kleeblatt ins Auge geflogen!',
    'Kein Problem! Das war mein geheimer Plan… glaube ich.',
  ],
  lastChance: ['Noch EIN Fehler und ich fall in Ohnmacht!', 'Ganz ruhig… ICH bin ganz ruhig! AAAH!'],
  hint: ['Psst, ich verrat\'s nur dir!', 'Hier! Aber nicht weitersagen!', 'Ich hab heimlich gespickt!'],
  won: [
    'UNGLAUBLICH! Ich hab keine Sekunde gezweifelt! (Doch. Ganz viele.)',
    'Sieg! Das feiern wir mit drei Portionen Nachtisch!',
    'Ich bin so stolz, ich platze gleich vor Glück!',
    'Wer ist der Champion? DU! Und ein bisschen ich.',
  ],
  lost: [
    'Das… war nur ein Aufwärmspiel! Ja, genau.',
    'Wir haben nicht verloren. Wir haben nur nicht gewonnen!',
    'Ich komme stärker zurück! Morgen. Oder gleich.',
    'Niemals aufgeben! Nochmal, nochmal, NOCHMAL!',
  ],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let bubbleTimer = null;
function say(text, bad = false) {
  const bubble = $('game-bubble');
  bubble.textContent = text;
  bubble.classList.toggle('bad', bad);
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2000);
}

function applyTheme() {
  const theme = THEMES[settings.theme] ? settings.theme : 'clover';
  document.documentElement.dataset.theme = theme;
  const other = theme === 'clover' ? 'classic' : 'clover';
  $('btn-theme').textContent = `Design: ${THEMES[theme]} · zu ${THEMES[other]} wechseln`;
}

// ---------- Mascot (drawn book or own pictures) ----------
let images = loadImages();

function mascot(mood) {
  const src = images[mood] || images.normal;
  if (!src) return grimoire(mood);
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.className = 'own-image';
  return img.outerHTML;
}

function renderMascots() {
  $('menu-mascot').innerHTML = mascot('normal');
  $('game-mascot').innerHTML = mascot('normal');
  document.documentElement.classList.toggle('has-own-images', Boolean(images.normal || images.happy || images.sad));
}

let moodTimer = null;
function setMood(mood, ms = 0) {
  $('game-mascot').innerHTML = mascot(mood);
  clearTimeout(moodTimer);
  if (ms) moodTimer = setTimeout(() => { $('game-mascot').innerHTML = mascot('normal'); }, ms);
}

/** Shrinks a picture to at most `max` pixels and returns it as a data URL. */
function shrinkImage(file, max = 360) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}

function renderImageSlots() {
  document.querySelectorAll('.slot').forEach((slot) => {
    const src = images[slot.dataset.mood];
    slot.querySelector('.slot-preview').innerHTML = src ? `<img src="${src}" alt="">` : grimoire(slot.dataset.mood);
    slot.querySelector('.slot-remove').hidden = !src;
  });
}

document.querySelectorAll('.slot').forEach((slot) => {
  const mood = slot.dataset.mood;
  slot.querySelector('input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = { ...images, [mood]: await shrinkImage(file) };
      if (!saveImages(next)) throw new Error('Kein Speicherplatz');
      images = next;
      $('images-note').textContent = 'Gespeichert.';
    } catch (err) {
      $('images-note').textContent = `Das hat nicht geklappt: ${err.message}. Versuch ein kleineres Bild.`;
    }
    renderImageSlots();
    renderMascots();
  });
  slot.querySelector('.slot-remove').addEventListener('click', () => {
    images = { ...images };
    delete images[mood];
    saveImages(images);
    renderImageSlots();
    renderMascots();
  });
});

$('menu-circle').innerHTML = magicCircle();
renderMascots();

const ui = {
  screen: 'menu',
  notesMode: false,
  paused: false,
  digitFocus: null,   // digit tapped on the keypad (highlights all of them)
  flash: null,        // { cell, digit } wrong digit shown briefly
  anim: null,         // { cell, cls } short animation on a cell
};

// ---------- Helpers ----------
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function vibrate(ms) {
  try { navigator.vibrate?.(ms); } catch { /* not supported (iOS) */ }
}

function setGame(next) {
  game = next;
  saveGame(game && game.status === 'playing' ? game : null);
}

// ---------- Screens ----------
function show(screen) {
  ui.screen = screen;
  for (const s of ['menu', 'game', 'stats']) $(`screen-${s}`).hidden = s !== screen;
  if (screen === 'menu') renderMenu();
  if (screen === 'game') renderGame();
  if (screen === 'stats') renderStats();
  updateTimer();
}

function renderMenu() {
  $('menu-bubble').textContent = pick(LINES.menu);
  const canContinue = game && game.status === 'playing';
  $('btn-continue').hidden = !canContinue;
  if (canContinue) $('continue-info').textContent = `${LABEL[game.difficulty]} · ${formatTime(game.elapsedSeconds)}`;
}

// ---------- Board ----------
const board = $('board');
const cells = [];
for (let i = 0; i < 81; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.setAttribute('role', 'gridcell');
  cell.addEventListener('pointerdown', (e) => { e.preventDefault(); onCellTap(i); });
  board.appendChild(cell);
  cells.push(cell);
}

const numpad = $('numpad');
const numButtons = [];
for (let d = 1; d <= 9; d++) {
  const b = document.createElement('button');
  b.className = 'num';
  b.innerHTML = `${d}<small></small>`;
  b.addEventListener('click', () => onDigit(d));
  numpad.appendChild(b);
  numButtons.push(b);
}

function renderGame() {
  if (!game) return;
  const h = getHighlights(game, ui.digitFocus);
  const related = new Set(h.related);
  const same = new Set(h.sameNumber);
  const blocked = new Set(h.blocked);

  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    const v = game.values[i];
    const cls = ['cell', `r${Math.floor(i / 9)}`, `c${i % 9}`];
    if (game.puzzle[i]) cls.push('given');
    if (blocked.has(i)) cls.push('blocked');
    if (related.has(i)) cls.push('related');
    if (same.has(i)) cls.push('same');
    if (i === h.selected) cls.push('selected');
    if (ui.anim && ui.anim.cell === i) cls.push(ui.anim.cls);

    let content = '';
    if (ui.flash && ui.flash.cell === i) {
      cls.push('error');
      content = String(ui.flash.digit);
    } else if (v) {
      content = String(v);
    } else if (game.notes[i]) {
      content = '<div class="notes">' + Array.from({ length: 9 }, (_, k) => {
        const d = k + 1;
        if (!(game.notes[i] & (1 << d))) return '<span></span>';
        return `<span class="${d === h.digit ? 'hl' : ''}">${d}</span>`;
      }).join('') + '</div>';
    }
    const className = cls.join(' ');
    if (cell.className !== className) cell.className = className;
    if (cell.innerHTML !== content) cell.innerHTML = content;
    cell.setAttribute('aria-label', `Zeile ${Math.floor(i / 9) + 1}, Spalte ${(i % 9) + 1}: ${v || 'leer'}`);
  }

  const left = remainingDigits(game);
  numButtons.forEach((b, k) => {
    const d = k + 1;
    b.classList.toggle('done', left[d] === 0);
    b.classList.toggle('focus', h.digit === d);
    b.querySelector('small').textContent = left[d] ? left[d] : '';
  });
  numpad.classList.toggle('notes-mode', ui.notesMode);

  $('info-difficulty').textContent = LABEL[game.difficulty];
  const mistakes = $('info-mistakes');
  mistakes.textContent = `Fehler ${game.mistakes}/${MAX_MISTAKES}`;
  mistakes.classList.toggle('warn', game.mistakes >= MAX_MISTAKES - 1);
  $('info-time').textContent = formatTime(game.elapsedSeconds);
  $('btn-notes').setAttribute('aria-pressed', String(ui.notesMode));
  $('notes-state').textContent = ui.notesMode ? 'an' : 'aus';
  $('hint-count').textContent = game.hintsUsed ? `(${game.hintsUsed})` : '';
  $('pause-overlay').hidden = !ui.paused;
  board.style.visibility = ui.paused ? 'hidden' : '';
}

function animate(cell, cls, ms = 500) {
  ui.anim = { cell, cls };
  setTimeout(() => {
    if (ui.anim && ui.anim.cell === cell && ui.anim.cls === cls) { ui.anim = null; renderGame(); }
  }, ms);
}

// ---------- Input ----------
function playing() {
  return game && game.status === 'playing' && !ui.paused && ui.screen === 'game';
}

function onCellTap(i) {
  if (!playing()) return;
  ui.digitFocus = null;
  setGame(selectCell(game, i));
  renderGame();
}

function onDigit(d) {
  if (!playing()) return;
  const i = game.selected;
  const editable = i !== null && game.values[i] === 0;

  if (!editable) {
    // No empty cell selected: just highlight this digit everywhere.
    ui.digitFocus = ui.digitFocus === d ? null : d;
    renderGame();
    return;
  }
  ui.digitFocus = null;
  if (ui.notesMode) {
    setGame(toggleNote(game, d));
    renderGame();
    return;
  }

  const { game: next, result } = enterNumber(game, d);
  setGame(next);
  if (result === 'correct') {
    vibrate(10);
    animate(i, 'correct', 300);
    setMood('happy', 900);
    if (game.status === 'playing' && Math.random() < 0.25) say(pick(LINES.correct));
  } else if (result === 'wrong') {
    vibrate([40, 40, 40]);
    setMood('sad', 1400);
    if (game.status === 'playing') say(pick(game.mistakes === MAX_MISTAKES - 1 ? LINES.lastChance : LINES.wrong), true);
    ui.flash = { cell: i, digit: d };
    setTimeout(() => { ui.flash = null; renderGame(); }, 900);
  }
  renderGame();
  if (game.status !== 'playing') finishGame();
}

function onErase() {
  if (!playing()) return;
  setGame(clearCell(game));
  renderGame();
}

function onHint() {
  if (!playing()) return;
  const { game: next, cell } = useHint(game);
  if (cell === null) return;
  ui.digitFocus = null;
  setGame(next);
  animate(cell, 'hinted', 600);
  renderGame();
  if (game.status === 'playing') say(pick(LINES.hint));
  else finishGame();
}

function moveSelection(dr, dc) {
  if (!playing()) return;
  const i = game.selected ?? 40;
  const r = (Math.floor(i / 9) + dr + 9) % 9;
  const c = ((i % 9) + dc + 9) % 9;
  onCellTap(r * 9 + c);
}

// ---------- Game end ----------
function finishGame() {
  const finished = game;
  const before = stats[finished.difficulty]?.bestTime ?? null;
  stats = recordGame(stats, finished);
  saveStats(stats);
  saveGame(null);
  stopTimer();

  const won = finished.status === 'won';
  if (won) {
    cells.forEach((c, i) => { c.style.animationDelay = `${(Math.floor(i / 9) + (i % 9)) * 30}ms`; });
    board.classList.add('won');
  }
  setTimeout(() => {
    board.classList.remove('won');
    cells.forEach((c) => { c.style.animationDelay = ''; });
    showResult(finished, won && (before === null || finished.elapsedSeconds < before));
  }, won ? 1100 : 700);
}

function showResult(finished, newRecord) {
  const won = finished.status === 'won';
  const level = summary(stats[finished.difficulty]);
  $('result-mascot').innerHTML = mascot(won ? 'happy' : 'sad');
  $('result-title').textContent = won ? 'Geschafft! 🍀' : 'Oh nein…';
  $('result-text').textContent = won
    ? `${LABEL[finished.difficulty]} gelöst${level.currentStreak > 1 ? ` · ${level.currentStreak} Siege in Folge` : ''}`
    : `${MAX_MISTAKES} Fehler – das Spiel ist vorbei.`;
  if (document.documentElement.dataset.theme === 'clover') {
    $('result-text').textContent = `${pick(won ? LINES.won : LINES.lost)} · ${$('result-text').textContent}`;
  }
  $('result-facts').innerHTML = [
    [formatTime(finished.elapsedSeconds), newRecord ? 'Neue Bestzeit!' : 'Zeit', newRecord],
    [formatTime(level.bestTime), 'Bestzeit'],
    [`${finished.mistakes}/${MAX_MISTAKES}`, 'Fehler'],
    [String(finished.hintsUsed), 'Hinweise'],
  ].map(([v, l, hl]) => `<div class="${hl ? 'new-record' : ''}"><b>${v}</b><span>${l}</span></div>`).join('');
  $('btn-result-retry').hidden = won;
  $('result').hidden = false;
  $('result').dataset.difficulty = finished.difficulty;
  resultGame = finished;
}
let resultGame = null;

// ---------- Starting games ----------
function startGame(difficulty) {
  setMood('normal');
  ui.notesMode = false;
  ui.paused = false;
  ui.digitFocus = null;
  ui.flash = null;
  setGame(newGame(difficulty, Date.now()));
  show('game');
}

async function requestNewGame(difficulty) {
  if (game && game.status === 'playing' && hasProgress(game)) {
    const ok = await confirmDialog('Das laufende Spiel wird abgebrochen und zählt in der Statistik als verloren. Neues Spiel starten?');
    if (!ok) return;
    stats = recordGame(stats, abandonGame(game));
    saveStats(stats);
  }
  startGame(difficulty);
}

function confirmDialog(text) {
  return new Promise((resolve) => {
    $('confirm-text').textContent = text;
    $('confirm').hidden = false;
    const done = (value) => {
      $('confirm').hidden = true;
      $('btn-confirm-yes').onclick = null;
      $('btn-confirm-no').onclick = null;
      resolve(value);
    };
    $('btn-confirm-yes').onclick = () => done(true);
    $('btn-confirm-no').onclick = () => done(false);
  });
}

// ---------- Timer ----------
let timer = null;
function stopTimer() { clearInterval(timer); timer = null; }
function updateTimer() {
  const run = playing() && document.visibilityState === 'visible';
  if (run && !timer) {
    timer = setInterval(() => {
      if (!playing()) return stopTimer();
      game = tick(game);
      saveGame(game);
      $('info-time').textContent = formatTime(game.elapsedSeconds);
    }, 1000);
  } else if (!run) {
    stopTimer();
  }
}

function setPaused(paused) {
  ui.paused = paused;
  renderGame();
  updateTimer();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && ui.screen === 'game' && game?.status === 'playing') ui.paused = true;
  if (ui.screen === 'game') renderGame();
  updateTimer();
});

// ---------- Statistics ----------
function renderStats() {
  const tab = settings.statsTab;
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const s = summary(stats[tab]);
  const items = [
    [s.played, 'Gespielt'],
    [s.won, 'Gewonnen'],
    [`${s.winRate} %`, 'Gewinnquote'],
    [s.perfectGames, 'Perfekte Spiele'],
    [formatTime(s.bestTime), 'Bestzeit'],
    [formatTime(s.averageTime), 'Ø Zeit'],
    [s.currentStreak, 'Aktuelle Serie'],
    [s.bestStreak, 'Längste Serie'],
    [s.played ? (s.totalMistakes / s.played).toFixed(1).replace('.', ',') : '–', 'Ø Fehler pro Spiel'],
    [s.totalHints, 'Hinweise genutzt'],
  ];
  $('stats-grid').innerHTML = items
    .map(([v, l]) => `<div class="stat"><div class="value">${v}</div><div class="label">${l}</div></div>`)
    .join('');
}

// ---------- Wiring ----------
document.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => requestNewGame(b.dataset.new)));
$('btn-continue').addEventListener('click', () => { ui.paused = false; show('game'); });
$('btn-stats').addEventListener('click', () => show('stats'));
$('btn-images').addEventListener('click', () => {
  $('images-note').textContent = 'Fehlt ein Bild für „Freut sich“ oder „Traurig“, wird „Normal“ verwendet.';
  renderImageSlots();
  $('images').hidden = false;
});
$('btn-images-done').addEventListener('click', () => { $('images').hidden = true; });
$('btn-images-reset').addEventListener('click', () => {
  images = {};
  saveImages(null);
  renderImageSlots();
  renderMascots();
  $('images-note').textContent = 'Zurückgesetzt: Das Zauberbuch ist wieder da.';
});
$('btn-theme').addEventListener('click', () => {
  settings.theme = document.documentElement.dataset.theme === 'clover' ? 'classic' : 'clover';
  saveSettings(settings);
  applyTheme();
});
$('btn-stats-back').addEventListener('click', () => show('menu'));
$('btn-menu').addEventListener('click', () => show('menu'));
$('btn-pause').addEventListener('click', () => setPaused(true));
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-erase').addEventListener('click', onErase);
$('btn-hint').addEventListener('click', onHint);
$('btn-notes').addEventListener('click', () => { ui.notesMode = !ui.notesMode; renderGame(); });
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
  settings.statsTab = b.dataset.tab;
  saveSettings(settings);
  renderStats();
}));
$('btn-reset-stats').addEventListener('click', async () => {
  if (await confirmDialog('Alle Statistiken löschen? Das kann nicht rückgängig gemacht werden.')) {
    stats = emptyStats();
    saveStats(stats);
    renderStats();
  }
});
$('btn-result-new').addEventListener('click', () => {
  $('result').hidden = true;
  startGame($('result').dataset.difficulty);
});
$('btn-result-retry').addEventListener('click', () => {
  $('result').hidden = true;
  ui.notesMode = false;
  ui.paused = false;
  setGame(restartGame(resultGame));
  show('game');
});
$('btn-result-menu').addEventListener('click', () => { $('result').hidden = true; show('menu'); });

document.addEventListener('keydown', (e) => {
  if (ui.screen !== 'game' || !$('result').hidden || !$('confirm').hidden) return;
  if (/^[1-9]$/.test(e.key)) onDigit(Number(e.key));
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') onErase();
  else if (e.key === 'ArrowUp') moveSelection(-1, 0);
  else if (e.key === 'ArrowDown') moveSelection(1, 0);
  else if (e.key === 'ArrowLeft') moveSelection(0, -1);
  else if (e.key === 'ArrowRight') moveSelection(0, 1);
  else if (e.key.toLowerCase() === 'n') { ui.notesMode = !ui.notesMode; renderGame(); }
  else if (e.key.toLowerCase() === 'h') onHint();
  else if (e.key === ' ') setPaused(!ui.paused);
  else return;
  e.preventDefault();
});

// Offline support
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode not available */ });
}

applyTheme();
show('menu');
