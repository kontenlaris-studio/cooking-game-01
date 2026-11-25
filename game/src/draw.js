// draw.js — everything Sizzle Street paints: the kitchen, tickets, stove,
// plate stack, bins, title and results screens. All art is drawn in code with
// canvas shapes; there are no image assets. LAYOUT is shared with main.js so
// the rectangles a player clicks are exactly the ones drawn here.

import { BIN_ORDER, INGREDIENTS, dishLayers } from './recipes.js';
import { BURNERS, MAX_STRIKES, cookStage, COOK_BURNT } from './kitchen.js';

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 58 },
  pauseBtn: { x: 1152, y: 10, w: 38, h: 38 },
  muteBtn: { x: 1200, y: 10, w: 38, h: 38 },
  board: { x: 16, y: 74, w: 300, h: 486 },
  ticket: (i) => ({ x: 26, y: 84 + i * 122, w: 280, h: 114 }),
  stove: { x: 332, y: 74, w: 616, h: 218 },
  burner: (i) => ({ x: 420 + i * 205, y: 124, w: 110, h: 110 }),
  counter: { x: 332, y: 308, w: 616, h: 252 },
  plate: { x: 640, y: 468 },
  serveBtn: { x: 372, y: 500, w: 150, h: 46 },
  clearBtn: { x: 758, y: 500, w: 150, h: 46 },
  binsPanel: { x: 964, y: 74, w: 300, h: 486 },
  bin: (i) => ({
    x: 976 + (i % 2) * 146,
    y: 116 + Math.floor(i / 2) * 88,
    w: 134, h: 80,
  }),
  footer: { x: 16, y: 576, w: 1248, h: 208 },
  startBtn: { x: 490, y: 598, w: 300, h: 64 },
  againBtn: { x: 490, y: 640, w: 300, h: 58 },
};

// Every clickable rectangle for the current phase, as {action, index?, rect}.
export function hitAreas(kitchen) {
  const areas = [];
  if (kitchen.phase === 'title') {
    areas.push({ action: 'start', rect: LAYOUT.startBtn });
    return areas;
  }
  if (kitchen.phase === 'done') {
    areas.push({ action: 'again', rect: LAYOUT.againBtn });
    return areas;
  }
  areas.push({ action: 'pause', rect: LAYOUT.pauseBtn });
  areas.push({ action: 'mute', rect: LAYOUT.muteBtn });
  if (kitchen.phase !== 'playing') return areas;
  BIN_ORDER.forEach((id, i) => areas.push({ action: 'bin', index: i, id, rect: LAYOUT.bin(i) }));
  for (let i = 0; i < BURNERS; i++) areas.push({ action: 'burner', index: i, rect: LAYOUT.burner(i) });
  kitchen.tickets.forEach((ticket, i) => areas.push({ action: 'ticket', index: i, rect: LAYOUT.ticket(i) }));
  areas.push({ action: 'serve', rect: LAYOUT.serveBtn });
  areas.push({ action: 'clear', rect: LAYOUT.clearBtn });
  return areas;
}

