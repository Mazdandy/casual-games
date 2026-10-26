import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W;
canvas.height = H;

const COLS = 4, COL_W = W / COLS;
const TH = 100;
const HIT_Y = 390;
const WIN_TOP = HIT_Y - 70;
const MISS_Y = HIT_Y + 55;
const KEYMAP = { d: 0, f: 1, j: 2, k: 3 };

let tiles, score, spawned, spawnTimer, spawnInterval, speed, running = false, rafId = 0, last = 0;

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
  tiles = [];
  score = 0; spawned = 0; spawnTimer = 0;
  spawnInterval = 0.95; speed = 170;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['pianotiles'] || 0;
  draw();
}

function spawnTile() {
  const free = [];
  for (let c = 0; c < COLS; c++) if (!tiles.some(t => t.col === c)) free.push(c);
  if (!free.length) return;
  const col = free[(Math.random() * free.length) | 0];
  tiles.push({ col, y: -TH });
  spawned++;
  speed = Math.min(430, 170 + spawned * 3.2);
  spawnInterval = Math.max(0.4, 0.95 - spawned * 0.011);
}

function update(dt) {
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) { spawnTimer = 0; spawnTile(); }
  for (const t of tiles) t.y += speed * dt;
  for (const t of tiles) {
    if (t.y + TH > MISS_Y) { finish(); return; }
  }
}

function tryHit(col) {
  let idx = -1;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.col !== col) continue;
    const bottom = t.y + TH;
    if (bottom >= WIN_TOP && bottom <= MISS_Y) { idx = i; break; }
  }
  if (idx >= 0) {
    tiles.splice(idx, 1);
    score += 10;
    scoreEl.textContent = score;
  } else {
    finish();
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(34,211,238,0.08)';
  ctx.fillRect(0, WIN_TOP, W, MISS_Y - WIN_TOP);

  ctx.strokeStyle = '#223040';
  ctx.lineWidth = 2;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * COL_W, 0);
    ctx.lineTo(c * COL_W, H);
    ctx.stroke();
  }

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, HIT_Y);
  ctx.lineTo(W, HIT_Y);
  ctx.stroke();

  for (const t of tiles) {
    const x = t.col * COL_W;
    ctx.fillStyle = '#a855f7';
    roundRect(x + 6, t.y + 4, COL_W - 12, TH - 8, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(x + 6, t.y + 4, COL_W - 12, 14, 10);
    ctx.fill();
  }

  ctx.fillStyle = '#8b98a5';
  ctx.font = 'bold 18px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ['D', 'F', 'J', 'K'].forEach((k, i) => ctx.fillText(k, i * COL_W + COL_W / 2, H - 22));
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  update(dt);
  if (!running) return;
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('pianotiles', score);
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

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / COL_W)));
  tryHit(col);
});

addEventListener('keydown', e => {
  if (!running) return;
  const k = e.key.toLowerCase();
  if (k in KEYMAP) { e.preventDefault(); tryHit(KEYMAP[k]); }
});

startBtn.addEventListener('click', start);
init();
