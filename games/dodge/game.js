import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 400, H = 400;
canvas.width = W; canvas.height = H;

const PW = 34, PH = 34, PLAYER_Y = H - PH - 10;

let player, blocks, score, running, rafId, keys, spawnTimer, speed, elapsed;

function init() {
  player = { x: W / 2 - PW / 2 };
  blocks = []; score = 0; keys = {}; speed = 2.2; elapsed = 0; spawnTimer = 20;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['dodge'] || 0;
  draw();
}

function update() {
  if (keys.left) player.x -= 6;
  if (keys.right) player.x += 6;
  player.x = Math.max(0, Math.min(W - PW, player.x));

  spawnTimer--;
  if (spawnTimer <= 0) {
    const w = 30 + Math.random() * 70;
    blocks.push({ x: Math.random() * (W - w), y: -30, w, h: 26 });
    spawnTimer = Math.max(14, 34 - elapsed * 0.6);
  }
  elapsed += 0.016;
  speed += 0.0008;

  blocks.forEach(b => { b.y += speed; });
  blocks = blocks.filter(b => {
    if (b.y > H) { score++; scoreEl.textContent = score; return false; }
    return true;
  });

  for (const b of blocks) {
    if (b.y + b.h > PLAYER_Y && b.y < PLAYER_Y + PH &&
        b.x < player.x + PW && b.x + b.w > player.x) {
      finish();
      return;
    }
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ef4444';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(player.x, PLAYER_Y, PW, PH);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('dodge', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Game Over</h2>
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

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});

function movePlayer(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (W / rect.width);
  player.x = Math.max(0, Math.min(W - PW, x - PW / 2));
}
canvas.addEventListener('touchmove', e => { e.preventDefault(); movePlayer(e.touches[0].clientX); }, { passive: false });
canvas.addEventListener('mousemove', e => movePlayer(e.clientX));
canvas.addEventListener('touchstart', e => { e.preventDefault(); movePlayer(e.touches[0].clientX); }, { passive: false });

startBtn.addEventListener('click', start);
init();