// --- small canvas helpers ----------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px 'Trebuchet MS', 'Segoe UI', sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function star(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,0,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// One ingredient layer, drawn centred at (cx, cy) with the given width.
// Used for the plate stack, the stove pans and (small) the ticket stacks.
export function drawLayer(ctx, id, cooked, cx, cy, w) {
  const h = w * 0.16;
  ctx.save();
  ctx.translate(cx, cy);
  switch (id) {
    case 'bun': {
      // Bottom bun is a shallow heel; the same shape reads as the crown layer
      // when it sits on top of a stack (drawn with a dome there by caller order).
      ctx.fillStyle = '#e9a94f';
      rr(ctx, -w / 2, -h * 0.7, w, h * 1.4, h * 0.7); ctx.fill();
      ctx.fillStyle = '#f6c877';
      rr(ctx, -w / 2, -h * 0.7, w, h * 0.62, h * 0.6); ctx.fill();
      break;
    }
    case 'patty': {
      ctx.fillStyle = cooked ? '#7c4322' : '#a9607f';
      rr(ctx, -w / 2, -h * 0.75, w, h * 1.5, h * 0.75); ctx.fill();
      ctx.fillStyle = cooked ? '#96603a' : '#bd7f99';
      rr(ctx, -w / 2, -h * 0.75, w, h * 0.6, h * 0.6); ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7b731';
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h * 0.4);
      ctx.lineTo(w / 2, -h * 0.4);
      ctx.lineTo(w * 0.34, h * 0.85);
      ctx.lineTo(0, h * 0.3);
      ctx.lineTo(-w * 0.34, h * 0.85);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = -w / 2 + (i * w) / 8;
        const py = (i % 2 === 0 ? -h * 0.55 : h * 0.35);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineTo(w / 2, h * 0.8); ctx.lineTo(-w / 2, h * 0.8);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a75';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.15, w * 0.3, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#fff7e6';
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.46, h * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cooked ? '#f5a623' : '#f8d67c';
      ctx.beginPath(); ctx.arc(w * 0.08, 0, h * 0.62, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'greens': {
      ctx.fillStyle = '#3f9e4d';
      for (const dx of [-0.28, 0, 0.28]) {
        ctx.beginPath(); ctx.ellipse(w * dx, 0, w * 0.2, h * 0.8, dx, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#57c465';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.2, w * 0.22, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bread': {
      ctx.fillStyle = '#deb887';
      rr(ctx, -w / 2, -h * 0.8, w, h * 1.6, h * 0.5); ctx.fill();
      ctx.fillStyle = '#f3d9ae';
      rr(ctx, -w / 2 + 3, -h * 0.8 + 3, w - 6, h * 0.7, h * 0.4); ctx.fill();
      break;
    }
    case 'batter': {
      ctx.fillStyle = cooked ? '#dfa04e' : '#f0d9a8';
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cooked ? '#c9853a' : '#e6c88f';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.2, w * 0.3, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'syrup': {
      ctx.strokeStyle = '#b5651d';
      ctx.lineWidth = Math.max(2, h * 0.34);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.4, 0);
      ctx.bezierCurveTo(-w * 0.15, -h * 0.9, w * 0.15, h * 0.9, w * 0.4, -h * 0.2);
      ctx.stroke();
      break;
    }
    default:
      ctx.fillStyle = '#999';
      rr(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
  }
  ctx.restore();
}

// A bin icon: the ingredient resting in its counter tub.
function drawBinIcon(ctx, id, cx, cy, w) {
  if (id === 'egg') {
    ctx.fillStyle = '#fff7e6';
    ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.3, w * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 2; ctx.stroke();
  } else if (id === 'syrup') {
    ctx.fillStyle = '#b5651d';
    rr(ctx, cx - w * 0.16, cy - w * 0.34, w * 0.32, w * 0.6, 5); ctx.fill();
    ctx.fillStyle = '#8a4a12';
    rr(ctx, cx - w * 0.1, cy - w * 0.48, w * 0.2, w * 0.16, 3); ctx.fill();
  } else {
    drawLayer(ctx, id, id === 'patty' || id === 'batter' ? false : true, cx, cy, w * 0.92);
  }
}

// --- scene pieces --------------------------------------------------------------

function drawBackdrop(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#3a2417');
  grad.addColorStop(0.55, '#54341d');
  grad.addColorStop(1, '#2a170d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Chequered floor strip along the bottom.
  ctx.fillStyle = '#241209';
  ctx.fillRect(0, 566, VIEW_W, 234);
  ctx.fillStyle = 'rgba(255,220,170,0.05)';
  for (let x = 0; x < VIEW_W; x += 64)
    for (let y = 566; y < VIEW_H; y += 58)
      if (((x / 64) + ((y - 566) / 58)) % 2 < 1) ctx.fillRect(x, y, 64, 58);
}

function drawHud(ctx, k, muted) {
  ctx.fillStyle = '#1d0f0a';
  ctx.fillRect(LAYOUT.hud.x, LAYOUT.hud.y, LAYOUT.hud.w, LAYOUT.hud.h);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(0, 56, VIEW_W, 2);
  text(ctx, 'SIZZLE STREET', 22, 30, 24, '#ffb347', 'left', 900);

  const mins = Math.floor(k.timeLeft / 60);
  const secs = Math.floor(k.timeLeft % 60);
  const clock = `${mins}:${String(secs).padStart(2, '0')}`;
  text(ctx, `⏱ ${clock}`, 520, 30, 30, k.timeLeft <= 15 && k.phase === 'playing' ? '#ff6b5e' : '#fff3d6', 'center', 900);

  ctx.fillStyle = '#ffd94d';
  ctx.beginPath(); ctx.arc(716, 29, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a86e00';
  ctx.font = "900 13px 'Trebuchet MS', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 716, 30);
  text(ctx, String(k.coins), 736, 30, 26, '#ffd94d', 'left', 900);

  if (k.combo >= 2) text(ctx, `COMBO ×${k.comboMultiplier()}`, 900, 30, 22, '#ff9f43', 'center', 900);

  for (let i = 0; i < MAX_STRIKES; i++) {
    text(ctx, '✕', 1024 + i * 30, 30, 24, i < k.strikes ? '#ff6b5e' : 'rgba(255,255,255,0.22)', 'center', 900);
  }

  for (const [rect, kind] of [[LAYOUT.pauseBtn, 'pause'], [LAYOUT.muteBtn, 'mute']]) {
    ctx.fillStyle = '#3a2417';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.fill();
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffe9c4';
    if (kind === 'pause') {
      ctx.fillRect(rect.x + 11, rect.y + 10, 6, 18);
      ctx.fillRect(rect.x + 22, rect.y + 10, 6, 18);
    } else {
      ctx.beginPath();
      ctx.moveTo(rect.x + 8, rect.y + 16);
      ctx.lineTo(rect.x + 15, rect.y + 16);
      ctx.lineTo(rect.x + 22, rect.y + 9);
      ctx.lineTo(rect.x + 22, rect.y + 29);
      ctx.lineTo(rect.x + 15, rect.y + 22);
      ctx.lineTo(rect.x + 8, rect.y + 22);
      ctx.closePath(); ctx.fill();
      if (muted) {
        ctx.strokeStyle = '#ff6b5e'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rect.x + 25, rect.y + 13); ctx.lineTo(rect.x + 34, rect.y + 25);
        ctx.moveTo(rect.x + 34, rect.y + 13); ctx.lineTo(rect.x + 25, rect.y + 25);
        ctx.stroke();
      }
    }
  }
}

function drawTicket(ctx, ticket, i, ready) {
  const r = LAYOUT.ticket(i);
  ctx.fillStyle = ready ? '#fff3b0' : '#fdf6e3';
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  ctx.strokeStyle = ready ? '#ffb347' : '#cbb98f';
  ctx.lineWidth = ready ? 3.5 : 1.5; ctx.stroke();
  text(ctx, ticket.dish.name.toUpperCase(), r.x + 12, r.y + 18, 15, '#5a3418', 'left', 900);
  text(ctx, `$${ticket.dish.price}`, r.x + r.w - 12, r.y + 18, 15, '#a86e00', 'right', 900);

  const layers = dishLayers(ticket.dish);
  const step = Math.min(12, 60 / layers.length);
  layers.forEach((layer, li) => {
    drawLayer(ctx, layer.id, layer.cooked, r.x + 44, r.y + 94 - li * step, 58);
  });
  ctx.fillStyle = 'rgba(90,52,24,0.75)';
  ctx.font = "600 11px 'Trebuchet MS', sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const names = layers.map((l) => INGREDIENTS[l.id].label + (l.cooked ? ' (cooked)' : '')).join(' · ');
  wrapText(ctx, names, r.x + 88, r.y + 48, r.w - 100, 14);

  const frac = Math.max(0, ticket.patience / ticket.maxPatience);
  ctx.fillStyle = '#e5d9bd';
  rr(ctx, r.x + 88, r.y + r.h - 20, r.w - 100, 9, 4); ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#f7b731' : '#e74c3c';
  if (frac > 0) { rr(ctx, r.x + 88, r.y + r.h - 20, (r.w - 100) * frac, 9, 4); ctx.fill(); }
  if (ready) text(ctx, 'READY — CLICK TO SERVE!', r.x + 88, r.y + r.h - 34, 11.5, '#b3541e', 'left', 900);
}

function wrapText(ctx, str, x, y, maxW, lineH) {
  const words = str.split(' ');
  let line = '';
  let ly = y;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && line) {
      ctx.fillText(line, x, ly);
      line = word;
      ly += lineH;
    } else line = trial;
  }
  if (line) ctx.fillText(line, x, ly);
}

function drawBoard(ctx, k) {
  const b = LAYOUT.board;
  ctx.fillStyle = '#6b4423';
  rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.fillStyle = '#54331a';
  rr(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 16, 9); ctx.fill();
  text(ctx, 'ORDER BOARD', b.x + b.w / 2, b.y + 22, 17, '#ffcf87', 'center', 900);
  if (k.tickets.length === 0) text(ctx, 'waiting for orders…', b.x + b.w / 2, b.y + 90, 15, '#d9b98a');
  const readyIdx = k.matchingTicketIndex();
  k.tickets.forEach((ticket, i) => drawTicket(ctx, ticket, i, i === readyIdx));
}

function drawStove(ctx, k) {
  const s = LAYOUT.stove;
  ctx.fillStyle = '#2e2a33';
  rr(ctx, s.x, s.y, s.w, s.h, 12); ctx.fill();
  ctx.fillStyle = '#3c3742';
  rr(ctx, s.x + 8, s.y + 8, s.w - 16, 44, 8); ctx.fill();
  text(ctx, 'STOVE — click a bin to start cooking, click the pan in the golden window', s.x + s.w / 2, s.y + 30, 14.5, '#cfc4de', 'center', 700);

  for (let i = 0; i < BURNERS; i++) {
    const r = LAYOUT.burner(i);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const item = k.stove[i];
    ctx.fillStyle = '#191720';
    ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = item ? '#ff7b3d' : '#575064';
    ctx.lineWidth = 3; ctx.stroke();
    if (item) {
      const stage = cookStage(item.t);
      // Pan and the food in it.
      ctx.fillStyle = '#454049';
      ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
      if (stage === 'burnt') {
        ctx.fillStyle = '#17130f';
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200,200,200,0.5)';
        for (const [dx, dy, rad] of [[-12, -34, 7], [4, -44, 9], [16, -32, 6]]) {
          ctx.beginPath(); ctx.arc(cx + dx, cy + dy, rad, 0, Math.PI * 2); ctx.fill();
        }
        text(ctx, 'BURNT!', cx, cy + 56, 13, '#ff6b5e', 'center', 900);
      } else {
        drawLayer(ctx, item.id, stage !== 'raw', cx, cy, 64);
        // Progress ring: orange while raw, green in the golden window.
        const frac = Math.min(1, item.t / COOK_BURNT);
        ctx.strokeStyle = stage === 'golden' ? '#2ecc71' : stage === 'overdone' ? '#e67e22' : '#f39c12';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 48, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();
        text(ctx, stage === 'golden' ? 'PERFECT — CLICK!' : stage === 'overdone' ? 'GETTING DARK…' : 'cooking…', cx, cy + 56, 12.5, stage === 'golden' ? '#2ecc71' : '#cfc4de', 'center', 800);
      }
    } else {
      text(ctx, 'empty', cx, cy, 13, '#7a7285');
    }
  }
}

function drawCounter(ctx, k) {
  const c = LAYOUT.counter;
  ctx.fillStyle = '#8a5a2e';
  rr(ctx, c.x, c.y, c.w, c.h, 12); ctx.fill();
  ctx.fillStyle = '#9c6a36';
  rr(ctx, c.x + 8, c.y + 8, c.w - 16, c.h - 16, 9); ctx.fill();
  text(ctx, 'ASSEMBLY COUNTER', c.x + c.w / 2, c.y + 24, 15, '#ffe1ae', 'center', 900);

  const p = LAYOUT.plate;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 118, 20, 0, 0, Math.PI * 2); ctx.fill();
  const ready = k.matchingTicketIndex() !== -1;
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 112, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ddd6c8';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 84, 16, 0, 0, Math.PI * 2); ctx.fill();
  if (ready) {
    ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 118, 27, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const step = Math.min(15, 120 / Math.max(1, k.plate.length));
  k.plate.forEach((layer, i) => drawLayer(ctx, layer.id, layer.cooked, p.x, p.y - 2 - i * step, 150));
  if (k.plate.length === 0) text(ctx, 'your plate is empty', p.x, p.y - 14, 14, 'rgba(255,240,214,0.8)');
  if (ready) text(ctx, 'A DISH IS READY TO SERVE!', p.x, c.y + 52, 16, '#ffd94d', 'center', 900);

  drawButton(ctx, LAYOUT.serveBtn, 'SERVE ✓', ready ? '#2e9e4f' : '#7a7a7a');
  drawButton(ctx, LAYOUT.clearBtn, 'CLEAR PLATE', '#a34d3a');
}

function drawButton(ctx, r, label, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, r.x, r.y + 4, r.w, r.h, 10); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 16, '#fff8ea', 'center', 900);
}

