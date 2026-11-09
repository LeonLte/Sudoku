import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePuzzle, gradePuzzle, hasUniqueSolution, solve, isConsistent, DIFFICULTIES, PEERS, countSolutions,
} from '../src/logic/sudoku.js';

test('every cell has 20 peers', () => {
  for (const p of PEERS) assert.equal(p.length, 20);
});

test('solver solves a known puzzle', () => {
  const p = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
    .split('').map(Number);
  const s = solve(p);
  assert.equal(s.join(''), '534678912672195348198342567859761423426853791713924856961537284287419635345286179');
});

test('empty board has many solutions, contradiction has none', () => {
  assert.equal(countSolutions(new Array(81).fill(0), 2).count, 2);
  const bad = new Array(81).fill(0); bad[0] = 5; bad[1] = 5;
  assert.equal(countSolutions(bad, 2).count, 0);
});

for (const difficulty of Object.keys(DIFFICULTIES)) {
  test(`generator: ${difficulty} puzzles are unique, valid and graded correctly`, () => {
    const { minClues, maxClues } = DIFFICULTIES[difficulty];
    for (let seed = 1; seed <= 15; seed++) {
      const { puzzle, solution } = generatePuzzle(difficulty, seed);
      const clues = puzzle.filter(Boolean).length;
      assert.ok(clues >= minClues && clues <= maxClues, `clues ${clues}`);
      assert.ok(isConsistent(solution) && solution.every(Boolean));
      puzzle.forEach((v, i) => v && assert.equal(v, solution[i]));
      assert.ok(hasUniqueSolution(puzzle));
      if (difficulty !== 'schwer') assert.equal(gradePuzzle(puzzle), difficulty);
    }
  });
}

test('same seed gives the same puzzle', () => {
  assert.deepEqual(generatePuzzle('mittel', 42), generatePuzzle('mittel', 42));
});
