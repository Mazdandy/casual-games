import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const CELL = 40, COLS = W / CELL, ROWS = H / CELL;
const START_ROW = ROWS - 1, GOAL_ROW = 0, LANE_TOP = 1, LANE_BOT = ROWS - 2;

let lanes, frog, score, lives, running, rafId, lastTime, touchStart;

function makeLane(row) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const speed = 55 + Math.random() * 75;
  const gap = 150 + Math.random() * 90;
  const cars = [];
  const n = Math.floor(W / gap) + 1;
  for (let i = 0; i < n; i++) {
    const w = Math.random() < 0.3 ? 72 : 40;
    cars.push({ x: i * gap - Math.random() * 30, w, h: 30 });
  }
  return { row, dir, speed, cars };
}

function buildLanes() {
  lanes = [];
  for (let r = LANE_TOP; r <= LANE_BOT; r++) lanes.push(makeLane(r));
}

function init() {
  buildLanes();
  frog = { col: Math.floor(COLS / 2), row: START_ROW };
  score = 0; lives = 3; lastTime = 0; touchStart = null;
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  bestEl.textContent = getProgress().bestScores['frogger'] || 0;
  draw();
}

function resetFrog() {
  frog.col = Math.floor(COLS / 2);
  frog.row = START_ROW;
}

function loseLife() {
  lives--; livesEl.textContent = lives;
  if (lives <= 0) { finish(); return; }
  resetFrog();
}

function speedUp() {
  lanes.forEach(l => { l.speed = Math.min(260, l.speed * 1.15); });
}

function move(dc, dr) {
  if (!running) return;
  frog.col = Math.max(0, Math.min(COLS - 1, frog.col + dc));
  frog.row = Math.max(0, Math.min(ROWS - 1, frog.row + dr));
  if (frog.row === GOAL_ROW) {
    score += 100; scoreEl.textContent = score;
    resetFrog();
    speedUp();
  }
}

function update(dt) {
  for (const l of lanes) {
    for (const c of l.cars) {
      c.x += l.dir * l.speed * dt;
      if (l.dir > 0 && c.x > W) c.x = -c.w - Math.random() * 40;
      if (l.dir < 0 && c.x + c.w < 0) c.x = W + Math.random() * 40;
    }
  }
  const fx = frog.col * CELL + 7, fy = frog.row * CELL + 7, fw = CELL - 14, fh = CELL - 14;
  for (const l of lanes) {
    if (l.row !== frog.row) continue;
    const cy = l.row * CELL + (CELL - 30) / 2;
    for (const c of l.cars) {
      if (fx < c.x + c.w && fx + fw > c.x && fy < cy + c.h && fy + fh > cy) { loseLife(); return; }
    }
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, GOAL_ROW * CELL, W, CELL);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, START_ROW * CELL, W, CELL);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, LANE_TOP * CELL, W, (LANE_BOT - LANE_TOP + 1) * CELL);

  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
  for (let r = LANE_TOP; r <= LANE_BOT + 1; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
  }

  for (const l of lanes) {
    const cy = l.row * CELL + (CELL - 30) / 2;
    for (const c of l.cars) {
      ctx.fillStyle = l.dir > 0 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(c.x, cy, c.w, c.h);
      ctx.fillStyle = '#111827';
      ctx.fillRect(c.x + c.w * 0.25, cy + 4, c.w * 0.18, c.h - 8);
      ctx.fillRect(c.x + c.w * 0.58, cy + 4, c.w * 0.18, c.h - 8);
    }
  }

  const fx = frog.col * CELL, fy = frog.row * CELL;
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(fx + 7, fy + 9, CELL - 14, CELL - 16);
  ctx.beginPath(); ctx.arc(fx + 15, fy + 13, 5, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(fx + CELL - 15, fy + 13, 5, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#0b0f14';
  ctx.beginPath(); ctx.arc(fx + 15, fy + 12, 2, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(fx + CELL - 15, fy + 12, 2, 0, 6.283); ctx.fill();
}

function loop(now) {
  if (!running) return;
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('frogger', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') { move(0, -1); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { move(0, 1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move(-1, 0); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { move(1, 0); e.preventDefault(); }
});

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  touchStart = { x: e.clientX, y: e.clientY };
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointerup', e => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 18) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    const y = (e.clientY - r.top) * (H / r.height);
    const dc = Math.round(x / CELL) - frog.col;
    const dr = Math.round(y / CELL) - frog.row;
    if (Math.abs(dc) >= Math.abs(dr)) move(Math.sign(dc), 0);
    else move(0, Math.sign(dr));
  } else if (Math.abs(dx) > Math.abs(dy)) {
    move(Math.sign(dx), 0);
  } else {
    move(0, Math.sign(dy));
  }
});
canvas.addEventListener('pointercancel', () => { touchStart = null; });

startBtn.addEventListener('click', start);
init();
