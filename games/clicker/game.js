import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W;
canvas.height = H;

const CX = W / 2, CY = H / 2, R = 118;
const DURATION = 10000;

let clicks, score, running = false, rafId = 0, endTime = 0, last = 0, pulse = 0;

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  const rr = R * (1 + 0.06 * pulse);
  const grad = ctx.createRadialGradient(CX, CY, 10, CX, CY, rr);
  grad.addColorStop(0, '#a855f7');
  grad.addColorStop(1, '#22d3ee');
  ctx.beginPath();
  ctx.arc(CX, CY, rr, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = '#04121a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px ui-sans-serif,system-ui';
  ctx.fillText('KLIK!', CX, CY - 14);
  ctx.font = 'bold 56px ui-sans-serif,system-ui';
  ctx.fillText(String(clicks), CX, CY + 40);
}

function init() {
  clicks = 0; score = 0; pulse = 0;
  scoreEl.textContent = '0';
  timeEl.textContent = Math.ceil(DURATION / 1000);
  bestEl.textContent = getProgress().bestScores['clicker'] || 0;
  endTime = performance.now() + DURATION;
  draw();
}

function hit() {
  if (!running) return;
  clicks++;
  score = clicks * 2;
  scoreEl.textContent = score;
  pulse = 1;
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  const remaining = Math.max(0, endTime - now);
  timeEl.textContent = Math.ceil(remaining / 1000);
  pulse = Math.max(0, pulse - dt * 5);
  draw();
  if (remaining <= 0) { finish(); return; }
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('clicker', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Klik: <strong>${clicks}</strong> kali</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); hit(); }
});

startBtn.addEventListener('click', start);
init();
