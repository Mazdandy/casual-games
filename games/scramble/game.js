import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const WORDS = [
  'aku', 'kamu', 'rumah', 'buku', 'meja', 'kursi', 'pintu', 'jendela', 'kucing', 'anjing',
  'air', 'api', 'tanah', 'langit', 'bulan', 'bintang', 'matahari', 'hujan', 'awan', 'pohon',
  'bunga', 'daun', 'akar', 'buah', 'roti', 'nasi', 'sayur', 'ikan', 'ayam', 'sapi',
  'kambing', 'kuda', 'gajah', 'harimau', 'burung', 'ular', 'katak', 'sekolah', 'guru', 'murid',
  'pena', 'tas', 'sepatu', 'baju', 'celana', 'topi', 'jalan', 'kota', 'desa', 'pasar',
  'uang', 'kerja', 'tidur', 'makan', 'minum', 'lari', 'gunting', 'pensil', 'papan', 'kunci'
];

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const KEYS = [];
const KEY_TOP = 172, KEY_H = 46, KEY_GAP = 6;
(function buildKeys() {
  KEY_ROWS.forEach((row, ri) => {
    const kw = 42;
    const total = row.length * kw + (row.length - 1) * KEY_GAP;
    let x = (W - total) / 2;
    const y = KEY_TOP + ri * (KEY_H + KEY_GAP);
    for (const ch of row) { KEYS.push({ label: ch, val: ch, x, y, w: kw, h: KEY_H }); x += kw + KEY_GAP; }
  });
  const y = KEY_TOP + 3 * (KEY_H + KEY_GAP);
  KEYS.push({ label: '⌫ Hapus', val: 'back', x: 88, y, w: 164, h: KEY_H });
  KEYS.push({ label: 'Lewati ⏭', val: 'skip', x: 268, y, w: 124, h: KEY_H });
})();

const TOTAL_TIME = 60;

let answer, scrambled, typed, score, timeLeft, running, flashUntil, timer = 0;

function scramble(w) {
  const a = w.split('');
  for (let t = 0; t < 60; t++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.join('') !== w) return a;
  }
  return w.split('').reverse();
}

function pickWord() {
  answer = WORDS[(Math.random() * WORDS.length) | 0];
  scrambled = scramble(answer);
  typed = '';
}

function init() {
  clearInterval(timer);
  score = 0; timeLeft = TOTAL_TIME; running = true; flashUntil = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['scramble'] || 0;
  pickWord();
  timer = setInterval(() => {
    if (!running) return;
    timeLeft--;
    if (timeLeft <= 0) { timeLeft = 0; draw(); finish(); return; }
    draw();
  }, 1000);
  draw();
}

function check() {
  if (typed.toLowerCase() === answer) {
    score += 30 + answer.length * 2;
    timeLeft += 2;
    scoreEl.textContent = score;
    pickWord();
  } else {
    flashUntil = performance.now() + 400;
    typed = '';
  }
  draw();
}

function press(val) {
  if (!running) return;
  if (val === 'back') { typed = typed.slice(0, -1); draw(); return; }
  if (val === 'skip') { score = Math.max(0, score - 10); scoreEl.textContent = score; pickWord(); draw(); return; }
  if (typed.length < answer.length) {
    typed += val;
    if (typed.length === answer.length) check();
    else draw();
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

function drawCentered(text, cx, cy, font, color, gap) {
  ctx.font = font; ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = text.toUpperCase().split('');
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((c, i) => { ctx.fillText(c, x + widths[i] / 2, cy); x += widths[i] + gap; });
}

function draw() {
  ctx.fillStyle = '#0f1720';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1c2634';
  ctx.fillRect(40, 20, W - 80, 12);
  ctx.fillStyle = timeLeft <= 10 ? '#ef4444' : '#22d3ee';
  ctx.fillRect(40, 20, (W - 80) * Math.max(0, timeLeft) / TOTAL_TIME, 12);
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 14px ui-sans-serif,system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⏱ ' + timeLeft + 's', W / 2, 50);

  ctx.fillStyle = '#8b98a5';
  ctx.font = '13px ui-sans-serif,system-ui';
  ctx.fillText('Susun huruf jadi kata:', W / 2, 82);
  drawCentered(scrambled.join(''), W / 2, 116, 'bold 40px ui-sans-serif,system-ui', '#a855f7', 12);

  ctx.fillStyle = '#8b98a5';
  ctx.font = '13px ui-sans-serif,system-ui';
  ctx.fillText('Jawabanmu:', W / 2, 150);
  const wrong = performance.now() < flashUntil;
  const shown = typed + '_'.repeat(answer.length - typed.length);
  drawCentered(shown, W / 2, 148 + 0, 'bold 34px ui-sans-serif,system-ui', wrong ? '#ef4444' : '#22d3ee', 8);

  for (const k of KEYS) {
    roundRect(k.x, k.y, k.w, k.h, 8);
    ctx.fillStyle = (k.val === 'skip') ? '#3b2a1a' : (k.val === 'back' ? '#2a1c26' : '#1e293b');
    ctx.fill();
    ctx.strokeStyle = '#2f3d4d';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 16px ui-sans-serif,system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(k.label, k.x + k.w / 2, k.y + k.h / 2);
  }
}

function finish() {
  running = false;
  clearInterval(timer);
  const res = submitScore('scramble', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Waktu Habis!</h2>
    <p>Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  for (const k of KEYS) {
    if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) { press(k.val); return; }
  }
});

window.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'Backspace') { press('back'); e.preventDefault(); return; }
  const k = e.key.toUpperCase();
  if (k.length === 1 && k >= 'A' && k <= 'Z') { press(k); e.preventDefault(); }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
