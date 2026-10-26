import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const rivalEl = document.getElementById('rival');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const PR = 20, PUCK_R = 9, MID = H / 2, WIN_GOALS = 7;
const GOAL_W = 112, GX1 = (W - GOAL_W) / 2, GX2 = (W + GOAL_W) / 2;
const MIN_SPEED = 140, MAX_SPEED = 470, BASE_SPEED = 220;
const KEY_SPEED = 340;

const keys = { left: false, right: false, up: false, down: false };

let player, ai, puck, playerGoals, aiGoals, running, rafId, lastTime;

function resetPuck(dir) {
  puck.x = W / 2; puck.y = MID;
  const a = (Math.random() - 0.5) * 1.0;
  puck.vx = Math.sin(a) * BASE_SPEED;
  puck.vy = Math.cos(a) * BASE_SPEED * dir;
}

function init() {
  player = { x: W / 2, y: H - 60, px: W / 2, py: H - 60, vx: 0, vy: 0, r: PR };
  ai = { x: W / 2, y: 60, px: W / 2, py: 60, vx: 0, vy: 0, r: PR };
  puck = { x: W / 2, y: MID, vx: 0, vy: 0 };
  playerGoals = 0; aiGoals = 0; lastTime = 0;
  keys.left = keys.right = keys.up = keys.down = false;
  resetPuck(Math.random() < 0.5 ? 1 : -1);
  scoreEl.textContent = '0';
  rivalEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['airhockey'] || 0;
  draw();
}

function clampPlayer() {
  player.x = Math.max(PR, Math.min(W - PR, player.x));
  player.y = Math.max(MID + PR, Math.min(H - PR, player.y));
}
function clampAi() {
  ai.x = Math.max(PR, Math.min(W - PR, ai.x));
  ai.y = Math.max(PR, Math.min(MID - PR, ai.y));
}

function capSpeed() {
  const s = Math.hypot(puck.vx, puck.vy);
  if (s > MAX_SPEED) { puck.vx *= MAX_SPEED / s; puck.vy *= MAX_SPEED / s; }
  else if (s < MIN_SPEED && s > 0) { puck.vx *= MIN_SPEED / s; puck.vy *= MIN_SPEED / s; }
}

function collide(pad) {
  const dx = puck.x - pad.x, dy = puck.y - pad.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const min = PUCK_R + pad.r;
  if (d < min) {
    const nx = dx / d, ny = dy / d;
    puck.x = pad.x + nx * min;
    puck.y = pad.y + ny * min;
    const dot = puck.vx * nx + puck.vy * ny;
    puck.vx -= 2 * dot * nx;
    puck.vy -= 2 * dot * ny;
    puck.vx += pad.vx * 0.35;
    puck.vy += pad.vy * 0.35;
    capSpeed();
  }
}

function update(dt) {
  if (keys.left) player.x -= KEY_SPEED * dt;
  if (keys.right) player.x += KEY_SPEED * dt;
  if (keys.up) player.y -= KEY_SPEED * dt;
  if (keys.down) player.y += KEY_SPEED * dt;
  clampPlayer();

  player.vx = (player.x - player.px) / dt;
  player.vy = (player.y - player.py) / dt;

  const aiSpeed = 250 + Math.min(150, (playerGoals + aiGoals) * 22);
  const tx = puck.y < MID ? puck.x : W / 2;
  const clampedTx = Math.max(PR, Math.min(W - PR, tx));
  ai.x += Math.max(-aiSpeed * dt, Math.min(aiSpeed * dt, clampedTx - ai.x));
  let ty = PR + 12;
  if (puck.y < MID) ty = puck.y - 26;
  ty = Math.max(PR, Math.min(MID - PR, ty));
  ai.y += Math.max(-aiSpeed * dt, Math.min(aiSpeed * dt, ty - ai.y));
  clampAi();
  ai.vx = (ai.x - ai.px) / dt;
  ai.vy = (ai.y - ai.py) / dt;

  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
  const damp = Math.pow(0.92, dt);
  puck.vx *= damp; puck.vy *= damp;

  if (puck.x - PUCK_R < 0) { puck.x = PUCK_R; puck.vx = Math.abs(puck.vx); }
  if (puck.x + PUCK_R > W) { puck.x = W - PUCK_R; puck.vx = -Math.abs(puck.vx); }
  const inGap = puck.x > GX1 && puck.x < GX2;
  if (puck.y - PUCK_R < 0 && !inGap) { puck.y = PUCK_R; puck.vy = Math.abs(puck.vy); }
  if (puck.y + PUCK_R > H && !inGap) { puck.y = H - PUCK_R; puck.vy = -Math.abs(puck.vy); }

  collide(player);
  collide(ai);

  if (puck.y < -PUCK_R) { playerScore(); return; }
  if (puck.y > H + PUCK_R) { aiScore(); return; }

  player.px = player.x; player.py = player.y;
  ai.px = ai.x; ai.py = ai.y;
}

function playerScore() {
  playerGoals++;
  scoreEl.textContent = playerGoals * 100;
  if (playerGoals >= WIN_GOALS) { finish('Kamu Menang! 🎉'); return; }
  resetPuck(1);
  player.px = player.x; player.py = player.y;
  ai.px = ai.x; ai.py = ai.y;
}

function aiScore() {
  aiGoals++;
  rivalEl.textContent = aiGoals;
  if (aiGoals >= WIN_GOALS) { finish('Kamu Kalah'); return; }
  resetPuck(-1);
  player.px = player.x; player.py = player.y;
  ai.px = ai.x; ai.py = ai.y;
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0f1a24';
  ctx.fillRect(0, 0, W, MID);
  ctx.fillStyle = '#0c1620';
  ctx.fillRect(0, MID, W, H - MID);

  ctx.strokeStyle = '#223040'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, MID, 44, 0, 6.283); ctx.stroke();

  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(GX1, 0, GOAL_W, 6);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(GX1, H - 6, GOAL_W, 6);

  ctx.fillStyle = '#f97316';
  ctx.beginPath(); ctx.arc(puck.x, puck.y, PUCK_R, 0, 6.283); ctx.fill();

  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ai.x, ai.y, PR, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = '#22d3ee';
  ctx.beginPath(); ctx.arc(player.x, player.y, PR, 0, 6.283); ctx.stroke();
}

function loop(now) {
  if (!running) return;
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;
  if (dt > 0) update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish(title) {
  running = false;
  cancelAnimationFrame(rafId);
  const finalScore = playerGoals * 100;
  const res = submitScore('airhockey', finalScore);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${finalScore}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Kamu ${playerGoals} — ${aiGoals} Lawan</p>
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
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.down = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = false;
  else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = false;
});

function setPlayer(e) {
  if (!running) return;
  const r = canvas.getBoundingClientRect();
  player.x = (e.clientX - r.left) * (W / r.width);
  player.y = (e.clientY - r.top) * (H / r.height);
  clampPlayer();
}
canvas.addEventListener('pointerdown', e => {
  setPlayer(e);
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => setPlayer(e));

startBtn.addEventListener('click', start);
init();
