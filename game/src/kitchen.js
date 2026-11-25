// kitchen.js — the Sizzle Street simulation: tickets, patience, the stove,
// the plate being stacked, coins, combos and strikes. Pure state and rules;
// drawing lives in draw.js and input in main.js, so a day here can be stepped
// headlessly and always plays out the same for a given seed.

import { DISHES, INGREDIENTS, plateMatchesDish } from './recipes.js';
import { makeRng, pickRandom } from './random.js';

export const DAY_SECONDS = 120;
export const MAX_TICKETS = 4;
export const BURNERS = 3;
export const MAX_STRIKES = 3;

// Stove timing, in seconds on a burner: raw until READY, golden (perfect to
// take) until PERFECT_END, then overdone, and charcoal after BURNT.
export const COOK_READY = 4.0;
export const COOK_PERFECT_END = 7.5;
export const COOK_BURNT = 9.5;

export function cookStage(seconds) {
  if (seconds < COOK_READY) return 'raw';
  if (seconds < COOK_PERFECT_END) return 'golden';
  if (seconds < COOK_BURNT) return 'overdone';
  return 'burnt';
}

let nextTicketId = 1;

export class Kitchen {
  constructor(seed) {
    this.rng = makeRng(seed);
    this.phase = 'title'; // title | playing | paused | done
    this.resetDay();
  }

  resetDay() {
    this.timeLeft = DAY_SECONDS;
    this.elapsed = 0;
    this.coins = 0;
    this.servedCount = 0;
    this.strikes = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.tickets = [];
    this.plate = [];
    this.stove = new Array(BURNERS).fill(null);
    this.spawnIn = 0.8;
    this.floaters = [];
    this.shake = 0;
    this.endReason = '';
  }

  startDay() {
    this.resetDay();
    this.phase = 'playing';
    this.dealTicket();
    this.dealTicket();
  }

  comboMultiplier() {
    return Math.max(1, Math.min(this.combo, 4));
  }

  patienceForNewTicket() {
    // Later tickets are ruder: patience shrinks as the day heats up.
    return Math.max(30, 46 - this.elapsed * 0.11);
  }

  spawnInterval() {
    return Math.max(3.4, 7.2 - this.elapsed * 0.032);
  }

  dealTicket() {
    if (this.tickets.length >= MAX_TICKETS) return;
    const dish = pickRandom(this.rng, DISHES);
    const patience = this.patienceForNewTicket();
    this.tickets.push({ id: nextTicketId++, dish, patience, maxPatience: patience });
  }

  // --- player actions; each returns a sound cue name or null ---------------

  takeFromBin(id) {
    if (this.phase !== 'playing') return null;
    if (INGREDIENTS[id].needsStove) {
      const free = this.stove.indexOf(null);
      if (free === -1) return 'buzz';
      this.stove[free] = { id, t: 0 };
      return 'place';
    }
    if (this.plate.length >= 7) return 'buzz';
    this.plate.push({ id, cooked: false });
    return 'pop';
  }

  takeFromStove(index) {
    if (this.phase !== 'playing') return null;
    const item = this.stove[index];
    if (!item) return null;
    this.stove[index] = null;
    if (cookStage(item.t) === 'burnt') return 'thud'; // straight into the bin
    if (this.plate.length >= 7) return 'buzz';
    this.plate.push({ id: item.id, cooked: item.t >= COOK_READY });
    return 'pop';
  }

  clearPlate() {
    if (this.phase !== 'playing' || this.plate.length === 0) return null;
    this.plate = [];
    return 'thud';
  }

  matchingTicketIndex() {
    return this.tickets.findIndex((ticket) => plateMatchesDish(this.plate, ticket.dish));
  }

  serveTicket(index) {
    if (this.phase !== 'playing') return null;
    const ticket = this.tickets[index];
    if (!ticket || this.plate.length === 0) return null;
    if (!plateMatchesDish(this.plate, ticket.dish)) {
      this.registerMistake(ticket, 'WRONG DISH');
      return 'buzz';
    }
    const tip = Math.round(8 * (ticket.patience / ticket.maxPatience));
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const earned = (ticket.dish.price + tip) * this.comboMultiplier();
    this.coins += earned;
    this.servedCount += 1;
    // The +coins floater rises from the ticket that was just served.
    this.floaters.push({ text: `+${earned}`, x: 166, y: 120 + index * 122, t: 0, color: '#ffd94d' });
    this.tickets.splice(index, 1);
    this.plate = [];
    if (this.tickets.length < 2) this.dealTicket();
    return 'ding';
  }

  serveBestMatch() {
    const index = this.matchingTicketIndex();
    if (index === -1) return 'buzz';
    return this.serveTicket(index);
  }

  registerMistake(ticket, label) {
    this.strikes += 1;
    this.combo = 0;
    this.shake = 0.35;
    this.floaters.push({ text: label, x: 640, y: 300, t: 0, color: '#ff6b5e' });
    if (this.strikes >= MAX_STRIKES) this.endDay('Three strikes — the street went hungry.');
  }

  endDay(reason) {
    this.phase = 'done';
    this.endReason = reason;
  }

  starRating() {
    if (this.coins >= 280) return 3;
    if (this.coins >= 180) return 2;
    if (this.coins >= 90) return 1;
    return 0;
  }

  cookingCount() {
    return this.stove.filter(Boolean).length;
  }

  // --- fixed-step simulation ------------------------------------------------

  update(dt) {
    for (const floater of this.floaters) floater.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 1.1);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.phase !== 'playing') return;

    this.elapsed += dt;
    this.timeLeft = Math.max(0, DAY_SECONDS - this.elapsed);

    for (const slot of this.stove) if (slot) slot.t += dt;

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.dealTicket();
      this.spawnIn = this.spawnInterval() * (0.75 + this.rng() * 0.5);
    }

    for (let i = this.tickets.length - 1; i >= 0; i--) {
      const ticket = this.tickets[i];
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        this.tickets.splice(i, 1);
        this.floaters.push({ text: 'TOO LATE!', x: 166, y: 140 + i * 126, t: 0, color: '#ff6b5e' });
        this.registerMistake(ticket, 'TOO LATE');
        if (this.phase !== 'playing') return;
      }
    }

    if (this.timeLeft <= 0) this.endDay('Time! The lunch rush is over.');
  }
}
