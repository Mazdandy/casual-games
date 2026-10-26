import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const N = 8, CELL = 60, W = N * CELL, H = N * CELL;
canvas.width = W; canvas.height = H;

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const darkSquare = (r, c) => (r + c) % 2 === 1;

let board, turn, moves, selected, running, busy, gameOver, score, timer = 0;

function cloneBoard(bd) {
  return bd.map(row => row.map(p => (p ? { side: p.side, king: p.king } : null)));
}

function captureSeqs(bd, r, c, piece, captured, from, out) {
  for (const [dr, dc] of DIRS) {
    const mr = r + dr, mc = c + dc, nr = r + 2 * dr, nc = c + 2 * dc;
    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
    const mid = bd[mr][mc];
    if (!mid || mid.side === piece.side) continue;
    if (captured.some(p => p[0] === mr && p[1] === mc)) continue;
    if (bd[nr][nc]) continue;

    const nb = cloneBoard(bd);
    nb[r][c] = null; nb[mr][mc] = null;
    nb[nr][nc] = { side: piece.side, king: piece.king };
    const cap2 = captured.concat([[mr, mc]]);
    const backRow = piece.side === 1 ? 0 : 7;

    if (!piece.king && nr === backRow) {
      nb[nr][nc].king = true;
      out.push({ from, to: [nr, nc], board: nb, captures: cap2 });
    } else {
      const sub = [];
      captureSeqs(nb, nr, nc, nb[nr][nc], cap2, from, sub);
      if (sub.length) out.push(...sub);
      else out.push({ from, to: [nr, nc], board: nb, captures: cap2 });
    }
  }
}

function genMoves(bd, side) {
  const caps = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = bd[r][c];
    if (!p || p.side !== side) continue;
    captureSeqs(bd, r, c, p, [], [r, c], caps);
  }
  if (caps.length) return caps;

  const simple = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = bd[r][c];
    if (!p || p.side !== side) continue;
    const dirs = p.king ? DIRS : (side === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      if (bd[nr][nc]) continue;
      const nb = cloneBoard(bd);
      nb[r][c] = null;
      nb[nr][nc] = { side, king: p.king };
      const backRow = side === 1 ? 0 : 7;
      if (!p.king && nr === backRow) nb[nr][nc].king = true;
      simple.push({ from: [r, c], to: [nr, nc], board: nb, captures: [] });
    }
  }
  return simple;
}

function countCaptures(bd, side) {
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = bd[r][c];
    if (!p || p.side !== side) continue;
    const out = [];
    captureSeqs(bd, r, c, p, [], [r, c], out);
    n += out.length;
  }
  return n;
}

function pickAI(list) {
  let best = list[0], bestScore = -Infinity;
  for (const mv of list) {
    let s = mv.captures.length * 100;
    const destPiece = mv.board[mv.to[0]][mv.to[1]];
    if (destPiece.king) s += 60;
    s += mv.to[0] * 3;
    s -= countCaptures(mv.board, 1) * 25;
    s += genMoves(mv.board, 2).length;
    s += Math.random() * 3;
    if (s > bestScore) { bestScore = s; best = mv; }
  }
  return best;
}

function refreshMoves() {
  moves = genMoves(board, turn);
}

function init() {
  running = false;
  gameOver = false; busy = false; selected = null;
  clearTimeout(timer);
  board = Array.from({ length: N }, () => Array(N).fill(null));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!darkSquare(r, c)) continue;
    if (r < 3) board[r][c] = { side: 2, king: false };
    else if (r > 4) board[r][c] = { side: 1, king: false };
  }
  turn = 1; score = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['checkers'] || 0;
  refreshMoves();
  draw();
}

function applyPlayerMove(mv) {
  board = mv.board;
  selected = null;
  busy = true;
  draw();
  timer = setTimeout(() => {
    if (!running) return;
    turn = 2;
    refreshMoves();
    if (moves.length === 0) { score += 100; scoreEl.textContent = score; finish('Menang! 🎉'); return; }
    draw();
    timer = setTimeout(aiTurn, 320);
  }, 240);
}

function aiTurn() {
  if (!running) return;
  const mv = pickAI(moves);
  board = mv.board;
  draw();
  timer = setTimeout(() => {
    if (!running) return;
    turn = 1;
    refreshMoves();
    if (moves.length === 0) { finish('Kalah 😢'); return; }
    busy = false;
    draw();
  }, 240);
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
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = darkSquare(r, c) ? '#26313c' : '#3a4653';
    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
  }

  if (selected) {
    ctx.fillStyle = 'rgba(34,211,238,0.35)';
    ctx.fillRect(selected[1] * CELL, selected[0] * CELL, CELL, CELL);
    for (const mv of moves) {
      if (mv.from[0] !== selected[0] || mv.from[1] !== selected[1]) continue;
      ctx.beginPath();
      ctx.arc(mv.to[1] * CELL + CELL / 2, mv.to[0] * CELL + CELL / 2, CELL * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34,211,238,0.85)';
      ctx.fill();
    }
  }

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const p = board[r][c];
    if (!p) continue;
    const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
    const rad = CELL * 0.33;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = p.side === 1 ? '#ef4444' : '#e6edf3';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.side === 1 ? '#7f1d1d' : '#8b98a5';
    ctx.stroke();
    if (p.king) {
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
    }
  }

  ctx.lineWidth = 4;
  ctx.strokeStyle = turn === 1 ? '#22d3ee' : '#a855f7';
  ctx.strokeRect(2, 2, W - 4, H - 4);
}

function finish(title) {
  running = false;
  gameOver = true;
  clearTimeout(timer);
  const res = submitScore('checkers', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
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

canvas.addEventListener('pointerdown', e => {
  if (!running || busy || gameOver || turn !== 1) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (r < 0 || r > 7 || c < 0 || c > 7) return;

  const p = board[r][c];
  if (p && p.side === 1) {
    selected = moves.some(m => m.from[0] === r && m.from[1] === c) ? [r, c] : null;
    draw();
    return;
  }
  if (selected) {
    const mv = moves.find(m =>
      m.from[0] === selected[0] && m.from[1] === selected[1] &&
      m.to[0] === r && m.to[1] === c);
    if (mv) applyPlayerMove(mv);
  }
});

startBtn.addEventListener('click', start);
init();
