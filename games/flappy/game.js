import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 360, H = 480;
canvas.width = W;
canvas.height = H;

const GRAVITY = 0.5, JUMP = -8, BIRD_X = 90, BIRD_R = 16;
const GAP = 130, PIPE_W = 64, SPEED = 2.6;
let bird, pipes, score, running, rafId, frame;

function init() {
  bird = { y: H / 2, v: 0 };
  pipes = []; score = 0; frame = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['flappy'] || 0;
}
function addPipe() {
  const top = 60 + Math.random() * (H - GAP - 140);
  pipes.push({ x: W, top, scored: false });
}
function flap() { if (running) bird.v = JUMP; }
function hit() {
  if (bird.y + BIRD_R >= H || bird.y - BIRD_R <= 0) return true;
  for (const p of pipes) {
    if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
      if (bird.y - BIRD_R < p.top || bird.y + BIRD_R > p.top + GAP) return true;
    }
  }
  return false;
}
function draw() {
  ctx.fillStyle = '#0f2233';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#22c55e';
  pipes.forEach(p => {
    ctx.fillRect(p.x, 0, PIPE_W, p.top);
    ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP);
  });
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(BIRD_X, bird.y, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0f14';
  ctx.beginPath();
  ctx.arc(BIRD_X + 6, bird.y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}
function loop() {
  if (!running) return;
  frame++;
  bird.v += GRAVITY;
  bird.y += bird.v;
  if (frame % 90 === 0) addPipe();
  pipes.forEach(p => { p.x -= SPEED; });
  pipes = pipes.filter(p => p.x + PIPE_W > 0);
  pipes.forEach(p => {
    if (!p.scored && p.x + PIPE_W < BIRD_X) { p.scored = true; score++; scoreEl.textContent = score; }
  });
  if (hit()) { gameOver(); return; }
  draw();
  rafId = requestAnimationFrame(loop);
}
function gameOver() {
  running = false;
  const res = submitScore('flappy', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Game Over</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}
function start() {
  init(); running = true;
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}
addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); flap(); } });
canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
startBtn.addEventListener('click', start);
init();
draw();
