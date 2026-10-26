import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 10, CELL = 30, GRID = N * CELL;
const MARGIN = 10, CLUE = 90;
const GX = MARGIN + CLUE, GY = MARGIN + CLUE;
const W = MARGIN * 2 + CLUE + GRID, H = GY + GRID + 64;
canvas.width = W; canvas.height = H;

const BTN = { x: (W - 220) / 2, y: GY + GRID + 14, w: 220, h: 40 };

const PATTERNS = [
  ['0011001100', '0111101110', '1111111111', '1111111111', '1111111111', '0111111110', '0011111100', '0001111000', '0000110000', '0000000000'],
  ['0011111100', '0111111110', '1111111111', '1111001111', '1111001111', '1111111111', '1100000011', '1110000111', '0111111110', '0011111100'],
  ['0000110000', '0001111000', '0011111100', '0111111110', '1111111111', '0001111000', '0001111000', '0001111000', '0001111000', '0001100000'],
  ['0001110000', '0011111100', '0111111110', '1111111111', '1111111111', '1100000011', '1100110011', '1100110011', '1100110011', '1111111111'],
  ['1100000011', '1110000111', '1111111111', '1100110011', '1100110011', '1111111111', '1111011111', '1111111111', '0111111110', '0011111100']
];

let pattern, rowClues, colClues, state, mode, running, startTime, timerId, score, press, longTimer, longFired;

function runsOf(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else { if (run) out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out.length ? out : [0];
}
function fmt(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
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

function init() {
  const pick = PATTERNS[(Math.random() * PATTERNS.length) | 0];
  pattern = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) pattern.push(pick[r][c] === '1' ? 1 : 0);
  rowClues = [];
  for (let r = 0; r < N; r++) rowClues.push(runsOf(pick[r].split('').map(ch => ch === '1' ? 1 : 0)));
  colClues = [];
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = 0; r < N; r++) col.push(pick[r][c] === '1' ? 1 : 0);
    colClues.push(runsOf(col));
  }
  state = Array.from({ length: N * N }, () => 0);
  mode = 'fill';
  score = 0; running = false; startTime = 0;
  press = null; longFired = false;
  clearInterval(timerId); clearTimeout(longTimer);
  timerId = 0; longTimer = 0;
  scoreEl.textContent = 0;
  timeEl.textContent = '0:00';
  bestEl.textContent = getProgress().bestScores['nonogram'] || 0;
  draw();
}

function elapsed() { return (performance.now() - startTime) / 1000; }
function tick() { if (!running) return; timeEl.textContent = fmt(elapsed()); }

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let r = 0; r < N; r++) {
    const clues = rowClues[r];
    ctx.font = '14px ui-sans-serif,system-ui';
    for (let j = 0; j < clues.length; j++) {
      const x = GX - (clues.length - j) * 18 - 2;
      ctx.fillStyle = '#8b98a5';
      ctx.fillText(String(clues[j]), x, GY + r * CELL + CELL / 2 + 1);
    }
  }
  for (let c = 0; c < N; c++) {
    const clues = colClues[c];
    ctx.font = '14px ui-sans-serif,system-ui';
    for (let j = 0; j < clues.length; j++) {
      const y = GY - (clues.length - j) * 18 - 2;
      ctx.fillStyle = '#8b98a5';
      ctx.fillText(String(clues[j]), GX + c * CELL + CELL / 2, y);
    }
  }
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const x = GX + c * CELL, y = GY + r * CELL;
    ctx.fillStyle = state[i] === 1 ? '#22d3ee' : '#131a22';
    ctx.fillRect(x, y, CELL, CELL);
    if (state[i] === 2) {
      ctx.strokeStyle = '#8b98a5'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 9); ctx.lineTo(x + CELL - 9, y + CELL - 9);
      ctx.moveTo(x + CELL - 9, y + 9); ctx.lineTo(x + 9, y + CELL - 9);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#223040'; ctx.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath(); ctx.moveTo(GX + i * CELL, GY); ctx.lineTo(GX + i * CELL, GY + GRID); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(GX, GY + i * CELL); ctx.lineTo(GX + GRID, GY + i * CELL); ctx.stroke();
  }
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
  ctx.strokeRect(GX, GY, GRID, GRID);

  ctx.fillStyle = mode === 'fill' ? '#22d3ee' : '#a855f7';
  roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 10);
  ctx.fill();
  ctx.fillStyle = '#04121a';
  ctx.font = 'bold 16px ui-sans-serif,system-ui';
  ctx.fillText('Mode: ' + (mode === 'fill' ? 'Isi' : 'Tanda'), BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 + 1);
}

function complete() {
  for (let i = 0; i < N * N; i++) {
    if ((pattern[i] === 1) !== (state[i] === 1)) return false;
  }
  return true;
}

function finish() {
  running = false;
  clearInterval(timerId); timerId = 0;
  clearTimeout(longTimer);
  const secs = elapsed();
  score = Math.max(100, Math.round(1200 - secs * 3));
  timeEl.textContent = fmt(secs);
  scoreEl.textContent = score;
  const res = submitScore('nonogram', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Gambar terbuka! 🎉</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Waktu: ${fmt(secs)}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
}
function cellAt(p) {
  if (p.x < GX || p.x >= GX + GRID || p.y < GY || p.y >= GY + GRID) return -1;
  const c = Math.floor((p.x - GX) / CELL), r = Math.floor((p.y - GY) / CELL);
  return r * N + c;
}
function mark(i) {
  if (i < 0) return;
  state[i] = state[i] === 2 ? 0 : 2;
  draw();
}
function fill(i) {
  if (i < 0) return;
  state[i] = state[i] === 1 ? 0 : 1;
  draw();
  if (complete()) finish();
}

function start() {
  init();
  startTime = performance.now();
  running = true;
  clearInterval(timerId);
  timerId = setInterval(tick, 500);
  overlay.classList.add('hidden');
  draw();
}

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!running) return;
  clearTimeout(longTimer);
  mark(cellAt(canvasPos(e)));
});

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!running) return;
  if (e.button === 2) return;
  const p = canvasPos(e);
  press = p; longFired = false;
  clearTimeout(longTimer);
  longTimer = setTimeout(() => {
    if (!press) return;
    longFired = true;
    mark(cellAt(press));
  }, 450);
});

canvas.addEventListener('pointerup', e => {
  if (!running) return;
  clearTimeout(longTimer);
  if (!press) return;
  const p = press; press = null;
  if (longFired) { longFired = false; return; }
  if (p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y && p.y <= BTN.y + BTN.h) {
    mode = mode === 'fill' ? 'mark' : 'fill';
    draw();
    return;
  }
  const i = cellAt(p);
  if (i >= 0) {
    if (mode === 'fill') fill(i); else mark(i);
  }
});

canvas.addEventListener('pointercancel', () => { clearTimeout(longTimer); press = null; });
canvas.addEventListener('pointerleave', () => { clearTimeout(longTimer); press = null; });

startBtn.addEventListener('click', start);
init();
