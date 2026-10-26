import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const roundEl = document.getElementById('round');
const rollsEl = document.getElementById('rolls');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const DICE = 5, DIE = 84, GAP = 6;
const DICE_X0 = (W - (DICE * DIE + (DICE - 1) * GAP)) / 2;
const DICE_Y = 116;
const BTN_W = 200, BTN_H = 70, BTN_Y = 306;
const ROLL_BTN = { x: W / 2 - BTN_W - 10, y: BTN_Y, w: BTN_W, h: BTN_H };
const DONE_BTN = { x: W / 2 + 10, y: BTN_Y, w: BTN_W, h: BTN_H };

const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
};

let running = false, rafId = 0;
let dice, held, rollsLeft, round, total, message;
let rolling = false, rollEnd = 0, rollingFinals = [], locking = false, timer = 0;

function init() {
  running = false;
  clearTimeout(timer);
  cancelAnimationFrame(rafId);
  round = 1; total = 0; message = '';
  rolling = false; locking = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['dice'] || 0;
  setupRound();
  draw();
}

function setupRound() {
  dice = [1, 1, 1, 1, 1];
  held = [false, false, false, false, false];
  rollsLeft = 3;
  locking = false;
  performRoll();
  updateHud();
}

function updateHud() {
  roundEl.textContent = `${round}/5`;
  rollsEl.textContent = rollsLeft;
}

function performRoll() {
  if (rollsLeft <= 0 || rolling || locking) return;
  rolling = true;
  rollEnd = performance.now() + 520;
  rollingFinals = dice.map((v, i) => (held[i] ? v : 1 + ((Math.random() * 6) | 0)));
  rollsLeft--;
  updateHud();
}

function calcScore() {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const v of dice) counts[v]++;
  let bonus = 0, label = '';
  if (counts.some(c => c === 5)) { bonus = 50; label = 'Five of a kind!'; }
  else if (counts.some(c => c === 4)) { bonus = 25; label = 'Four of a kind!'; }
  else if (counts.includes(3) && counts.includes(2)) { bonus = 15; label = 'Full house!'; }
  const sum = dice.reduce((a, b) => a + b, 0);
  return { total: sum + bonus, label };
}

function finishRound() {
  if (!running || locking || rolling) return;
  const res = calcScore();
  total += res.total;
  scoreEl.textContent = total;
  locking = true;
  message = `Ronde ${round}: +${res.total}${res.label ? ' · ' + res.label : ''}`;
  draw();
  if (round >= 5) { timer = setTimeout(finish, 900); return; }
  timer = setTimeout(() => {
    if (!running) return;
    round++;
    setupRound();
    draw();
  }, 900);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDie(x, y, size, value, isHeld) {
  roundRect(x, y, size, size, 12);
  ctx.fillStyle = isHeld ? '#67e8f9' : '#e6edf3';
  ctx.fill();
  ctx.lineWidth = isHeld ? 4 : 2;
  ctx.strokeStyle = isHeld ? '#22d3ee' : '#223040';
  ctx.stroke();

  const pad = size * 0.2;
  const step = (size - pad * 2) / 2;
  ctx.fillStyle = '#0b0f14';
  for (const [gx, gy] of PIPS[value]) {
    ctx.beginPath();
    ctx.arc(x + pad + gx * step, y + pad + gy * step, size * 0.085, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawButton(b, label, enabled) {
  roundRect(b.x, b.y, b.w, b.h, 12);
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  if (enabled) { g.addColorStop(0, '#22d3ee'); g.addColorStop(1, '#a855f7'); }
  else { g.addColorStop(0, '#2b3b4d'); g.addColorStop(1, '#223040'); }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = enabled ? '#04121a' : '#8b98a5';
  ctx.font = '800 22px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8b98a5';
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(`Ronde ${round} dari 5`, W / 2, 44);

  for (let i = 0; i < DICE; i++) {
    const x = DICE_X0 + i * (DIE + GAP);
    const v = (rolling && !held[i]) ? 1 + ((Math.random() * 6) | 0) : dice[i];
    drawDie(x, DICE_Y, DIE, v, held[i]);
  }

  ctx.fillStyle = message ? '#22d3ee' : '#8b98a5';
  ctx.font = message ? '700 18px ui-sans-serif, system-ui, sans-serif' : '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(message || 'Klik dadu untuk tahan atau lepas', W / 2, 245);

  drawButton(ROLL_BTN, 'Lempar', !rolling && !locking && rollsLeft > 0);
  drawButton(DONE_BTN, 'Selesai', !rolling && !locking);
}

function loop(now) {
  if (!running) return;
  if (rolling && now >= rollEnd) {
    dice = rollingFinals.slice();
    rolling = false;
    if (rollsLeft === 0 && !locking) finishRound();
  }
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  clearTimeout(timer);
  cancelAnimationFrame(rafId);
  const res = submitScore('dice', total);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${total}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  rafId = requestAnimationFrame(loop);
}

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

canvas.addEventListener('pointerdown', e => {
  if (!running || locking) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);

  if (y >= DICE_Y && y <= DICE_Y + DIE) {
    for (let i = 0; i < DICE; i++) {
      const dx = DICE_X0 + i * (DIE + GAP);
      if (x >= dx && x <= dx + DIE) { held[i] = !held[i]; draw(); return; }
    }
  }
  if (hit(ROLL_BTN, x, y)) { performRoll(); draw(); return; }
  if (hit(DONE_BTN, x, y)) { finishRound(); return; }
});

document.addEventListener('keydown', e => {
  if (!running || locking) return;
  if (e.code === 'Space') { e.preventDefault(); performRoll(); }
  else if (e.code === 'Enter') { e.preventDefault(); finishRound(); }
});

startBtn.addEventListener('click', start);
init();
