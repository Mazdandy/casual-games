import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 400, H = 300, ROUNDS = 5;
canvas.width = W; canvas.height = H;

let round, total, state, readyAt, timeoutId, running, lastMsg;

function init() {
  round = 0; total = 0; state = 'wait'; readyAt = 0; running = true; lastMsg = '';
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['reaction'] || 0;
  draw();
}

function draw() {
  const bg = state === 'ready' ? '#22c55e' : state === 'wait' ? '#7f1d1d' : '#1b2733';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px ui-sans-serif,system-ui';
  const title = state === 'ready' ? 'KLIK!' : state === 'wait' ? 'Tunggu…' : state === 'early' ? 'Terlalu cepat!' : 'Ronde ' + round;
  ctx.fillText(title, W / 2, H / 2 - 16);
  ctx.font = '15px ui-sans-serif,system-ui';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(lastMsg || `${round} / ${ROUNDS} ronde`, W / 2, H / 2 + 22);
}

function nextRound() {
  if (!running) return;
  if (round >= ROUNDS) { finish(); return; }
  round++;
  state = 'wait';
  lastMsg = '';
  draw();
  const delay = 800 + Math.random() * 1800;
  timeoutId = setTimeout(() => {
    if (!running) return;
    state = 'ready';
    readyAt = performance.now();
    draw();
  }, delay);
}

function finish() {
  running = false;
  clearTimeout(timeoutId);
  state = 'done';
  const res = submitScore('reaction', total);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor total: <strong>${total}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', () => {
  if (!running) return;
  if (state === 'wait') {
    clearTimeout(timeoutId);
    state = 'early';
    lastMsg = 'Tunggu warna hijau dulu ya.';
    draw();
    setTimeout(nextRound, 800);
    return;
  }
  if (state === 'ready') {
    const ms = Math.round(performance.now() - readyAt);
    const pts = Math.max(10, 600 - ms);
    total += pts;
    scoreEl.textContent = total;
    lastMsg = `${ms} ms · +${pts} poin`;
    state = 'scored';
    draw();
    setTimeout(nextRound, 700);
  }
});

function start() {
  init();
  overlay.classList.add('hidden');
  nextRound();
}

startBtn.addEventListener('click', start);
init();
