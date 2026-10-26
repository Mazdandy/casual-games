import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const langkahEl = document.getElementById('langkah');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 6, TS = 80, W = N * TS, H = N * TS;
canvas.width = W; canvas.height = H;

const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

let running = false, busy = false, animating = false;
let grid, source, sink, level, score, rotations, rotationsThisLevel;
let rafId = 0, animStart = 0, timer = 0;

function rotateConns(c) { return [c[3], c[0], c[1], c[2]]; }

function dirBetween(r, c, nr, nc) {
  if (nr === r - 1) return 0;
  if (nc === c + 1) return 1;
  if (nr === r + 1) return 2;
  return 3;
}

function shuffleArr(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function findPath(sr, rr) {
  const seen = new Set();
  const path = [];
  let found = false;
  function dfs(r, c) {
    seen.add(r * N + c); path.push([r, c]);
    if (r === rr && c === N - 1) { found = true; return; }
    for (const [dr, dc] of shuffleArr([[0, 1], [1, 0], [-1, 0], [0, -1]])) {
      if (found) return;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (seen.has(nr * N + nc)) continue;
      dfs(nr, nc);
    }
    if (!found) path.pop();
  }
  dfs(sr, 0);
  return path;
}

function randomShape() {
  const options = [
    [1, 0, 1, 0], [0, 1, 0, 1],
    [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1],
    [1, 1, 1, 0], [0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1],
    [1, 1, 1, 1]
  ];
  let conns = options[(Math.random() * options.length) | 0];
  const k = (Math.random() * 4) | 0;
  for (let i = 0; i < k; i++) conns = rotateConns(conns);
  return conns.slice();
}

function reachInfo() {
  const dist = new Map();
  const q = [[source[0], source[1], 0]];
  dist.set(source[0] * N + source[1], 0);
  let max = 0;
  while (q.length) {
    const [r, c, d] = q.shift();
    if (d > max) max = d;
    const conns = grid[r][c].conns;
    for (let dir = 0; dir < 4; dir++) {
      if (!conns[dir]) continue;
      const nr = r + DIRS[dir][0], nc = c + DIRS[dir][1];
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      if (!grid[nr][nc].conns[(dir + 2) % 4]) continue;
      const k = nr * N + nc;
      if (!dist.has(k)) { dist.set(k, d + 1); q.push([nr, nc, d + 1]); }
    }
  }
  return { dist, max };
}

const isSolved = () => reachInfo().dist.has(sink[0] * N + sink[1]);

function genLevel() {
  const sr = (Math.random() * N) | 0;
  const rr = (Math.random() * N) | 0;
  source = [sr, 0];
  sink = [rr, N - 1];
  const path = findPath(sr, rr);

  grid = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => ({ conns: [false, false, false, false] })));

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const conns = grid[r][c].conns;
    if (i > 0) { const d = dirBetween(r, c, path[i - 1][0], path[i - 1][1]); conns[d] = true; }
    if (i < path.length - 1) { const d = dirBetween(r, c, path[i + 1][0], path[i + 1][1]); conns[d] = true; }
    if (i === 0) conns[3] = true;
    if (i === path.length - 1) conns[1] = true;
  }

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (grid[r][c].conns.some(Boolean)) continue;
    grid[r][c].conns = randomShape();
  }

  let guard = 0;
  do {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const k = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < k; i++) grid[r][c].conns = rotateConns(grid[r][c].conns);
    }
    guard++;
  } while (isSolved() && guard < 20);

  rotationsThisLevel = 0;
}

function init() {
  running = false; busy = false; animating = false;
  clearTimeout(timer);
  cancelAnimationFrame(rafId);
  level = 1; score = 0; rotations = 0; rotationsThisLevel = 0;
  scoreEl.textContent = 0;
  langkahEl.textContent = 0;
  levelEl.textContent = '1/5';
  bestEl.textContent = getProgress().bestScores['pipes'] || 0;
  genLevel();
  draw(0);
}

function draw(t = 0) {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  const info = reachInfo();
  const threshold = t > 0 ? t * (info.max || 0) + 0.001 : -1;

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = (r + c) % 2 === 0 ? '#131a22' : '#182430';
    ctx.fillRect(c * TS, r * TS, TS, TS);
  }

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const conns = grid[r][c].conns;
    const d = info.dist.get(r * N + c);
    const wet = threshold >= 0 && d !== undefined && d <= threshold;
    const cx = c * TS + TS / 2, cy = r * TS + TS / 2;

    ctx.strokeStyle = wet ? '#22d3ee' : '#5b6b7a';
    ctx.lineWidth = TS * 0.2;
    for (let dir = 0; dir < 4; dir++) {
      if (!conns[dir]) continue;
      const ex = cx + DIRS[dir][1] * TS / 2;
      const ey = cy + DIRS[dir][0] * TS / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, TS * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = wet ? '#67e8f9' : '#7b8b9a';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(34,48,64,0.6)';
  ctx.lineWidth = 1;
  for (let i = 1; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(i * TS, 0); ctx.lineTo(i * TS, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * TS); ctx.lineTo(W, i * TS); ctx.stroke();
  }

  const scy = source[0] * TS + TS / 2;
  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.moveTo(4, scy - 15); ctx.lineTo(4, scy + 15); ctx.lineTo(TS * 0.34, scy);
  ctx.closePath(); ctx.fill();

  const kcy = sink[0] * TS + TS / 2;
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(W - TS * 0.34, kcy - 15); ctx.lineTo(W - TS * 0.34, kcy + 15); ctx.lineTo(W - 4, kcy);
  ctx.closePath(); ctx.fill();
}

function startFlow() {
  busy = true;
  animating = true;
  animStart = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(flowLoop);
}

function flowLoop(now) {
  if (!running) return;
  const t = Math.min(1, (now - animStart) / 650);
  draw(t);
  if (t >= 1) {
    animating = false;
    const pts = Math.max(40, 100 - 15 * rotationsThisLevel);
    score += pts;
    scoreEl.textContent = score;
    level++;
    if (level > 5) { finish(); return; }
    levelEl.textContent = `${level}/5`;
    timer = setTimeout(() => { if (running) nextLevel(); }, 500);
    return;
  }
  rafId = requestAnimationFrame(flowLoop);
}

function nextLevel() {
  rotationsThisLevel = 0;
  busy = false;
  genLevel();
  draw(0);
}

function finish() {
  running = false;
  busy = false;
  clearTimeout(timer);
  cancelAnimationFrame(rafId);
  const res = submitScore('pipes', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Semua level selesai!</h2>
    <p>Skor: <strong>${score}</strong> · Langkah: <strong>${rotations}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  running = true;
  draw(0);
}

canvas.addEventListener('pointerdown', e => {
  if (!running || busy) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const c = Math.floor(x / TS), r = Math.floor(y / TS);
  if (r < 0 || r >= N || c < 0 || c >= N) return;
  grid[r][c].conns = rotateConns(grid[r][c].conns);
  rotations++;
  rotationsThisLevel++;
  langkahEl.textContent = rotations;
  draw(0);
  if (isSolved()) startFlow();
});

startBtn.addEventListener('click', start);
init();
