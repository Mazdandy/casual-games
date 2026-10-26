import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 3, CELL = 110, S = N * CELL;
canvas.width = S; canvas.height = S;

const DURATION = 30000, SPAWN_MS = 550, LIFE_MS = 800;

let holes, score, running, rafId, endTime, lastSpawn;

function init() {
  holes = Array.from({ length: N * N }, () => ({ mole: false, until: 0 }));
  score = 0; running = true;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['whack'] || 0;
  endTime = performance.now() + DURATION;
  lastSpawn = 0;
  draw(0);
}

function loop(now) {
  if (!running) return;
  const left = Math.max(0, endTime - now);

  holes.forEach(h => { if (h.mole && now > h.until) h.mole = false; });
  if (now - lastSpawn > SPAWN_MS) {
    lastSpawn = now;
    const free = holes.map((h, i) => (h.mole ? -1 : i)).filter(i => i >= 0);
    if (free.length) {
      const i = free[(Math.random() * free.length) | 0];
      holes[i].mole = true;
      holes[i].until = now + LIFE_MS;
    }
  }

  draw(left);
  if (left <= 0) { finish(); return; }
  rafId = requestAnimationFrame(loop);
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

function draw(left) {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  holes.forEach((h, i) => {
    const c = i % N, r = Math.floor(i / N);
    const x = c * CELL + 10, y = r * CELL + 10, size = CELL - 20;
    ctx.fillStyle = '#223040';
    roundRect(x, y, size, size, 16); ctx.fill();
    if (h.mole) {
      ctx.font = '54px ui-sans-serif,system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🐹', x + size / 2, y + size / 2);
    }
  });
  ctx.fillStyle = '#8b98a5';
  ctx.font = 'bold 14px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Sisa waktu: ' + Math.ceil(left / 1000) + 's', S / 2, S - 4);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('whack', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (S / rect.width);
  const y = (e.clientY - rect.top) * (S / rect.height);
  const c = Math.min(N - 1, Math.floor(x / CELL));
  const r = Math.min(N - 1, Math.floor(y / CELL));
  const h = holes[r * N + c];
  if (h.mole) {
    h.mole = false;
    score += 10;
    scoreEl.textContent = score;
  }
});

function start() {
  init();
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', start);
init();
