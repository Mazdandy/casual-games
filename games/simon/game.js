import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const S = 320, HALF = S / 2;
canvas.width = S; canvas.height = S;

const PADS = [
  { x: 8, y: 8, color: '#22c55e', flash: '#86efac' },
  { x: HALF + 4, y: 8, color: '#ef4444', flash: '#fca5a5' },
  { x: 8, y: HALF + 4, color: '#facc15', flash: '#fde68a' },
  { x: HALF + 4, y: HALF + 4, color: '#3b82f6', flash: '#93c5fd' }
];
const PAD_SIZE = HALF - 12;

let seq, input, phase, active, score, running;

function init() {
  seq = []; input = []; phase = 'idle'; active = -1; score = 0; running = true;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['simon'] || 0;
  draw();
}

function nextRound() {
  if (!running) return;
  seq.push((Math.random() * 4) | 0);
  phase = 'showing';
  playSeq(0);
}

function playSeq(i) {
  if (!running) return;
  if (i >= seq.length) {
    active = -1;
    phase = 'input';
    input = [];
    draw();
    return;
  }
  active = seq[i];
  draw();
  setTimeout(() => {
    active = -1;
    draw();
    setTimeout(() => playSeq(i + 1), 160);
  }, 440);
}

function press(pad) {
  if (phase !== 'input' || !running) return;
  active = pad;
  draw();
  setTimeout(() => { active = -1; draw(); }, 160);

  if (pad !== seq[input.length]) { finish('Game Over'); return; }
  input.push(pad);
  if (input.length === seq.length) {
    score = seq.length * 10;
    scoreEl.textContent = score;
    phase = 'wait';
    setTimeout(nextRound, 550);
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  PADS.forEach((p, i) => {
    ctx.fillStyle = i === active ? p.flash : p.color;
    ctx.globalAlpha = i === active ? 1 : 0.55;
    roundRect(p.x, p.y, PAD_SIZE, PAD_SIZE, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
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

function finish(title) {
  running = false;
  phase = 'idle';
  const res = submitScore('simon', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong> · Panjang urutan: <strong>${seq.length}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (S / rect.width);
  const y = (e.clientY - rect.top) * (S / rect.height);
  let pad = -1;
  PADS.forEach((p, i) => {
    if (x >= p.x && x <= p.x + PAD_SIZE && y >= p.y && y <= p.y + PAD_SIZE) pad = i;
  });
  if (pad >= 0) press(pad);
});

function start() {
  init();
  overlay.classList.add('hidden');
  nextRound();
}

startBtn.addEventListener('click', start);
init();
