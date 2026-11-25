// shots.js — frozen, deterministic scenes for the screenshots, reached with
// ?shot=<name>&seed=<n>. Each scene hand-builds a Kitchen state and the game
// renders it once, with no simulation running, so a capture is identical on
// every visit: cover (title), kitchen (mid-service), rush (the dinner peak)
// and results (the end-of-day screen).

import { Kitchen } from './kitchen.js';
import { DISHES } from './recipes.js';

function dish(id) {
  return DISHES.find((d) => d.id === id);
}

function ticket(id, dishId, patienceFrac) {
  const max = 40;
  return { id, dish: dish(dishId), patience: max * patienceFrac, maxPatience: max };
}

export function buildShotScene(name, seed) {
  const k = new Kitchen(seed);
  if (name === 'kitchen') {
    k.phase = 'playing';
    k.elapsed = 23;
    k.timeLeft = 97;
    k.coins = 48;
    k.combo = 2;
    k.bestCombo = 2;
    k.tickets = [ticket(1, 'burger', 0.72), ticket(2, 'salad', 0.45)];
    k.plate = [
      { id: 'bun', cooked: false }, { id: 'patty', cooked: true },
      { id: 'cheese', cooked: false }, { id: 'lettuce', cooked: false },
      { id: 'bun', cooked: false },
    ];
    k.stove[1] = { id: 'patty', t: 5.4 };
  } else if (name === 'rush') {
    k.phase = 'playing';
    k.elapsed = 77;
    k.timeLeft = 43;
    k.coins = 132;
    k.combo = 5;
    k.bestCombo = 5;
    k.strikes = 1;
    k.tickets = [ticket(1, 'deluxe', 0.55), ticket(2, 'pancakes', 0.3), ticket(3, 'club', 0.8)];
    k.plate = [
      { id: 'bread', cooked: false }, { id: 'egg', cooked: true }, { id: 'cheese', cooked: false },
    ];
    k.stove[0] = { id: 'batter', t: 6.4 };
    k.stove[1] = { id: 'patty', t: 2.8 };
    k.stove[2] = { id: 'egg', t: 8.9 };
  } else if (name === 'results') {
    k.phase = 'done';
    k.coins = 287;
    k.servedCount = 14;
    k.bestCombo = 7;
    k.strikes = 1;
    k.timeLeft = 0;
    k.endReason = 'Time! The lunch rush is over.';
  } else {
    k.phase = 'title'; // cover, and the fallback for any unknown scene
  }
  return k;
}
