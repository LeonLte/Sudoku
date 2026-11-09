// User interface: connects the game logic with the page.

import {
  newGame, selectCell, enterNumber, toggleNote, clearCell, useHint, getHighlights,
  remainingDigits, tick, restartGame, abandonGame, hasProgress, MAX_MISTAKES,
} from './logic/game.js';
import { recordGame, summary, emptyStats } from './logic/stats.js';
import { loadGame, saveGame, loadStats, saveStats, loadSettings, saveSettings } from './storage.js';

const LABEL = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
const $ = (id) => document.getElementById(id);

// ---------- State ----------
let game = loadGame();
if (game && (game.status !== 'playing' || !Array.isArray(game.values))) game = null;
let stats = loadStats();
const settings = loadSettings();

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
  } else if (result === 'wrong') {
    vibrate([40, 40, 40]);
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
  if (game.status !== 'playing') finishGame();
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
  $('result-title').textContent = won ? 'Geschafft! 🎉' : 'Leider verloren';
  $('result-text').textContent = won
    ? `${LABEL[finished.difficulty]} gelöst${level.currentStreak > 1 ? ` · ${level.currentStreak} Siege in Folge` : ''}`
    : `${MAX_MISTAKES} Fehler – das Spiel ist vorbei.`;
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

show('menu');
