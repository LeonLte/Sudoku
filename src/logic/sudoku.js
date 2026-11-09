// Core Sudoku logic: board helpers, solver, generator and difficulty grading.
// A board is an array of 81 numbers (row by row), 0 means empty.

import { createRng, shuffle } from './random.js';

export const SIZE = 9;
export const CELLS = 81;
const ALL = 0x3fe; // bits 1..9 set

export const row = (i) => Math.floor(i / 9);
export const col = (i) => i % 9;
export const box = (i) => Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3);

// PEERS[i] = all cells sharing a row, column or box with cell i (20 cells).
export const PEERS = Array.from({ length: CELLS }, (_, i) => {
  const peers = [];
  for (let j = 0; j < CELLS; j++) {
    if (j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))) peers.push(j);
  }
  return peers;
});

// The 27 units (9 rows, 9 columns, 9 boxes), each a list of 9 cell indices.
export const UNITS = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) =>
    Array.from({ length: 9 }, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3))
  ),
];

const bitCount = (m) => {
  let n = 0;
  while (m) { m &= m - 1; n++; }
  return n;
};

/** Bitmask of digits still allowed in cell i. */
export function candidatesMask(board, i) {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << board[p];
  return ALL & ~used;
}

/** List of digits still allowed in cell i. */
export function candidates(board, i) {
  const mask = candidatesMask(board, i);
  const out = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d);
  return out;
}

/** True if the given digits never repeat in a row, column or box. */
export function isConsistent(board) {
  for (let i = 0; i < CELLS; i++) {
    const v = board[i];
    if (v === 0) continue;
    for (const p of PEERS[i]) if (board[p] === v) return false;
  }
  return true;
}

/**
 * Counts solutions up to `limit` (backtracking, always fills the cell with the fewest options).
 * Returns { count, solution } where solution is the first solution found.
 */
export function countSolutions(board, limit = 2, rng = null) {
  const b = board.slice();
  let count = 0;
  let solution = null;

  function search() {
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (let i = 0; i < CELLS; i++) {
      if (b[i] !== 0) continue;
      const m = candidatesMask(b, i);
      const c = bitCount(m);
      if (c < bestCount) {
        best = i; bestMask = m; bestCount = c;
        if (c <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (!solution) solution = b.slice();
      return count >= limit;
    }
    if (bestCount === 0) return false;
    let digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rng) digits = shuffle(digits, rng);
    for (const d of digits) {
      b[best] = d;
      if (search()) return true;
    }
    b[best] = 0;
    return false;
  }

  if (isConsistent(b)) search();
  return { count, solution };
}

/** Returns the solved board, or null if there is no solution. */
export function solve(board) {
  return countSolutions(board, 1).solution;
}

export function hasUniqueSolution(board) {
  return countSolutions(board, 2).count === 1;
}

/** A random completely filled valid board. */
export function generateSolvedBoard(rng = createRng()) {
  return countSolutions(new Array(CELLS).fill(0), 1, rng).solution;
}

/**
 * Solves using only the techniques a human beginner uses.
 * level 1: naked singles (a cell with only one possible digit)
 * level 2: + hidden singles (a digit with only one possible cell in a row/column/box)
 * Returns true if the puzzle can be solved completely that way.
 */
export function solvableWithSingles(board, level = 2) {
  const b = board.slice();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < CELLS; i++) {
      if (b[i] !== 0) continue;
      const m = candidatesMask(b, i);
      if (m === 0) return false;
      if (bitCount(m) === 1) { b[i] = 31 - Math.clz32(m); progress = true; }
    }
    if (progress || level < 2) continue;
    for (const unit of UNITS) {
      for (let d = 1; d <= 9; d++) {
        if (unit.some((i) => b[i] === d)) continue;
        const spots = unit.filter((i) => b[i] === 0 && candidatesMask(b, i) & (1 << d));
        if (spots.length === 1) { b[spots[0]] = d; progress = true; }
      }
    }
  }
  return b.every((v) => v !== 0);
}

export const DIFFICULTIES = {
  leicht: { minClues: 36, maxClues: 40 },
  mittel: { minClues: 30, maxClues: 34 },
  schwer: { minClues: 23, maxClues: 28 },
};

/** Rough human difficulty of a puzzle with a unique solution. */
export function gradePuzzle(puzzle) {
  if (solvableWithSingles(puzzle, 1)) return 'leicht';
  if (solvableWithSingles(puzzle, 2)) return 'mittel';
  return 'schwer';
}

const RANK = { leicht: 0, mittel: 1, schwer: 2 };

/**
 * Creates a puzzle with exactly one solution.
 * Returns { puzzle, solution, difficulty, seed }.
 */
export function generatePuzzle(difficulty = 'mittel', seed = Date.now()) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`Unbekannter Schwierigkeitsgrad: ${difficulty}`);
  const rng = createRng(seed);
  let fallback = null;

  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = generateSolvedBoard(rng);
    const puzzle = solution.slice();
    const target = cfg.minClues + Math.floor(rng() * (cfg.maxClues - cfg.minClues + 1));
    let clues = CELLS;

    // Remove cells in symmetric pairs while the solution stays unique
    // and the puzzle does not get harder than the requested level.
    for (const i of shuffle([...Array(41).keys()], rng)) {
      if (clues <= target) break;
      const j = CELLS - 1 - i;
      const removed = i === j ? 1 : 2;
      if (clues - removed < cfg.minClues) continue;
      const saved = [puzzle[i], puzzle[j]];
      puzzle[i] = 0;
      puzzle[j] = 0;
      if (hasUniqueSolution(puzzle) && RANK[gradePuzzle(puzzle)] <= RANK[difficulty]) {
        clues -= removed;
      } else {
        puzzle[i] = saved[0];
        puzzle[j] = saved[1];
      }
    }
    if (clues > cfg.maxClues) continue;
    const result = { puzzle, solution, difficulty, seed };
    if (gradePuzzle(puzzle) === difficulty) return result;
    // "schwer" puzzles that only need singles are kept as a fallback (few clues still make them hard).
    if (difficulty === 'schwer' && !fallback) fallback = result;
  }
  if (fallback) return fallback;
  throw new Error('Konnte kein passendes Rätsel erzeugen');
}
