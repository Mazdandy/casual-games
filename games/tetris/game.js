import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const COLS = 10, ROWS = 20, CELL = 24;
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

const SHAPES = [
  [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]]
];
const COLORS = ['#22d3ee','#facc15','#a855f7','#3b82f6','#f97316','#22c55e','#ef4444'];
let board, piece, px, py, pcolor, dropMs, lastDrop, score, running, rafId;

function init() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0; dropMs = 600; lastDrop = performance.now();
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['tetris'] || 0;
  spawn();
}
function spawn() {
  const idx = (Math.random() * SHAPES.length) | 0;
  piece = SHAPES[idx].map(row => row.slice());
  pcolor = COLORS[idx];
  px = Math.floor((COLS - piece[0].length) / 2);
  py = 0;
  if (collide(px, py, piece)) gameOver();
}
function collide(nx, ny, shape) {
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
    if (!shape[r][c]) continue;
    const x = nx + c, y = ny + r;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}
function rotate(shape) {
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out[c][rows - 1 - r] = shape[r][c];
  return out;
}
function merge() {
  piece.forEach((row, r) => row.forEach((v, c) => {
    if (v && py + r >= 0) board[py + r][px + c] = pcolor;
  }));
}
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++; r++;
    }
  }
  if (cleared) {
    score += [0, 100, 300, 500, 800][cleared];
    scoreEl.textContent = score;
    if (dropMs > 150) dropMs -= 20;
  }
}
function lock() {
  merge(); clearLines(); spawn();
}
function tick(now) {
  if (!running) return;
  if (now - lastDrop >= dropMs) {
    lastDrop = now;
    if (!collide(px, py + 1, piece)) py++;
    else lock();
  }
  draw();
  rafId = requestAnimationFrame(tick);
}
function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
}
function draw() {
  const cs = getComputedStyle(document.documentElement);
  ctx.fillStyle = cs.getPropertyValue('--board-bg').trim() || '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) drawCell(c, r, board[r][c]);
  piece.forEach((row, r) => row.forEach((v, c) => { if (v && py + r >= 0) drawCell(px + c, py + r, pcolor); }));
}
function hardDrop() {
  while (!collide(px, py + 1, piece)) py++;
  lock();
}
function move(dx) {
  if (!collide(px + dx, py, piece)) { px += dx; draw(); }
}
function spin() {
  const rot = rotate(piece);
  if (!collide(px, py, rot)) { piece = rot; draw(); }
}
function gameOver() {
  running = false;
  const res = submitScore('tetris', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Game Over</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}
function start() {
  init(); running = true;
  overlay.classList.add('hidden');
  lastDrop = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}
addEventListener('keydown', e => {
  if (!running) return;
  const k = e.key;
  if (k === 'ArrowLeft') { e.preventDefault(); move(-1); }
  else if (k === 'ArrowRight') { e.preventDefault(); move(1); }
  else if (k === 'ArrowDown') { e.preventDefault(); if (!collide(px, py + 1, piece)) { py++; draw(); } }
  else if (k === 'ArrowUp') { e.preventDefault(); spin(); }
  else if (k === ' ') { e.preventDefault(); hardDrop(); }
});
startBtn.addEventListener('click', start);
init();
draw();
