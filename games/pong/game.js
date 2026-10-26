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

const PW = 10, PH = 70, WIN = 11;
let player, ai, ball, pScore, aScore, running, rafId, keys;

function init() {
  player = { y: (H - PH) / 2 };
  ai = { y: (H - PH) / 2 };
  resetBall(1);
  pScore = 0; aScore = 0; keys = {};
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['pong'] || 0;
  draw();
}

function resetBall(dir) {
  ball = { x: W / 2, y: H / 2, dx: 4 * dir, dy: (Math.random() * 4 - 2) || 2, r: 7 };
}

function update() {
  if (keys.up) player.y -= 7;
  if (keys.down) player.y += 7;
  player.y = Math.max(0, Math.min(H - PH, player.y));

  const target = ball.y - PH / 2;
  ai.y += Math.max(-5, Math.min(5, target - ai.y));
  ai.y = Math.max(0, Math.min(H - PH, ai.y));

  ball.x += ball.dx; ball.y += ball.dy;
  if (ball.y - ball.r < 0 || ball.y + ball.r > H) ball.dy *= -1;

  if (ball.dx < 0 && ball.x - ball.r < 24 && ball.x > 0 &&
      ball.y > player.y && ball.y < player.y + PH) {
    ball.dx = Math.abs(ball.dx) * 1.03;
    ball.dy += (ball.y - (player.y + PH / 2)) * 0.06;
  }
  if (ball.dx > 0 && ball.x + ball.r > W - 24 && ball.x < W &&
      ball.y > ai.y && ball.y < ai.y + PH) {
    ball.dx = -Math.abs(ball.dx) * 1.03;
    ball.dy += (ball.y - (ai.y + PH / 2)) * 0.06;
  }

  if (ball.x < -ball.r) { aScore++; resetBall(1); }
  if (ball.x > W + ball.r) { pScore++; scoreEl.textContent = pScore * 100; resetBall(-1); }

  if (pScore >= WIN) finish('Menang! 🎉');
  else if (aScore >= WIN) finish('Game Over');
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = '#223040';
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(14, player.y, PW, PH);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(W - 14 - PW, ai.y, PW, PH);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8b98a5';
  ctx.font = 'bold 20px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(pScore, W / 2 - 40, 30);
  ctx.fillText(aScore, W / 2 + 40, 30);
}

function finish(title) {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('pong', pScore * 100);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>${pScore} — ${aScore}${res.isBest ? ' · Rekor baru! 🎉' : ''}</p>
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

function movePaddle(clientY) {
  const rect = canvas.getBoundingClientRect();
  const y = (clientY - rect.top) * (H / rect.height);
  player.y = Math.max(0, Math.min(H - PH, y - PH / 2));
}

canvas.addEventListener('mousemove', e => movePaddle(e.clientY));
canvas.addEventListener('touchmove', e => { e.preventDefault(); movePaddle(e.touches[0].clientY); }, { passive: false });
addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') { keys.up = true; e.preventDefault(); }
  if (e.key === 'ArrowDown') { keys.down = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowUp') keys.up = false;
  if (e.key === 'ArrowDown') keys.down = false;
});
startBtn.addEventListener('click', start);
init();
