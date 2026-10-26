import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const rowsEl = document.getElementById('rows');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const COLS = 10, R = 22.5, D = 45, STEP = 45;
const EVEN_X0 = 26.25, ODD_X0 = 48.75;
const ROW_H = D * Math.sqrt(3) / 2;
const TOP = 26;
const GAMEOVER_Y = 400;
const MAX_ROWS = 16;
const INIT_ROWS = 6;
const DROP_EVERY = 7;
const SPEED = 9;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
const SHOOTER = { x: 240, y: 448 };

let rows, score, shots, angle, missile, curColor, nextColor, running = false, rafId = 0;

function centerX(r, c) { return (r % 2 === 0 ? EVEN_X0 : ODD_X0) + c * STEP; }
function centerY(r) { return TOP + r * ROW_H; }

function neighbors(r, c) {
  const list = r % 2 === 0
    ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
    : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];
  return list.filter(([a, b]) => a >= 0 && b >= 0 && b < COLS);
}

function ensureRow(r) {
  while (rows.length <= r) rows.push(new Array(COLS).fill(null));
}

function init() {
  rows = [];
  for (let r = 0; r < INIT_ROWS; r++) {
    rows.push(Array.from({ length: COLS }, () => (Math.random() * COLORS.length) | 0));
  }
  score = 0; shots = 0;
  angle = -Math.PI / 2;
  missile = null;
  curColor = (Math.random() * COLORS.length) | 0;
  nextColor = (Math.random() * COLORS.length) | 0;
  running = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['bubble'] || 0;
  updateHud();
  draw();
}

function updateHud() { rowsEl.textContent = rows.length; }

function clampAim() {
  if (angle > -0.15) angle = -0.15;
  if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
}

function setAim(x, y) {
  angle = Math.atan2(y - SHOOTER.y, x - SHOOTER.x);
  clampAim();
}

function shoot() {
  if (!running || missile) return;
  missile = {
    x: SHOOTER.x, y: SHOOTER.y,
    vx: Math.cos(angle) * SPEED, vy: Math.sin(angle) * SPEED,
    color: curColor
  };
}

function hitBubble(x, y) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (rows[r][c] === null) continue;
      const dx = centerX(r, c) - x, dy = centerY(r) - y;
      if (dx * dx + dy * dy < (D * 0.92) ** 2) return true;
    }
  }
  return false;
}

function nearestEmptyCell(x, y) {
  let row = Math.round((y - TOP) / ROW_H);
  row = Math.max(0, Math.min(MAX_ROWS - 1, row));
  ensureRow(row);
  const x0 = row % 2 === 0 ? EVEN_X0 : ODD_X0;
  let col = Math.round((x - x0) / STEP);
  col = Math.max(0, Math.min(COLS - 1, col));
  if (rows[row][col] === null) return { row, col };
  let best = null, bestD = Infinity;
  for (let r = Math.max(0, row - 2); r <= Math.min(MAX_ROWS - 1, row + 2); r++) {
    ensureRow(r);
    for (let c = 0; c < COLS; c++) {
      if (rows[r][c] !== null) continue;
      const cx = centerX(r, c), cy = centerY(r);
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestD) { bestD = d; best = { row: r, col: c }; }
    }
  }
  return best;
}

function popMatches(r, c) {
  const color = rows[r][c];
  if (color === null) return;
  const seen = new Set([r + ',' + c]);
  const stack = [[r, c]];
  const group = [];
  while (stack.length) {
    const [a, b] = stack.pop();
    group.push([a, b]);
    for (const [na, nb] of neighbors(a, b)) {
      if (na >= rows.length || rows[na][nb] === null) continue;
      if (rows[na][nb] !== color) continue;
      const k = na + ',' + nb;
      if (seen.has(k)) continue;
      seen.add(k); stack.push([na, nb]);
    }
  }
  if (group.length >= 3) {
    for (const [a, b] of group) rows[a][b] = null;
    score += group.length * 10;
    scoreEl.textContent = score;
  }
}

function dropFloating() {
  const connected = new Set();
  const stack = [];
  if (rows[0]) {
    for (let c = 0; c < COLS; c++) {
      if (rows[0][c] !== null) { connected.add('0,' + c); stack.push([0, c]); }
    }
  }
  while (stack.length) {
    const [a, b] = stack.pop();
    for (const [na, nb] of neighbors(a, b)) {
      if (na >= rows.length || !rows[na] || rows[na][nb] === null) continue;
      const k = na + ',' + nb;
      if (connected.has(k)) continue;
      connected.add(k); stack.push([na, nb]);
    }
  }
  let dropped = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (rows[r][c] !== null && !connected.has(r + ',' + c)) { rows[r][c] = null; dropped++; }
    }
  }
  if (dropped) { score += dropped * 5; scoreEl.textContent = score; }
}

