import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';

applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const COLS = 20, ROWS = 20, CELL = 24;
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

let snake, dir, nextDir, food, score, running, lastTick, tickMs;

function init() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
  score = 0; running = false; tickMs = 130;
  bestEl.textContent = getProgress().bestScores['snake'] || 0;
  placeFood();
  scoreEl.textContent = 0;
}

function placeFood() {
  do { food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 }; }
  while (snake.some(s => s.x === food.x && s.y === food.y));
}

function start() {
  init();
  running = true;
  overlay.classList.add('hidden');
  lastTick = performance.now();
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;
  if (now - lastTick >= tickMs) { lastTick = now; step(); }
  draw();
  requestAnimationFrame(loop);
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
  const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) { gameOver(); return; }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    if (tickMs > 70) tickMs -= 2;
    placeFood();
  } else {
    snake.pop();
  }
}

function gameOver() {
  running = false;
  const res = submitScore('snake', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Game Over</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function draw() {
  const cs = getComputedStyle(document.documentElement);
  ctx.fillStyle = cs.getPropertyValue('--board-bg').trim() || '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#a5f3fc' : '#22d3ee';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function setDir(x, y) {
  if (x === -dir.x && y === -dir.y) return;
  nextDir = { x, y };
}

addEventListener('keydown', e => {
  const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (map[k]) { e.preventDefault(); setDir(...map[k]); }
});

let touchStart;
canvas.addEventListener('touchstart', e => { touchStart = e.touches[0]; }, { passive: true });
canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.clientX, dy = t.clientY - touchStart.clientY;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
  else setDir(0, dy > 0 ? 1 : -1);
});

startBtn.addEventListener('click', start);
init();
draw();
