import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const ballsEl = document.getElementById('balls');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const BUCKETS = 9, BW = W / BUCKETS, BUCKET_H = 48, BUCKET_TOP = H - BUCKET_H;
const POINTS = [10, 25, 50, 200, 500, 200, 50, 25, 10];
const BALL_R = 8, PEG_R = 5, G = 0.0009, MAX_DT = 33, MAX_VY = 1.1;

const pegs = [];
for (let row = 0; row < 8; row++) {
  const count = row + 3;
  const y = 96 + row * 40;
  const margin = W / (count + 1);
  for (let i = 0; i < count; i++) pegs.push({ x: margin * (i + 1), y });
}

let running = false, rafId = 0, last = 0;
let score = 0, ballsLeft = 10, ball = null;
let flashBucket = -1, flashUntil = 0;

function init() {
  running = false;
  cancelAnimationFrame(rafId);
  score = 0; ballsLeft = 10; ball = null;
  flashBucket = -1; flashUntil = 0;
  scoreEl.textContent = 0;
  ballsEl.textContent = ballsLeft;
  bestEl.textContent = getProgress().bestScores['plinko'] || 0;
  draw();
}

function dropBall(x) {
  if (ball || ballsLeft <= 0) return;
  const px = Math.max(BALL_R + 2, Math.min(W - BALL_R - 2, x));
  ball = { x: px, y: 34, vx: (Math.random() - 0.5) * 0.08, vy: 0.05 };
  ballsLeft--;
  ballsEl.textContent = ballsLeft;
}

function update(dt) {
  if (!ball) return;
  ball.vy = Math.min(MAX_VY, ball.vy + G * dt);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const min = BALL_R + PEG_R;
  for (const p of pegs) {
    const dx = ball.x - p.x, dy = ball.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < min && d > 0.0001) {
      const nx = dx / d, ny = dy / d;
      ball.x = p.x + nx * min;
      ball.y = p.y + ny * min;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx = ball.vx * 0.5 + (Math.random() - 0.5) * 0.3;
      ball.vy = Math.abs(ball.vy) * 0.45 + 0.08;
      if (Math.abs(ball.vx) < 0.06) ball.vx += (Math.random() < 0.5 ? -1 : 1) * 0.08;
      ball.vx = Math.max(-0.75, Math.min(0.75, ball.vx));
    }
  }

  if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.6; }
  if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.6; }

  if (ball.y + BALL_R >= BUCKET_TOP && ball.vy > 0) {
    const b = Math.max(0, Math.min(BUCKETS - 1, Math.floor(ball.x / BW)));
    score += POINTS[b];
    scoreEl.textContent = score;
    flashBucket = b;
    flashUntil = performance.now() + 450;
    ball = null;
    if (ballsLeft <= 0) finish();
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

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(139,152,165,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(0, 74); ctx.lineTo(W, 74); ctx.stroke();
  ctx.setLineDash([]);

  if (!ball && ballsLeft > 0) {
    ctx.fillStyle = '#8b98a5';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Klik di sini untuk menjatuhkan bola', W / 2, 54);
  }

  for (const p of pegs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
    ctx.fillStyle = '#8b98a5';
    ctx.fill();
  }

  const now = performance.now();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const bucketColor = i => ['#223040', '#2b3b4d', '#3b4f8a', '#7c3aed', '#0891b2'][Math.abs(i - 4)];
  for (let i = 0; i < BUCKETS; i++) {
    const x = i * BW;
    roundRect(x + 4, BUCKET_TOP, BW - 8, BUCKET_H - 4, 8);
    ctx.fillStyle = bucketColor(i);
    ctx.fill();
    if (flashBucket === i && now < flashUntil) {
      roundRect(x + 4, BUCKET_TOP, BW - 8, BUCKET_H - 4, 8);
      ctx.fillStyle = 'rgba(34,211,238,0.65)';
      ctx.fill();
    }
    ctx.fillStyle = '#e6edf3';
    ctx.font = `800 ${Math.abs(i - 4) === 0 ? 17 : 15}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(String(POINTS[i]), x + BW / 2, BUCKET_TOP + BUCKET_H / 2 - 2);
  }

  if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(MAX_DT, last ? now - last : 16.7);
  last = now;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('plinko', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  last = 0;
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => {
  if (!running || ball || ballsLeft <= 0) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  dropBall(x);
});

startBtn.addEventListener('click', start);
init();
