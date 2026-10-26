import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const TURN = 3.8, THRUST = 175, MAX_SPEED = 205, FRICTION = 0.7;
const BULLET_SPEED = 330, BULLET_LIFE = 0.85, SHOOT_CD = 0.16;

const keys = { left: false, right: false, up: false, space: false };
const pointer = { down: false, x: 0, y: 0 };

let ship, asteroids, bullets, score, lives, running, rafId, shootCd, lastTime, wave;

function shape() {
  const n = 6 + Math.floor(Math.random() * 4);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ a: (i / n) * Math.PI * 2, r: 0.7 + Math.random() * 0.55 });
  return pts;
}

function spawnAsteroid(x, y, size) {
  const ang = Math.random() * Math.PI * 2;
  const sp = (size === 3 ? 26 : size === 2 ? 42 : 60) + Math.random() * 20;
  const r = size === 3 ? 30 : size === 2 ? 19 : 11;
  return {
    x, y, size, r,
    vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    rot: Math.random() * 6.283, spin: (Math.random() - 0.5) * 2,
    pts: shape(), dead: false
  };
}

function wrap(o, r) {
  if (o.x < -r) o.x = W + r; else if (o.x > W + r) o.x = -r;
  if (o.y < -r) o.y = H + r; else if (o.y > H + r) o.y = -r;
}

function freshWave(count) {
  for (let i = 0; i < count; i++) {
    let x, y;
    do { x = Math.random() * W; y = Math.random() * H; }
    while (ship && Math.hypot(x - ship.x, y - ship.y) < 120);
    asteroids.push(spawnAsteroid(x, y, 3));
  }
}

function init() {
  ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 2 };
  asteroids = []; bullets = [];
  score = 0; lives = 3; shootCd = 0; lastTime = 0; wave = 0;
  keys.left = keys.right = keys.up = keys.space = false;
  pointer.down = false;
  freshWave(4);
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  bestEl.textContent = getProgress().bestScores['asteroids'] || 0;
  draw();
}

function shoot(angle) {
  if (shootCd > 0 || !ship) return;
  bullets.push({
    x: ship.x + Math.cos(angle) * 15,
    y: ship.y + Math.sin(angle) * 15,
    vx: Math.cos(angle) * BULLET_SPEED + ship.vx * 0.4,
    vy: Math.sin(angle) * BULLET_SPEED + ship.vy * 0.4,
    life: BULLET_LIFE
  });
  shootCd = SHOOT_CD;
}

function hitShip() {
  lives--; livesEl.textContent = lives;
  if (lives <= 0) { finish(); return; }
  ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0;
  ship.angle = -Math.PI / 2; ship.invuln = 2;
  asteroids = asteroids.filter(a => Math.hypot(a.x - W / 2, a.y - H / 2) > a.r + 95);
}

function update(dt) {
  if (shootCd > 0) shootCd -= dt;

  if (pointer.down) {
    ship.angle = Math.atan2(pointer.y - ship.y, pointer.x - ship.x);
    shoot(ship.angle);
  }
  if (keys.left) ship.angle -= TURN * dt;
  if (keys.right) ship.angle += TURN * dt;
  if (keys.up) {
    ship.vx += Math.cos(ship.angle) * THRUST * dt;
    ship.vy += Math.sin(ship.angle) * THRUST * dt;
  }
  if (keys.space) shoot(ship.angle);

  const f = Math.max(0, 1 - FRICTION * dt);
  ship.vx *= f; ship.vy *= f;
  const sp = Math.hypot(ship.vx, ship.vy);
  if (sp > MAX_SPEED) { ship.vx *= MAX_SPEED / sp; ship.vy *= MAX_SPEED / sp; }
  ship.x += ship.vx * dt; ship.y += ship.vy * dt;
  wrap(ship, 14);
  if (ship.invuln > 0) ship.invuln -= dt;

  bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b, 4); });
  asteroids.forEach(a => { a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.spin * dt; wrap(a, a.r); });

  const newAst = [];
  for (const b of bullets) {
    if (b.life <= 0) continue;
    for (const a of asteroids) {
      if (a.dead) continue;
      if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
        a.dead = true; b.life = 0;
        score += 20; scoreEl.textContent = score;
        if (a.size > 1) {
          for (let i = 0; i < 2; i++) {
            const c = spawnAsteroid(a.x, a.y, a.size - 1);
            c.vx += a.vx * 0.5; c.vy += a.vy * 0.5;
            newAst.push(c);
          }
        }
        break;
      }
    }
  }
  bullets = bullets.filter(b => b.life > 0);
  asteroids = asteroids.filter(a => !a.dead).concat(newAst);

  if (ship.invuln <= 0) {
    for (const a of asteroids) {
      if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + 8) { hitShip(); return; }
    }
  }

  if (asteroids.length === 0) { wave++; freshWave(Math.min(8, 3 + wave)); }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2;
  for (const a of asteroids) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot); ctx.beginPath();
    a.pts.forEach((p, i) => {
      const px = Math.cos(p.a) * a.r * p.r, py = Math.sin(p.a) * a.r * p.r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  ctx.fillStyle = '#facc15';
  for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, 6.283); ctx.fill(); }

  if (ship && (ship.invuln <= 0 || Math.floor(performance.now() / 120) % 2 === 0)) {
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9);
    ctx.closePath(); ctx.stroke();
    ctx.restore();
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
  const res = submitScore('asteroids', score);
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
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.up = true; e.preventDefault(); }
  else if (k === ' ') { keys.space = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = false;
  else if (k === ' ') keys.space = false;
});

function setAim(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - r.left) * (W / r.width);
  pointer.y = (e.clientY - r.top) * (H / r.height);
}
canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  pointer.down = true;
  setAim(e);
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => { if (pointer.down) setAim(e); });
canvas.addEventListener('pointerup', () => { pointer.down = false; });
canvas.addEventListener('pointercancel', () => { pointer.down = false; });

startBtn.addEventListener('click', start);
init();
