import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const fuelEl = document.getElementById('fuel');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const GROUND_Y = H - 26;
const PAD_W = 104;
const MAXV = 3.6, MAX_HV = 3.2;
const THRUST = 0.055, ROT = 0.055, FUEL_DRAIN = 0.32;
const SAFE_VY = 1.1, SAFE_VX = 0.7, SAFE_ANGLE = 0.35;

let lander, padX, round, score, fuel, fuelMax, gravity, running = false, rafId = 0, last = 0;
let thrusting = false, msg = '', msgT = 0;

const stars = [];
for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * (GROUND_Y - 40), r: Math.random() * 1.4 + 0.4 });

const keys = {};
const ptr = new Map();

function init() {
  round = 0;
  score = 0;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['lander'] || 0;
  msg = ''; msgT = 0;
  newRound();
  draw();
}

function newRound() {
  const fuelStart = Math.max(45, 100 - round * 8);
  fuelMax = fuelStart;
  fuel = fuelStart;
  gravity = 0.012 + round * 0.0013;
  fuelEl.textContent = String(Math.round(fuel));
  padX = 40 + Math.random() * (W - 80 - PAD_W);
  lander = {
    x: 90 + Math.random() * (W - 180),
    y: 42,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 0.2,
    angle: 0
  };
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);

  const rotLeft = keys.left || zoneActive('left');
  const rotRight = keys.right || zoneActive('right');
  thrusting = (keys.up || zoneActive('thrust')) && fuel > 0;

  if (rotLeft) lander.angle -= ROT * s;
  if (rotRight) lander.angle += ROT * s;

  lander.vy += gravity * s;
  if (thrusting) {
    lander.vx += Math.sin(lander.angle) * THRUST * s;
    lander.vy -= Math.cos(lander.angle) * THRUST * s;
    fuel -= FUEL_DRAIN * s;
    if (fuel < 0) fuel = 0;
    fuelEl.textContent = String(Math.round(fuel));
  }

  lander.vy = Math.max(-MAXV, Math.min(MAXV, lander.vy));
  lander.vx = Math.max(-MAX_HV, Math.min(MAX_HV, lander.vx));

  lander.x += lander.vx * s;
  lander.y += lander.vy * s;

  if (lander.x < 14) { lander.x = 14; lander.vx = Math.abs(lander.vx) * 0.4; }
  if (lander.x > W - 14) { lander.x = W - 14; lander.vx = -Math.abs(lander.vx) * 0.4; }
  if (lander.y < 14) { lander.y = 14; if (lander.vy < 0) lander.vy = 0; }

  if (msgT > 0) msgT -= s;

  const bottom = lander.y + 11;
  if (bottom >= GROUND_Y) {
    lander.y = GROUND_Y - 11;
    const a = normAngle(lander.angle);
    const onPad = lander.x > padX && lander.x < padX + PAD_W;
    if (onPad && Math.abs(lander.vy) < SAFE_VY && Math.abs(lander.vx) < SAFE_VX && Math.abs(a) < SAFE_ANGLE) {
      score += 200;
      scoreEl.textContent = String(score);
      round++;
      msg = 'Pendaratan mulus! +200';
      msgT = 120;
      newRound();
    } else {
      finish('Meledak! 💥');
    }
  }
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050914');
  g.addColorStop(1, '#0b1224');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#9fb3c8';
  for (const st of stars) {
    ctx.globalAlpha = 0.4 + (st.r / 1.8) * 0.6;
    ctx.fillRect(st.x, st.y, st.r, st.r);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#2b3346';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#d1fae5';
  ctx.fillRect(padX, GROUND_Y - 4, PAD_W, 4);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 12px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('LANDASAN', padX + PAD_W / 2, GROUND_Y + 16);

  // teks info
  ctx.textAlign = 'left';
  ctx.font = '12px ui-sans-serif,system-ui';
  ctx.fillStyle = '#8b98a5';
  ctx.fillText('Vy: ' + lander.vy.toFixed(2), 14, 24);
  ctx.fillText('Vx: ' + lander.vx.toFixed(2), 14, 40);
  ctx.fillText('Ronde: ' + (round + 1), 14, 56);

  // bar bahan bakar
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(W - 154, 14, 140, 10);
  const fr = fuelMax > 0 ? fuel / fuelMax : 0;
  ctx.fillStyle = fr > 0.3 ? '#22d3ee' : '#ef4444';
  ctx.fillRect(W - 154, 14, 140 * fr, 10);

  drawLander();

  // tombol layar sentuh
  drawButton(10, H - 52, 100, 44, '◀', zoneActive('left'));
  drawButton(W / 2 - 70, H - 52, 140, 44, 'MESIN', zoneActive('thrust'));
  drawButton(W - 110, H - 52, 100, 44, '▶', zoneActive('right'));

  if (msgT > 0) {
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 16px ui-sans-serif,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, 90);
  }
}

function drawButton(x, y, w, h, label, active) {
  ctx.fillStyle = active ? 'rgba(34,211,238,.35)' : 'rgba(255,255,255,.06)';
  ctx.strokeStyle = active ? '#22d3ee' : '#3a4b60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + w - 10, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + 10);
  ctx.lineTo(x + w, y + h - 10);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 10, y + h);
  ctx.lineTo(x + 10, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 10);
  ctx.lineTo(x, y + 10);
  ctx.quadraticCurveTo(x, y, x + 10, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? '#e6edf3' : '#8b98a5';
  ctx.font = 'bold 14px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawLander() {
  ctx.save();
  ctx.translate(lander.x, lander.y);
  ctx.rotate(lander.angle);

  if (thrusting) {
    const flick = 0.6 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, 11);
    ctx.lineTo(0, 11 + 20 * flick);
    ctx.lineTo(6, 11);
    ctx.closePath();
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, 11);
    ctx.lineTo(0, 11 + 12 * flick);
    ctx.lineTo(3, 11);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
  }

  ctx.fillStyle = '#c7d2fe';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(11, 8);
  ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, -1, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, 8); ctx.lineTo(-13, 13);
  ctx.moveTo(10, 8); ctx.lineTo(13, 13);
  ctx.stroke();

  ctx.restore();
}

function loop(now) {
  if (!running) return;
  if (!last) last = now;
  let dt = now - last;
  last = now;
  if (dt > 50) dt = 50;
  update(dt);
  if (running) draw();
  rafId = requestAnimationFrame(loop);
}

function finish(title) {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('lander', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong> — ${round} pendaratan${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  last = 0;
  init();
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { keys.up = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = false;
});

function zoneFromXY(x, y) {
  if (y > H - 58) {
    if (x < W * 0.34) return 'left';
    if (x > W * 0.66) return 'right';
    return 'thrust';
  }
  return 'thrust';
}

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height)
  };
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const p = toCanvas(e);
  ptr.set(e.pointerId, zoneFromXY(p.x, p.y));
});
canvas.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return;
  const p = toCanvas(e);
  ptr.set(e.pointerId, zoneFromXY(p.x, p.y));
});
function dropPointer(e) { ptr.delete(e.pointerId); }
canvas.addEventListener('pointerup', dropPointer);
canvas.addEventListener('pointercancel', dropPointer);
canvas.addEventListener('pointerleave', dropPointer);

function zoneActive(z) {
  for (const v of ptr.values()) if (v === z) return true;
  return false;
}

startBtn.addEventListener('click', start);
init();
