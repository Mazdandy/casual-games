import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;
canvas.style.touchAction = 'none';

const WALL = 10, FLOOR_Y = H - 14;
const BALL_R = 7, GRAV = 0.16, REST = 0.72;
const FLIP_Y = H - 78, FLIP_LEN = 64, FLIP_R = 6;
const DRAIN_L = 148, DRAIN_R = W - 148;

const BUMPER_DEF = [
  { x: 150, y: 150, r: 21 },
  { x: 330, y: 150, r: 21 },
  { x: 240, y: 232, r: 22 },
  { x: 240, y: 96, r: 15 }
];
const LANE_X = [150, 240, 330];
const GUIDES = [
  { ax: WALL, ay: 250, bx: 152, by: FLIP_Y - 34 },
  { ax: W - WALL, ay: 250, bx: W - 152, by: FLIP_Y - 34 }
];

let ball, flippers, bumpers, lanes, score, lives, running = false, rafId = 0, last = 0;

function init() {
  flippers = [
    { px: 162, py: FLIP_Y, rest: 0.5, up: -0.4, angle: 0.5, active: false },
    { px: W - 162, py: FLIP_Y, rest: Math.PI - 0.5, up: Math.PI + 0.4, angle: Math.PI - 0.5, active: false }
  ];
  bumpers = BUMPER_DEF.map(b => ({ ...b, cd: 0, flash: 0 }));
  lanes = LANE_X.map(x => ({ x, cd: 0 }));
  score = 0; lives = 3;
  scoreEl.textContent = '0';
  livesEl.textContent = '3';
  bestEl.textContent = getProgress().bestScores['pinball'] || 0;
  resetBall();
  draw();
}

function resetBall() {
  ball = { x: W / 2 + (Math.random() - 0.5) * 28, y: 66, vx: (Math.random() - 0.5) * 2.4, vy: 1.4, r: BALL_R };
}

function addScore(n) { score += n; scoreEl.textContent = String(score); }

function segOf(f) {
  return {
    ax: f.px, ay: f.py,
    bx: f.px + Math.cos(f.angle) * FLIP_LEN,
    by: f.py + Math.sin(f.angle) * FLIP_LEN
  };
}

function collideSeg(ax, ay, bx, by, segR, kick) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby || 0.0001;
  let t = ((ball.x - ax) * abx + (ball.y - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t, cy = ay + aby * t;
  let dx = ball.x - cx, dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  const min = ball.r + segR;
  if (d < min) {
    if (d < 0.0001) { dx = 0; dy = -1; d = 0.0001; }
    const nx = dx / d, ny = dy / d;
    ball.x = cx + nx * min;
    ball.y = cy + ny * min;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + REST) * vn * nx;
      ball.vy -= (1 + REST) * vn * ny;
    }
    if (kick) {
      ball.vx += nx * kick;
      ball.vy += ny * kick;
    }
  }
}

function physics(s) {
  for (const f of flippers) {
    const target = f.active ? f.up : f.rest;
    const d = target - f.angle;
    f.angle += Math.sign(d) * Math.min(Math.abs(d), 0.42 * s);
  }

  ball.vy += GRAV * s;
  ball.x += ball.vx * s;
  ball.y += ball.vy * s;

  if (ball.x - ball.r < WALL) { ball.x = WALL + ball.r; ball.vx = Math.abs(ball.vx) * REST; }
  if (ball.x + ball.r > W - WALL) { ball.x = W - WALL - ball.r; ball.vx = -Math.abs(ball.vx) * REST; }
  if (ball.y - ball.r < WALL) { ball.y = WALL + ball.r; ball.vy = Math.abs(ball.vy) * REST; }

  if (ball.y + ball.r > FLOOR_Y && (ball.x < DRAIN_L || ball.x > DRAIN_R)) {
    ball.y = FLOOR_Y - ball.r;
    ball.vy = -Math.abs(ball.vy) * REST;
  }

  for (const g of GUIDES) collideSeg(g.ax, g.ay, g.bx, g.by, 5, 0);
  for (const f of flippers) {
    const sg = segOf(f);
    collideSeg(sg.ax, sg.ay, sg.bx, sg.by, FLIP_R, f.active ? 8 : 1);
  }

  for (const b of bumpers) {
    const dx = ball.x - b.x, dy = ball.y - b.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.0001) d = 0.0001;
    const min = b.r + ball.r;
    if (d < min) {
      const nx = dx / d, ny = dy / d;
      ball.x = b.x + nx * min;
      ball.y = b.y + ny * min;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= 1.7 * vn * nx;
        ball.vy -= 1.7 * vn * ny;
      }
      ball.vx += nx * 3.0;
      ball.vy += ny * 3.0;
      if (b.cd <= 0) {
        addScore(10 * (1 + Math.floor(Math.random() * 5)));
        b.cd = 6;
        b.flash = 12;
      }
    }
  }
}

