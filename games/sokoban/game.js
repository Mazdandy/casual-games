import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const movesEl = document.getElementById('moves');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const LEVELS = [
  [
    '#######',
    '#     #',
    '# @$. #',
    '#     #',
    '#######'
  ],
  [
    '#########',
    '#       #',
    '#  $ $  #',
    '#  . .  #',
    '#   @   #',
    '#       #',
    '#########'
  ],
  [
    '##########',
    '#        #',
    '#  $  .  #',
    '#        #',
    '#    @   #',
    '#        #',
    '##########'
  ],
  [
    '##########',
    '#        #',
    '#  .  .  #',
    '#  $  $  #',
    '#   @    #',
    '#        #',
    '##########'
  ],
  [
    '##########',
    '#        #',
    '#  $ $   #',
    '#  . .   #',
    '#   @    #',
    '#     $  #',
    '#     .  #',
    '##########'
  ]
];

const CELL = 48, BW = 46, CONTROL_H = 222;
let map, player, history, moves, score, levelIndex, cols, rows, running;

function isBox(ch) { return ch === '$' || ch === '*'; }
function isGoalCh(ch) { return ch === '.' || ch === '*' || ch === '+'; }

function dpadRects() {
  const top = rows * CELL + 12;
  const cx = canvas.width / 2;
  return {
    up:    { x: cx - BW / 2, y: top, w: BW, h: BW },
    left:  { x: cx - BW / 2 - BW - 4, y: top + BW + 4, w: BW, h: BW },
    right: { x: cx + BW / 2 + 4, y: top + BW + 4, w: BW, h: BW },
    down:  { x: cx - BW / 2, y: top + 2 * (BW + 4), w: BW, h: BW },
    undo:  { x: cx - 124, y: top + 3 * BW + 20, w: 120, h: 40 },
    reset: { x: cx + 4, y: top + 3 * BW + 20, w: 120, h: 40 }
  };
}

function loadLevel() {
  const grid = LEVELS[levelIndex];
  rows = grid.length; cols = grid[0].length;
  map = grid.map(row => row.split(''));
  player = { r: 0, c: 0 };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (map[r][c] === '@' || map[r][c] === '+') player = { r, c };
  }
  history = [];
  moves = 0;
  canvas.width = cols * CELL;
  canvas.height = rows * CELL + CONTROL_H;
  movesEl.textContent = 0;
  levelEl.textContent = (levelIndex + 1) + '/' + LEVELS.length;
  draw();
}

function init() {
  score = 0; levelIndex = 0; running = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['sokoban'] || 0;
  loadLevel();
}

function snapshot() {
  return { map: map.map(row => row.slice()), r: player.r, c: player.c, moves };
}

function move(dx, dy) {
  if (!running) return;
  const nx = player.c + dx, ny = player.r + dy;
  if (map[ny][nx] === '#') return;
  const dest = map[ny][nx];
  const playerOnGoal = map[player.r][player.c] === '+';
  if (isBox(dest)) {
    const bx = nx + dx, by = ny + dy;
    const beyond = map[by][bx];
    if (beyond === '#' || isBox(beyond)) return;
    history.push(snapshot());
    const srcGoal = dest === '*';
    map[by][bx] = isGoalCh(beyond) ? '*' : '$';
    map[ny][nx] = srcGoal ? '+' : '@';
    map[player.r][player.c] = playerOnGoal ? '.' : ' ';
    player = { r: ny, c: nx };
  } else {
    history.push(snapshot());
    map[player.r][player.c] = playerOnGoal ? '.' : ' ';
    map[ny][nx] = isGoalCh(dest) ? '+' : '@';
    player = { r: ny, c: nx };
  }
  moves++;
  movesEl.textContent = moves;
  draw();
  checkSolved();
}

function undo() {
  if (!running || !history.length) return;
  const s = history.pop();
  map = s.map; player = { r: s.r, c: s.c }; moves = s.moves;
  movesEl.textContent = moves;
  draw();
}

function restartLevel() {
  if (!running) return;
  const keep = score;
  loadLevel();
  score = keep;
  scoreEl.textContent = score;
}

function checkSolved() {
  for (const row of map) for (const ch of row) if (ch === '$') return;
  score += 100;
  scoreEl.textContent = score;
  levelIndex++;
  if (levelIndex >= LEVELS.length) { finish(); return; }
  loadLevel();
}

function finish() {
  running = false;
  const res = submitScore('sokoban', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Semua level selesai! 🎉</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
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
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const ch = map[r][c];
    const x = c * CELL, y = r * CELL;
    if (ch === '#') {
      ctx.fillStyle = '#223040';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = '#2c3d50';
      ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      continue;
    }
    ctx.fillStyle = '#0f1620';
    ctx.fillRect(x, y, CELL, CELL);
    if (isGoalCh(ch)) {
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.fill();
    }
    if (isBox(ch)) {
      ctx.fillStyle = ch === '*' ? '#22c55e' : '#b45309';
      roundRect(x + 6, y + 6, CELL - 12, CELL - 12, 6);
      ctx.fill();
      ctx.strokeStyle = '#0b0f14'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(player.c * CELL + CELL / 2, player.r * CELL + CELL / 2, CELL * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fill();

  const b = dpadRects();
  for (const key of ['up', 'down', 'left', 'right']) {
    const rc = b[key];
    ctx.fillStyle = '#1b2733';
    roundRect(rc.x, rc.y, rc.w, rc.h, 8); ctx.fill();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 18px ui-sans-serif,system-ui';
    ctx.fillText({ up: '▲', down: '▼', left: '◀', right: '▶' }[key], rc.x + rc.w / 2, rc.y + rc.h / 2 + 1);
  }
  for (const key of ['undo', 'reset']) {
    const rc = b[key];
    ctx.fillStyle = key === 'undo' ? '#1b2733' : '#2a1b33';
    roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fill();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 15px ui-sans-serif,system-ui';
    ctx.fillText(key === 'undo' ? '↶ Batal' : '⟳ Ulang', rc.x + rc.w / 2, rc.y + rc.h / 2 + 1);
  }
}

function start() {
  init();
  running = true;
  overlay.classList.add('hidden');
  draw();
}

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}
function inside(rc, p) { return p.x >= rc.x && p.x <= rc.x + rc.w && p.y >= rc.y && p.y <= rc.y + rc.h; }

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!running) return;
  const p = pos(e);
  const b = dpadRects();
  if (inside(b.up, p)) move(0, -1);
  else if (inside(b.down, p)) move(0, 1);
  else if (inside(b.left, p)) move(-1, 0);
  else if (inside(b.right, p)) move(1, 0);
  else if (inside(b.undo, p)) undo();
  else if (inside(b.reset, p)) restartLevel();
});

document.addEventListener('keydown', e => {
  if (!running) return;
  const k = e.key;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); move(0, -1); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); move(0, 1); }
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); move(-1, 0); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); move(1, 0); }
  else if (k === 'z' || k === 'Z' || k === 'Backspace') { e.preventDefault(); undo(); }
  else if (k === 'r' || k === 'R') { e.preventDefault(); restartLevel(); }
});

startBtn.addEventListener('click', start);
init();
