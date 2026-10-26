import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const citiesEl = document.getElementById('cities');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const CITY_Y = H - 46;
const EXPL_MAX = 44, EXPL_LIFE = 0.6, HIT_SCORE = 25;

let cities, enemies, explosions, score, running, rafId, lastTime, elapsed, spawnTimer;

function init() {
  cities = [];
  for (let i = 0; i < 6; i++) cities.push({ x: 40 + i * 80, y: CITY_Y, alive: true });
  enemies = []; explosions = [];
  score = 0; lastTime = 0; elapsed = 0; spawnTimer = 0.6;
  scoreEl.textContent = '0';
  citiesEl.textContent = '6';
  bestEl.textContent = getProgress().bestScores['missile'] || 0;
  draw();
}

function update(dt) {
  elapsed += dt;
  const wave = 1 + Math.floor(elapsed / 15);
  const interval = Math.max(0.24, 1.0 - (wave - 1) * 0.09);
  const speed = 46 + wave * 9;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = interval * (0.7 + Math.random() * 0.6);
    enemies.push({ x: 14 + Math.random() * (W - 28), y: -8, vy: speed * (0.85 + Math.random() * 0.4), dead: false });
  }

  enemies.forEach(e => { e.y += e.vy * dt; });
  explosions.forEach(ex => { ex.life -= dt; });

  for (const ex of explosions) {
    ex.r = EXPL_MAX * Math.sin(Math.PI * (1 - Math.max(0, ex.life) / EXPL_LIFE));
    if (ex.r <= 0) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - ex.x, e.y - ex.y) < ex.r) {
        e.dead = true;
        score += HIT_SCORE;
        scoreEl.textContent = score;
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  for (const e of enemies) {
    if (e.y >= CITY_Y) {
      e.dead = true;
      let target = null, bd = 1e9;
      for (const c of cities) {
        if (!c.alive) continue;
        const d = Math.abs(c.x - e.x);
        if (d < bd) { bd = d; target = c; }
      }
      if (target && bd < 34) target.alive = false;
    }
  }
  enemies = enemies.filter(e => !e.dead);
  explosions = explosions.filter(ex => ex.life > 0);

  const alive = cities.filter(c => c.alive).length;
  citiesEl.textContent = alive;
  if (alive === 0) finish();
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#223040'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, CITY_Y - 4); ctx.lineTo(W, CITY_Y - 4); ctx.stroke();

  for (const c of cities) {
    if (c.alive) {
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(c.x - 15, c.y, 30, 22);
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(c.x - 8, c.y + 8, 5, 6);
      ctx.fillRect(c.x + 3, c.y + 8, 5, 6);
    } else {
      ctx.fillStyle = '#3a2f2f';
      ctx.fillRect(c.x - 15, c.y + 12, 30, 10);
    }
  }

  for (const e of enemies) {
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(e.x, e.y - 12); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(e.x - 2, e.y - 3, 4, 6);
  }

  for (const ex of explosions) {
    if (ex.r <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, ex.life / EXPL_LIFE));
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function loop(now) {
  if (!running) return;
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('missile', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Kota Hancur!</h2>
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
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function detonate(e) {
  if (!running) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  explosions.push({ x, y: Math.min(y, CITY_Y - 8), r: 0, life: EXPL_LIFE });
}
canvas.addEventListener('pointerdown', e => {
  detonate(e);
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});

startBtn.addEventListener('click', start);
init();
