import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const GRAV = 0.62, JUMP1 = -11.6, JUMP2 = -9.8, MAXFALL = 15;
const GROUND_Y = H - 56;
const BASE_SPEED = 4.6, MAX_SPEED = 11.5;

let player, obstacles, speed, score, spawnGap, running = false, rafId = 0, last = 0;
let bg1 = 0, bg2 = 0;
const keys = {};

function init() {
  player = { x: 96, y: GROUND_Y, vy: 0, jumps: 0, onGround: true };
  obstacles = [];
  speed = BASE_SPEED;
  score = 0;
  spawnGap = 220;
  bg1 = 0; bg2 = 0;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['runner'] || 0;
  draw();
}

function spawnObstacle() {
  if (Math.random() < 0.6) {
    obstacles.push({
      type: 'box',
      x: W + 20,
      w: 22 + Math.random() * 18,
      h: 26 + Math.random() * 22,
      passed: false
    });
  } else {
    obstacles.push({
      type: 'pit',
      x: W + 20,
      w: 55 + Math.random() * 55,
      passed: false
    });
  }
}

function jump() {
  if (player.jumps < 2) {
    player.vy = player.jumps === 0 ? JUMP1 : JUMP2;
    player.jumps++;
    player.onGround = false;
  }
}

function overPit() {
  for (const o of obstacles) {
    if (o.type !== 'pit') continue;
    if (player.x > o.x + 4 && player.x < o.x + o.w - 4) return true;
  }
  return false;
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);
  speed = Math.min(MAX_SPEED, BASE_SPEED + score * 0.05);

  bg1 = (bg1 + speed * 0.3 * s) % W;
  bg2 = (bg2 + speed * 0.6 * s) % W;

  spawnGap -= speed * s;
  if (spawnGap <= 0) {
    spawnObstacle();
    spawnGap = 160 + Math.random() * 170;
  }

  for (const o of obstacles) o.x -= speed * s;
  obstacles = obstacles.filter(o => o.x + o.w > -40);

  player.vy += GRAV * s;
  player.vy = Math.min(player.vy, MAXFALL);
  player.y += player.vy * s;

  if (player.y >= GROUND_Y) {
    if (!overPit()) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.jumps = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }
  }

  if (player.y > H + 60) { finish(); return; }

  const pl = player.x - 12, pr = player.x + 12, pt = player.y - 34, pb = player.y;
  for (const o of obstacles) {
    if (o.type === 'box') {
      const bl = o.x, br = o.x + o.w, bt = GROUND_Y - o.h, bb = GROUND_Y;
      if (pr > bl && pl < br && pb > bt && pt < bb) { finish(); return; }
    }
    if (!o.passed && o.x + o.w < player.x - 12) {
      o.passed = true;
      score++;
      scoreEl.textContent = String(score);
    }
  }
}

function drawGround() {
  ctx.fillStyle = '#1b2a1f';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#2f5c3a';
  ctx.fillRect(0, GROUND_Y, W, 6);

  // lubang
  ctx.fillStyle = '#0b0f14';
  for (const o of obstacles) {
    if (o.type === 'pit') ctx.fillRect(o.x, GROUND_Y, o.w, H - GROUND_Y);
  }
  ctx.fillStyle = '#2f5c3a';
  for (const o of obstacles) {
    if (o.type === 'pit') {
      ctx.fillRect(o.x, GROUND_Y, 4, 6);
      ctx.fillRect(o.x + o.w - 4, GROUND_Y, 4, 6);
    }
  }
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#101c2c');
  g.addColorStop(1, '#1b2f42');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // parallax gunung jauh
  ctx.fillStyle = '#16283a';
  for (let i = -1; i < 5; i++) {
    const bx = i * 150 - bg1;
    ctx.beginPath();
    ctx.moveTo(bx, GROUND_Y);
    ctx.lineTo(bx + 75, GROUND_Y - 90);
    ctx.lineTo(bx + 150, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  // parallax bukit dekat
  ctx.fillStyle = '#1d3a4d';
  for (let i = -1; i < 6; i++) {
    const bx = i * 120 - bg2;
    ctx.beginPath();
    ctx.moveTo(bx, GROUND_Y);
    ctx.lineTo(bx + 60, GROUND_Y - 48);
    ctx.lineTo(bx + 120, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  drawGround();

  // rintangan
  for (const o of obstacles) {
    if (o.type === 'box') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(o.x, GROUND_Y - o.h, o.w, 4);
    }
  }

  // pemain
  const py = player.y;
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(player.x - 12, py - 34, 24, 34);
  ctx.fillStyle = '#04121a';
  ctx.fillRect(player.x - 7, py - 28, 5, 6);
  ctx.fillRect(player.x + 2, py - 28, 5, 6);
}

function loop(now) {
  if (!running) return;
  if (!last) last = now;
  let dt = now - last;
  last = now;
  if (dt > 50) dt = 50;
  update(dt);
  if (running) draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('runner', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Tabrakan! 💥</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  last = 0;
  init();
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (running) jump();
    e.preventDefault();
  }
});

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  jump();
  e.preventDefault();
});

startBtn.addEventListener('click', start);
init();
