import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const heightEl = document.getElementById('height');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W;
canvas.height = H;

const BH = 26;
const BASE_W = 200;
const BASE_Y = H - 40;
const COLORS = ['#22d3ee', '#a855f7', '#38bdf8', '#f472b6', '#facc15', '#34d399'];

let blocks, cur, cam, score, running = false, rafId = 0, last = 0;

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function init() {
  blocks = [{ x: (W - BASE_W) / 2, w: BASE_W, c: 0 }];
  cam = 0;
  score = 0;
  scoreEl.textContent = '0';
  heightEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['stack'] || 0;
  spawn();
  draw();
}

function spawn() {
  const w = blocks[blocks.length - 1].w;
  const side = Math.random() < 0.5 ? 1 : -1;
  cur = { x: side > 0 ? 0 : W - w, w, dir: side, speed: 2.2 + Math.min(5.5, blocks.length * 0.2) };
}

function update(dt) {
  cur.x += cur.dir * cur.speed * dt * 60;
  if (cur.x < 0) { cur.x = 0; cur.dir = 1; }
  if (cur.x + cur.w > W) { cur.x = W - cur.w; cur.dir = -1; }
  const target = Math.max(0, (blocks.length - 5) * BH);
  cam += (target - cam) * Math.min(1, dt * 6);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  const gy = BASE_Y + cam + BH;
  if (gy < H) {
    ctx.fillStyle = '#131a22';
    ctx.fillRect(0, gy, W, H - gy);
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const y = BASE_Y - i * BH + cam;
    if (y < -BH || y > H) continue;
    ctx.fillStyle = COLORS[b.c];
    roundRect(b.x, y, b.w, BH - 3, 5);
    ctx.fill();
  }

  const cy = BASE_Y - blocks.length * BH + cam;
  if (cy > -BH && cy < H) {
    ctx.save();
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#e6edf3';
    roundRect(cur.x, cy, cur.w, BH - 3, 5);
    ctx.fill();
    ctx.restore();
  }
}

function drop() {
  if (!running) return;
  const prev = blocks[blocks.length - 1];
  const left = Math.max(cur.x, prev.x);
  const right = Math.min(cur.x + cur.w, prev.x + prev.w);
  const overlap = right - left;
  if (overlap <= 3) { finish(); return; }
  blocks.push({ x: left, w: overlap, c: blocks.length % COLORS.length });
  score += 10;
  scoreEl.textContent = score;
  heightEl.textContent = blocks.length - 1;
  spawn();
  draw();
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('stack', score);
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
  cancelAnimationFrame(rafId);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); drop(); }
});
startBtn.addEventListener('click', start);
init();
