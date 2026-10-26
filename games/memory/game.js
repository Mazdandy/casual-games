import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 4, CELL = 100;
canvas.width = N * CELL;
canvas.height = N * CELL;

const SYMBOLS = ['🍎','🍌','🍇','🍓','🍒','🥝','🍑','🍍'];
let deck, flipped, matched, moves, running, lock;

function init() {
  deck = [...SYMBOLS, ...SYMBOLS].sort(() => Math.random() - 0.5);
  flipped = []; matched = new Set(); moves = 0; running = true; lock = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['memory'] || 0;
  draw();
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
  ctx.fillStyle = '#1b2733';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gap = 8, size = (canvas.width - gap * (N + 1)) / N;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c;
    const x = gap + c * (size + gap), y = gap + r * (size + gap);
    const open = matched.has(i) || flipped.includes(i);
    ctx.fillStyle = open ? '#334155' : '#22d3ee';
    roundRect(x, y, size, size, 10); ctx.fill();
    if (open) {
      ctx.font = '44px ui-sans-serif,system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(deck[i], x + size / 2, y + size / 2);
    }
  }
}
function finish() {
  running = false;
  const score = Math.max(10, 1000 - moves * 30);
  scoreEl.textContent = score;
  const res = submitScore('memory', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai! 🎉</h2>
    <p>Langkah: <strong>${moves}</strong> · Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru!' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}
canvas.addEventListener('click', e => {
  if (!running || lock) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.min(N - 1, Math.floor(x / CELL));
  const r = Math.min(N - 1, Math.floor(y / CELL));
  const i = r * N + c;
  if (matched.has(i) || flipped.includes(i)) return;
  flipped.push(i);
  draw();
  if (flipped.length === 2) {
    moves++;
    lock = true;
    setTimeout(() => {
      const [a, b] = flipped;
      if (deck[a] === deck[b]) { matched.add(a); matched.add(b); }
      flipped = []; lock = false;
      draw();
      if (matched.size === deck.length) finish();
    }, 650);
  }
});
function start() { init(); overlay.classList.add('hidden'); }
startBtn.addEventListener('click', start);
init();
