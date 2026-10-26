import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const pegsEl = document.getElementById('pegs');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 7, CELL = 60, OFF = 30, S = 480;
canvas.width = S; canvas.height = S;

const TOTAL_HOLES = 33;
const DIRS = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [-2, 2], [2, -2], [2, 2]];

let board, pegs, score, selected, running = false;

function valid(r, c) { return (r >= 2 && r <= 4) || (c >= 2 && c <= 4); }

function init() {
  board = Array.from({ length: N }, () => new Array(N).fill(-1));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) if (valid(r, c)) board[r][c] = 1;
  }
  board[3][3] = 0;
  pegs = 32;
  score = 0;
  selected = null;
  running = false;
  scoreEl.textContent = 0;
  pegsEl.textContent = pegs;
  bestEl.textContent = getProgress().bestScores['peg'] || 0;
  draw();
}

function cellAt(e) {
  const rc = canvas.getBoundingClientRect();
  const x = (e.clientX - rc.left) * (S / rc.width);
  const y = (e.clientY - rc.top) * (S / rc.height);
  const c = Math.floor((x - OFF) / CELL);
  const r = Math.floor((y - OFF) / CELL);
  if (r < 0 || r >= N || c < 0 || c >= N) return null;
  return { r, c };
}

function canJump(fr, fc, tr, tc) {
  const dr = tr - fr, dc = tc - fc;
  const okLine = (Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2) ||
                 (Math.abs(dr) === 2 && Math.abs(dc) === 2);
  if (!okLine) return false;
  if (!valid(tr, tc) || board[tr][tc] !== 0) return false;
  const mr = (fr + tr) / 2, mc = (fc + tc) / 2;
  return board[mr][mc] === 1;
}

function hasAnyMove() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== 1) continue;
      for (const [dr, dc] of DIRS) {
        if (canJump(r, c, r + dr, c + dc)) return true;
      }
    }
  }
  return false;
}

function performJump(fr, fc, tr, tc) {
  const mr = (fr + tr) / 2, mc = (fc + tc) / 2;
  board[fr][fc] = 0;
  board[mr][mc] = 0;
  board[tr][tc] = 1;
  pegs--;
  pegsEl.textContent = pegs;
  score = (TOTAL_HOLES - pegs) * 30;
  scoreEl.textContent = score;
  selected = null;
  draw();
  if (pegs === 1 || !hasAnyMove()) finish();
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
  ctx.fillRect(0, 0, S, S);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === -1) continue;
      const cx = OFF + c * CELL + CELL / 2;
      const cy = OFF + r * CELL + CELL / 2;
      ctx.fillStyle = '#131a22';
      ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.40, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
      if (board[r][c] === 1) {
        const isSel = selected && selected.r === r && selected.c === c;
        ctx.fillStyle = isSel ? '#a855f7' : '#22d3ee';
        ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(cx - 6, cy - 7, 6, 0, Math.PI * 2); ctx.fill();
        if (isSel) {
          ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.40, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1;
        }
      } else if (selected && canJump(selected.r, selected.c, r, c)) {
        ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.28, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }
}

function finish() {
  running = false;
  score = (TOTAL_HOLES - pegs) * 30;
  scoreEl.textContent = score;
  const res = submitScore('peg', score);
  bestEl.textContent = res.best;
  const win = pegs === 1;
  overlay.innerHTML = `
    <h2>${win ? 'Kamu Menang! 🎉' : 'Selesai!'}</h2>
    <p>Sisa pasak: <strong>${pegs}</strong> — Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
}

canvas.addEventListener('click', e => {
  if (!running) return;
  const cell = cellAt(e);
  if (!cell || board[cell.r][cell.c] === -1) return;
  if (selected && canJump(selected.r, selected.c, cell.r, cell.c)) {
    performJump(selected.r, selected.c, cell.r, cell.c);
    return;
  }
  if (board[cell.r][cell.c] === 1) selected = cell;
  else selected = null;
  draw();
});

startBtn.addEventListener('click', start);
init();
