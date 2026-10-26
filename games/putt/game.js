import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const holeEl = document.getElementById('hole');
const strokeEl = document.getElementById('stroke');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const B = 10;                       // tebal dinding
const BALL_R = 7, CUP_R = 13, PAR = 2;
const FRICTION = 0.985, STOP = 0.06, MAX_POWER = 11;

const HOLES = [
  { start: { x: 80, y: 180 }, cup: { x: 400, y: 180 }, walls: [] },
  { start: { x: 70, y: 70 }, cup: { x: 410, y: 290 }, walls: [{ x: 195, y: 120, w: 90, h: 120 }] },
  { start: { x: 70, y: 290 }, cup: { x: 410, y: 70 }, walls: [{ x: 150, y: 40, w: 180, h: 28 }, { x: 150, y: 292, w: 180, h: 28 }] },
  { start: { x: 60, y: 60 }, cup: { x: 420, y: 300 }, walls: [{ x: 180, y: 10, w: 26, h: 180 }, { x: 280, y: 170, w: 26, h: 180 }] },
  { start: { x: 60, y: 300 }, cup: { x: 420, y: 60 }, walls: [{ x: 120, y: 100, w: 250, h: 26 }, { x: 120, y: 232, w: 250, h: 26 }] }
];

let holeIndex, hole, ball, strokes, score, running = false, rafId = 0, last = 0;
let aiming = false, aimX = 0, aimY = 0, aimPower = 0, aimDirX = 0, aimDirY = 0, pointerId = null;
let msg = '', msgT = 0;

function init() {
  score = 0;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['putt'] || 0;
  msg = ''; msgT = 0;
  aiming = false; pointerId = null;
  loadHole(0);
  draw();
}

function loadHole(i) {
  holeIndex = i;
  hole = HOLES[i];
  ball = { x: hole.start.x, y: hole.start.y, vx: 0, vy: 0, r: BALL_R };
  strokes = 0;
  aiming = false; aimPower = 0; pointerId = null;
  holeEl.textContent = (i + 1) + '/5';
  strokeEl.textContent = '0';
}

function ballMoving() { return ball.vx !== 0 || ball.vy !== 0; }

function collideRect(w) {
  const cx = Math.max(w.x, Math.min(ball.x, w.x + w.w));
  const cy = Math.max(w.y, Math.min(ball.y, w.y + w.h));
  let dx = ball.x - cx, dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  if (d < ball.r) {
    if (d < 0.0001) { dx = 0; dy = -1; d = 0.0001; }
    const nx = dx / d, ny = dy / d;
    ball.x = cx + nx * ball.r;
    ball.y = cy + ny * ball.r;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= 1.6 * vn * nx;
      ball.vy -= 1.6 * vn * ny;
    }
  }
}

function physics(s) {
  ball.x += ball.vx * s;
  ball.y += ball.vy * s;

  if (ball.x - ball.r < B) { ball.x = B + ball.r; ball.vx = Math.abs(ball.vx) * 0.7; }
  if (ball.x + ball.r > W - B) { ball.x = W - B - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7; }
  if (ball.y - ball.r < B) { ball.y = B + ball.r; ball.vy = Math.abs(ball.vy) * 0.7; }
  if (ball.y + ball.r > H - B) { ball.y = H - B - ball.r; ball.vy = -Math.abs(ball.vy) * 0.7; }

  for (const w of hole.walls) collideRect(w);
}

function sink() {
  const holeScore = Math.max(10, 100 - 20 * Math.max(0, strokes - PAR));
  score += holeScore;
  scoreEl.textContent = String(score);
  msg = 'Hole ' + (holeIndex + 1) + ' masuk! +' + holeScore;
  msgT = 100;
  if (holeIndex + 1 >= HOLES.length) { finish(); return; }
  loadHole(holeIndex + 1);
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);
  const SUB = 4;
  for (let i = 0; i < SUB; i++) physics(s / SUB);

  const f = Math.pow(FRICTION, s);
  ball.vx *= f; ball.vy *= f;
  if (Math.hypot(ball.vx, ball.vy) < STOP) { ball.vx = 0; ball.vy = 0; }

  const dx = hole.cup.x - ball.x, dy = hole.cup.y - ball.y;
  const d = Math.hypot(dx, dy);
  if (d < 34 && ballMoving()) {
    ball.vx += (dx / d) * 0.13 * s;
    ball.vy += (dy / d) * 0.13 * s;
  }
  if (d < CUP_R - 3) { sink(); return; }

  if (msgT > 0) msgT -= s;
}

