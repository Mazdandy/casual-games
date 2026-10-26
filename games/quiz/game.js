import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const qnumEl = document.getElementById('qnum');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 480;
canvas.width = W; canvas.height = H;

const QUESTIONS = [
  { q: 'Ibu kota Indonesia adalah?', a: 'Jakarta', opts: ['Jakarta', 'Surabaya', 'Bandung', 'Medan'] },
  { q: 'Planet terdekat dengan Matahari?', a: 'Merkurius', opts: ['Merkurius', 'Venus', 'Bumi', 'Mars'] },
  { q: 'Hewan tercepat di darat?', a: 'Cheetah', opts: ['Cheetah', 'Kuda', 'Singa', 'Rusa'] },
  { q: 'Hasil dari 7 x 8 adalah?', a: '56', opts: ['56', '54', '48', '64'] },
  { q: 'Benua terbesar di dunia?', a: 'Asia', opts: ['Asia', 'Afrika', 'Amerika', 'Eropa'] },
  { q: 'Gunung tertinggi di dunia?', a: 'Everest', opts: ['Everest', 'Fuji', 'Kilimanjaro', 'Semeru'] },
  { q: 'Campuran biru dan kuning menghasilkan warna?', a: 'Hijau', opts: ['Hijau', 'Ungu', 'Oranye', 'Cokelat'] },
  { q: 'Mata uang Jepang adalah?', a: 'Yen', opts: ['Yen', 'Won', 'Yuan', 'Baht'] },
  { q: 'Jumlah pemain satu tim sepak bola di lapangan?', a: '11', opts: ['11', '9', '10', '12'] },
  { q: 'Ibu kota Prancis adalah?', a: 'Paris', opts: ['Paris', 'Lyon', 'Roma', 'Berlin'] }
];

const OPT_W = 432, OPT_H = 56, OPT_GAP = 12, OPT_X = (W - OPT_W) / 2, OPT_Y0 = 190;

let running = false, timer = 0;
let index, score, options, correctIndex, selected, revealed, question;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function init() {
  running = false;
  clearTimeout(timer);
  index = 0; score = 0; selected = -1; revealed = false;
  scoreEl.textContent = 0;
  bestEl.textContent = getProgress().bestScores['quiz'] || 0;
  loadQuestion();
  draw();
}

function loadQuestion() {
  question = QUESTIONS[index];
  options = shuffle(question.opts);
  correctIndex = options.indexOf(question.a);
  selected = -1; revealed = false;
  qnumEl.textContent = `${index + 1}/${QUESTIONS.length}`;
}

function pick(i) {
  if (!running || revealed) return;
  selected = i; revealed = true;
  if (i === correctIndex) { score += 10; scoreEl.textContent = score; }
  draw();
  timer = setTimeout(() => {
    if (!running) return;
    index++;
    if (index >= QUESTIONS.length) { finish(); return; }
    loadQuestion();
    draw();
  }, 850);
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

function drawWrapped(text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.fillStyle = '#e6edf3';
  ctx.font = '700 22px ui-sans-serif, system-ui, sans-serif';
  drawWrapped(question.q, W / 2, 52, 432, 30);

  for (let i = 0; i < options.length; i++) {
    const b = { x: OPT_X, y: OPT_Y0 + i * (OPT_H + OPT_GAP), w: OPT_W, h: OPT_H };
    let bg = '#1b242e', border = '#223040', text = '#e6edf3';
    if (revealed && i === correctIndex) { bg = '#14532d'; border = '#22c55e'; text = '#bbf7d0'; }
    else if (revealed && i === selected) { bg = '#7f1d1d'; border = '#ef4444'; text = '#fecaca'; }
    roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = '700 20px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${'ABCD'[i]}.  ${options[i]}`, W / 2, b.y + b.h / 2);
  }
}

function finish() {
  running = false;
  clearTimeout(timer);
  const res = submitScore('quiz', score);
  bestEl.textContent = res.best;
  const benar = score / 10;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Benar <strong>${benar}</strong>/${QUESTIONS.length} · Skor: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
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
  if (!running || revealed) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  for (let i = 0; i < options.length; i++) {
    const by = OPT_Y0 + i * (OPT_H + OPT_GAP);
    if (x >= OPT_X && x <= OPT_X + OPT_W && y >= by && y <= by + OPT_H) { pick(i); return; }
  }
});

document.addEventListener('keydown', e => {
  if (!running || revealed) return;
  const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 };
  if (e.code in map) { e.preventDefault(); pick(map[e.code]); }
});

startBtn.addEventListener('click', start);
init();
