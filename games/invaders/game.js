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

const COLS = 8, ROWS = 5, AW = 28, AH = 22, GAPX = 16, GAPY = 14;
const OFFSET_X = 40, OFFSET_Y = 40;

let player, aliens, bullets, dir, speed, score, running, rafId, keys, cooldown;

function init() {
  player = { x: W / 2 - 18, w: 36 };
  aliens = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    aliens.push({ x: OFFSET_X + c * (AW + GAPX), y: OFFSET_Y + r * (AH + GAPY), alive: true });
  bullets = [];
  dir = 1; speed = 0.7; score = 0; keys = {}; cooldown = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['invaders'] || 0;
  draw();
}

function alive() { return aliens.filter(a => a.alive); }

function update() {
  if (keys.left) player.x -= 5;
  if (keys.right) player.x += 5;
  player.x = Math.max(0, Math.min(W - player.w, player.x));
  if (cooldown > 0) cooldown--;

  const living = alive();
  if (!living.length) { finish('Menang! 🎉'); return; }

  let minX = Infinity, maxX = -Infinity;
  living.forEach(a => { if (a.x < minX) minX = a.x; if (a.x + AW > maxX) maxX = a.x + AW; });
  if (maxX + dir * speed > W - 4 || minX + dir * speed < 4) {
    dir *= -1;
    living.forEach(a => { a.y += 14; });
  } else {
    living.forEach(a => { a.x += dir * speed; });
  }

  if (living.some(a => a.y + AH > H - 40)) { finish('Game Over'); return; }

  bullets.forEach(b => { b.y -= 8; });
  bullets = bullets.filter(b => b.y > -10);

  for (const b of bullets) {
    for (const a of aliens) {
      if (!a.alive) continue;
      if (b.x > a.x && b.x < a.x + AW && b.y < a.y + AH && b.y > a.y) {
        a.alive = false; b.y = -99;
        score += 10; scoreEl.textContent = score;
        speed += 0.03;
        break;
      }
    }
  }
  bullets = bullets.filter(b => b.y > 0);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  aliens.forEach(a => {
    if (!a.alive) return;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(a.x, a.y, AW, AH);
  });
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(player.x, H - 34, player.w, 16);
  ctx.fillRect(player.x + player.w / 2 - 2, H - 46, 4, 12);
  ctx.fillStyle = '#facc15';
  bullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 10));
}

function shoot() {
  if (!running || cooldown > 0) return;
  bullets.push({ x: player.x + player.w / 2, y: H - 50 });
  cooldown = 10;
}

function finish(title) {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('invaders', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function loop() {
  if (!running) return;
  update();
  draw();
  rafId = requestAnimationFrame(loop);
}

function start() {
  init();
  running = true;
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function pointerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) * (W / rect.width);
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
  if (e.key === ' ') { e.preventDefault(); shoot(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});
canvas.addEventListener('mousemove', e => { player.x = Math.max(0, Math.min(W - player.w, pointerX(e.clientX) - player.w / 2)); });
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  player.x = Math.max(0, Math.min(W - player.w, pointerX(e.touches[0].clientX) - player.w / 2));
  shoot();
}, { passive: false });

startBtn.addEventListener('click', start);
init();
