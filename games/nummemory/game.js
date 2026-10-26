import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const PAD = [];
(function buildPad() {
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''];
  const kw = 90, kh = 60, gap = 12;
  const startX = (W - (3 * kw + 2 * gap)) / 2;
  const startY = 196;
  labels.forEach((label, i) => {
    if (label === '') return;
    const r = Math.floor(i / 3), c = i % 3;
    PAD.push({ label, x: startX + c * (kw + gap), y: startY + r * (kh + gap), w: kw, h: kh });
  });
})();

let seq, input, level, score, phase, running, timer = 0;

function randomSeq(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += (Math.random() * 10) | 0;
  return s;
}

function init() {
  clearTimeout(timer);
  level = 1; score = 0; input = ''; running = true;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;
  bestEl.textContent = getProgress().bestScores['nummemory'] || 0;
  nextRound();
}

function nextRound() {
  seq = randomSeq(level + 3);
  input = '';
  phase = 'show';
  draw();
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!running) return;
    phase = 'input';
    draw();
  }, seq.length * 1000);
}

function press(val) {
  if (!running || phase !== 'input') return;
  if (val === 'back') { input = input.slice(0, -1); draw(); return; }
  if (input.length >= seq.length) return;
  input += val;
  if (input.length === seq.length) check();
  else draw();
}

function check() {
  if (input === seq) {
    score += level * 20;
    scoreEl.textContent = score;
    level++;
    levelEl.textContent = level;
    phase = 'ok';
    draw();
    clearTimeout(timer);
    timer = setTimeout(() => { if (!running) return; nextRound(); }, 700);
  } else {
    phase = 'bad';
    draw();
    clearTimeout(timer);
    timer = setTimeout(() => { if (!running) return; finish(); }, 600);
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

function drawCentered(text, cx, cy, font, color, gap) {
  ctx.font = font; ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = text.split('');
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((c, i) => { ctx.fillText(c, x + widths[i] / 2, cy); x += widths[i] + gap; });
}

function draw() {
  ctx.fillStyle = '#0f1720';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8b98a5';
  ctx.font = '14px ui-sans-serif,system-ui';

  if (phase === 'show') {
    ctx.fillText('Ingat urutan angka ini...', W / 2, 60);
    drawCentered(seq, W / 2, 120, 'bold 56px ui-sans-serif,system-ui', '#22d3ee', 14);
  } else if (phase === 'input') {
    ctx.fillText('Sekarang ulangi (' + seq.length + ' angka):', W / 2, 60);
    const shown = input + '_'.repeat(seq.length - input.length);
    drawCentered(shown, W / 2, 120, 'bold 48px ui-sans-serif,system-ui', '#a855f7', 10);
  } else if (phase === 'ok') {
    ctx.fillText('Benar! 🎉', W / 2, 60);
    drawCentered(seq, W / 2, 120, 'bold 48px ui-sans-serif,system-ui', '#22c55e', 10);
  } else {
    ctx.fillText('Salah! 🙈', W / 2, 60);
    drawCentered(seq, W / 2, 120, 'bold 48px ui-sans-serif,system-ui', '#ef4444', 10);
  }

  for (const k of PAD) {
    roundRect(k.x, k.y, k.w, k.h, 10);
    ctx.fillStyle = k.label === '⌫' ? '#2a1c26' : '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#2f3d4d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 24px ui-sans-serif,system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(k.label, k.x + k.w / 2, k.y + k.h / 2);
  }
}

function finish() {
  running = false;
  clearTimeout(timer);
  const res = submitScore('nummemory', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Level tercapai: <strong>${level}</strong> · Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  for (const k of PAD) {
    if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) { press(k.label); return; }
  }
});

window.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'Backspace') { press('back'); e.preventDefault(); return; }
  if (e.key.length === 1 && e.key >= '0' && e.key <= '9') { press(e.key); e.preventDefault(); }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
