import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 4, CELL = 100;
canvas.width = N * CELL;
canvas.height = N * CELL;

let grid, score, running;

const COLORS = { 2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',
  64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e' };

function init() {
  grid = Array.from({ length: N }, () => Array(N).fill(0));
  score = 0; running = true;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['2048'] || 0;
  addTile(); addTile();
  draw();
}
function emptyCells() {
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) cells.push([r, c]);
  return cells;
}
function addTile() {
  const cells = emptyCells();
  if (!cells.length) return;
  const [r, c] = cells[(Math.random() * cells.length) | 0];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}
function slide(row) {
  let arr = row.filter(v => v);
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
  }
  while (arr.length < N) arr.push(0);
  return arr;
}
function move(dir) {
  if (!running) return;
  const before = JSON.stringify(grid);
  if (dir === 'left' || dir === 'right') {
    for (let r = 0; r < N; r++) {
      let row = grid[r].slice();
      if (dir === 'right') row.reverse();
      row = slide(row);
      if (dir === 'right') row.reverse();
      grid[r] = row;
    }
  } else {
    for (let c = 0; c < N; c++) {
      let col = [];
      for (let r = 0; r < N; r++) col.push(grid[r][c]);
      if (dir === 'down') col.reverse();
      col = slide(col);
      if (dir === 'down') col.reverse();
      for (let r = 0; r < N; r++) grid[r][c] = col[r];
    }
  }
  if (JSON.stringify(grid) !== before) {
    addTile();
    scoreEl.textContent = score;
    draw();
    if (checkLose()) gameOver();
  }
}
function checkLose() {
  if (emptyCells().length) return false;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = grid[r][c];
    if (c < N - 1 && grid[r][c + 1] === v) return false;
    if (r < N - 1 && grid[r + 1][c] === v) return false;
  }
  return true;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function draw() {
  ctx.fillStyle = '#1b2733';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gap = 8, size = (canvas.width - gap * (N + 1)) / N;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = gap + c * (size + gap), y = gap + r * (size + gap);
    const v = grid[r][c];
    ctx.fillStyle = v ? (COLORS[v] || '#3c3a32') : 'rgba(255,255,255,0.06)';
    roundRect(x, y, size, size, 8); ctx.fill();
    if (v) {
      ctx.fillStyle = v > 4 ? '#fff' : '#776e65';
      const fs = v >= 1000 ? 26 : v >= 100 ? 32 : 40;
      ctx.font = `bold ${fs}px ui-sans-serif,system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(v, x + size / 2, y + size / 2);
    }
  }
}
function gameOver() {
  running = false;
  const res = submitScore('2048', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Game Over</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}
function start() { init(); overlay.classList.add('hidden'); }

addEventListener('keydown', e => {
  const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
                w:'up', s:'down', a:'left', d:'right' };
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (map[k]) { e.preventDefault(); move(map[k]); }
});
let ts;
canvas.addEventListener('touchstart', e => { ts = e.touches[0]; }, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!ts) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - ts.clientX, dy = t.clientY - ts.clientY;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
});
startBtn.addEventListener('click', start);
init();