function drawBins(ctx, k) {
  const p = LAYOUT.binsPanel;
  ctx.fillStyle = '#6b4423';
  rr(ctx, p.x, p.y, p.w, p.h, 12); ctx.fill();
  ctx.fillStyle = '#54331a';
  rr(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, 9); ctx.fill();
  text(ctx, 'INGREDIENTS', p.x + p.w / 2, p.y + 22, 17, '#ffcf87', 'center', 900);
  BIN_ORDER.forEach((id, i) => {
    const r = LAYOUT.bin(i);
    ctx.fillStyle = '#fdf6e3';
    rr(ctx, r.x, r.y, r.w, r.h, 9); ctx.fill();
    drawBinIcon(ctx, id, r.x + r.w / 2, r.y + 30, 52);
    text(ctx, INGREDIENTS[id].label, r.x + r.w / 2, r.y + 62, 13.5, '#5a3418', 'center', 800);
    if (INGREDIENTS[id].needsStove) text(ctx, 'stove', r.x + r.w - 16, r.y + 13, 10.5, '#e67e22', 'center', 900);
    text(ctx, String((i + 1) % 10), r.x + 13, r.y + 13, 10.5, '#a08b62', 'center', 800);
  });
}

function drawFooter(ctx) {
  const f = LAYOUT.footer;
  ctx.fillStyle = 'rgba(20,10,5,0.55)';
  rr(ctx, f.x, f.y, f.w, f.h, 12); ctx.fill();
  text(ctx, 'HOW TO PLAY', f.x + 24, f.y + 26, 16, '#ffb347', 'left', 900);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = "600 14.5px 'Trebuchet MS', sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const lines = [
    '1. Read a ticket on the order board — the stack shows exactly what to build, bottom layer first.',
    '2. Click ingredient bins to stack the plate. Patties, eggs and pancakes go on the stove first: click the pan in the golden window to plate them cooked.',
    '3. Click the matching ticket (or SERVE) to serve. Fast serves earn tips; chained serves build a combo up to ×4.',
    '4. A wrong dish or an expired ticket is a strike — three strikes end the day. You have 120 seconds. Good luck, chef!',
  ];
  lines.forEach((line, i) => ctx.fillText(line, f.x + 24, f.y + 58 + i * 34));
}

