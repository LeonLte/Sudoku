import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStats, recordGame, summary } from '../src/logic/stats.js';

const game = (status, elapsedSeconds, mistakes = 0, hintsUsed = 0) =>
  ({ difficulty: 'mittel', status, elapsedSeconds, mistakes, hintsUsed });

test('stats track wins, losses, times and streaks', () => {
  let s = emptyStats();
  s = recordGame(s, game('won', 300));
  s = recordGame(s, game('won', 200, 1));
  s = recordGame(s, game('lost', 100, 3));
  s = recordGame(s, game('won', 400, 0, 2));
  const m = summary(s.mittel);
  assert.equal(m.played, 4);
  assert.equal(m.won, 3);
  assert.equal(m.lost, 1);
  assert.equal(m.winRate, 75);
  assert.equal(m.bestTime, 200);
  assert.equal(m.averageTime, 300);
  assert.equal(m.bestStreak, 2);
  assert.equal(m.currentStreak, 1);
  assert.equal(m.perfectGames, 1);
  assert.equal(s.leicht.played, 0);
});

test('unfinished games are not recorded', () => {
  const s = emptyStats();
  assert.equal(recordGame(s, game('playing', 10)), s);
});
