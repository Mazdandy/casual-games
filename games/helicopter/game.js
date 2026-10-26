import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W;
canvas.height = H;

const HELI_X = 100, HELI_R = 12;
const GRAV = 300, THRUST = 720, MAXV = 230;

let scroll, heliY, vy, score, p1, p2, p3, thrust, running = false, rafId = 0, last = 0, t = 0;

function bounds(d) {
  const mid = H / 2 + 45 * Math.sin(d * 0.007 + p1) + 18 * Math.sin(d * 0.019 + p2);
  const diff = Math.max(0.7, 1 - scroll * 0.00002);
  const half = (55 + 40 * (0.5 + 0.5 * Math.sin(d * 0.012 + p3))) * diff;
  let ceil = mid - half;
  let floor = mid + half;
  if (floor - ceil < 80) { const c = (ceil + floor) / 2; ceil = c - 40; floor = c + 40; }
  if (ceil < 24) { ceil = 24; if (floor < 104) floor = 104; }
  if (floor > H - 24) { floor = H - 24; if (ceil > H - 104) ceil = H - 104; }
  return [ceil, floor];
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1c2b3a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, bounds(scroll + x)[0]);
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, bounds(scroll + x)[1]);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = bounds(scroll + x)[0];
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = bounds(scroll + x)[1];
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const ang = t * 14;
  ctx.strokeStyle = '#e6edf3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(HELI_X - Math.cos(ang) * 20, heliY - 13 - Math.sin(ang) * 3);
  ctx.lineTo(HELI_X + Math.cos(ang) * 20, heliY - 13 + Math.sin(ang) * 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(HELI_X, heliY - 13);
  ctx.lineTo(HELI_X, heliY - 8);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.ellipse(HELI_X, heliY, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(HELI_X + 8, heliY - 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(HELI_X - 18, heliY - 4);
  ctx.lineTo(HELI_X - 27, heliY + 3);
  ctx.stroke();
}

function init() {
  scroll = 0;
  heliY = H / 2;
  vy = 0;
  score = 0;
  t = 0;
  thrust = false;
  p1 = Math.random() * 6.28;
  p2 = Math.random() * 6.28;
  p3 = Math.random() * 6.28;
  scoreEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['helicopter'] || 0;
  draw();
}

function update(dt) {
  const speed = 130 + Math.min(130, scroll * 0.012);
  scroll += speed * dt;

  vy += GRAV * dt;
  if (thrust) vy -= THRUST * dt;
  vy = Math.max(-MAXV, Math.min(MAXV, vy));
  heliY += vy * dt;

  const s = Math.floor(scroll / 10);
  if (s !== score) { score = s; scoreEl.textContent = score; }

  for (const off of [-HELI_R, 0, HELI_R]) {
    const b = bounds(scroll + HELI_X + off);
    if (heliY - HELI_R < b[0] || heliY + HELI_R > b[1]) { finish(); return; }
  }
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  t += dt;
  update(dt);
  if (!running) return;
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('helicopter', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Menabrak!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => { e.preventDefault(); thrust = true; });
addEventListener('pointerup', () => { thrust = false; });
addEventListener('pointercancel', () => { thrust = false; });
addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); thrust = true; } });
addEventListener('keyup', e => { if (e.code === 'Space') thrust = false; });

startBtn.addEventListener('click', start);
init();
