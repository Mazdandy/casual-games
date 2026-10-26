import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 4, CELL = 120, S = N * CELL;
canvas.width = S; canvas.height = S;

let board, moves, score, running, startTime, timerId;

function blankIndex() { return board.indexOf(0); }
function isSolved() {
  for (let i = 0; i < 15; i++) if (board[i] !== i + 1) return false;
  return board[15] === 0;
}
function slideAt(i) {
  const b = blankIndex();
  const r = Math.floor(i / N), c = i % N;
  const br = Math.floor(b / N), bc = b % N;
  if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return false;
  board[b] = board[i]; board[i] = 0;
  return true;
}
function fmt(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function init() {
  board = [];
  for (let i = 1; i < N * N; i++) board.push(i);
  board.push(0);
  let prev = -1;
  for (let k = 0; k < 300; k++) {
    const b = blankIndex();
    const br = Math.floor(b / N), bc = b % N;
    const opts = [];
    if (br > 0) opts.push(b - N);
    if (br < N - 1) opts.push(b + N);
    if (bc > 0) opts.push(b - 1);
    if (bc < N - 1) opts.push(b + 1);
    const choices = opts.filter(x => x !== prev);
    const pick = choices[(Math.random() * choices.length) | 0];
    board[b] = board[pick]; board[pick] = 0;
    prev = b;
  }
  if (isSolved()) return init();
  moves = 0; score = 0; running = false; startTime = 0;
  clearInterval(timerId); timerId = 0;
  scoreEl.textContent = 0;
  movesEl.textContent = 0;
  timeEl.textContent = '0:00';
  bestEl.textContent = getProgress().bestScores['slidepuzzle'] || 0;
  draw();
}

function elapsed() { return (performance.now() - startTime) / 1000; }
function tick() { if (!running) return; timeEl.textContent = fmt(elapsed()); }

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const x = c * CELL, y = r * CELL;
    const v = board[i];
    if (v === 0) continue;
    const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
    g.addColorStop(0, '#1b2733'); g.addColorStop(1, '#131a22');
    ctx.fillStyle = g;
    roundRect(x + 5, y + 5, CELL - 10, CELL - 10, 12);
    ctx.fill();
    ctx.strokeStyle = '#223040'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = v === i + 1 ? '#22d3ee' : '#e6edf3';
    ctx.font = 'bold 40px ui-sans-serif,system-ui';
    ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 2);
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

function finish() {
  running = false;
  clearInterval(timerId); timerId = 0;
  const secs = elapsed();
  score = Math.max(100, Math.round(1500 - moves * 10 - secs * 2));
  timeEl.textContent = fmt(secs);
  scoreEl.textContent = score;
  const res = submitScore('slidepuzzle', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai! 🎉</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Langkah: ${moves} · Waktu: ${fmt(secs)}</p>
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
  draw();
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (S / rect.width);
  const y = (e.clientY - rect.top) * (S / rect.height);
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (c < 0 || c >= N || r < 0 || r >= N) return;
  if (slideAt(r * N + c)) {
    moves++;
    movesEl.textContent = moves;
    draw();
    if (isSolved()) finish();
  }
});

startBtn.addEventListener('click', start);
init();
