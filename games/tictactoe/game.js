import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 3, CELL = 100, S = N * CELL;
canvas.width = S; canvas.height = S;

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

let board, score, running;

function init() {
  board = Array(9).fill('');
  score = 0; running = true;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['tictactoe'] || 0;
  draw();
}

function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(v => v) ? 'draw' : null;
}

function minimax(b, isMax) {
  const w = winner(b);
  if (w === 'O') return { score: 1 };
  if (w === 'X') return { score: -1 };
  if (w === 'draw') return { score: 0 };
  let best = null;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = isMax ? 'O' : 'X';
    const r = minimax(b, !isMax);
    b[i] = '';
    if (!best || (isMax ? r.score > best.score : r.score < best.score)) best = { score: r.score, move: i };
  }
  return best;
}

function newRound() {
  board = Array(9).fill('');
  draw();
}

function checkState() {
  const w = winner(board);
  if (w === 'X') { score += 100; scoreEl.textContent = score; newRound(); }
  else if (w === 'O') { finish('Game Over'); }
  else if (w === 'draw') { newRound(); }
  else return false;
  return true;
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#223040';
  ctx.lineWidth = 4;
  for (let i = 1; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(S, i * CELL); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 60px ui-sans-serif,system-ui';
  board.forEach((v, i) => {
    if (!v) return;
    const x = (i % N) * CELL + CELL / 2;
    const y = Math.floor(i / N) * CELL + CELL / 2;
    ctx.fillStyle = v === 'X' ? '#22d3ee' : '#f97316';
    ctx.fillText(v, x, y);
  });
}

function finish(title) {
  running = false;
  const res = submitScore('tictactoe', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (S / rect.width);
  const y = (e.clientY - rect.top) * (S / rect.height);
  const c = Math.min(N - 1, Math.floor(x / CELL));
  const r = Math.min(N - 1, Math.floor(y / CELL));
  const i = r * N + c;
  if (board[i]) return;
  board[i] = 'X';
  draw();
  if (checkState()) return;
  const best = minimax(board.slice(), true);
  board[best.move] = 'O';
  draw();
  checkState();
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
