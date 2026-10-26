import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
const COLS = 12, ROWS = 9, CELL = W / COLS;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const TIME_LIMIT = 60;

let maze, player, coins, timeLeft, score, running, rafId, lastTime, touchStart;

function genMaze() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) grid[r][c] = { N: true, E: true, S: true, W: true, visited: false };
  }
  const stack = [{ c: 0, r: 0 }];
  grid[0][0].visited = true;
  while (stack.length) {
    const { c, r } = stack[stack.length - 1];
    const opts = [];
    if (r > 0 && !grid[r - 1][c].visited) opts.push({ c, r: r - 1, d: 'N', o: 'S' });
    if (c < COLS - 1 && !grid[r][c + 1].visited) opts.push({ c: c + 1, r, d: 'E', o: 'W' });
    if (r < ROWS - 1 && !grid[r + 1][c].visited) opts.push({ c, r: r + 1, d: 'S', o: 'N' });
    if (c > 0 && !grid[r][c - 1].visited) opts.push({ c: c - 1, r, d: 'W', o: 'E' });
    if (!opts.length) { stack.pop(); continue; }
    const n = opts[Math.floor(Math.random() * opts.length)];
    grid[r][c][n.d] = false;
    grid[n.r][n.c][n.o] = false;
    grid[n.r][n.c].visited = true;
    stack.push({ c: n.c, r: n.r });
  }
  return grid;
}

function placeCoins() {
  coins = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = maze[r][c];
      let open = 0;
      if (!cell.N) open++;
      if (!cell.E) open++;
      if (!cell.S) open++;
      if (!cell.W) open++;
      if (open === 1 && !(c === player.c && r === player.r)) coins.add(c + ',' + r);
    }
  }
  if (coins.size === 0) {
    let c, r;
    do { c = Math.floor(Math.random() * COLS); r = Math.floor(Math.random() * ROWS); }
    while (c === player.c && r === player.r);
    coins.add(c + ',' + r);
  }
}

function newLevel() {
  player.c = 0; player.r = 0;
  maze = genMaze();
  placeCoins();
}

function init() {
  player = { c: 0, r: 0 };
  score = 0; timeLeft = TIME_LIMIT; lastTime = 0; touchStart = null;
  newLevel();
  scoreEl.textContent = '0';
  timeEl.textContent = TIME_LIMIT;
  bestEl.textContent = getProgress().bestScores['maze'] || 0;
  draw();
}

function move(dc, dr) {
  if (!running) return;
  const cell = maze[player.r][player.c];
  if (dc === 1 && cell.E) return;
  if (dc === -1 && cell.W) return;
  if (dr === 1 && cell.S) return;
  if (dr === -1 && cell.N) return;
  player.c += dc; player.r += dr;
  const key = player.c + ',' + player.r;
  if (coins.has(key)) {
    coins.delete(key);
    score += 10; scoreEl.textContent = score;
  }
  if (coins.size === 0) newLevel();
}

function update(dt) {
  timeLeft -= dt;
  timeEl.textContent = Math.ceil(Math.max(0, timeLeft));
  if (timeLeft <= 0) finish();
}

function draw() {
  ctx.fillStyle = '#101a24';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#3b5b73'; ctx.lineWidth = 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = maze[r][c];
      const x = c * CELL, y = r * CELL;
      if (cell.N) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); ctx.stroke(); }
      if (cell.W) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); ctx.stroke(); }
      if (cell.E && c === COLS - 1) { ctx.beginPath(); ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); ctx.stroke(); }
      if (cell.S && r === ROWS - 1) { ctx.beginPath(); ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); ctx.stroke(); }
    }
  }

  ctx.fillStyle = '#facc15';
  for (const key of coins) {
    const [c, r] = key.split(',').map(Number);
    ctx.beginPath();
    ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 5, 0, 6.283);
    ctx.fill();
  }

  const px = player.c * CELL, py = player.r * CELL;
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(px + 9, py + 9, CELL - 18, CELL - 18);
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
  const res = submitScore('maze', score);
  bestEl.textContent = res.best;
  timeEl.textContent = '0';
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
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
  if (k === 'ArrowUp' || k === 'w' || k === 'W') { move(0, -1); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { move(0, 1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move(-1, 0); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { move(1, 0); e.preventDefault(); }
});

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  touchStart = { x: e.clientX, y: e.clientY };
  if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointerup', e => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 18) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    const y = (e.clientY - r.top) * (H / r.height);
    const dc = Math.round(x / CELL) - player.c;
    const dr = Math.round(y / CELL) - player.r;
    if (Math.abs(dc) >= Math.abs(dr)) move(Math.sign(dc), 0);
    else move(0, Math.sign(dr));
  } else if (Math.abs(dx) > Math.abs(dy)) {
    move(Math.sign(dx), 0);
  } else {
    move(0, Math.sign(dy));
  }
});
canvas.addEventListener('pointercancel', () => { touchStart = null; });

startBtn.addEventListener('click', start);
init();
