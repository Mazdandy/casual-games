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

const CELL = 24;
const PLAYER_W = 26, PLAYER_H = 20, PLAYER_Y = H - 30;
const BULLET_SPEED = 330, MAX_BULLETS = 3, SHOOT_CD = 0.16, MOVE_SPEED = 250;

const keys = { left: false, right: false, space: false };
const pointer = { down: false };

let player, centipedes, bullets, score, lives, running, rafId, shootCd, lastTime, wave, period;

function spawnCentipede() {
  const headX = 13 * CELL;
  const segs = [];
  for (let i = 0; i < 10; i++) segs.push({ x: headX - i * CELL, y: CELL });
  centipedes.push({ segs, dir: 1, acc: 0 });
}

function updatePeriod() {
  period = Math.max(0.05, 0.16 - wave * 0.006 - Math.min(0.07, score * 0.00006));
}

function init() {
  player = { x: W / 2 - PLAYER_W / 2, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };
  centipedes = []; bullets = [];
  score = 0; lives = 3; shootCd = 0; lastTime = 0; wave = 0;
  keys.left = keys.right = keys.space = false;
  pointer.down = false;
  spawnCentipede();
  updatePeriod();
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  bestEl.textContent = getProgress().bestScores['centipede'] || 0;
  draw();
}

function shoot() {
  if (shootCd > 0 || bullets.length >= MAX_BULLETS) return;
  bullets.push({ x: player.x + player.w / 2, y: player.y - 2 });
  shootCd = SHOOT_CD;
}

function hitSegment(ci, si) {
  score += 10; scoreEl.textContent = score;
  updatePeriod();
  const c = centipedes[ci];
  if (c.segs.length === 1) { centipedes.splice(ci, 1); return; }
  if (si === 0) { c.segs.shift(); return; }
  if (si === c.segs.length - 1) { c.segs.pop(); return; }
  const tail = c.segs.slice(si + 1);
  c.segs = c.segs.slice(0, si);
  centipedes.push({ segs: tail, dir: c.dir, acc: 0 });
}

function stepCentipede(c) {
  const head = c.segs[0];
  let nx = head.x + c.dir * CELL, ny = head.y;
  if (c.dir > 0 && head.x + CELL > W - 2) { c.dir = -1; nx = head.x; ny = head.y + CELL; }
  else if (c.dir < 0 && head.x - CELL < 0) { c.dir = 1; nx = head.x; ny = head.y + CELL; }
  for (let i = c.segs.length - 1; i > 0; i--) {
    c.segs[i].x = c.segs[i - 1].x;
    c.segs[i].y = c.segs[i - 1].y;
  }
  c.segs[0].x = nx; c.segs[0].y = ny;
}

function loseLife() {
  lives--; livesEl.textContent = lives;
  if (lives <= 0) { finish(); return; }
  centipedes = []; bullets = [];
  spawnCentipede();
  updatePeriod();
}

function update(dt) {
  if (shootCd > 0) shootCd -= dt;

  if (keys.left) player.x -= MOVE_SPEED * dt;
  if (keys.right) player.x += MOVE_SPEED * dt;
  player.x = Math.max(0, Math.min(W - player.w, player.x));
  if (keys.space || pointer.down) shoot();

  for (const c of centipedes) {
    c.acc += dt;
    while (c.acc >= period) { c.acc -= period; stepCentipede(c); }
  }

  bullets.forEach(b => { b.y -= BULLET_SPEED * dt; });
  bullets = bullets.filter(b => b.y > -10);

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    let hit = false;
    for (let ci = centipedes.length - 1; ci >= 0 && !hit; ci--) {
      const c = centipedes[ci];
      for (let si = c.segs.length - 1; si >= 0; si--) {
        const s = c.segs[si];
        if (b.x > s.x && b.x < s.x + CELL && b.y < s.y + CELL && b.y > s.y) {
          bullets.splice(bi, 1);
          hitSegment(ci, si);
          hit = true;
          break;
        }
      }
    }
  }

  for (const c of centipedes) {
    for (const s of c.segs) {
      if (s.y + CELL > player.y + 4) { loseLife(); return; }
    }
  }

  if (centipedes.length === 0) { wave++; spawnCentipede(); updatePeriod(); }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#141d27'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  centipedes.forEach(c => c.segs.forEach((s, i) => {
    ctx.fillStyle = i % 2 ? '#4ade80' : '#22c55e';
    ctx.fillRect(s.x + 2, s.y + 2, CELL - 4, CELL - 4);
  }));

  ctx.fillStyle = '#facc15';
  bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 8, 4, 10));

  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2, player.y);
  ctx.lineTo(player.x, player.y + player.h);
  ctx.lineTo(player.x + player.w, player.y + player.h);
  ctx.closePath(); ctx.fill();
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
  const res = submitScore('centipede', score);
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
  else if (k === ' ') { keys.space = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  else if (k === ' ') keys.space = false;
});

function setPlayerX(clientX) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (W / r.width);
  player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
}
canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  pointer.down = true;
  setPlayerX(e.clientX);
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => { if (running) setPlayerX(e.clientX); });
canvas.addEventListener('pointerup', () => { pointer.down = false; });
canvas.addEventListener('pointercancel', () => { pointer.down = false; });

startBtn.addEventListener('click', start);
init();
