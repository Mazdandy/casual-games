import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W;
canvas.height = H;

const LANES = 4, LW = W / LANES;
const HIT_Y = 390;
const NOTE_H = 26;
const SPEED = 330;
const PERFECT = 24, GOOD = 52;
const TOTAL = 60;
const KEYMAP = { d: 0, f: 1, j: 2, k: 3 };
const LANE_COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#34d399'];
const KEY_LABELS = ['D', 'F', 'J', 'K'];

let notes, score, combo, spawned, resolved, interval, spawnTimer, feed, running = false, rafId = 0, last = 0;

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function init() {
  notes = [];
  score = 0; combo = 0; spawned = 0; resolved = 0;
  interval = 0.62; spawnTimer = 0.5;
  feed = null;
  scoreEl.textContent = '0';
  comboEl.textContent = '0';
  bestEl.textContent = getProgress().bestScores['rhythm'] || 0;
  draw();
}

function spawnNote() {
  const lane = (Math.random() * LANES) | 0;
  notes.push({ lane, y: -NOTE_H, judged: false });
  spawned++;
  interval = Math.max(0.3, 0.62 - spawned * 0.005);
}

function update(dt) {
  if (spawned < TOTAL) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnNote(); spawnTimer = interval; }
  }

  for (const n of notes) n.y += SPEED * dt;

  for (const n of notes) {
    if (!n.judged && n.y + NOTE_H / 2 - HIT_Y > GOOD) {
      n.judged = true;
      combo = 0;
      comboEl.textContent = '0';
      score = Math.max(0, score - 5);
      scoreEl.textContent = score;
      resolved++;
      feed = { text: 'MISS', color: '#ef4444', life: 0.6 };
    }
  }

  notes = notes.filter(n => n.y < H + 80);

  if (feed) { feed.life -= dt; if (feed.life <= 0) feed = null; }

  if (spawned >= TOTAL && notes.length === 0) { finish(); return; }
}

function tryHit(lane) {
  let idx = -1, bestDist = Infinity;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.lane !== lane || n.judged) continue;
    const d = Math.abs(n.y + NOTE_H / 2 - HIT_Y);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  if (idx >= 0 && bestDist <= GOOD) {
    notes.splice(idx, 1);
    resolved++;
    combo++;
    if (bestDist <= PERFECT) {
      score += 30;
      feed = { text: 'PERFECT', color: '#22d3ee', life: 0.5 };
    } else {
      score += 15;
      feed = { text: 'GOOD', color: '#a855f7', life: 0.5 };
    }
    scoreEl.textContent = score;
    comboEl.textContent = combo;
  }
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < LANES; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(i * LW, 0, LW, H);
    ctx.strokeStyle = '#223040';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(i * LW, 0);
    ctx.lineTo(i * LW, H);
    ctx.stroke();
  }

  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, HIT_Y);
  ctx.lineTo(W, HIT_Y);
  ctx.stroke();

  for (const n of notes) {
    ctx.fillStyle = LANE_COLORS[n.lane];
    roundRect(n.lane * LW + 6, n.y, LW - 12, NOTE_H, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(n.lane * LW + 6, n.y, LW - 12, 7, 8);
    ctx.fill();
  }

  ctx.fillStyle = '#8b98a5';
  ctx.font = 'bold 18px ui-sans-serif,system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < LANES; i++) ctx.fillText(KEY_LABELS[i], i * LW + LW / 2, H - 20);

  ctx.font = 'bold 14px ui-sans-serif,system-ui';
  ctx.fillText(resolved + ' / ' + TOTAL, W / 2, 22);

  if (feed) {
    ctx.globalAlpha = Math.min(1, feed.life / 0.3);
    ctx.fillStyle = feed.color;
    ctx.font = 'bold 34px ui-sans-serif,system-ui';
    ctx.fillText(feed.text, W / 2, 150);
    ctx.globalAlpha = 1;
  }
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  update(dt);
  if (!running) return;
  draw();
  rafId = requestAnimationFrame(loop);
}

function finish() {
  running = false;
  cancelAnimationFrame(rafId);
  const res = submitScore('rhythm', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    <p>Catatan: <strong>${resolved}/${TOTAL}</strong></p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function start() {
  init();
  overlay.classList.add('hidden');
  cancelAnimationFrame(rafId);
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / LW)));
  tryHit(lane);
});

addEventListener('keydown', e => {
  if (!running) return;
  const k = e.key.toLowerCase();
  if (k in KEYMAP) { e.preventDefault(); tryHit(KEYMAP[k]); }
});

startBtn.addEventListener('click', start);
init();
