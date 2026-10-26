import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const N = 15, PAD = 16;
const CELL = (W - 2 * PAD) / (N - 1);
const R = 12;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

let board, score, running, busy, lastMove, timer = 0;

function init() {
  clearTimeout(timer);
  board = Array.from({ length: N }, () => Array(N).fill(0));
  score = 0; running = true; busy = false; lastMove = null;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['gomoku'] || 0;
  draw();
}

function hasFive(r, c, p) {
  for (const [dr, dc] of DIRS) {
    let count = 1;
    for (let s = 1; s < 5; s++) {
      const rr = r + dr * s, cc = c + dc * s;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N || board[rr][cc] !== p) break;
      count++;
    }
    for (let s = 1; s < 5; s++) {
      const rr = r - dr * s, cc = c - dc * s;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N || board[rr][cc] !== p) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}

function pat(count, open) {
  if (count >= 5) return 1e6;
  if (open === 0) return 0;
  const base = open === 2 ? 1 : 0.4;
  const tbl = { 0: 0, 1: 1, 2: 20, 3: 400, 4: 8000 };
  return (tbl[count] || 0) * base;
}

function lineValue(r, c, p) {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let count = 1, open = 0;
    let i = 1;
    for (; ;) {
      const rr = r + dr * i, cc = c + dc * i;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
      if (board[rr][cc] === p) { count++; i++; continue; }
      if (board[rr][cc] === 0) open++;
      break;
    }
    let j = 1;
    for (; ;) {
      const rr = r - dr * j, cc = c - dc * j;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
      if (board[rr][cc] === p) { count++; j++; continue; }
      if (board[rr][cc] === 0) open++;
      break;
    }
    total += pat(count, open);
  }
  return total;
}

function aiMove() {
  let best = null;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== 0) continue;
      if (!hasNeighbor(r, c)) continue;
      const atk = lineValue(r, c, 2);
      const def = lineValue(r, c, 1);
      const center = 10 - (Math.abs(r - 7) + Math.abs(c - 7));
      const s = atk + def * 0.9 + center * 0.5;
      if (!best || s > best.s) best = { r, c, s };
    }
  }
  if (!best) { for (let r = 0; r < N && !best; r++) for (let c = 0; c < N; c++) if (board[r][c] === 0) { best = { r, c }; break; } }
  if (!best) return;
  board[best.r][best.c] = 2;
  lastMove = { r: best.r, c: best.c };
  draw();
  if (hasFive(best.r, best.c, 2)) { finish('Game Over'); return; }
  if (full()) { finish('Seri'); return; }
}

function hasNeighbor(r, c) {
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr][cc] !== 0) return true;
  }
  return false;
}

function full() {
  return board.every(row => row.every(v => v !== 0));
}

function draw() {
  ctx.fillStyle = '#b8874a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    const pos = PAD + i * CELL;
    ctx.beginPath(); ctx.moveTo(PAD, pos); ctx.lineTo(W - PAD, pos); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pos, PAD); ctx.lineTo(pos, H - PAD); ctx.stroke();
  }
  ctx.fillStyle = '#5c3d1e';
  [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]].forEach(([r, c]) => {
    ctx.beginPath();
    ctx.arc(PAD + c * CELL, PAD + r * CELL, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!board[r][c]) continue;
    const x = PAD + c * CELL, y = PAD + r * CELL;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fillStyle = board[r][c] === 1 ? '#111827' : '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = board[r][c] === 1 ? '#000' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (lastMove) {
    const x = PAD + lastMove.c * CELL, y = PAD + lastMove.r * CELL;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }
}

function finish(msg) {
  running = false;
  clearTimeout(timer);
  const res = submitScore('gomoku', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${msg}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('pointerdown', e => {
  if (!running || busy) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.round((x - PAD) / CELL);
  const r = Math.round((y - PAD) / CELL);
  if (r < 0 || r >= N || c < 0 || c >= N || board[r][c] !== 0) return;
  board[r][c] = 1;
  lastMove = { r, c };
  draw();
  if (hasFive(r, c, 1)) { score = 100; scoreEl.textContent = 100; finish('Kamu Menang! 🎉'); return; }
  if (full()) { finish('Seri'); return; }
  busy = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!running) return;
    aiMove();
    busy = false;
  }, 200);
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
