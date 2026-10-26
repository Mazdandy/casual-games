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

const GRAV = 0.5, BOUNCE = -12.5, MOVE = 5.2, MAXFALL = 13;

let player, platforms, camY, genY, startY, maxHeight, score, running = false, rafId = 0, last = 0;
let pLeft = false, pRight = false;

const keys = {};
const ptr = new Map();

function init() {
  camY = 0;
  player = { x: W / 2, y: H - 110, vx: 0, vy: BOUNCE, w: 26, h: 26 };
  startY = player.y;
  maxHeight = 0;
  platforms = [{ x: W / 2 - 45, y: H - 70, w: 90, h: 12, type: 'normal', vx: 0, dead: false }];
  genY = H - 70;
  score = 0;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['doodle'] || 0;
  pLeft = false; pRight = false;
  generate();
  draw();
}

function generate() {
  while (genY > camY - H) {
    genY -= 58 + Math.random() * 42;
    const r = Math.random();
    const type = r < 0.16 ? 'break' : (r < 0.34 ? 'move' : 'normal');
    const w = type === 'break' ? 66 : 78;
    const x = 10 + Math.random() * (W - 20 - w);
    platforms.push({ x, y: genY, w, h: 12, type, vx: Math.random() < 0.5 ? -1.4 : 1.4, dead: false });
  }
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);

  const left = keys.left || pLeft;
  const right = keys.right || pRight;
  const target = (left && !right) ? -MOVE : (right && !left) ? MOVE : 0;
  player.vx += (target - player.vx) * Math.min(1, 0.22 * s);

  const prevBottom = player.y + player.h / 2;

  player.vy += GRAV * s;
  player.vy = Math.min(player.vy, MAXFALL);
  player.x += player.vx * s;
  player.y += player.vy * s;

  if (player.x < -player.w / 2) player.x = W + player.w / 2;
  if (player.x > W + player.w / 2) player.x = -player.w / 2;

  for (const p of platforms) {
    if (p.type !== 'move') continue;
    p.x += p.vx * s;
    if (p.x < 8) { p.x = 8; p.vx = -p.vx; }
    if (p.x + p.w > W - 8) { p.x = W - 8 - p.w; p.vx = -p.vx; }
  }

  const bottom = player.y + player.h / 2;
  if (player.vy > 0) {
    for (const p of platforms) {
      if (p.dead) continue;
      if (prevBottom <= p.y && bottom >= p.y &&
          player.x + player.w / 2 > p.x && player.x - player.w / 2 < p.x + p.w) {
        player.y = p.y - player.h / 2;
        player.vy = BOUNCE;
        if (p.type === 'break') p.dead = true;
        break;
      }
    }
  }

  const t = player.y - H * 0.45;
  if (t < camY) camY = t;

  maxHeight = Math.max(maxHeight, startY - player.y);
  const ns = Math.floor(maxHeight / 10);
  if (ns !== score) { score = ns; scoreEl.textContent = String(score); }

  generate();
  platforms = platforms.filter(p => !p.dead && p.y < camY + H + 60);

  if (player.y - camY > H + 30) finish();
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1030');
  g.addColorStop(1, '#0b0f14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const p of platforms) {
    const sy = p.y - camY;
    if (sy < -20 || sy > H + 20) continue;
    if (p.type === 'break') ctx.fillStyle = '#f97316';
    else if (p.type === 'move') ctx.fillStyle = '#a855f7';
    else ctx.fillStyle = '#22c55e';
    ctx.fillRect(p.x, sy, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(p.x, sy, p.w, 3);
    if (p.type === 'break') {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(p.x + p.w / 2 - 1, sy, 2, p.h);
    }
  }

  const py = player.y - camY;
  ctx.beginPath();
  ctx.arc(player.x, py, player.w / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fill();
  ctx.fillStyle = '#04121a';
  ctx.beginPath();
  ctx.arc(player.x - 5, py - 3, 3.2, 0, Math.PI * 2);
  ctx.arc(player.x + 5, py - 3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x, py + 5, 5, 0, Math.PI);
  ctx.strokeStyle = '#04121a';
  ctx.lineWidth = 2;
  ctx.stroke();
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
  const res = submitScore('doodle', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Jatuh! 💫</h2>
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
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function updateZones() {
  let l = false, r = false;
  for (const p of ptr.values()) {
    if (p < W / 2) l = true; else r = true;
  }
  pLeft = l;
  pRight = r;
}

function toCanvasX(e) {
  const r = canvas.getBoundingClientRect();
  return (e.clientX - r.left) * (W / r.width);
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  ptr.set(e.pointerId, toCanvasX(e));
  updateZones();
});
canvas.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return;
  ptr.set(e.pointerId, toCanvasX(e));
  updateZones();
});
function dropPointer(e) { ptr.delete(e.pointerId); updateZones(); }
canvas.addEventListener('pointerup', dropPointer);
canvas.addEventListener('pointercancel', dropPointer);
canvas.addEventListener('pointerleave', dropPointer);

startBtn.addEventListener('click', start);
init();
