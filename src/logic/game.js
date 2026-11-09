// Game state and rules. All functions are pure: they return a new state object,
// so the state can simply be saved as JSON (e.g. in localStorage).

import { generatePuzzle, PEERS, candidates, CELLS } from './sudoku.js';

export const MAX_MISTAKES = 3;

/** Starts a new game. */
export function newGame(difficulty = 'mittel', seed = Date.now()) {
  const { puzzle, solution } = generatePuzzle(difficulty, seed);
  return {
    difficulty,
    seed,
    puzzle,                         // starting numbers (0 = empty)
    solution,
    values: puzzle.slice(),         // current numbers on the board
    notes: new Array(CELLS).fill(0),// pencil marks as bitmask (bit d = digit d)
    selected: null,                 // index of the selected cell
    mistakes: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
    status: 'playing',              // 'playing' | 'won' | 'lost'
  };
}

const copy = (game) => ({ ...game, values: game.values.slice(), notes: game.notes.slice() });

export const isGiven = (game, i) => game.puzzle[i] !== 0;

export function selectCell(game, i) {
  return { ...game, selected: i };
}

/** Restarts the same puzzle from the beginning (e.g. "Nochmal versuchen"). */
export function restartGame(game) {
  return {
    ...game,
    values: game.puzzle.slice(),
    notes: new Array(CELLS).fill(0),
    selected: null,
    mistakes: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
    status: 'playing',
  };
}

/** Gives up a running game (counts as lost in the statistics). */
export function abandonGame(game) {
  return game.status === 'playing' ? { ...game, status: 'lost' } : game;
}

/** True if the player already did something in this game. */
export function hasProgress(game) {
  return game.elapsedSeconds > 0 || game.mistakes > 0 || game.hintsUsed > 0 ||
    game.values.some((v, i) => v !== game.puzzle[i]) || game.notes.some(Boolean);
}

/** Adds seconds to the timer while the game is running. */
export function tick(game, seconds = 1) {
  if (game.status !== 'playing') return game;
  return { ...game, elapsedSeconds: game.elapsedSeconds + seconds };
}

function placeCorrect(g, i, digit) {
  g.values[i] = digit;
  g.notes[i] = 0;
  for (const p of PEERS[i]) g.notes[p] &= ~(1 << digit); // clean up notes
  if (g.values.every((v, k) => v === g.solution[k])) g.status = 'won';
}

/**
 * Enters a digit in the selected cell.
 * Returns { game, result } with result 'correct', 'wrong' or 'ignored'.
 * A wrong digit is not placed but counts as a mistake; after MAX_MISTAKES the game is lost.
 */
export function enterNumber(game, digit) {
  const i = game.selected;
  if (game.status !== 'playing' || i === null || isGiven(game, i) || game.values[i] !== 0) {
    return { game, result: 'ignored' };
  }
  const g = copy(game);
  if (game.solution[i] === digit) {
    placeCorrect(g, i, digit);
    return { game: g, result: 'correct' };
  }
  g.mistakes += 1;
  if (g.mistakes >= MAX_MISTAKES) g.status = 'lost';
  return { game: g, result: 'wrong' };
}

/** Toggles a pencil mark in the selected empty cell. */
export function toggleNote(game, digit) {
  const i = game.selected;
  if (game.status !== 'playing' || i === null || game.values[i] !== 0) return game;
  const g = copy(game);
  g.notes[i] ^= 1 << digit;
  return g;
}

/** Clears the notes of the selected cell. */
export function clearCell(game) {
  const i = game.selected;
  if (game.status !== 'playing' || i === null || game.values[i] !== 0) return game;
  const g = copy(game);
  g.notes[i] = 0;
  return g;
}

/**
 * Reveals one cell: the selected cell if it is empty, otherwise the empty cell
 * with the fewest possible digits (the "most obvious" next move).
 * Returns { game, cell } (cell = index that was filled, or null).
 */
export function useHint(game) {
  if (game.status !== 'playing') return { game, cell: null };
  let target = null;
  if (game.selected !== null && game.values[game.selected] === 0) {
    target = game.selected;
  } else {
    let best = 10;
    for (let i = 0; i < CELLS; i++) {
      if (game.values[i] !== 0) continue;
      const n = candidates(game.values, i).length;
      if (n < best) { best = n; target = i; }
    }
  }
  if (target === null) return { game, cell: null };
  const g = copy(game);
  g.hintsUsed += 1;
  g.selected = target;
  placeCorrect(g, target, g.solution[target]);
  return { game: g, cell: target };
}

/**
 * What the board should highlight:
 * - selected: the selected cell
 * - related: same row, column and box as the selected cell
 * - sameNumber: all cells with the focused digit (the digit in the selected cell,
 *   or `digit` if given, e.g. after tapping a number on the keypad)
 * - blocked: empty cells where that digit can no longer go (helps to see where it "blocks")
 */
export function getHighlights(game, digit = null) {
  const i = game.selected;
  const focus = digit ?? (i !== null ? game.values[i] : 0);
  const sameNumber = [];
  const blocked = new Set();
  if (focus) {
    game.values.forEach((v, k) => {
      if (v !== focus) return;
      sameNumber.push(k);
      for (const p of PEERS[k]) if (game.values[p] === 0) blocked.add(p);
    });
  }
  return {
    selected: i,
    digit: focus || null,
    related: i !== null ? PEERS[i] : [],
    sameNumber,
    blocked: [...blocked].sort((a, b) => a - b),
  };
}

/** How often each digit 1-9 still has to be placed (0 = digit is complete). */
export function remainingDigits(game) {
  const left = Array(10).fill(9);
  left[0] = 0;
  for (const v of game.values) if (v) left[v] -= 1;
  return left;
}
