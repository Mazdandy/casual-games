import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const roundEl = document.getElementById('roundNum');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 360;
canvas.width = W; canvas.height = H;

const P_COLOR = '#22d3ee', A_COLOR = '#a855f7';
const MAX_ROUNDS = 10;
const BTNS = [
  { x: 20, y: 250, w: 140, h: 70, label: 'Batu' },
  { x: 170, y: 250, w: 140, h: 70, label: 'Gunting' },
  { x: 320, y: 250, w: 140, h: 70, label: 'Kertas' }
];

let round, score, running = false, busy = false, pPick = -1, aPick = -1, resultText = '', moveTimer = 0;

function init() {
  round = 0; score = 0; busy = false; pPick = -1; aPick = -1; resultText = '';
  running = true;
  clearTimeout(moveTimer);
  scoreEl.textContent = 0;
  roundEl.textContent = '0/' + MAX_ROUNDS;
  bestEl.textContent = getProgress().bestScores['rps'] || 0;
  draw();
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

function drawIcon(type, cx, cy, scale, color) {
  ctx.save();
  if (type === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else if (type === 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 18 * scale, cy - 20 * scale); ctx.lineTo(cx + 14 * scale, cy + 18 * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 18 * scale, cy - 20 * scale); ctx.lineTo(cx - 14 * scale, cy + 18 * scale); ctx.stroke();
    ctx.lineWidth = 4 * scale;
    ctx.beginPath(); ctx.arc(cx - 15 * scale, cy + 15 * scale, 7 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 15 * scale, cy + 15 * scale, 7 * scale, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(cx - 22 * scale, cy - 26 * scale, 44 * scale, 52 * scale);
    ctx.strokeStyle = '#0b0f14';
    ctx.lineWidth = 3 * scale;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 12 * scale, cy + i * 12 * scale);
      ctx.lineTo(cx + 12 * scale, cy + i * 12 * scale);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawArena() {
  ctx.beginPath();
  ctx.arc(140, 120, 62, 0, Math.PI * 2);
  ctx.fillStyle = '#131a22';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(340, 120, 62, 0, Math.PI * 2);
  ctx.fillStyle = '#131a22';
  ctx.fill();

  ctx.font = 'bold 15px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = P_COLOR;
  ctx.fillText('Kamu', 140, 30);
  ctx.fillStyle = A_COLOR;
  ctx.fillText('Komputer', 340, 30);

  if (pPick >= 0) drawIcon(pPick, 140, 120, 1.2, P_COLOR);
  if (aPick >= 0) drawIcon(aPick, 340, 120, 1.2, A_COLOR);

  ctx.font = '20px ui-sans-serif,system-ui,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8b98a5';
  ctx.fillText('VS', 240, 120);

  ctx.font = 'bold 17px ui-sans-serif,system-ui,sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(resultText, 240, 212);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  drawArena();

  const active = running && !busy && round < MAX_ROUNDS;
  for (let i = 0; i < BTNS.length; i++) {
    const b = BTNS[i];
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = active ? '#16202b' : '#101720';
    ctx.fill();
    ctx.strokeStyle = active ? '#22d3ee' : '#223040';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIcon(i, b.x + b.w / 2, b.y + 24, 0.55, active ? '#22d3ee' : '#4b5563');
    ctx.fillStyle = active ? '#e6edf3' : '#4b5563';
    ctx.font = 'bold 14px ui-sans-serif,system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h - 12);
  }
}

function pick(i) {
  if (!running || busy || round >= MAX_ROUNDS || pPick >= 0) return;
  busy = true;
  pPick = i;
  aPick = -1;
  resultText = '';
  let ticks = 0;
  const spin = () => {
    if (!running) return;
    ticks++;
    aPick = Math.floor(Math.random() * 3);
    draw();
    if (ticks < 8) { moveTimer = setTimeout(spin, 70); return; }
    aPick = Math.floor(Math.random() * 3);
    resolve();
  };
  spin();
}

function resolve() {
  round++;
  const win = (pPick === 0 && aPick === 1) || (pPick === 1 && aPick === 2) || (pPick === 2 && aPick === 0);
  const tie = pPick === aPick;
  if (win) score += 10;
  resultText = tie ? 'Seri!' : win ? 'Kamu menang ronde ini! 🎉' : 'Komputer menang ronde ini.';
  scoreEl.textContent = score;
  roundEl.textContent = Math.min(round, MAX_ROUNDS) + '/' + MAX_ROUNDS;
  draw();
  if (round >= MAX_ROUNDS) { moveTimer = setTimeout(finishGame, 900); return; }
  moveTimer = setTimeout(nextRound, 1100);
}

function nextRound() {
  if (!running) return;
  pPick = -1; aPick = -1; resultText = ''; busy = false;
  draw();
}

function finishGame() {
  running = false; busy = false;
  clearTimeout(moveTimer);
  scoreEl.textContent = score;
  const res = submitScore('rps', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', e => {
  if (!running || busy || round >= MAX_ROUNDS) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  for (let i = 0; i < BTNS.length; i++) {
    const b = BTNS[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { pick(i); return; }
  }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
