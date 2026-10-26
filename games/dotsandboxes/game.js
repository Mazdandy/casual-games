import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const boxScoreEl = document.getElementById('boxScore');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const BOX = 5;
const MARGIN = 50, STEP = 70;
const W = MARGIN * 2 + BOX * STEP, H = W;
canvas.width = W; canvas.height = H;

const P_COLOR = '#22d3ee', A_COLOR = '#a855f7';

let h, v, boxes, running = false, busy = false, score = 0, aiTimer = 0;

function init() {
  h = Array.from({ length: BOX + 1 }, () => Array(BOX).fill(0));
  v = Array.from({ length: BOX }, () => Array(BOX + 1).fill(0));
  boxes = Array.from({ length: BOX }, () => Array(BOX).fill(0));
  running = true; busy = false; score = 0;
  clearTimeout(aiTimer);
  scoreEl.textContent = 0;
  boxScoreEl.textContent = '0 : 0';
  bestEl.textContent = getProgress().bestScores['dotsandboxes'] || 0;
  draw();
}

function adjacentBoxes(type, r, c) {
  const out = [];
  if (type === 'h') {
    if (r - 1 >= 0) out.push([r - 1, c]);
    if (r < BOX) out.push([r, c]);
  } else {
    if (c - 1 >= 0) out.push([r, c - 1]);
    if (c < BOX) out.push([r, c]);
  }
  return out;
}

function sidesCount(r, c) {
  let n = 0;
  if (h[r][c]) n++;
  if (h[r + 1][c]) n++;
  if (v[r][c]) n++;
  if (v[r][c + 1]) n++;
  return n;
}

function freeEdges() {
  const out = [];
  for (let r = 0; r <= BOX; r++) for (let c = 0; c < BOX; c++) if (!h[r][c]) out.push(['h', r, c]);
  for (let r = 0; r < BOX; r++) for (let c = 0; c <= BOX; c++) if (!v[r][c]) out.push(['v', r, c]);
  return out;
}

function claim(type, r, c, owner) {
  if (type === 'h') h[r][c] = owner; else v[r][c] = owner;
  let made = 0;
  for (const [br, bc] of adjacentBoxes(type, r, c)) {
    if (boxes[br][bc] === 0 && sidesCount(br, bc) === 4) { boxes[br][bc] = owner; made++; }
  }
  return made;
}

function completingEdges() {
  const out = [];
  for (const e of freeEdges()) {
    for (const [br, bc] of adjacentBoxes(e[0], e[1], e[2])) {
      if (boxes[br][bc] === 0 && sidesCount(br, bc) === 3) { out.push(e); break; }
    }
  }
  return out;
}

function isSafe(type, r, c) {
  for (const [br, bc] of adjacentBoxes(type, r, c)) {
    if (boxes[br][bc] === 0 && sidesCount(br, bc) === 2) return false;
  }
  return true;
}

function countBoxes(owner) {
  let n = 0;
  for (const row of boxes) for (const b of row) if (b === owner) n++;
  return n;
}

function updateHud() {
  boxScoreEl.textContent = countBoxes(1) + ' : ' + countBoxes(2);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  for (let r = 0; r < BOX; r++) for (let c = 0; c < BOX; c++) {
    if (!boxes[r][c]) continue;
    const x = MARGIN + c * STEP, y = MARGIN + r * STEP;
    ctx.fillStyle = boxes[r][c] === 1 ? 'rgba(34,211,238,0.20)' : 'rgba(168,85,247,0.20)';
    ctx.fillRect(x, y, STEP, STEP);
    ctx.fillStyle = boxes[r][c] === 1 ? P_COLOR : A_COLOR;
    ctx.font = 'bold 30px ui-sans-serif,system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boxes[r][c] === 1 ? 'K' : 'M', x + STEP / 2, y + STEP / 2);
  }

  ctx.lineCap = 'round';
  for (let r = 0; r <= BOX; r++) for (let c = 0; c < BOX; c++) {
    const x1 = MARGIN + c * STEP, y = MARGIN + r * STEP, x2 = x1 + STEP;
    const owner = h[r][c];
    ctx.strokeStyle = owner === 1 ? P_COLOR : owner === 2 ? A_COLOR : '#223040';
    ctx.lineWidth = owner ? 7 : 3;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  }
  for (let r = 0; r < BOX; r++) for (let c = 0; c <= BOX; c++) {
    const x = MARGIN + c * STEP, y1 = MARGIN + r * STEP, y2 = y1 + STEP;
    const owner = v[r][c];
    ctx.strokeStyle = owner === 1 ? P_COLOR : owner === 2 ? A_COLOR : '#223040';
    ctx.lineWidth = owner ? 7 : 3;
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  }

  for (let r = 0; r <= BOX; r++) for (let c = 0; c <= BOX; c++) {
    ctx.beginPath();
    ctx.arc(MARGIN + c * STEP, MARGIN + r * STEP, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#8b98a5';
    ctx.fill();
  }
}

function pickEdge(x, y) {
  let best = null, bestD = 24;
  const hr = Math.round((y - MARGIN) / STEP), hc = Math.floor((x - MARGIN) / STEP);
  if (hr >= 0 && hr <= BOX && hc >= 0 && hc < BOX) {
    const d = Math.abs(y - (MARGIN + hr * STEP));
    if (d < bestD) { bestD = d; best = ['h', hr, hc]; }
  }
  const vr = Math.floor((y - MARGIN) / STEP), vc = Math.round((x - MARGIN) / STEP);
  if (vr >= 0 && vr < BOX && vc >= 0 && vc <= BOX) {
    const d = Math.abs(x - (MARGIN + vc * STEP));
    if (d < bestD) { bestD = d; best = ['v', vr, vc]; }
  }
  return best;
}

function aiMove() {
  if (!running) return;
  const comp = completingEdges();
  let made;
  if (comp.length) {
    const e = comp[Math.floor(Math.random() * comp.length)];
    made = claim(e[0], e[1], e[2], 2);
  } else {
    const free = freeEdges();
    if (!free.length) { gameOver(); return; }
    const safe = free.filter(e => isSafe(e[0], e[1], e[2]));
    const pool = safe.length ? safe : free;
    const e = pool[Math.floor(Math.random() * pool.length)];
    made = claim(e[0], e[1], e[2], 2);
  }
  updateHud();
  draw();
  if (!freeEdges().length) { gameOver(); return; }
  if (made > 0) { aiTimer = setTimeout(aiMove, 400); return; }
  busy = false;
}

function gameOver() {
  running = false; busy = false;
  clearTimeout(aiTimer);
  const p = countBoxes(1), a = countBoxes(2);
  if (p > a) score += 100;
  scoreEl.textContent = score;
  finish(p > a ? 'Kamu Menang! 🎉' : p < a ? 'Kamu Kalah' : 'Seri!');
}

function finish(title) {
  running = false; busy = false;
  clearTimeout(aiTimer);
  const res = submitScore('dotsandboxes', score);
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
  if (!running || busy) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const edge = pickEdge(x, y);
  if (!edge) return;
  const [t, r, c] = edge;
  if (t === 'h' ? h[r][c] : v[r][c]) return;
  const made = claim(t, r, c, 1);
  score = countBoxes(1) * 20;
  scoreEl.textContent = score;
  updateHud();
  draw();
  if (!freeEdges().length) { gameOver(); return; }
  if (made > 0) return;
  busy = true;
  aiTimer = setTimeout(aiMove, 400);
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
