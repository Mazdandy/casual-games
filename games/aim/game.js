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

const DURATION = 30000;
const LIFE = 1500;
const SPAWN_CD = 0.4;

let targets, score, hits, misses, running = false, rafId = 0, endTime = 0, last = 0, spawnCd = 0;

function points(r) {
  if (r <= 15) return 30;
  if (r <= 23) return 20;
  return 10;
}
function colorFor(r) {
  const p = points(r);
  return p === 30 ? '#f472b6' : p === 20 ? '#a855f7' : '#22d3ee';
}

function spawn(now) {
  const r = 12 + Math.random() * 20;
  const x = r + 14 + Math.random() * (W - 2 * r - 28);
  const y = r + 14 + Math.random() * (H - 2 * r - 28);
  targets.push({ x, y, r, until: now + LIFE });
}

function draw(now) {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  for (const t of targets) {
    const life = Math.max(0, (t.until - now) / LIFE);
    ctx.globalAlpha = 0.35 + 0.65 * life;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = colorFor(t.r);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (targets.length === 0) {
    ctx.fillStyle = '#8b98a5';
    ctx.font = 'bold 16px ui-sans-serif,system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Bersiap...', W / 2, H / 2);
  }
}

function init() {
  targets = [];
  score = 0; hits = 0; misses = 0; spawnCd = 0;
  scoreEl.textContent = '0';
  timeEl.textContent = Math.ceil(DURATION / 1000);
  bestEl.textContent = getProgress().bestScores['aim'] || 0;
  endTime = performance.now() + DURATION;
  draw(performance.now());
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  const remaining = Math.max(0, endTime - now);
  timeEl.textContent = Math.ceil(remaining / 1000);

  targets = targets.filter(t => now < t.until);
  spawnCd -= dt;
  if (targets.length < 2 && spawnCd <= 0) { spawn(now); spawnCd = SPAWN_CD; }

  draw(now);
  if (remaining <= 0) { finish(); return; }
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const total = hits + misses;
  const acc = total > 0 ? Math.round((hits / total) * 100) : 0;
  const res = submitScore('aim', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Akurasi: <strong>${acc}%</strong> (${hits} kena / ${total} klik)</p>
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
  const y = (e.clientY - rect.top) * (H / rect.height);
  let idx = -1;
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    const dx = x - t.x, dy = y - t.y;
    if (dx * dx + dy * dy <= t.r * t.r) { idx = i; break; }
  }
  if (idx >= 0) {
    score += points(targets[idx].r);
    hits++;
    targets.splice(idx, 1);
    scoreEl.textContent = score;
  } else {
    misses++;
  }
});

startBtn.addEventListener('click', start);
init();
