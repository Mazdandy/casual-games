import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const streakEl = document.getElementById('streak');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const HI = { x: 20, y: 380, w: 210, h: 72, label: 'Lebih Tinggi ▲' };
const LO = { x: 250, y: 380, w: 210, h: 72, label: 'Lebih Rendah ▼' };

let running = false, timer = 0;
let current, next, streak, score, phase, lastCorrect;

const randNum = () => 1 + ((Math.random() * 100) | 0);

function init() {
  running = false;
  clearTimeout(timer);
  current = randNum();
  next = null; streak = 0; score = 0; phase = 'await'; lastCorrect = false;
  scoreEl.textContent = 0;
  streakEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['higherlower'] || 0;
  draw();
}

function guess(kind) {
  if (!running || phase !== 'await') return;
  next = randNum();
  lastCorrect = kind === 'hi' ? next >= current : next <= current;
  phase = 'reveal';
  draw();
  if (lastCorrect) {
    streak++;
    score += 10 + Math.floor(streak / 2);
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    timer = setTimeout(() => {
      if (!running) return;
      current = next; next = null; phase = 'await';
      draw();
    }, 780);
  } else {
    timer = setTimeout(() => { if (running) finish(); }, 880);
  }
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

function drawButton(b, color) {
  roundRect(b.x, b.y, b.w, b.h, 12);
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  g.addColorStop(0, color[0]);
  g.addColorStop(1, color[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#04121a';
  ctx.font = '800 20px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8b98a5';
  ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Angka sekarang', W / 2, 74);

  ctx.fillStyle = '#e6edf3';
  ctx.font = '800 150px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(String(current), W / 2, 190);

  if (phase === 'reveal' && next !== null) {
    const color = lastCorrect ? '#22c55e' : '#ef4444';
    ctx.fillStyle = color;
    ctx.font = '800 30px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(String(next), W / 2, 300);
    ctx.font = '700 20px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(lastCorrect ? 'Benar! 🎉' : 'Salah!', W / 2, 342);
  } else {
    ctx.fillStyle = '#8b98a5';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Tekan tombol untuk menebak', W / 2, 320);
  }

  drawButton(HI, ['#22c55e', '#16a34a']);
  drawButton(LO, ['#f97316', '#ef4444']);
}

function finish() {
  running = false;
  clearTimeout(timer);
  const res = submitScore('higherlower', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong> · Streak: <strong>${streak}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
}

const hit = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

canvas.addEventListener('pointerdown', e => {
  if (!running || phase !== 'await') return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  if (hit(HI, x, y)) guess('hi');
  else if (hit(LO, x, y)) guess('lo');
});

document.addEventListener('keydown', e => {
  if (!running || phase !== 'await') return;
  if (e.code === 'ArrowUp') { e.preventDefault(); guess('hi'); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); guess('lo'); }
});

startBtn.addEventListener('click', start);
init();
