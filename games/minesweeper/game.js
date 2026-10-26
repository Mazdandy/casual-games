import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 8, MINES = 10, CELL = 44, S = N * CELL;
canvas.width = S; canvas.height = S;

const NUM_COLORS = ['', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#06b6d4', '#e6edf3', '#8b98a5'];

let cells, revealed, running, startTime;

function init() {
  cells = Array.from({ length: N * N }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }));
  let placed = 0;
  while (placed < MINES) {
    const i = (Math.random() * N * N) | 0;
    if (cells[i].mine) continue;
    cells[i].mine = true; placed++;
  }
  for (let i = 0; i < N * N; i++) {
    if (cells[i].mine) continue;
    cells[i].count = neighbors(i).filter(j => cells[j].mine).length;
  }
  revealed = 0; running = true;
  startTime = performance.now();
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['minesweeper'] || 0;
  draw();
}

function neighbors(i) {
  const r = Math.floor(i / N), c = i % N, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(nr * N + nc);
  }
  return out;
}

function reveal(i) {
  const cell = cells[i];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  revealed++;
  if (cell.mine) { finish('Game Over', revealed * 5); return; }
  if (cell.count === 0) neighbors(i).forEach(reveal);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < N * N; i++) {
    const cell = cells[i];
    const c = i % N, r = Math.floor(i / N);
    const x = c * CELL, y = r * CELL;
    if (cell.revealed) {
      ctx.fillStyle = '#1b2733';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      if (cell.mine) {
        ctx.font = '24px ui-sans-serif,system-ui';
        ctx.fillText('💣', x + CELL / 2, y + CELL / 2);
      } else if (cell.count) {
        ctx.fillStyle = NUM_COLORS[cell.count];
        ctx.font = 'bold 22px ui-sans-serif,system-ui';
        ctx.fillText(cell.count, x + CELL / 2, y + CELL / 2);
      }
    } else {
      ctx.fillStyle = '#223040';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      if (cell.flagged) {
        ctx.font = '20px ui-sans-serif,system-ui';
        ctx.fillText('🚩', x + CELL / 2, y + CELL / 2);
      }
    }
  }
}

function checkWin() {
  if (revealed === N * N - MINES) {
    const secs = (performance.now() - startTime) / 1000;
    finish('Menang! 🎉', Math.max(100, Math.round(600 - secs * 2)));
  }
}

function finish(title, finalScore) {
  running = false;
  scoreEl.textContent = finalScore;
  const res = submitScore('minesweeper', finalScore);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${finalScore}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function indexAt(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (S / rect.width);
  const y = (e.clientY - rect.top) * (S / rect.height);
  const c = Math.min(N - 1, Math.floor(x / CELL));
  const r = Math.min(N - 1, Math.floor(y / CELL));
  return r * N + c;
}

canvas.addEventListener('click', e => {
  if (!running) return;
  const i = indexAt(e);
  reveal(i);
  if (running) { draw(); checkWin(); }
});
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!running) return;
  const cell = cells[indexAt(e)];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  draw();
});

function start() { init(); overlay.classList.add('hidden'); }
startBtn.addEventListener('click', start);
init();
