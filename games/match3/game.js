import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 8, CELL = 60, S = N * CELL;
canvas.width = S; canvas.height = S;

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

let board, selected, score, timeLeft, running = false, busy = false, timerId = 0;

function init() {
  board = Array.from({ length: N }, () => new Array(N).fill(null));
  fillBoard();
  selected = null;
  busy = false;
  score = 0;
  timeLeft = 60;
  running = false;
  scoreEl.textContent = 0;
  timeEl.textContent = timeLeft;
  bestEl.textContent = getProgress().bestScores['match3'] || 0;
  draw();
}

function randColorAvoiding(r, c) {
  const bad = new Set();
  if (c >= 2 && board[r][c - 1] === board[r][c - 2]) bad.add(board[r][c - 1]);
  if (r >= 2 && board[r - 1][c] === board[r - 2][c]) bad.add(board[r - 1][c]);
  let v;
  do { v = (Math.random() * COLORS.length) | 0; } while (bad.has(v));
  return v;
}

function fillBoard() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) board[r][c] = randColorAvoiding(r, c);
  }
}

function findMatches() {
  const m = new Set();
  for (let r = 0; r < N; r++) {
    let run = 1;
    for (let c = 1; c <= N; c++) {
      const same = c < N && board[r][c] !== null && board[r][c] === board[r][c - 1];
      if (same) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) m.add(r + ',' + k);
        run = 1;
      }
    }
  }
  for (let c = 0; c < N; c++) {
    let run = 1;
    for (let r = 1; r <= N; r++) {
      const same = r < N && board[r][c] !== null && board[r][c] === board[r - 1][c];
      if (same) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) m.add(k + ',' + c);
        run = 1;
      }
    }
  }
  return m;
}

function applyGravity() {
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = N - 1; r >= 0; r--) if (board[r][c] !== null) col.push(board[r][c]);
    for (let r = N - 1; r >= 0; r--) {
      const idx = N - 1 - r;
      board[r][c] = idx < col.length ? col[idx] : null;
    }
  }
}

function refill() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === null) board[r][c] = (Math.random() * COLORS.length) | 0;
    }
  }
}

function resolve() {
  let combo = 1;
  while (running) {
    const m = findMatches();
    if (!m.size) break;
    score += m.size * 10 * combo;
    combo = Math.min(combo + 1, 5);
    for (const k of m) {
      const [r, c] = k.split(',').map(Number);
      board[r][c] = null;
    }
    applyGravity();
    refill();
  }
  scoreEl.textContent = score;
}

function swapCells(a, b) {
  const t = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = t;
}

function trySwap(a, b) {
  if (busy) return;
  busy = true;
  swapCells(a, b);
  if (!findMatches().size) {
    swapCells(a, b);
  } else {
    resolve();
  }
  busy = false;
  draw();
}

function cellAt(e) {
  const rc = canvas.getBoundingClientRect();
  const x = (e.clientX - rc.left) * (S / rc.width);
  const y = (e.clientY - rc.top) * (S / rc.height);
  const c = Math.max(0, Math.min(N - 1, Math.floor(x / CELL)));
  const r = Math.max(0, Math.min(N - 1, Math.floor(y / CELL)));
  return { r, c };
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

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  const pad = 6;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = c * CELL, y = r * CELL;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 12);
      ctx.fill();
      const v = board[r][c];
      if (v === null) continue;
      ctx.fillStyle = COLORS[v];
      roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(x + pad + 8, y + pad + 8, 14, 14, 6);
      ctx.fill();
      if (selected && selected.r === r && selected.c === c) {
        ctx.strokeStyle = '#e6edf3';
        ctx.lineWidth = 3;
        roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 12);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }
}

function finish() {
  running = false;
  clearInterval(timerId);
  const res = submitScore('match3', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function tick() {
  if (!running) return;
  timeLeft--;
  timeEl.textContent = Math.max(0, timeLeft);
  if (timeLeft <= 0) finish();
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

canvas.addEventListener('click', e => {
  if (!running || busy) return;
  const cell = cellAt(e);
  if (!selected) { selected = cell; draw(); return; }
  if (selected.r === cell.r && selected.c === cell.c) { selected = null; draw(); return; }
  const dr = Math.abs(selected.r - cell.r), dc = Math.abs(selected.c - cell.c);
  if (dr + dc === 1) {
    const a = selected;
    selected = null;
    trySwap(a, cell);
  } else {
    selected = cell;
    draw();
  }
});

startBtn.addEventListener('click', start);
init();
