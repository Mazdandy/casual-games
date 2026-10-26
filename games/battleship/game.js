import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const enemyLeftEl = document.getElementById('enemyLeft');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const G = 8, CELL = 24, GAP = 32, TOP = 56;
const GRID = G * CELL;
const W = 480, H = 300;
canvas.width = W; canvas.height = H;
const LEFT = (W - (GRID * 2 + GAP)) / 2;
const RIGHT = LEFT + GRID + GAP;
const FLEET = [4, 3, 3, 2, 2];

let pGrid, pShips, eGrid, eShips, pShots, eShots;
let aiQueue, playerHits, score = 0, running = false, busy = false, revealEnemy = false, aiTimer = 0;

function placeFleet() {
  const grid = Array.from({ length: G }, () => Array(G).fill(0));
  const ships = {};
  let id = 1;
  for (const size of FLEET) {
    let placed = false, tries = 0;
    while (!placed && tries < 600) {
      tries++;
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? G : G - size + 1));
      const c = Math.floor(Math.random() * (horiz ? G - size + 1 : G));
      let ok = true;
      for (let i = 0; i < size; i++) {
        const rr = horiz ? r : r + i;
        const cc = horiz ? c + i : c;
        if (grid[rr][cc]) { ok = false; break; }
      }
      if (!ok) continue;
      const cells = [];
      for (let i = 0; i < size; i++) {
        const rr = horiz ? r : r + i;
        const cc = horiz ? c + i : c;
        grid[rr][cc] = id;
        cells.push([rr, cc]);
      }
      ships[id] = { size, hits: 0, sunk: false, cells };
      id++; placed = true;
    }
  }
  return { grid, ships };
}

function allSunk(ships) {
  return Object.values(ships).every(s => s.sunk);
}

function remaining(ships) {
  return Object.values(ships).filter(s => !s.sunk).length;
}

function init() {
  const p = placeFleet(), e = placeFleet();
  pGrid = p.grid; pShips = p.ships;
  eGrid = e.grid; eShips = e.ships;
  pShots = Array.from({ length: G }, () => Array(G).fill(0));
  eShots = Array.from({ length: G }, () => Array(G).fill(0));
  aiQueue = [];
  playerHits = 0;
  running = true; busy = false; revealEnemy = false;
  clearTimeout(aiTimer);
  scoreEl.textContent = 0;
  enemyLeftEl.textContent = FLEET.length;
  bestEl.textContent = getProgress().bestScores['battleship'] || 0;
  draw();
}

function drawGrid(originX, grid, shots, revealShips) {
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    const x = originX + c * CELL, y = TOP + r * CELL;
    ctx.fillStyle = revealShips && grid[r][c] ? '#1e3a5f' : '#0f172a';
    ctx.fillRect(x, y, CELL, CELL);
    const s = shots[r][c];
    if (s === 1) {
      ctx.fillStyle = 'rgba(139,152,165,0.30)';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#8b98a5';
      ctx.fill();
    } else if (s === 2) {
      ctx.fillStyle = 'rgba(239,68,68,0.55)';
      ctx.fillRect(x, y, CELL, CELL);
    }
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
  }
  ctx.strokeStyle = '#223040';
  ctx.lineWidth = 2;
  ctx.strokeRect(originX, TOP, GRID, GRID);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 15px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#8b98a5';
  ctx.fillText('Armada Kamu', LEFT + GRID / 2, 36);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('Perairan Musuh', RIGHT + GRID / 2, 36);

  drawGrid(LEFT, pGrid, pShots, true);
  drawGrid(RIGHT, eGrid, eShots, revealEnemy);

  ctx.font = '13px ui-sans-serif,system-ui,sans-serif';
  ctx.fillStyle = '#8b98a5';
  ctx.textAlign = 'center';
  ctx.fillText('Klik petak musuh untuk menembak', W / 2, H - 12);
}

function fireAtEnemy(r, c) {
  if (eGrid[r][c]) {
    eShots[r][c] = 2;
    const ship = eShips[eGrid[r][c]];
    ship.hits++;
    playerHits++;
    if (ship.hits >= ship.size) ship.sunk = true;
    scoreEl.textContent = playerHits * 20;
  } else {
    eShots[r][c] = 1;
  }
  enemyLeftEl.textContent = remaining(eShips);
  draw();
  if (allSunk(eShips)) { gameOver(true); return; }
  aiTimer = setTimeout(aiTurn, 500);
}

function aiTurn() {
  if (!running) return;
  let target = null;
  while (aiQueue.length) {
    const cand = aiQueue.shift();
    if (!pShots[cand[0]][cand[1]]) { target = cand; break; }
  }
  if (!target) {
    const unknown = [];
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (!pShots[r][c]) unknown.push([r, c]);
    if (!unknown.length) { gameOver(false); return; }
    target = unknown[Math.floor(Math.random() * unknown.length)];
  }
  const [r, c] = target;
  if (pGrid[r][c]) {
    pShots[r][c] = 2;
    const ship = pShips[pGrid[r][c]];
    ship.hits++;
    if (ship.hits >= ship.size) {
      ship.sunk = true;
    } else {
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < G && nc >= 0 && nc < G && !pShots[nr][nc] &&
            !aiQueue.some(q => q[0] === nr && q[1] === nc)) aiQueue.push([nr, nc]);
      });
    }
  } else {
    pShots[r][c] = 1;
  }
  draw();
  if (allSunk(pShips)) { gameOver(false); return; }
  busy = false;
}

function gameOver(win) {
  running = false; busy = false;
  clearTimeout(aiTimer);
  revealEnemy = true;
  score = win ? playerHits * 20 + 100 : playerHits * 20;
  scoreEl.textContent = score;
  draw();
  finish(win ? 'Armada Musuh Hancur! 🎉' : 'Armada Kamu Tenggelam');
}

function finish(title) {
  const res = submitScore('battleship', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Kena: <strong>${playerHits}</strong> tembakan</p>
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
  const c = Math.floor((x - RIGHT) / CELL);
  const r = Math.floor((y - TOP) / CELL);
  if (r < 0 || r >= G || c < 0 || c >= G) return;
  if (eShots[r][c]) return;
  busy = true;
  fireAtEnemy(r, c);
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
