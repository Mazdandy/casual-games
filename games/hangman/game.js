import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const wordIdxEl = document.getElementById('wordIdx');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const MAX_WRONG = 6;
const TOTAL_WORDS = 5;

const WORDS = [
  'KOMPUTER', 'SEPEDA', 'JAKARTA', 'KUCING', 'ANJING', 'MATAHARI', 'BULAN', 'BINTANG',
  'SEKOLAH', 'GURU', 'MEJA', 'KURSI', 'PINTU', 'JENDELA', 'BUKU', 'PENSIL', 'KERTAS',
  'GUNUNG', 'PANTAI', 'LAUT', 'SUNGAI', 'HUTAN', 'POHON', 'BUNGA', 'BURUNG', 'IKAN',
  'GAJAH', 'HARIMAU', 'MONYET', 'PISANG', 'MANGGA', 'JERUK', 'SEMANGKA', 'SEPATU',
  'BAJU', 'TOPI', 'RUMAH', 'PASAR', 'JALAN', 'MOBIL', 'KERETA', 'PESAWAT', 'KAPAL',
  'DOKTER', 'PETANI', 'POLISI', 'TELUR', 'NASI', 'ROTI', 'KOPI'
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROWS = [LETTERS.slice(0, 9), LETTERS.slice(9, 18), LETTERS.slice(18)];
const KEY_W = 44, KEY_H = 38, GAP_X = 8, GAP_Y = 8, KEY_Y0 = 312;

let words, wordIndex, word, guessed, wrong, score, running = false;

function init() {
  const pool = WORDS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  words = pool.slice(0, TOTAL_WORDS);
  wordIndex = 0;
  guessed = new Set();
  wrong = 0;
  score = 0;
  running = false;
  loadWord();
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['hangman'] || 0;
  livesEl.textContent = MAX_WRONG;
  wordIdxEl.textContent = `1/${TOTAL_WORDS}`;
  draw();
}

function loadWord() {
  word = words[wordIndex];
  guessed = new Set();
  wrong = 0;
  livesEl.textContent = MAX_WRONG;
  wordIdxEl.textContent = `${wordIndex + 1}/${TOTAL_WORDS}`;
}

function isComplete() {
  for (const ch of word) if (!guessed.has(ch)) return false;
  return true;
}

function guess(letter) {
  if (!running || guessed.has(letter)) return;
  guessed.add(letter);
  if (!word.includes(letter)) {
    wrong++;
    livesEl.textContent = MAX_WRONG - wrong;
    if (wrong >= MAX_WRONG) { draw(); finish(); return; }
  } else if (isComplete()) {
    score += word.length * 20 + (MAX_WRONG - wrong) * 10;
    scoreEl.textContent = score;
    wordIndex++;
    if (wordIndex >= TOTAL_WORDS) { draw(); finish(); return; }
    loadWord();
  }
  draw();
}

function keyRect(i, row, count) {
  const totalW = count * KEY_W + (count - 1) * GAP_X;
  const x0 = (W - totalW) / 2;
  const x = x0 + i * (KEY_W + GAP_X);
  const y = KEY_Y0 + row * (KEY_H + GAP_Y);
  return { x, y };
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

function drawGallows(n) {
  ctx.strokeStyle = '#8b98a5';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(60, 220); ctx.lineTo(200, 220);
  ctx.moveTo(90, 220); ctx.lineTo(90, 50);
  ctx.moveTo(90, 50); ctx.lineTo(190, 50);
  ctx.moveTo(190, 50); ctx.lineTo(190, 80);
  ctx.stroke();
  ctx.lineWidth = 3;
  if (n >= 1) { ctx.beginPath(); ctx.arc(190, 100, 20, 0, Math.PI * 2); ctx.stroke(); }
  if (n >= 2) { ctx.beginPath(); ctx.moveTo(190, 120); ctx.lineTo(190, 175); ctx.stroke(); }
  if (n >= 3) { ctx.beginPath(); ctx.moveTo(190, 135); ctx.lineTo(163, 158); ctx.stroke(); }
  if (n >= 4) { ctx.beginPath(); ctx.moveTo(190, 135); ctx.lineTo(217, 158); ctx.stroke(); }
  if (n >= 5) { ctx.beginPath(); ctx.moveTo(190, 175); ctx.lineTo(166, 210); ctx.stroke(); }
  if (n >= 6) { ctx.beginPath(); ctx.moveTo(190, 175); ctx.lineTo(214, 210); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  drawGallows(wrong);

  const bw = 34, bgap = 8;
  const totalW = word.length * bw + (word.length - 1) * bgap;
  const startX = (W - totalW) / 2;
  const cy = 262;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < word.length; i++) {
    const x = startX + i * (bw + bgap);
    const ch = word[i];
    const shown = guessed.has(ch);
    ctx.fillStyle = shown ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)';
    roundRect(x, cy - 22, bw, 44, 8); ctx.fill();
    if (shown) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 26px ui-sans-serif,system-ui';
      ctx.fillText(ch, x + bw / 2, cy + 1);
    } else {
      ctx.strokeStyle = '#8b98a5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, cy + 20); ctx.lineTo(x + bw - 8, cy + 20);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  for (let row = 0; row < ROWS.length; row++) {
    for (let i = 0; i < ROWS[row].length; i++) {
      const letter = ROWS[row][i];
      const { x, y } = keyRect(i, row, ROWS[row].length);
      const used = guessed.has(letter);
      const correct = used && word.includes(letter);
      let bg = '#131a22';
      if (correct) bg = '#155e63';
      else if (used) bg = '#3a2020';
      ctx.fillStyle = bg;
      roundRect(x, y, KEY_W, KEY_H, 8); ctx.fill();
      ctx.strokeStyle = '#223040'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = correct ? '#7fe9f5' : used ? '#8b6a6a' : '#e6edf3';
      ctx.font = 'bold 18px ui-sans-serif,system-ui';
      ctx.fillText(letter, x + KEY_W / 2, y + KEY_H / 2 + 1);
    }
  }
}

function finish() {
  running = false;
  const res = submitScore('hangman', score);
  bestEl.textContent = res.best;
  const won = wordIndex >= TOTAL_WORDS;
  overlay.innerHTML = `
    <h2>${won ? 'Semua Kata Berhasil! 🎉' : 'Game Over'}</h2>
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
  if (!running) return;
  const rc = canvas.getBoundingClientRect();
  const x = (e.clientX - rc.left) * (W / rc.width);
  const y = (e.clientY - rc.top) * (H / rc.height);
  for (let row = 0; row < ROWS.length; row++) {
    for (let i = 0; i < ROWS[row].length; i++) {
      const { x: kx, y: ky } = keyRect(i, row, ROWS[row].length);
      if (x >= kx && x <= kx + KEY_W && y >= ky && y <= ky + KEY_H) {
        guess(ROWS[row][i]);
        return;
      }
    }
  }
});

addEventListener('keydown', e => {
  if (!running) return;
  if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) guess(e.key.toUpperCase());
});

startBtn.addEventListener('click', start);
init();
