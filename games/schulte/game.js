import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const nextEl = document.getElementById('next');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W;
canvas.height = H;

const N = 5, CELL = W / N;
const TOTAL = N * N;

let grid, next, score, startTime, wrong, wrongT, running = false, rafId = 0, last = 0;

function init() {
  const nums = Array.from({ length: TOTAL }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = nums[i]; nums[i] = nums[j]; nums[j] = tmp;
  }
  grid = nums;
  next = 1;
  score = 0;
  wrong = -1;
  wrongT = 0;
  scoreEl.textContent = '0';
  nextEl.textContent = '1';
  bestEl.textContent = getProgress().bestScores['schulte'] || 0;
  startTime = performance.now();
  draw();
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < TOTAL; i++) {
    const c = i % N, r = (i / N) | 0;
    const x = c * CELL, y = r * CELL;
    ctx.fillStyle = i === wrong ? '#7f1d1d' : '#131a22';
    ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3.5, y + 3.5, CELL - 7, CELL - 7);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 34px ui-sans-serif,system-ui';
    ctx.fillText(String(grid[i]), x + CELL / 2, y + CELL / 2);
  }
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;

  const elapsed = (now - startTime) / 1000;
  score = Math.max(0, Math.round(1000 - elapsed * 20));
  scoreEl.textContent = score;

  if (wrongT > 0) { wrongT -= dt; if (wrongT <= 0) wrong = -1; }

  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const elapsed = (performance.now() - startTime) / 1000;
  score = Math.max(0, Math.round(1000 - elapsed * 20));
  scoreEl.textContent = score;
  draw();
  const res = submitScore('schulte', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Waktu: <strong>${elapsed.toFixed(1)}s</strong></p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (c < 0 || c >= N || r < 0 || r >= N) return;
  const idx = r * N + c;
  if (grid[idx] === next) {
    if (next >= TOTAL) { finish(); return; }
    next++;
    nextEl.textContent = next;
  } else {
    wrong = idx;
    wrongT = 0.35;
  }
});

startBtn.addEventListener('click', start);
init();
