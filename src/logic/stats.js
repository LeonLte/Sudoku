// Statistics per difficulty. Stored on the device (localStorage) as JSON.

const emptyLevel = () => ({
  played: 0,
  won: 0,
  lost: 0,
  bestTime: null,       // seconds, fastest won game
  totalWinTime: 0,      // seconds, sum of all won games (for the average)
  currentStreak: 0,     // wins in a row
  bestStreak: 0,
  perfectGames: 0,      // won without mistakes and without hints
  totalMistakes: 0,
  totalHints: 0,
});

export function emptyStats() {
  return { leicht: emptyLevel(), mittel: emptyLevel(), schwer: emptyLevel() };
}

/** Records a finished game (status 'won' or 'lost') and returns the new stats. */
export function recordGame(stats, game) {
  if (game.status !== 'won' && game.status !== 'lost') return stats;
  const s = { ...stats, [game.difficulty]: { ...(stats[game.difficulty] ?? emptyLevel()) } };
  const l = s[game.difficulty];
  l.played += 1;
  l.totalMistakes += game.mistakes;
  l.totalHints += game.hintsUsed;
  if (game.status === 'won') {
    l.won += 1;
    l.totalWinTime += game.elapsedSeconds;
    if (l.bestTime === null || game.elapsedSeconds < l.bestTime) l.bestTime = game.elapsedSeconds;
    l.currentStreak += 1;
    l.bestStreak = Math.max(l.bestStreak, l.currentStreak);
    if (game.mistakes === 0 && game.hintsUsed === 0) l.perfectGames += 1;
  } else {
    l.lost += 1;
    l.currentStreak = 0;
  }
  return s;
}

/** Values for display, e.g. win rate in percent and average time. */
export function summary(level) {
  return {
    ...level,
    winRate: level.played ? Math.round((level.won / level.played) * 100) : 0,
    averageTime: level.won ? Math.round(level.totalWinTime / level.won) : null,
  };
}
