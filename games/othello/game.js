import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const blackEl = document.getElementById('black');
const whiteEl = document.getElementById('white');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 8, CELL = 60, S = N * CELL;
canvas.width = S; canvas.height = S;

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const CORNERS = [[0, 0], [0, 7], [7, 0], [7, 7]];

let board, current, score, running, busy, aiTimer = 0;

function init() {
  clearTimeout(aiTimer);
  board = Array.from({ length: N }, () => Array(N).fill(0));
  board[3][3] = 2; board[4][4] = 2;
  board[3][4] = 1; board[4][3] = 1;
  current = 'player'; score = 0; running = true; busy = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['othello'] || 0;
  updateCounts();
  draw();
}

const opp = p => (p === 1 ? 2 : 1);

function flipsFor(r, c, p) {
  if (board[r][c] !== 0) return null;
  const o = opp(p);
  let all = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr][cc] === o) { line.push([rr, cc]); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr][cc] === p) all = all.concat(line);
  }
  return all.length ? all : null;
}

function legalMoves(p) {
  const moves = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const f = flipsFor(r, c, p);
    if (f) moves.push({ r, c, flips: f });
  }
  return moves;
}

const hasMoves = p => legalMoves(p).length > 0;

function applyMove(r, c, p, flips) {
  board[r][c] = p;
  for (const [fr, fc] of flips) board[fr][fc] = p;
}

function cornerBonus(r, c) {
  if (CORNERS.some(([cr, cc]) => cr === r && cc === c)) return 10;
  if (r === 0 || r === N - 1 || c === 0 || c === N - 1) return 1;
  return 0;
}

function aiTurn() {
  const moves = legalMoves(2);
  if (!moves.length) { busy = false; passTurn(); return; }
  let best = null;
  for (const m of moves) {
    const s = m.flips.length + cornerBonus(m.r, m.c);
    if (!best || s > best.s) best = { ...m, s };
  }
  applyMove(best.r, best.c, 2, best.flips);
  updateCounts();
  draw();
  busy = false;
  passTurn();
}

function passTurn() {
  current = current === 'player' ? 'ai' : 'player';
  if (hasMoves(current === 'player' ? 1 : 2)) {
    if (current === 'ai') { busy = true; clearTimeout(aiTimer); aiTimer = setTimeout(() => { if (!running) return; aiTurn(); }, 260); }
    return;
  }
  current = current === 'player' ? 'ai' : 'player';
  if (hasMoves(current === 'player' ? 1 : 2)) {
    if (current === 'ai') { busy = true; clearTimeout(aiTimer); aiTimer = setTimeout(() => { if (!running) return; aiTurn(); }, 260); }
    return;
  }
  endGame();
}

function updateCounts() {
  let b = 0, w = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] === 1) b++; else if (board[r][c] === 2) w++;
  }
  blackEl.textContent = b;
  whiteEl.textContent = w;
}

function draw() {
  ctx.fillStyle = '#0f5132';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#0a3d26';
  ctx.lineWidth = 2;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(S, i * CELL); ctx.stroke();
  }

  if (running && current === 'player' && !busy) {
    for (const m of legalMoves(1)) {
      ctx.beginPath();
      ctx.arc(m.c * CELL + CELL / 2, m.r * CELL + CELL / 2, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34,211,238,.55)';
      ctx.fill();
    }
  }

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!board[r][c]) continue;
    const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = board[r][c] === 1 ? '#111827' : '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = board[r][c] === 1 ? '#000' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function endGame() {
  let b = 0, w = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] === 1) b++; else if (board[r][c] === 2) w++;
  }
  score = Math.max(0, b - w) * 10;
  if (b > w) score += 100;
  scoreEl.textContent = score;
  finish(b > w ? 'Kamu Menang! 🎉' : 'Game Over', b, w);
}

function finish(msg, b, w) {
  running = false;
  clearTimeout(aiTimer);
  const res = submitScore('othello', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${msg}</h2>
    <p>Hitam <strong>${b}</strong> · Putih <strong>${w}</strong> · Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('pointerdown', e => {
  if (!running || busy || current !== 'player') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (r < 0 || r >= N || c < 0 || c >= N) return;
  const flips = flipsFor(r, c, 1);
  if (!flips) return;
  applyMove(r, c, 1, flips);
  updateCounts();
  draw();
  passTurn();
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