function drawFloaters(ctx, k) {
  for (const f of k.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
    text(ctx, f.text, f.x, f.y - f.t * 46, 24, f.color, 'center', 900);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, k, blink) {
  drawBackdrop(ctx);
  ctx.fillStyle = 'rgba(20,10,5,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The hero burger: the menu's biggest stack, drawn large.
  const cx = 640;
  const baseY = 468;
  const hero = [
    { id: 'bun', cooked: false }, { id: 'patty', cooked: true }, { id: 'cheese', cooked: false },
    { id: 'tomato', cooked: false }, { id: 'lettuce', cooked: false }, { id: 'bun', cooked: false },
  ];
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(cx, baseY + 26, 240, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.ellipse(cx, baseY + 14, 228, 40, 0, 0, Math.PI * 2); ctx.fill();
  hero.forEach((layer, i) => drawLayer(ctx, layer.id, layer.cooked, cx, baseY - i * 30, 330));

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 5;
  text(ctx, 'SIZZLE STREET', cx, 118, 74, '#ffb347', 'center', 900);
  ctx.restore();
  text(ctx, 'a 120-second cooking rush', cx, 168, 24, '#ffe9c4', 'center', 700);

  drawButton(ctx, LAYOUT.startBtn, '▶  CLICK TO START', '#2e9e4f');
  if (blink) text(ctx, 'the lunch rush waits for no one…', cx, 700, 16, '#ffcf87');
  text(ctx, 'Build the ticket stacks, mind the stove, serve fast — three strikes and the day is done.', cx, 742, 16.5, '#ffe9c4');
}

function drawResults(ctx, k) {
  drawBackdrop(ctx);
  ctx.fillStyle = 'rgba(20,10,5,0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const panel = { x: 340, y: 120, w: 600, h: 430 };
  ctx.fillStyle = '#fdf6e3';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 16); ctx.fill();
  ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, 'END OF DAY', 640, panel.y + 48, 36, '#5a3418', 'center', 900);
  text(ctx, k.endReason || 'Time! The lunch rush is over.', 640, panel.y + 86, 15.5, '#8a6a45');

  const stars = k.starRating();
  for (let i = 0; i < 3; i++) star(ctx, 560 + i * 80, panel.y + 140, 30, i < stars ? '#ffd94d' : '#ddd2ba');

  const rows = [
    ['Coins earned', `$${k.coins}`],
    ['Dishes served', String(k.servedCount)],
    ['Best combo', `×${Math.max(1, Math.min(k.bestCombo, 4))}`],
    ['Strikes', `${k.strikes} / ${MAX_STRIKES}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = panel.y + 196 + i * 44;
    text(ctx, label, panel.x + 90, y, 19, '#5a3418', 'left', 700);
    text(ctx, value, panel.x + panel.w - 90, y, 21, '#a86e00', 'right', 900);
  });
  drawButton(ctx, LAYOUT.againBtn, '↻  PLAY AGAIN', '#2e9e4f');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(15,7,3,0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', 640, 380, 52, '#ffb347', 'center', 900);
  text(ctx, 'press P or click the pause button to keep cooking', 640, 428, 17, '#ffe9c4');
}

// The one entry point main.js calls every frame.
export function drawGame(ctx, k, muted, nowMs) {
  if (k.phase === 'title') { drawTitle(ctx, k, Math.floor(nowMs / 600) % 2 === 0); return; }
  if (k.phase === 'done') { drawResults(ctx, k); return; }
  ctx.save();
  if (k.shake > 0) {
    const mag = k.shake * 14;
    ctx.translate((Math.sin(nowMs * 0.09) * mag) / 2, (Math.cos(nowMs * 0.11) * mag) / 2);
  }
  drawBackdrop(ctx);
  drawHud(ctx, k, muted);
  drawBoard(ctx, k);
  drawStove(ctx, k);
  drawCounter(ctx, k);
  drawBins(ctx, k);
  drawFooter(ctx);
  drawFloaters(ctx, k);
  ctx.restore();
  if (k.phase === 'paused') drawPaused(ctx);
}
