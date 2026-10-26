import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 5, PAD = 12, GAP = 8;
const CELL = (480 - PAD * 2 - GAP * (N - 1)) / N;
const S = 480;
canvas.width = S; canvas.height = S;

let grid, moves, score, running;

function toggleAt(i) {
  const r = Math.floor(i / N), c = i % N;
  const cells = [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
  for (const [rr, cc] of cells) {
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) grid[rr * N + cc] = !grid[rr * N + cc];
  }
}
function allOff() { return grid.every(v => !v); }

function init() {
  grid = Array.from({ length: N * N }, () => false);
  const times = 6 + ((Math.random() * 6) | 0);
  for (let k = 0; k < times; k++) toggleAt((Math.random() * N * N) | 0);
  if (allOff()) toggleAt(12);
  moves = 0; score = 0; running = false;
  scoreEl.textContent = 0;
  movesEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['lightsout'] || 0;
  draw();
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const x = PAD + c * (CELL + GAP), y = PAD + r * (CELL + GAP);
    if (grid[i]) {
      const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      g.addColorStop(0, '#22d3ee'); g.addColorStop(1, '#a855f7');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = '#1b2733';
    }
    roundRect(x, y, CELL, CELL, 10);
    ctx.fill();
    if (!grid[i]) {
      ctx.fillStyle = '#223040';
      roundRect(x + 6, y + 6, CELL - 12, CELL - 12, 8);
      ctx.fill();
    }
  }
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

function finish() {
  running = false;
  score = Math.max(100, 1000 - moves * 20);
  scoreEl.textContent = score;
  const res = submitScore('lightsout', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Padam semua! 🎉</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Langkah: ${moves}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  running = true;
  overlay.classList.add('hidden');
  draw();
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!running) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (S / r.width);
  const y = (e.clientY - r.top) * (S / r.height);
  const c = Math.floor((x - PAD) / (CELL + GAP));
  const rr = Math.floor((y - PAD) / (CELL + GAP));
  if (c < 0 || c >= N || rr < 0 || rr >= N) return;
  if (x > PAD + c * (CELL + GAP) + CELL || y > PAD + rr * (CELL + GAP) + CELL) return;
  toggleAt(rr * N + c);
  moves++;
  movesEl.textContent = moves;
  draw();
  if (allOff()) finish();
});

startBtn.addEventListener('click', start);
init();
