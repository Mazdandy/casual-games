import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const GRAV = 0.5, MOVE = 4.4, JUMP_V = -11.8, MAXFALL = 14;
const PLAT_W = 84, PLAT_H = 12;

let player, platforms, camY, genY, score, running = false, rafId = 0, last = 0;
let jumpQueued = false, pLeft = false, pRight = false;

const keys = {};
const ptr = new Map();

function init() {
  camY = 0;
  genY = H - 70;
  player = { x: W / 2, y: H - 100, vx: 0, vy: 0, w: 22, h: 26, onGround: false };
  platforms = [{ x: W / 2 - 130, y: genY, w: 260, h: PLAT_H, landed: true }];
  score = 0;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['jump'] || 0;
  jumpQueued = false;
  generate();
  draw();
}

function generate() {
  while (genY > camY - H * 1.5) {
    const gap = 62 + Math.random() * 40;
    genY -= gap;
    const x = 12 + Math.random() * (W - 24 - PLAT_W);
    platforms.push({ x, y: genY, w: PLAT_W, h: PLAT_H, landed: false });
  }
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);

  const left = keys.left || pLeft;
  const right = keys.right || pRight;
  player.vx = (left && !right) ? -MOVE : (right && !left) ? MOVE : 0;
  player.x += player.vx * s;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

  if (jumpQueued && player.onGround) {
    player.vy = JUMP_V;
    player.onGround = false;
  }
  jumpQueued = false;

  const prevBottom = player.y + player.h / 2;
  player.vy += GRAV * s;
  player.vy = Math.min(player.vy, MAXFALL);
  player.y += player.vy * s;
  const bottom = player.y + player.h / 2;

  player.onGround = false;
  if (player.vy >= 0) {
    for (const p of platforms) {
      if (prevBottom <= p.y + 2 && bottom >= p.y && bottom <= p.y + p.h + 14 &&
          player.x + player.w / 2 > p.x && player.x - player.w / 2 < p.x + p.w) {
        player.y = p.y - player.h / 2;
        player.vy = 0;
        player.onGround = true;
        if (!p.landed) {
          p.landed = true;
          score += 10;
          scoreEl.textContent = String(score);
        }
        break;
      }
    }
  }

  const target = player.y - H * 0.55;
  if (target < camY) camY = target;

  generate();
  platforms = platforms.filter(p => p.y < camY + H + 80);

  if (player.y - camY > H + 30) finish();
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1a2a');
  g.addColorStop(1, '#0b0f14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // bintang parallax
  ctx.fillStyle = 'rgba(139,152,165,.5)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97) % W;
    const sy = ((i * 53) % H + (camY * 0.3) % H + H) % H;
    ctx.fillRect(sx, sy, 2, 2);
  }

  for (const p of platforms) {
    const sy = p.y - camY;
    if (sy < -20 || sy > H + 20) continue;
    ctx.fillStyle = p.landed ? '#22c55e' : '#3b4c63';
    ctx.fillRect(p.x, sy, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(p.x, sy, p.w, 3);
  }

  const py = player.y - camY;
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(player.x - player.w / 2, py - player.h / 2, player.w, player.h);
  ctx.fillStyle = '#04121a';
  ctx.fillRect(player.x - 6, py - 6, 4, 4);
  ctx.fillRect(player.x + 2, py - 6, 4, 4);

  // tombol lompat
  const bx = W / 2 - 60, by = H - 52;
  ctx.fillStyle = 'rgba(34,211,238,.12)';
  ctx.fillRect(bx, by, 120, 44);
  ctx.strokeStyle = 'rgba(34,211,238,.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, 120, 44);
  ctx.fillStyle = '#8b98a5';
  ctx.font = 'bold 14px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOMPAT', W / 2, by + 23);
  ctx.textBaseline = 'alphabetic';
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
  const res = submitScore('jump', score);
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
  last = 0;
  init();
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { jumpQueued = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height)
  };
}

function updateZones() {
  let l = false, rr = false;
  for (const p of ptr.values()) {
    if (p.y > H - 64 && Math.abs(p.x - W / 2) < 64) continue;
    if (p.x < W / 2) l = true; else rr = true;
  }
  pLeft = l;
  pRight = rr;
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const p = toCanvas(e);
  ptr.set(e.pointerId, p);
  if (p.y > H - 64 && Math.abs(p.x - W / 2) < 64) jumpQueued = true;
  updateZones();
});
canvas.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return;
  ptr.set(e.pointerId, toCanvas(e));
  updateZones();
});
function dropPointer(e) { ptr.delete(e.pointerId); updateZones(); }
canvas.addEventListener('pointerup', dropPointer);
canvas.addEventListener('pointercancel', dropPointer);
canvas.addEventListener('pointerleave', dropPointer);

startBtn.addEventListener('click', start);
init();
