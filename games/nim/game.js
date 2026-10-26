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

const START = [3, 5, 7];
const ROW_Y = [140, 260, 380];
const STONE_START = 34, STONE_GAP = 36, STONE_R = 14;
const BTN_X = 318, BTN_GAP = 52, BTN_W = 44, BTN_H = 42;

let piles, score, running, busy, playerTurn, timer = 0;

function init() {
  clearTimeout(timer);
  piles = START.slice();
  score = 0; running = true; busy = false; playerTurn = true;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['nim'] || 0;
  draw();
}

const total = () => piles.reduce((a, b) => a + b, 0);

function take(row, n) {
  if (!running || busy || !playerTurn) return;
  if (row < 0 || row > 2 || n < 1 || n > 3 || n > piles[row]) return;
  piles[row] -= n;
  draw();
  if (total() === 0) { score = 100; scoreEl.textContent = 100; finish('Kamu Menang! 🎉'); return; }
  playerTurn = false; busy = true;
  clearTimeout(timer);
  timer = setTimeout(() => { if (!running) return; aiMove(); }, 350);
}

function bestMove() {
  const sum = piles.reduce((a, b) => a ^ b, 0);
  if (sum !== 0) {
    for (let i = 0; i < 3; i++) {
      const t = piles[i] ^ sum;
      const n = piles[i] - t;
      if (n >= 1 && n <= 3) return { row: i, n };
    }
  }
  let idx = 0;
  for (let i = 1; i < 3; i++) if (piles[i] > piles[idx]) idx = i;
  return { row: idx, n: Math.min(3, piles[idx]) };
}

function aiMove() {
  const m = bestMove();
  piles[m.row] -= m.n;
  draw();
  if (total() === 0) { finish('Game Over'); return; }
  playerTurn = true; busy = false;
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
  ctx.fillStyle = '#0f1720';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px ui-sans-serif,system-ui';
  if (running) {
    ctx.fillStyle = playerTurn && !busy ? '#22d3ee' : '#8b98a5';
    ctx.fillText(playerTurn && !busy ? 'Giliranmu' : 'AI sedang berpikir...', W / 2, 48);
  } else {
    ctx.fillStyle = '#8b98a5';
    ctx.fillText('Selesai', W / 2, 48);
  }

  for (let row = 0; row < 3; row++) {
    const y = ROW_Y[row];
    ctx.fillStyle = '#8b98a5';
    ctx.font = '12px ui-sans-serif,system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(piles[row] + ' batu', 12, y - 34);

    for (let i = 0; i < piles[row]; i++) {
      const x = STONE_START + i * STONE_GAP;
      ctx.beginPath();
      ctx.arc(x, y, STONE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (running && playerTurn && !busy) {
      for (let n = 1; n <= 3; n++) {
        const x = BTN_X + (n - 1) * BTN_GAP;
        const disabled = n > piles[row];
        roundRect(x, y - BTN_H / 2, BTN_W, BTN_H, 8);
        ctx.fillStyle = disabled ? '#1a222d' : '#26405a';
        ctx.fill();
        ctx.strokeStyle = disabled ? '#22303d' : '#3b5c80';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = disabled ? '#3c4b5a' : '#e6edf3';
        ctx.font = 'bold 18px ui-sans-serif,system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(n), x + BTN_W / 2, y);
      }
    }
  }
  ctx.textBaseline = 'middle';
}

function finish(msg) {
  running = false;
  clearTimeout(timer);
  const res = submitScore('nim', score);
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
  if (!running || busy || !playerTurn) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  for (let row = 0; row < 3; row++) {
    for (let n = 1; n <= 3; n++) {
      const bx = BTN_X + (n - 1) * BTN_GAP;
      const by = ROW_Y[row] - BTN_H / 2;
      if (x >= bx && x <= bx + BTN_W && y >= by && y <= by + BTN_H) { take(row, n); return; }
    }
  }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