function descend() {
  rows.unshift(Array.from({ length: COLS }, () => (Math.random() * COLORS.length) | 0));
}

function trimEmpty() {
  while (rows.length > 1 && rows[rows.length - 1].every(v => v === null)) rows.pop();
}

function land(x, y) {
  const color = missile.color;
  missile = null;
  const cell = nearestEmptyCell(x, y);
  if (cell) {
    ensureRow(cell.row);
    rows[cell.row][cell.col] = color;
    popMatches(cell.row, cell.col);
    dropFloating();
    shots++;
    if (shots % DROP_EVERY === 0) descend();
  }
  curColor = nextColor;
  nextColor = (Math.random() * COLORS.length) | 0;
  trimEmpty();
  updateHud();
  if (running) checkGameOver();
}

function checkGameOver() {
  for (let r = rows.length - 1; r >= 0; r--) {
    let has = false;
    for (let c = 0; c < COLS; c++) if (rows[r][c] !== null) has = true;
    if (has) {
      if (centerY(r) + R >= GAMEOVER_Y) finish();
      return;
    }
  }
}

function update() {
  if (!missile) return;
  const steps = Math.ceil(Math.hypot(missile.vx, missile.vy) / (R * 0.6));
  let sx = missile.vx / steps, sy = missile.vy / steps;
  for (let i = 0; i < steps && missile; i++) {
    missile.x += sx; missile.y += sy;
    if (missile.x < R) { missile.x = R; sx = Math.abs(sx); }
    else if (missile.x > W - R) { missile.x = W - R; sx = -Math.abs(sx); }
    if (missile.y <= TOP) { land(missile.x, missile.y); break; }
    if (hitBubble(missile.x, missile.y)) { land(missile.x, missile.y); break; }
  }
}

function drawBubble(x, y, color, rad = R) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 1;
}

function drawAim() {
  let x = SHOOTER.x, y = SHOOTER.y;
  let vx = Math.cos(angle), vy = Math.sin(angle);
  const pts = [];
  const step = 7;
  for (let i = 0; i < 300; i++) {
    x += vx * step; y += vy * step;
    if (x < R) { x = R; vx = -vx; }
    else if (x > W - R) { x = W - R; vx = -vx; }
    if (i % 2 === 0) pts.push([x, y]);
    if (y <= TOP || hitBubble(x, y)) break;
  }
  ctx.strokeStyle = 'rgba(34,211,238,0.45)';
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(SHOOTER.x, SHOOTER.y);
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(239,68,68,0.55)';
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(0, GAMEOVER_Y); ctx.lineTo(W, GAMEOVER_Y); ctx.stroke();
  ctx.setLineDash([]);

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = rows[r][c];
      if (v === null) continue;
      drawBubble(centerX(r, c), centerY(r), COLORS[v]);
    }
  }

  if (!missile && running) drawAim();

  ctx.fillStyle = '#131a22';
  ctx.beginPath(); ctx.arc(SHOOTER.x, SHOOTER.y, R + 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#223040'; ctx.stroke();
  drawBubble(SHOOTER.x, SHOOTER.y, COLORS[curColor]);

  ctx.fillStyle = '#8b98a5';
  ctx.font = '11px ui-sans-serif,system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('NEXT', SHOOTER.x + 62, SHOOTER.y - 8);
  drawBubble(SHOOTER.x + 62, SHOOTER.y + 14, COLORS[nextColor], 14);

  if (missile) drawBubble(missile.x, missile.y, COLORS[missile.color]);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('bubble', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
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
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function pointerPos(e) {
  const rct = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rct.left) * (W / rct.width),
    y: (e.clientY - rct.top) * (H / rct.height)
  };
}

canvas.addEventListener('pointermove', e => {
  if (!running) return;
  const p = pointerPos(e);
  setAim(p.x, p.y);
  if (!missile) draw();
});
canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const p = pointerPos(e);
  setAim(p.x, p.y);
  shoot();
});
addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'ArrowLeft') { angle -= 0.06; clampAim(); if (!missile) draw(); }
  else if (e.key === 'ArrowRight') { angle += 0.06; clampAim(); if (!missile) draw(); }
  else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); shoot(); }
});

startBtn.addEventListener('click', start);
init();
