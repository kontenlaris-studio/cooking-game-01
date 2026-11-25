// main.js — Sizzle Street's boot: canvas setup, pointer and keyboard input,
// the fixed-timestep loop, and the ?shot= path the screenshots are taken
// through. Rules live in kitchen.js, painting in draw.js, sound in sound.js.

import { Kitchen } from './kitchen.js';
import { drawGame, hitAreas, VIEW_W, VIEW_H } from './draw.js';
import { buildShotScene } from './shots.js';
import { SoundBank } from './sound.js';
import { BIN_ORDER } from './recipes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const sounds = new SoundBank();

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

let kitchen = shotName ? buildShotScene(shotName, seed) : new Kitchen(seed);

function playCue(cue) {
  if (cue && typeof sounds[cue] === 'function') sounds[cue]();
}

function announce() {
  if (!status) return;
  status.textContent = kitchen.phase === 'playing'
    ? `Sizzle Street: ${kitchen.coins} coins, ${kitchen.servedCount} dishes served, ${Math.ceil(kitchen.timeLeft)} seconds left.`
    : `Sizzle Street: ${kitchen.phase}.`;
}

// Map a pointer event to the game's 1280x800 view coordinates.
function viewPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function activate(area) {
  sounds.ensure();
  switch (area.action) {
    case 'start':
    case 'again':
      kitchen.startDay();
      break;
    case 'pause':
      if (kitchen.phase === 'playing') kitchen.phase = 'paused';
      else if (kitchen.phase === 'paused') kitchen.phase = 'playing';
      break;
    case 'mute':
      sounds.muted = !sounds.muted;
      break;
    case 'bin':
      playCue(kitchen.takeFromBin(area.id));
      break;
    case 'burner':
      playCue(kitchen.takeFromStove(area.index));
      break;
    case 'ticket':
      playCue(kitchen.serveTicket(area.index));
      break;
    case 'serve':
      playCue(kitchen.serveBestMatch());
      break;
    case 'clear':
      playCue(kitchen.clearPlate());
      break;
  }
  announce();
}

canvas.addEventListener('pointerdown', (event) => {
  const point = viewPoint(event);
  const areas = hitAreas(kitchen);
  for (let i = areas.length - 1; i >= 0; i--) {
    const r = areas[i].rect;
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
      activate(areas[i]);
      return;
    }
  }
  // A click anywhere on the title screen also starts the day.
  if (kitchen.phase === 'title') { sounds.ensure(); kitchen.startDay(); announce(); }
});

window.addEventListener('blur', () => {
  // Never let a day burn down while the cook is looking at another window.
  if (kitchen.phase === 'playing') kitchen.phase = 'paused';
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (kitchen.phase === 'title' || kitchen.phase === 'done')) {
    sounds.ensure(); kitchen.startDay(); announce(); return;
  }
  if (kitchen.phase !== 'playing' && kitchen.phase !== 'paused') return;
  const key = event.key.toLowerCase();
  if (key === 'p' || key === 'escape') {
    kitchen.phase = kitchen.phase === 'playing' ? 'paused' : 'playing';
  } else if (key === 'm') {
    sounds.ensure(); sounds.muted = !sounds.muted;
  } else if (kitchen.phase === 'playing' && /^[0-9]$/.test(key)) {
    const index = key === '0' ? 9 : Number(key) - 1;
    playCue(kitchen.takeFromBin(BIN_ORDER[index]));
  } else if (kitchen.phase === 'playing' && key === ' ') {
    event.preventDefault();
    playCue(kitchen.serveBestMatch());
  } else if (kitchen.phase === 'playing' && (key === 'backspace' || key === 'delete')) {
    event.preventDefault();
    playCue(kitchen.clearPlate());
  }
  announce();
});

if (shotName) {
  // Screenshot path: paint the frozen scene and say when it is on screen.
  drawGame(ctx, kitchen, sounds.muted, 100);
  requestAnimationFrame(() => {
    drawGame(ctx, kitchen, sounds.muted, 100);
    document.body.dataset.shotReady = '1';
  });
} else {
  const STEP = 1 / 60;
  let last = performance.now();
  let accumulator = 0;
  let announcedSecond = -1;
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      kitchen.update(STEP);
      accumulator -= STEP;
    }
    sounds.setSizzleLevel(kitchen.phase === 'playing' ? kitchen.cookingCount() : 0);
    drawGame(ctx, kitchen, sounds.muted, now);
    const wholeSecond = Math.ceil(kitchen.timeLeft);
    if (wholeSecond !== announcedSecond) { announcedSecond = wholeSecond; announce(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
