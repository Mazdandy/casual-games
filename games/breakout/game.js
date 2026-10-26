import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;

const PW = 80, PH = 12, PADDLE_Y = H - 30;
const ROWS = 5, COLS = 8, MARGIN = 10, BRICK_W = (W - MARGIN * 2) / COLS, BRICK_H = 18;
const ROW_COLORS = ['#22d3ee', '#a855f7', '#facc15', '#22c55e', '#f97316'];

let paddle, ball, bricks, score, lives, running, rafId, keys;

function init() {
  paddle = { x: (W - PW) / 2, w: PW };
  ball = { x: W / 2, y: PADDLE_Y - 40, dx: 3, dy: -3.4, r: 7 };
  bricks = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      bricks.push({ x: MARGIN + c * BRICK_W, y: 40 + r * BRICK_H, color: ROW_COLORS[r], alive: true });
  score = 0; lives = 3; keys = {};
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['breakout'] || 0;
  draw();
}

function update() {
  if (keys.left) paddle.x -= 7;
  if (keys.right) paddle.x += 7;
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

  ball.x += ball.dx; ball.y += ball.dy;
  if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.dx *= -1;
  if (ball.y - ball.r < 0) ball.dy *= -1;
  if (ball.y - ball.r > H) { loseLife(); return; }

  if (ball.dy > 0 && ball.y + ball.r >= PADDLE_Y && ball.y < PADDLE_Y + PH &&
      ball.x > paddle.x - ball.r && ball.x < paddle.x + paddle.w + ball.r) {
    ball.dy = -Math.abs(ball.dy);
    const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.dx = hit * 4.5;
  }

  for (const b of bricks) {
    if (!b.alive) continue;
    if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + BRICK_W &&
        ball.y + ball.r > b.y && ball.y - ball.r < b.y + BRICK_H) {
      b.alive = false;
      ball.dy *= -1;
      score += 10;
      scoreEl.textContent = score;
      break;
    }
  }
  if (bricks.every(b => !b.alive)) finish('Menang! 🎉');
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, BRICK_H - 2);
  });
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(paddle.x, PADDLE_Y, paddle.w, PH);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8b98a5';
  ctx.font = '13px ui-sans-serif,system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('Nyawa: ' + lives, 10, H - 8);
}

function loseLife() {
  lives--;
  if (lives <= 0) { finish('Game Over'); return; }
  ball = { x: W / 2, y: PADDLE_Y - 40, dx: 3, dy: -3.4, r: 7 };
  draw();
}

function finish(title) {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('breakout', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
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

function movePaddle(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (W / rect.width);
  paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
}

canvas.addEventListener('mousemove', e => movePaddle(e.clientX));
canvas.addEventListener('touchmove', e => { e.preventDefault(); movePaddle(e.touches[0].clientX); }, { passive: false });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});
startBtn.addEventListener('click', start);
init();
