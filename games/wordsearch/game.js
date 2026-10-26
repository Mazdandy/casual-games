import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timeEl = document.getElementById('time');
const foundEl = document.getElementById('found');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 10, CELL = 48, S = N * CELL;
canvas.width = S; canvas.height = S;

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const WORD_POOL = [
  'PANTAI', 'GUNUNG', 'SEKOLAH', 'KUCING', 'JAKARTA', 'BUNGA', 'MATAHARI', 'SEMANGKA',
  'PISANG', 'HARIMAU', 'GAJAH', 'KERETA', 'PESAWAT', 'DOKTER', 'PASAR', 'SUNGAI', 'BINTANG'
];

let grid, words, found, foundWords, anchor, cursor, dragging, score, timeLeft, running = false, timerId = 0;

function rand(n) { return (Math.random() * n) | 0; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryPlace(w, r, c, dy, dx, g) {
  for (let i = 0; i < w.length; i++) {
    const rr = r + dy * i, cc = c + dx * i;
    if (rr < 0 || rr >= N || cc < 0 || cc >= N) return false;
    if (g[rr][cc] && g[rr][cc] !== w[i]) return false;
  }
  for (let i = 0; i < w.length; i++) g[r + dy * i][c + dx * i] = w[i];
  return true;
}

function generate() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const g = Array.from({ length: N }, () => new Array(N).fill(''));
    const chosen = shuffle(WORD_POOL.slice()).slice(0, 6);
    let ok = true;
    for (const w of chosen) {
      let placed = false;
      for (let t = 0; t < 400 && !placed; t++) {
        const [dy, dx] = DIRS[rand(DIRS.length)];
        placed = tryPlace(w, rand(N), rand(N), dy, dx, g);
      }
      if (!placed) { ok = false; break; }
    }
    if (!ok) continue;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!g[r][c]) g[r][c] = String.fromCharCode(65 + rand(26));
      }
    }
    grid = g;
    words = chosen;
    return;
  }
}

function init() {
  generate();
  found = [];
  foundWords = new Set();
  anchor = null;
  cursor = null;
  dragging = false;
  score = 0;
  timeLeft = 90;
  running = false;
  scoreEl.textContent = 0;
  timeEl.textContent = timeLeft;
  foundEl.textContent = `0/${words.length}`;
  bestEl.textContent = getProgress().bestScores['wordsearch'] || 0;
  draw();
}

function getLine(a, b) {
  const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c);
  const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c));
  const cells = [];
  for (let i = 0; i <= len; i++) cells.push([a.r + dr * i, a.c + dc * i]);
  return cells;
}

function snapEnd(a, er, ec) {
  let best = null, bd = Infinity;
  for (const [dy, dx] of DIRS) {
    for (let k = 1; k < N; k++) {
      const rr = a.r + dy * k, cc = a.c + dx * k;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
      const d = (rr - er) ** 2 + (cc - ec) ** 2;
      if (d < bd) { bd = d; best = { r: rr, c: cc }; }
      if (d === 0) return best;
    }
  }
  return best || a;
}

function cellAt(e) {
  const rc = canvas.getBoundingClientRect();
  const x = (e.clientX - rc.left) * (S / rc.width);
  const y = (e.clientY - rc.top) * (S / rc.height);
  if (x < 0 || y < 0 || x >= S || y >= S) return null;
  return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
}

function validate() {
  if (!anchor || !cursor) return;
  const cells = getLine(anchor, cursor);
  if (cells.length < 2) return;
  const str = cells.map(([r, c]) => grid[r][c]).join('');
  const rev = str.split('').reverse().join('');
  for (const w of words) {
    if (foundWords.has(w)) continue;
    if (str === w || rev === w) {
      foundWords.add(w);
      found.push({ cells, word: w });
      score += 50;
      scoreEl.textContent = score;
      foundEl.textContent = `${foundWords.size}/${words.length}`;
      if (foundWords.size === words.length) finish('Semua Kata Ketemu! 🎉');
      return;
    }
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
  ctx.fillRect(0, 0, S, S);

  const foundSet = new Set();
  for (const f of found) for (const [r, c] of f.cells) foundSet.add(r + ',' + c);

  const selSet = new Set();
  if (anchor && cursor && dragging) {
    for (const [r, c] of getLine(anchor, cursor)) selSet.add(r + ',' + c);
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = c * CELL, y = r * CELL;
      const key = r + ',' + c;
      if (foundSet.has(key)) ctx.fillStyle = 'rgba(34,211,238,0.22)';
      else if (selSet.has(key)) ctx.fillStyle = 'rgba(168,85,247,0.35)';
      else ctx.fillStyle = 'rgba(255,255,255,0.03)';
      roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();
      ctx.strokeStyle = '#1b2733'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  for (const f of found) {
    if (f.cells.length < 2) continue;
    const a = f.cells[0], b = f.cells[f.cells.length - 1];
    ctx.strokeStyle = 'rgba(34,211,238,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[1] * CELL + CELL / 2, a[0] * CELL + CELL / 2);
    ctx.lineTo(b[1] * CELL + CELL / 2, b[0] * CELL + CELL / 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px ui-sans-serif,system-ui';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const key = r + ',' + c;
      ctx.fillStyle = foundSet.has(key) ? '#7fe9f5' : selSet.has(key) ? '#e6edf3' : '#c7d1da';
      ctx.fillText(grid[r][c], c * CELL + CELL / 2, r * CELL + CELL / 2 + 1);
    }
  }
}

function finish(title) {
  running = false;
  clearInterval(timerId);
  anchor = null; cursor = null; dragging = false;
  const res = submitScore('wordsearch', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong> — Kata ketemu: <strong>${foundWords.size}/${words.length}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function tick() {
  if (!running) return;
  timeLeft--;
  timeEl.textContent = Math.max(0, timeLeft);
  if (timeLeft <= 0) finish('Waktu Habis!');
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
  draw();
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const cell = cellAt(e);
  if (!cell) return;
  if (!anchor) {
    anchor = cell;
    cursor = cell;
    dragging = true;
  } else {
    cursor = snapEnd(anchor, cell.r, cell.c);
    validate();
    anchor = null; cursor = null; dragging = false;
  }
  draw();
});

canvas.addEventListener('pointermove', e => {
  if (!running || !dragging || !anchor) return;
  const cell = cellAt(e);
  if (!cell) return;
  cursor = snapEnd(anchor, cell.r, cell.c);
  draw();
});

canvas.addEventListener('pointerup', () => {
  if (!running) return;
  if (dragging && anchor && cursor && (cursor.r !== anchor.r || cursor.c !== anchor.c)) {
    validate();
    anchor = null; cursor = null;
  }
  dragging = false;
  draw();
});

startBtn.addEventListener('click', start);
init();
