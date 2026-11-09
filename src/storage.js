// Saves the running game, the statistics and settings on the device.
// Every access is wrapped in try/catch because storage can be unavailable
// (e.g. private browsing). The app still works then, it just forgets.

import { emptyStats } from './logic/stats.js';

const KEYS = { game: 'sudoku.game.v1', stats: 'sudoku.stats.v1', settings: 'sudoku.settings.v1' };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage not available */
  }
}

export const loadGame = () => read(KEYS.game, null);
export const saveGame = (game) => write(KEYS.game, game);

export const loadStats = () => ({ ...emptyStats(), ...read(KEYS.stats, {}) });
export const saveStats = (stats) => write(KEYS.stats, stats);

export const loadSettings = () => ({ statsTab: 'mittel', theme: 'clover', ...read(KEYS.settings, {}) });
export const saveSettings = (settings) => write(KEYS.settings, settings);
