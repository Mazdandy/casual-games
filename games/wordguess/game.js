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

const ANSWERS = [
  'hijau', 'merah', 'putih', 'hitam', 'pintu', 'kunci', 'lampu', 'bunga', 'pohon', 'kolam',
  'jalan', 'pasar', 'hotel', 'dunia', 'besar', 'kecil', 'panas', 'ramai', 'sedih', 'kelas',
  'papan', 'tulis', 'cabai', 'garam', 'pesan', 'surat', 'hadir', 'murid', 'bakat', 'dasar',
  'cepat', 'rumah', 'pagar', 'sawah', 'kamar', 'indah', 'bagus', 'buruk', 'benar', 'salah',
  'suara', 'musik', 'angka', 'huruf', 'tanah', 'pasir', 'pulau', 'sinar', 'angin', 'hujan',
  'salju', 'badai', 'ombak', 'perak', 'harga', 'modal', 'kerja', 'semut', 'lebah', 'lalat',
  'tikus', 'bebek', 'panah', 'busur', 'kepal', 'kotak', 'sabuk', 'payung', 'dokar', 'bulan'
];

const COLS = 5, ROWS = 6, TILE = 46, TGAP = 5;
const BOARD_X = (W - (COLS * TILE + (COLS - 1) * TGAP)) / 2;
const BOARD_Y = 6;

const KEY_TOP = 324, KEY_H = 40, KEY_GAP = 6;
const KB = [];
(function buildKeyboard() {
  const row1 = 'QWERTYUIOP', row2 = 'ASDFGHJKL', row3 = 'ZXCVBNM';
  const kw1 = (W - 24 - 9 * 4) / 10;
  let tot1 = row1.length * kw1 + (row1.length - 1) * 4;
  let x = (W - tot1) / 2;
  let y = KEY_TOP;
  for (const ch of row1) { KB.push({ label: ch, val: ch, x, y, w: kw1, h: KEY_H }); x += kw1 + 4; }
  y += KEY_H + KEY_GAP;
  const tot2 = row2.length * kw1 + (row2.length - 1) * 4;
  x = (W - tot2) / 2;
  for (const ch of row2) { KB.push({ label: ch, val: ch, x, y, w: kw1, h: KEY_H }); x += kw1 + 4; }
  y += KEY_H + KEY_GAP;
  const kw3 = 42, wEnter = 56;
  const tot3 = wEnter + row3.length * kw3 + wEnter + 8 * 4;
  x = (W - tot3) / 2;
  KB.push({ label: 'Kirim', val: 'enter', x, y, w: wEnter, h: KEY_H }); x += wEnter + 4;
  for (const ch of row3) { KB.push({ label: ch, val: ch, x, y, w: kw3, h: KEY_H }); x += kw3 + 4; }
  KB.push({ label: '⌫', val: 'back', x, y, w: wEnter, h: KEY_H });
})();

const COLOR = { correct: '#22c55e', present: '#eab308', absent: '#475569', empty: '#1e293b' };

let answer, grid, states, keyStates, currentRow, currentCol, running, score, timer = 0;

function evaluate(guess, target) {
  const res = Array(COLS).fill('absent');
  const counts = {};
  for (const ch of target) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < COLS; i++) if (guess[i] === target[i]) { res[i] = 'correct'; counts[guess[i]]--; }
  for (let i = 0; i < COLS; i++) {
    if (res[i] === 'correct') continue;
    const ch = guess[i];
    if (counts[ch] > 0) { res[i] = 'present'; counts[ch]--; }
  }
  return res;
}

function init() {
  clearTimeout(timer);
  answer = ANSWERS[(Math.random() * ANSWERS.length) | 0].toUpperCase();
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  states = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  keyStates = {};
  currentRow = 0; currentCol = 0; running = true; score = 0;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['wordguess'] || 0;
  draw();
}

function typeLetter(ch) {
  if (!running || currentCol >= COLS) return;
  grid[currentRow][currentCol] = ch;
  currentCol++;
  draw();
}

function backspace() {
  if (!running || currentCol <= 0) return;
  currentCol--;
  grid[currentRow][currentCol] = '';
  draw();
}

function submit() {
  if (!running || currentCol < COLS) return;
  const guess = grid[currentRow].join('');
  const st = evaluate(guess, answer);
  states[currentRow] = st;
  st.forEach((s, i) => {
    const ch = guess[i];
    const cur = keyStates[ch];
    if (s === 'correct') keyStates[ch] = 'correct';
    else if (s === 'present' && cur !== 'correct') keyStates[ch] = 'present';
    else if (s === 'absent' && cur !== 'correct' && cur !== 'present') keyStates[ch] = 'absent';
  });
  currentRow++; currentCol = 0;
  draw();
  if (guess === answer) { score = 100; scoreEl.textContent = 100; settle('Kamu Menang! 🎉', 100); return; }
  if (currentRow >= ROWS) settle('Game Over', 0);
}

function settle(msg, sc) {
  clearTimeout(timer);
  timer = setTimeout(() => { if (!running) return; finish(msg, sc); }, 700);
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
  ctx.fillStyle = '#0f1720';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = BOARD_X + c * (TILE + TGAP);
      const y = BOARD_Y + r * (TILE + TGAP);
      roundRect(x, y, TILE, TILE, 6);
      ctx.fillStyle = states[r][c] ? COLOR[states[r][c]] : COLOR.empty;
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (grid[r][c]) {
        ctx.fillStyle = '#f5f7fa';
        ctx.font = 'bold 26px ui-sans-serif,system-ui';
        ctx.fillText(grid[r][c], x + TILE / 2, y + TILE / 2);
      }
    }
  }

  for (const k of KB) {
    roundRect(k.x, k.y, k.w, k.h, 7);
    const st = keyStates[k.label];
    ctx.fillStyle = st ? COLOR[st] : '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#f5f7fa';
    ctx.font = (k.val === 'enter' || k.val === 'back' ? 'bold 13px' : 'bold 16px') + ' ui-sans-serif,system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(k.label, k.x + k.w / 2, k.y + k.h / 2);
  }
}

function finish(msg, sc) {
  running = false;
  clearTimeout(timer);
  const res = submitScore('wordguess', sc);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>${msg}</h2>
    <p>Jawaban: <strong>${answer}</strong> · Skor: <strong>${sc}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
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
  for (const k of KB) {
    if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) {
      if (k.val === 'enter') submit();
      else if (k.val === 'back') backspace();
      else typeLetter(k.val);
      return;
    }
  }
});

window.addEventListener('keydown', e => {
  if (!running) return;
  if (e.key === 'Enter') { submit(); e.preventDefault(); return; }
  if (e.key === 'Backspace') { backspace(); e.preventDefault(); return; }
  const k = e.key.toUpperCase();
  if (k.length === 1 && k >= 'A' && k <= 'Z') { typeLetter(k); e.preventDefault(); }
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