function checkLanes() {
  if (ball.y > 30 && ball.y < 60) {
    for (const l of lanes) {
      if (l.cd <= 0 && Math.abs(ball.x - l.x) < 24) { addScore(25); l.cd = 45; }
    }
  }
}

function update(dt) {
  const s = Math.min(2.5, dt / 16.6667);
  const SUB = 3;
  for (let i = 0; i < SUB; i++) physics(s / SUB);
  for (const b of bumpers) {
    if (b.cd > 0) b.cd -= s;
    if (b.flash > 0) b.flash -= s;
  }
  for (const l of lanes) if (l.cd > 0) l.cd -= s;
  checkLanes();

  if (ball.y - ball.r > H + 6) loseBall();
}

function loseBall() {
  lives--;
  livesEl.textContent = String(Math.max(0, lives));
  if (lives <= 0) { finish(); return; }
  resetBall();
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0f1720';
  ctx.fillRect(WALL, WALL, W - WALL * 2, H - WALL);
  ctx.strokeStyle = '#223040';
  ctx.lineWidth = 2;
  ctx.strokeRect(WALL, WALL, W - WALL * 2, H - WALL);

  ctx.fillStyle = '#160a12';
  ctx.fillRect(DRAIN_L, FLOOR_Y - 2, DRAIN_R - DRAIN_L, H - (FLOOR_Y - 2));

  for (const l of lanes) {
    ctx.fillStyle = l.cd > 0 ? '#a855f7' : '#1d2a38';
    ctx.fillRect(l.x - 14, 28, 28, 34);
    ctx.strokeStyle = '#3a4b60';
    ctx.strokeRect(l.x - 14, 28, 28, 34);
    ctx.fillStyle = '#8b98a5';
    ctx.font = '11px ui-sans-serif,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('+25', l.x, 49);
  }

  ctx.strokeStyle = '#2a3b4d';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (const g of GUIDES) {
    ctx.beginPath();
    ctx.moveTo(g.ax, g.ay);
    ctx.lineTo(g.bx, g.by);
    ctx.stroke();
  }

  for (const b of bumpers) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.flash > 0 ? '#facc15' : '#1b2a3a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = b.flash > 0 ? '#ffffff' : '#22d3ee';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#22d3ee';
    ctx.fill();
  }

  for (const f of flippers) {
    const sg = segOf(f);
    ctx.strokeStyle = f.active ? '#a855f7' : '#22d3ee';
    ctx.lineWidth = FLIP_R * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sg.ax, sg.ay);
    ctx.lineTo(sg.bx, sg.by);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function loop(now) {
  if (!running) return;
  if (!last) last = now;
  let dt = now - last;
  last = now;
  if (dt > 50) dt = 50;
  update(dt);
  if (running) draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('pinball', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  last = 0;
  init();
  overlay.classList.add('hidden');
  running = true;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function flip(i, active) {
  if (!flippers || !flippers[i]) return;
  flippers[i].active = active;
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { flip(0, true); e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { flip(1, true); e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') flip(0, false);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') flip(1, false);
});

function pointerX(e) {
  const r = canvas.getBoundingClientRect();
  return (e.clientX - r.left) * (W / r.width);
}
canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  flip(pointerX(e) < W / 2 ? 0 : 1, true);
});
canvas.addEventListener('pointerup', () => { flip(0, false); flip(1, false); });
canvas.addEventListener('pointercancel', () => { flip(0, false); flip(1, false); });
canvas.addEventListener('pointerleave', () => { flip(0, false); flip(1, false); });

startBtn.addEventListener('click', start);
init();
