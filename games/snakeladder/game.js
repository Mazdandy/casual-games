import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const CELL = 44, MARGIN = 20, BOARD_TOP = 92;
const W = 480, H = 606;
canvas.width = W; canvas.height = H;

const P_COLOR = '#22d3ee', A_COLOR = '#a855f7';
const BTN = { x: 140, y: 548, w: 200, h: 44 };

const LADDERS = { 2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98 };
const SNAKES = { 16: 6, 46: 25, 49: 11, 62: 19, 64: 60, 74: 53, 89: 68, 92: 88, 95: 75, 99: 80 };

let pPos, aPos, turn, busy, die, running = false, score = 0, moveTimer = 0;

function init() {
  pPos = 0; aPos = 0; turn = 1; busy = false; die = 0;
  running = true; score = 0;
  clearTimeout(moveTimer);
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['snakeladder'] || 0;
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

function cellCenter(n) {
  const rb = Math.floor((n - 1) / 10);
  const off = (n - 1) % 10;
  const col = rb % 2 === 0 ? off : 9 - off;
  const row = 9 - rb;
  return { x: MARGIN + col * CELL + CELL / 2, y: BOARD_TOP + row * CELL + CELL / 2 };
}

function boardJump(n) {
  return LADDERS[n] || SNAKES[n] || n;
}

function drawBoard() {
  for (let n = 1; n <= 100; n++) {
    const rb = Math.floor((n - 1) / 10);
    const off = (n - 1) % 10;
    const col = rb % 2 === 0 ? off : 9 - off;
    const row = 9 - rb;
    const x = MARGIN + col * CELL, y = BOARD_TOP + row * CELL;
    ctx.fillStyle = (row + col) % 2 === 0 ? '#131a22' : '#0f172a';
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    ctx.fillStyle = '#8b98a5';
    ctx.font = '11px ui-sans-serif,system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(n), x + 4, y + 3);
  }
}

function drawJumps() {
  ctx.lineCap = 'round';
  for (const from in LADDERS) {
    const a = cellCenter(+from), b = cellCenter(LADDERS[from]);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = '#0b0f14';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const from in SNAKES) {
    const a = cellCenter(+from), b = cellCenter(SNAKES[from]);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#ef4444'; ctx.fill();
  }
}

function drawToken(pos, color) {
  if (pos < 1) return;
  const p = cellCenter(pos);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#0b0f14';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTokens() {
  if (pPos === aPos && pPos >= 1) {
    drawToken(pPos, P_COLOR);
    const p = cellCenter(pPos);
    ctx.beginPath();
    ctx.arc(p.x, p.y + 6, 10, 0, Math.PI * 2);
    ctx.fillStyle = A_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#0b0f14';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    drawToken(pPos, P_COLOR);
    drawToken(aPos, A_COLOR);
  }
}

function drawDie(cx, cy, val) {
  const s = 50;
  ctx.fillStyle = '#f8fafc';
  roundRect(cx - s / 2, cy - s / 2, s, s, 10);
  ctx.fill();
  if (!val) return;
  const pips = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
  };
  ctx.fillStyle = '#0b0f14';
  const d = 12;
  for (const [dx, dy] of pips[val]) {
    ctx.beginPath();
    ctx.arc(cx + dx * d, cy + dy * d, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  drawBoard();
  drawJumps();
  drawTokens();

  drawDie(W / 2, 42, die);

  ctx.font = 'bold 14px ui-sans-serif,system-ui,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = P_COLOR;
  ctx.fillText('Kamu: ' + pPos, 20, 42);
  ctx.textAlign = 'right';
  ctx.fillStyle = A_COLOR;
  ctx.fillText('Komputer: ' + aPos, W - 20, 42);

  let status = turn === 1 ? 'Giliranmu — lempar dadu!' : 'Komputer melempar...';
  if (!running) status = 'Permainan selesai';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#8b98a5';
  ctx.font = '14px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText(status, W / 2, 82);

  roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 12);
  ctx.fillStyle = turn === 1 && !busy ? '#22d3ee' : '#16202b';
  ctx.fill();
  ctx.fillStyle = turn === 1 && !busy ? '#04121a' : '#4b5563';
  ctx.font = 'bold 16px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Lempar Dadu 🎲', BTN.x + BTN.w / 2, BTN.y + BTN.h / 2);
}

function setPos(who, v) {
  if (who === 1) pPos = v; else aPos = v;
}

function slide(who, from, to, speed, cb) {
  if (from === to) { cb(); return; }
  const dir = to > from ? 1 : -1;
  let cur = from;
  const step = () => {
    if (!running) return;
    cur += dir;
    setPos(who, cur);
    draw();
    if (cur === to) { cb(); return; }
    moveTimer = setTimeout(step, speed);
  };
  moveTimer = setTimeout(step, speed);
}

function endTurn() {
  if (!running) return;
  turn = turn === 1 ? 2 : 1;
  draw();
  if (turn === 2) {
    moveTimer = setTimeout(() => roll(2), 700);
  } else {
    busy = false;
    draw();
  }
}

function roll(who) {
  if (!running) return;
  busy = true;
  const d = 1 + Math.floor(Math.random() * 6);
  die = d;
  const from = who === 1 ? pPos : aPos;
  const target = from + d;
  draw();
  if (target > 100) { endTurn(); return; }
  slide(who, from, target, 100, () => {
    const jump = boardJump(target);
    slide(who, target, jump, 100, () => {
      if (jump === 100) { finish(who === 1 ? 'Kamu Menang! 🎉' : 'Komputer Menang', who === 1); return; }
      endTurn();
    });
  });
}

function finish(title, won) {
  running = false; busy = false;
  clearTimeout(moveTimer);
  score = won ? 100 : 0;
  scoreEl.textContent = score;
  const res = submitScore('snakeladder', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('click', e => {
  if (!running || busy || turn !== 1) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) roll(1);
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && running && !busy && turn === 1) { e.preventDefault(); roll(1); }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
