import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const COLS = 7, ROWS = 6, CELL = 60;
const W = COLS * CELL, H = ROWS * CELL;
canvas.width = W; canvas.height = H;

let grid, score, running, busy;

function init() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0; running = true; busy = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['connect4'] || 0;
  draw();
}

function dropRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) if (!grid[r][col]) return r;
  return -1;
}

function hasWin(p) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] !== p) continue;
    if (c + 3 < COLS && grid[r][c+1] === p && grid[r][c+2] === p && grid[r][c+3] === p) return true;
    if (r + 3 < ROWS && grid[r+1][c] === p && grid[r+2][c] === p && grid[r+3][c] === p) return true;
    if (r + 3 < ROWS && c + 3 < COLS && grid[r+1][c+1] === p && grid[r+2][c+2] === p && grid[r+3][c+3] === p) return true;
    if (r - 3 >= 0 && c + 3 < COLS && grid[r-1][c+1] === p && grid[r-2][c+2] === p && grid[r-3][c+3] === p) return true;
  }
  return false;
}

function tryWin(p) {
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(c);
    if (r < 0) continue;
    grid[r][c] = p;
    const won = hasWin(p);
    grid[r][c] = 0;
    if (won) return c;
  }
  return -1;
}

function aiMove() {
  let col = tryWin(2);
  if (col < 0) col = tryWin(1);
  if (col < 0) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    col = order.find(c => dropRow(c) >= 0);
  }
  const r = dropRow(col);
  grid[r][col] = 2;
}

function full() {
  return grid[0].every(v => v);
}

function draw() {
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = grid[r][c] === 1 ? '#ef4444' : grid[r][c] === 2 ? '#facc15' : '#0b0f14';
    ctx.fill();
  }
}

function finish(title) {
  running = false;
  const res = submitScore('connect4', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function round() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  busy = false;
  draw();
}

canvas.addEventListener('click', e => {
  if (!running || busy) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const col = Math.min(COLS - 1, Math.floor(x / CELL));
  const r = dropRow(col);
  if (r < 0) return;
  busy = true;
  grid[r][col] = 1;
  draw();
  if (hasWin(1)) { score += 100; scoreEl.textContent = score; round(); return; }
  if (full()) { round(); return; }
  setTimeout(() => {
    aiMove();
    draw();
    if (hasWin(2)) { finish('Game Over'); return; }
    if (full()) { round(); return; }
    busy = false;
  }, 260);
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
