import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 14, CELL = 34, BOARD = N * CELL;
const COLORS = ['#22d3ee', '#a855f7', '#22c55e', '#ef4444', '#f97316', '#3b82f6'];
const MAX_MOVES = 25;
const SW_GAP = 4, SW = (BOARD - SW_GAP * (COLORS.length - 1)) / COLORS.length;
const PAL_TOP = BOARD + 14, PAL_H = 44;
const W = BOARD, H = PAL_TOP + PAL_H + 10;
canvas.width = W; canvas.height = H;

let grid, moves, running, score;

function regionCells() {
  const target = grid[0];
  const seen = new Uint8Array(N * N);
  seen[0] = 1;
  const stack = [0];
  const out = [];
  while (stack.length) {
    const i = stack.pop(); out.push(i);
    const r = Math.floor(i / N), c = i % N;
    if (r > 0 && !seen[i - N] && grid[i - N] === target) { seen[i - N] = 1; stack.push(i - N); }
    if (r < N - 1 && !seen[i + N] && grid[i + N] === target) { seen[i + N] = 1; stack.push(i + N); }
    if (c > 0 && !seen[i - 1] && grid[i - 1] === target) { seen[i - 1] = 1; stack.push(i - 1); }
    if (c < N - 1 && !seen[i + 1] && grid[i + 1] === target) { seen[i + 1] = 1; stack.push(i + 1); }
  }
  return out;
}
function swRect(i) { return { x: i * (SW + SW_GAP), y: PAL_TOP, w: SW, h: PAL_H }; }

function init() {
  grid = Array.from({ length: N * N }, () => (Math.random() * COLORS.length) | 0);
  moves = 0; score = 0; running = false;
  scoreEl.textContent = 0;
  movesEl.textContent = '0/' + MAX_MOVES;
  bestEl.textContent = getProgress().bestScores['floodfill'] || 0;
  draw();
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    ctx.fillStyle = COLORS[grid[i]];
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    ctx.strokeStyle = '#0b0f14'; ctx.lineWidth = 1;
    ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
  }
  const owned = grid[0];
  for (let i = 0; i < COLORS.length; i++) {
    const rc = swRect(i);
    ctx.fillStyle = COLORS[i];
    roundRect(rc.x, rc.y, rc.w, rc.h, 8);
    ctx.fill();
    ctx.strokeStyle = i === owned ? '#e6edf3' : 'transparent';
    ctx.lineWidth = 3;
    ctx.stroke();
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

function finish(won) {
  running = false;
  const covered = regionCells().length;
  score = covered * 2 + (MAX_MOVES - moves) * 20;
  scoreEl.textContent = score;
  const res = submitScore('floodfill', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${won ? 'Papan terbanjiri! 🎉' : 'Langkah habis!'}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Terisi ${covered}/${N * N} kotak · ${moves} langkah</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function choose(color) {
  if (!running) return;
  if (color === grid[0]) return;
  const cells = regionCells();
  for (const i of cells) grid[i] = color;
  moves++;
  movesEl.textContent = moves + '/' + MAX_MOVES;
  draw();
  const covered = regionCells().length;
  if (covered === N * N) { finish(true); return; }
  if (moves >= MAX_MOVES) finish(false);
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
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  if (y < PAL_TOP || y > PAL_TOP + PAL_H) return;
  const idx = Math.floor(x / (SW + SW_GAP));
  if (idx >= 0 && idx < COLORS.length && x <= swRect(idx).x + SW) choose(idx);
});

startBtn.addEventListener('click', start);
init();
