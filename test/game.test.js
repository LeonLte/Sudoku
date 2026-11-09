import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, selectCell, enterNumber, toggleNote, useHint, getHighlights, remainingDigits, tick, MAX_MISTAKES,
} from '../src/logic/game.js';
import { PEERS } from '../src/logic/sudoku.js';

const firstEmpty = (g) => g.values.indexOf(0);
const wrongDigit = (g, i) => (g.solution[i] % 9) + 1;

test('correct number is placed', () => {
  let g = newGame('leicht', 1);
  const i = firstEmpty(g);
  const r = enterNumber(selectCell(g, i), g.solution[i]);
  assert.equal(r.result, 'correct');
  assert.equal(r.game.values[i], g.solution[i]);
});

test('three mistakes end the game', () => {
  let g = selectCell(newGame('leicht', 2), null);
  const i = firstEmpty(g);
  g = selectCell(g, i);
  for (let k = 1; k <= MAX_MISTAKES; k++) {
    const r = enterNumber(g, wrongDigit(g, i));
    assert.equal(r.result, 'wrong');
    assert.equal(r.game.values[i], 0);
    g = r.game;
    assert.equal(g.mistakes, k);
  }
  assert.equal(g.status, 'lost');
  assert.equal(enterNumber(g, g.solution[i]).result, 'ignored');
});

test('given numbers cannot be changed', () => {
  const g = newGame('leicht', 3);
  const i = g.puzzle.findIndex(Boolean);
  assert.equal(enterNumber(selectCell(g, i), 1).result, 'ignored');
});

test('hints fill a correct cell and are counted', () => {
  let g = newGame('mittel', 4);
  const r = useHint(g);
  assert.equal(r.game.hintsUsed, 1);
  assert.equal(r.game.values[r.cell], g.solution[r.cell]);
});

test('filling every cell wins the game', () => {
  let g = newGame('leicht', 5);
  while (g.status === 'playing') g = useHint(g).game;
  assert.equal(g.status, 'won');
  assert.deepEqual(g.values, g.solution);
});

test('notes are toggled and removed from peers when a number is placed', () => {
  let g = newGame('leicht', 6);
  const i = firstEmpty(g);
  const d = g.solution[i];
  const peer = PEERS[i].find((p) => g.values[p] === 0);
  g = toggleNote(selectCell(g, peer), d);
  assert.equal(g.notes[peer], 1 << d);
  g = enterNumber(selectCell(g, i), d).game;
  assert.equal(g.notes[peer], 0);
});

test('highlights show all cells with the same number', () => {
  const g = newGame('leicht', 7);
  const i = g.puzzle.findIndex(Boolean);
  const h = getHighlights(selectCell(g, i));
  const expected = g.values.map((v, k) => (v === g.values[i] ? k : -1)).filter((k) => k >= 0);
  assert.deepEqual(h.sameNumber, expected);
  assert.equal(h.related.length, 20);
  for (const b of h.blocked) assert.equal(g.values[b], 0);
});

test('remaining digits and timer', () => {
  let g = newGame('leicht', 8);
  const left = remainingDigits(g);
  assert.equal(left.reduce((a, b) => a + b), g.values.filter((v) => v === 0).length);
  assert.equal(tick(tick(g)).elapsedSeconds, 2);
});

test('highlights for a digit tapped on the keypad', () => {
  const g = newGame('leicht', 9);
  const h = getHighlights(g, 5);
  assert.equal(h.digit, 5);
  assert.ok(h.sameNumber.every((k) => g.values[k] === 5));
});

test('restart and abandon', async () => {
  const { restartGame, abandonGame, hasProgress } = await import('../src/logic/game.js');
  let g = newGame('leicht', 10);
  assert.equal(hasProgress(g), false);
  g = useHint(g).game;
  assert.equal(hasProgress(g), true);
  const r = restartGame(g);
  assert.deepEqual(r.values, g.puzzle);
  assert.equal(r.hintsUsed, 0);
  assert.equal(abandonGame(g).status, 'lost');
});