function draw() {
  ctx.fillStyle = '#0d1a12';
  ctx.fillRect(0, 0, W, H);

  // rumput
  ctx.fillStyle = '#123a22';
  ctx.fillRect(B, B, W - B * 2, H - B * 2);
  ctx.strokeStyle = '#1f5c36';
  ctx.lineWidth = 4;
  ctx.strokeRect(B, B, W - B * 2, H - B * 2);

  // rintangan
  for (const w of hole.walls) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#6b4f2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }

  // lubang
  ctx.beginPath();
  ctx.arc(hole.cup.x, hole.cup.y, CUP_R, 0, Math.PI * 2);
  ctx.fillStyle = '#04120a';
  ctx.fill();
  ctx.strokeStyle = '#1f5c36';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hole.cup.x, hole.cup.y);
  ctx.lineTo(hole.cup.x, hole.cup.y - 26);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(hole.cup.x, hole.cup.y - 26);
  ctx.lineTo(hole.cup.x + 16, hole.cup.y - 20);
  ctx.lineTo(hole.cup.x, hole.cup.y - 14);
  ctx.closePath();
  ctx.fill();

  // garis bantu arah
  if (aiming && aimPower > 0.02) {
    const len = 30 + aimPower * 90;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + aimDirX * len, ball.y + aimDirY * len);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // bola
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // meter tenaga
  if (aiming && !ballMoving()) {
    const pw = 120;
    const px = W / 2 - pw / 2, py = H - 20;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(px, py, pw, 8);
    ctx.fillStyle = aimPower > 0.75 ? '#ef4444' : '#22d3ee';
    ctx.fillRect(px, py, pw * aimPower, 8);
  }

  if (msgT > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(0, 20, W, 30);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 15px ui-sans-serif,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, 41);
  }

  if (!ballMoving() && !aiming && msgT <= 0) {
    ctx.fillStyle = '#8b98a5';
    ctx.font = '13px ui-sans-serif,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Tarik dari bola lalu lepas untuk memukul', W / 2, H - 16);
  }
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
  const res = submitScore('putt', score);
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

function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height)
  };
}

function setAim(x, y) {
  aimX = x; aimY = y;
  let dx = ball.x - aimX, dy = ball.y - aimY;
  const d = Math.hypot(dx, dy);
  if (d < 1) { aimPower = 0; return; }
  aimDirX = dx / d;
  aimDirY = dy / d;
  aimPower = Math.min(d, 130) / 130;
}

canvas.addEventListener('pointerdown', e => {
  if (!running || ballMoving() || pointerId !== null) return;
  pointerId = e.pointerId;
  aiming = true;
  const p = toCanvas(e);
  setAim(p.x, p.y);
});
canvas.addEventListener('pointermove', e => {
  if (!aiming || e.pointerId !== pointerId) return;
  const p = toCanvas(e);
  setAim(p.x, p.y);
});
function endAim(e) {
  if (!aiming || e.pointerId !== pointerId) return;
  pointerId = null;
  aiming = false;
  if (aimPower > 0.05) {
    ball.vx = aimDirX * aimPower * MAX_POWER;
    ball.vy = aimDirY * aimPower * MAX_POWER;
    strokes++;
    strokeEl.textContent = String(strokes);
  }
  aimPower = 0;
}
canvas.addEventListener('pointerup', endAim);
canvas.addEventListener('pointercancel', endAim);

startBtn.addEventListener('click', start);
init();
