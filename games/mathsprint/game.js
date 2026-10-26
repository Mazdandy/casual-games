import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const OPS = ['+', '−', '×'];
const BW = 200, BH = 80, GAP = 20;
const BTN_X = [30, 250], BTN_Y = [290, 390];

let question, choices, used, score, time, running = false, rafId = 0, last = 0, flash = null;

function rand(n) { return (Math.random() * n) | 0; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newQuestion() {
  const op = OPS[rand(OPS.length)];
  let a, b, ans;
  if (op === '+') { a = 2 + rand(38); b = 2 + rand(38); ans = a + b; }
  else if (op === '−') { a = 10 + rand(40); b = 1 + rand(a); ans = a - b; }
  else { a = 2 + rand(11); b = 2 + rand(11); ans = a * b; }
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < 4 && guard++ < 300) {
    const delta = rand(21) - 10;
    const v = ans + (delta === 0 ? 7 : delta);
    if (v >= 0) set.add(v);
  }
  let k = 1;
  while (set.size < 4) set.add(ans + k++);
  question = { text: `${a} ${op} ${b}`, ans };
  choices = shuffle([...set]);
  used = new Set();
}

function init() {
  score = 0;
  time = 60;
  flash = null;
  running = false;
  last = 0;
  scoreEl.textContent = 0;
  timeEl.textContent = 60;
  bestEl.textContent = getProgress().bestScores['mathsprint'] || 0;
  newQuestion();
  draw();
}

function answer(i) {
  if (!running || used.has(i)) return;
  if (choices[i] === question.ans) {
    score += 10;
    scoreEl.textContent = score;
    flash = { i, ok: true, t: 0.35 };
    newQuestion();
  } else {
    used.add(i);
    time = Math.max(0, time - 3);
    timeEl.textContent = Math.ceil(time);
    flash = { i, ok: false, t: 0.35 };
    if (time <= 0) finish();
  }
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
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  const ratio = Math.max(0, time / 60);
  ctx.fillStyle = '#223040';
  roundRect(30, 20, W - 60, 14, 7); ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? '#22d3ee' : '#ef4444';
  roundRect(30, 20, (W - 60) * ratio, 14, 7); ctx.fill();

  ctx.fillStyle = '#e6edf3';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px ui-sans-serif,system-ui';
  ctx.fillText(question.text, W / 2, 170);
  ctx.fillStyle = '#8b98a5';
  ctx.font = '16px ui-sans-serif,system-ui';
  ctx.fillText('Berapa hasilnya?', W / 2, 235);

  for (let i = 0; i < 4; i++) {
    const x = BTN_X[i % 2], y = BTN_Y[(i / 2) | 0];
    let bg = '#131a22';
    if (flash && flash.i === i) bg = flash.ok ? '#22c55e' : '#ef4444';
    else if (used.has(i)) bg = '#3a2020';
    ctx.fillStyle = bg;
    roundRect(x, y, BW, BH, 14); ctx.fill();
    ctx.strokeStyle = used.has(i) ? '#4a3030' : '#223040';
    ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = used.has(i) ? '#8b98a5' : '#e6edf3';
    ctx.font = 'bold 34px ui-sans-serif,system-ui';
    ctx.fillText(String(choices[i]), x + BW / 2, y + BH / 2);
  }
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  timeEl.textContent = 0;
  const res = submitScore('mathsprint', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function loop(ts) {
  if (!running) return;
  if (!last) last = ts;
  const dt = Math.min(0.1, (ts - last) / 1000);
  last = ts;
  time -= dt;
  if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
  timeEl.textContent = Math.max(0, Math.ceil(time));
  if (time <= 0) { time = 0; draw(); finish(); return; }
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

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const rc = canvas.getBoundingClientRect();
  const x = (e.clientX - rc.left) * (W / rc.width);
  const y = (e.clientY - rc.top) * (H / rc.height);
  for (let i = 0; i < 4; i++) {
    const bx = BTN_X[i % 2], by = BTN_Y[(i / 2) | 0];
    if (x >= bx && x <= bx + BW && y >= by && y <= by + BH) { answer(i); break; }
  }
});

addEventListener('keydown', e => {
  if (!running) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) answer(n - 1);
});

startBtn.addEventListener('click', start);
init();
