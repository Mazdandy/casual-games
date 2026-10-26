import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const missEl = document.getElementById('mistakes');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 9, CELL = 44, BOARD = N * CELL;
const BX = (480 - BOARD) / 2, BY = 10;
const BTN_GAP = 6, BTN_COLS = 5, BTN_H = 44;
const BTN_W = (480 - BTN_GAP * (BTN_COLS + 1)) / BTN_COLS;
const PAD_TOP = BY + BOARD + 14;
const W = 480, H = PAD_TOP + BTN_H * 2 + BTN_GAP + 10;
canvas.width = W; canvas.height = H;

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫'];

let solution, user, given, selected, mistakes, running, startTime, timerId, score;

function padRect(i) {
  const row = Math.floor(i / BTN_COLS), col = i % BTN_COLS;
  return { x: BTN_GAP + col * (BTN_W + BTN_GAP), y: PAD_TOP + row * (BTN_H + BTN_GAP), w: BTN_W, h: BTN_H };
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
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function ok(g, r, c, n) {
  for (let i = 0; i < 9; i++) { if (g[r][i] === n || g[i][c] === n) return false; }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === n) return false;
  return true;
}
function solve(g) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (g[r][c] === 0) {
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (ok(g, r, c, n)) { g[r][c] = n; if (solve(g)) return true; g[r][c] = 0; }
      }
      return false;
    }
  }
  return true;
}
function makeSolution() {
  const g = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(g);
  return g;
}
function fmt(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function init() {
  const sol = makeSolution();
  const puz = sol.map(r => r.slice());
  const order = shuffle([...Array(81).keys()]);
  let clues = 81;
  for (const idx of order) {
    if (clues <= 32) break;
    const r = Math.floor(idx / 9), c = idx % 9;
    if (puz[r][c] === 0) continue;
    puz[r][c] = 0; clues--;
  }
  solution = sol;
  user = puz.map(r => r.slice());
  given = puz.map(r => r.map(v => v !== 0));
  selected = null; mistakes = 0; score = 0; running = false; startTime = 0;
  clearInterval(timerId); timerId = 0;
  scoreEl.textContent = 0;
  timeEl.textContent = '0:00';
  missEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['sudoku'] || 0;
  draw();
}

function elapsed() { return (performance.now() - startTime) / 1000; }
function tick() { if (!running) return; timeEl.textContent = fmt(elapsed()); }

function inputDigit(n) {
  if (!running || !selected) return;
  const { r, c } = selected;
  if (given[r][c]) return;
  if (n === 0) {
    user[r][c] = 0;
  } else {
    user[r][c] = n;
    if (solution[r][c] !== n) { mistakes++; missEl.textContent = mistakes; }
  }
  draw();
  checkWin();
}

function conflicts() {
  const bad = new Set();
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const v = user[r][c];
    if (!v) continue;
    for (let i = 0; i < 9; i++) {
      if (i !== c && user[r][i] === v) { bad.add(r * 9 + c); bad.add(r * 9 + i); }
      if (i !== r && user[i][c] === v) { bad.add(r * 9 + c); bad.add(i * 9 + c); }
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const rr = br + i, cc = bc + j;
      if ((rr !== r || cc !== c) && user[rr][cc] === v) { bad.add(r * 9 + c); bad.add(rr * 9 + cc); }
    }
  }
  return bad;
}

function checkWin() {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (user[r][c] !== solution[r][c]) return;
  score = Math.max(100, Math.round(2000 - elapsed() * 5));
  finish(false);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  const bad = conflicts();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const x = BX + c * CELL, y = BY + r * CELL;
    const sel = selected && selected.r === r && selected.c === c;
    ctx.fillStyle = sel ? '#1b2733' : (given[r][c] ? '#151d26' : '#101720');
    ctx.fillRect(x, y, CELL, CELL);
    const v = user[r][c];
    if (v) {
      if (bad.has(r * 9 + c)) ctx.fillStyle = '#ef4444';
      else if (given[r][c]) ctx.fillStyle = '#e6edf3';
      else ctx.fillStyle = '#22d3ee';
      ctx.font = (given[r][c] ? 'bold ' : '') + '22px ui-sans-serif,system-ui';
      ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 1);
    }
  }
  ctx.strokeStyle = '#223040'; ctx.lineWidth = 1;
  for (let i = 0; i <= 9; i++) {
    ctx.beginPath(); ctx.moveTo(BX + i * CELL, BY); ctx.lineTo(BX + i * CELL, BY + BOARD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BX, BY + i * CELL); ctx.lineTo(BX + BOARD, BY + i * CELL); ctx.stroke();
  }
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
  for (let i = 0; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(BX + i * CELL * 3, BY); ctx.lineTo(BX + i * CELL * 3, BY + BOARD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BX, BY + i * CELL * 3); ctx.lineTo(BX + BOARD, BY + i * CELL * 3); ctx.stroke();
  }
  for (let i = 0; i < PAD.length; i++) {
    const rc = padRect(i);
    ctx.fillStyle = '#1b2733';
    roundRect(rc.x, rc.y, rc.w, rc.h, 8);
    ctx.fill();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 20px ui-sans-serif,system-ui';
    ctx.fillText(PAD[i], rc.x + rc.w / 2, rc.y + rc.h / 2 + 1);
  }
}

function finish() {
  running = false;
  clearInterval(timerId); timerId = 0;
  timeEl.textContent = fmt(elapsed());
  scoreEl.textContent = score;
  const res = submitScore('sudoku', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai! 🎉</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Waktu ${timeEl.textContent} · Salah ${mistakes}x</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  startTime = performance.now();
  running = true;
  clearInterval(timerId);
  timerId = setInterval(tick, 500);
  overlay.classList.add('hidden');
}

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!running) return;
  const p = canvasPos(e);
  for (let i = 0; i < PAD.length; i++) {
    const rc = padRect(i);
    if (p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h) {
      inputDigit(i === PAD.length - 1 ? 0 : i + 1);
      return;
    }
  }
  if (p.x >= BX && p.x < BX + BOARD && p.y >= BY && p.y < BY + BOARD) {
    const c = Math.floor((p.x - BX) / CELL), r = Math.floor((p.y - BY) / CELL);
    selected = { r, c };
    draw();
  }
});

document.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key >= '1' && e.key <= '9') { inputDigit(Number(e.key)); }
  else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); inputDigit(0); }
});

startBtn.addEventListener('click', start);
init();
