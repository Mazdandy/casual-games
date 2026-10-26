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

const PLAYER_W = 28, PLAYER_H = 20, PLAYER_Y = H - 30;
const PLAYER_SPEED = 270, BULLET_SPEED = 430, SHOOT_CD = 0.22;
const COLS = 5, ROWS = 4, EW = 30, EH = 22, GAPX = 18, GAPY = 16;
const OFFSET_X = 62, OFFSET_Y = 40;

const keys = { left: false, right: false };
const pointer = { active: false };

let player, enemies, bullets, bombs, dir, speed, score, lives, running, rafId, lastTime, shootCd, bombTimer, wave, invuln;

function buildFormation() {
  enemies = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      enemies.push({ x: OFFSET_X + c * (EW + GAPX), y: OFFSET_Y + r * (EH + GAPY), alive: true });
    }
  }
}

function init() {
  player = { x: W / 2 - PLAYER_W / 2, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H };
  buildFormation();
  bullets = []; bombs = [];
  dir = 1; speed = 44; score = 0; lives = 3; shootCd = 0; bombTimer = 1.4;
  wave = 1; invuln = 0; lastTime = 0;
  keys.left = keys.right = false;
  pointer.active = false;
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  bestEl.textContent = getProgress().bestScores['shooter'] || 0;
  draw();
}

function alive() { return enemies.filter(e => e.alive); }

function fire() {
  bullets.push({ x: player.x + player.w / 2, y: player.y - 4 });
}

function loseLife() {
  lives--; livesEl.textContent = lives;
  if (lives <= 0) { finish(); return; }
  invuln = 1.6;
  bombs = [];
  player.x = W / 2 - player.w / 2;
}

function update(dt) {
  if (keys.left) player.x -= PLAYER_SPEED * dt;
  if (keys.right) player.x += PLAYER_SPEED * dt;
  player.x = Math.max(0, Math.min(W - player.w, player.x));
  if (invuln > 0) invuln -= dt;

  shootCd -= dt;
  if (shootCd <= 0) { fire(); shootCd = SHOOT_CD; }

  const living = alive();
  if (living.length === 0) {
    wave++;
    speed += 12;
    buildFormation();
    bombs = [];
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  living.forEach(e => { if (e.x < minX) minX = e.x; if (e.x + EW > maxX) maxX = e.x + EW; });
  if (maxX + dir * speed * dt > W - 6 || minX + dir * speed * dt < 6) {
    dir *= -1;
    living.forEach(e => { e.y += 14; });
  } else {
    living.forEach(e => { e.x += dir * speed * dt; });
  }
  enemies.forEach(e => { if (e.alive) e.y += (4 + wave) * dt; });

  if (living.some(e => e.y + EH > PLAYER_Y)) { finish(); return; }

  bullets.forEach(b => { b.y -= BULLET_SPEED * dt; });
  bullets = bullets.filter(b => b.y > -10);

  for (const b of bullets) {
    for (const e of living) {
      if (!e.alive) continue;
      if (b.x > e.x && b.x < e.x + EW && b.y < e.y + EH && b.y > e.y) {
        e.alive = false; b.y = -99;
        score += 10; scoreEl.textContent = score;
        break;
      }
    }
  }
  bullets = bullets.filter(b => b.y > -10);

  bombTimer -= dt;
  if (bombTimer <= 0) {
    bombTimer = Math.max(0.45, 1.6 - wave * 0.15);
    const l = alive();
    if (l.length) {
      const e = l[Math.floor(Math.random() * l.length)];
      bombs.push({ x: e.x + EW / 2, y: e.y + EH });
    }
  }
  bombs.forEach(b => { b.y += 190 * dt; });
  bombs = bombs.filter(b => b.y < H + 10);

  if (invuln <= 0) {
    for (const b of bombs) {
      if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
        loseLife();
        return;
      }
    }
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  enemies.forEach(e => {
    if (!e.alive) return;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(e.x, e.y, EW, EH);
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(e.x + 5, e.y + 6, 5, 5);
    ctx.fillRect(e.x + EW - 10, e.y + 6, 5, 5);
  });

  ctx.fillStyle = '#facc15';
  bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 12, 4, 12));

  ctx.fillStyle = '#f87171';
  bombs.forEach(b => ctx.fillRect(b.x - 3, b.y - 6, 6, 12));

  if (invuln <= 0 || Math.floor(performance.now() / 120) % 2 === 0) {
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(player.x + player.w / 2, player.y);
    ctx.lineTo(player.x, player.y + player.h);
    ctx.lineTo(player.x + player.w, player.y + player.h);
    ctx.closePath(); ctx.fill();
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
  const res = submitScore('shooter', score);
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
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
});

function setPlayerX(clientX) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (W / r.width);
  player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
}
canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  pointer.active = true;
  setPlayerX(e.clientX);
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => { if (running && pointer.active) setPlayerX(e.clientX); });
canvas.addEventListener('pointerup', () => { pointer.active = false; });
canvas.addEventListener('pointercancel', () => { pointer.active = false; });

startBtn.addEventListener('click', start);
init();
