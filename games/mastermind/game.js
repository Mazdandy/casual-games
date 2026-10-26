import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const guessCountEl = document.getElementById('guessCount');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 470;
canvas.width = W; canvas.height = H;

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'];
const NAMES = ['Merah', 'Biru', 'Hijau', 'Kuning', 'Ungu', 'Oranye'];
const LEN = 4, MAX = 10;
const ROW0 = 27, ROWH = 30, CUR = 336;
const BTN1 = { x: 176, y: 318, w: 116, h: 36 };
const BTN2 = { x: 304, y: 318, w: 100, h: 36 };
const PAL_Y = 438;

let secret, guesses, current, running = false, score = 0;

function init() {
  secret = Array.from({ length: LEN }, () => Math.floor(Math.random() * COLORS.length));
  guesses = [];
  current = [];
  running = true;
  score = 0;
  scoreEl.textContent = 0;
  guessCountEl.textContent = '0/' + MAX;
  bestEl.textContent = getProgress().bestScores['mastermind'] || 0;
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

function drawPeg(x, y, r, color, outline) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawFeedback(x, y, black, white) {
  const pos = [[x, y - 7], [x + 12, y - 7], [x, y + 7], [x + 12, y + 7]];
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(pos[i][0], pos[i][1], 4.5, 0, Math.PI * 2);
    ctx.fillStyle = i < black ? '#e6edf3' : (i < black + white ? '#8b98a5' : '#16202b');
    ctx.fill();
  }
}

function drawButton(b, label, active) {
  roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = active ? '#22d3ee' : '#16202b';
  ctx.fill();
  ctx.fillStyle = active ? '#04121a' : '#4b5563';
  ctx.font = 'bold 15px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < MAX; i++) {
    const cy = ROW0 + i * ROWH;
    const g = guesses[i];
    for (let j = 0; j < LEN; j++) {
      drawPeg(26 + j * 34, cy, 11, g ? COLORS[g.g[j]] : '#16202b');
    }
    if (g) drawFeedback(166, cy, g.black, g.white);
  }

  for (let j = 0; j < LEN; j++) {
    drawPeg(26 + j * 34, CUR, 11, j < current.length ? COLORS[current[j]] : '#16202b', true);
  }

  drawButton(BTN1, 'KIRIM', current.length === LEN);
  drawButton(BTN2, 'HAPUS', current.length > 0);

  ctx.fillStyle = '#8b98a5';
  ctx.font = '14px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Pilih warna:', 26, 404);
  for (let i = 0; i < COLORS.length; i++) {
    drawPeg(46 + i * 78, PAL_Y, 19, COLORS[i]);
  }
}

function evaluate(guess, code) {
  let black = 0, white = 0;
  const gs = guess.slice(), cs = code.slice();
  for (let i = 0; i < LEN; i++) if (gs[i] === cs[i]) { black++; gs[i] = -1; cs[i] = -2; }
  for (let i = 0; i < LEN; i++) {
    if (gs[i] < 0) continue;
    const k = cs.indexOf(gs[i]);
    if (k >= 0) { white++; cs[k] = -2; }
  }
  return { black, white };
}

function submit() {
  if (current.length !== LEN) return;
  const fb = evaluate(current, secret);
  guesses.push({ g: current.slice(), black: fb.black, white: fb.white });
  current = [];
  guessCountEl.textContent = guesses.length + '/' + MAX;
  draw();
  if (fb.black === LEN) { score = (11 - guesses.length) * 30 + 100; scoreEl.textContent = score; finish('Kode Terpecah! 🎉'); return; }
  if (guesses.length >= MAX) { score = 0; finish('Kode Tidak Terpecah'); return; }
}

function finish(title) {
  running = false;
  const res = submitScore('mastermind', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Kode rahasia: <strong>${secret.map(i => NAMES[i]).join(' · ')}</strong></p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function inRect(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

canvas.addEventListener('click', e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);

  for (let i = 0; i < COLORS.length; i++) {
    const cx = 46 + i * 78;
    if ((x - cx) * (x - cx) + (y - PAL_Y) * (y - PAL_Y) < 400) {
      if (current.length < LEN) { current.push(i); draw(); }
      return;
    }
  }
  for (let j = 0; j < LEN; j++) {
    const cx = 26 + j * 34;
    if ((x - cx) * (x - cx) + (y - CUR) * (y - CUR) < 196) {
      if (j < current.length) { current.splice(j, 1); draw(); }
      return;
    }
  }
  if (inRect(x, y, BTN1)) { submit(); return; }
  if (inRect(x, y, BTN2)) { current = []; draw(); return; }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
