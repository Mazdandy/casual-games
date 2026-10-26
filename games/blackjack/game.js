import { submitScore, applyTheme, getProgress } from '../../assets/js/store.js';
applyTheme();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const roundEl = document.getElementById('roundNum');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const W = 480, H = 440;
canvas.width = W; canvas.height = H;

const BET = 10, MAX_ROUNDS = 10;
const CARD_W = 56, CARD_H = 80, CARD_GAP = 26;
const DEALER_Y = 36, PLAYER_Y = 262;
const BTN_HIT = { x: 60, y: 380, w: 160, h: 44 };
const BTN_STAND = { x: 260, y: 380, w: 160, h: 44 };
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

let deck, pHand, dHand, chips, round, phase, msg, revealDealer, running = false, score = 0, moveTimer = 0;

function init() {
  deck = shuffle(newDeck());
  pHand = []; dHand = [];
  chips = 100; round = 0; phase = 'idle'; msg = '';
  revealDealer = false; running = true; score = 0;
  clearTimeout(moveTimer);
  scoreEl.textContent = 100;
  roundEl.textContent = '0/' + MAX_ROUNDS;
  bestEl.textContent = getProgress().bestScores['blackjack'] || 0;
  newRound();
}

function newDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s });
  return d;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal() {
  if (deck.length < 15) deck = shuffle(newDeck());
  return deck.pop();
}

function handValue(hand) {
  let sum = 0, aces = 0;
  for (const c of hand) {
    if (c.r === 1) { aces++; sum += 11; }
    else if (c.r >= 11) sum += 10;
    else sum += c.r;
  }
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
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

function drawCard(card, x, y, faceDown) {
  roundRect(x, y, CARD_W, CARD_H, 8);
  ctx.fillStyle = faceDown ? '#1e3a8a' : '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = '#223040';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (faceDown) return;
  const red = card.s === 1 || card.s === 2;
  ctx.fillStyle = red ? '#ef4444' : '#0b0f14';
  ctx.font = 'bold 16px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(RANKS[card.r], x + 6, y + 5);
  ctx.font = '20px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText(SUITS[card.s], x + 6, y + 26);
}

function drawHand(hand, y, hideSecond) {
  const total = CARD_W + (hand.length - 1) * CARD_GAP;
  const startX = (W - total) / 2;
  for (let i = 0; i < hand.length; i++) {
    drawCard(hand[i], startX + i * CARD_GAP, y, hideSecond && i === 1);
  }
}

function drawButton(b, label, active) {
  roundRect(b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = active ? '#22d3ee' : '#16202b';
  ctx.fill();
  ctx.fillStyle = active ? '#04121a' : '#4b5563';
  ctx.font = 'bold 16px ui-sans-serif,system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

function draw() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px ui-sans-serif,system-ui,sans-serif';
  ctx.fillStyle = '#8b98a5';
  ctx.fillText('Komputer: ' + (revealDealer ? handValue(dHand) : '?'), 24, 24);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('Kamu: ' + handValue(pHand), 24, 250);

  drawHand(dHand, DEALER_Y, !revealDealer);
  drawHand(pHand, PLAYER_Y, false);

  if (msg) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px ui-sans-serif,system-ui,sans-serif';
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(msg, W / 2, 212);
  }

  const active = phase === 'player';
  drawButton(BTN_HIT, 'Kartu', active);
  drawButton(BTN_STAND, 'Stop', active);
}

function updateHud() {
  scoreEl.textContent = chips;
  roundEl.textContent = Math.min(round, MAX_ROUNDS) + '/' + MAX_ROUNDS;
}

function newRound() {
  if (!running) return;
  if (round >= MAX_ROUNDS || chips < BET) { finishGame(); return; }
  round++;
  chips -= BET;
  pHand = [deal(), deal()];
  dHand = [deal(), deal()];
  revealDealer = false;
  msg = 'Kartu atau Stop?';
  updateHud();

  if (handValue(pHand) === 21 || handValue(dHand) === 21) {
    phase = 'dealer';
    revealDealer = true;
    draw();
    moveTimer = setTimeout(settle, 700);
    return;
  }
  phase = 'player';
  draw();
}

function hit() {
  if (phase !== 'player') return;
  pHand.push(deal());
  draw();
  if (handValue(pHand) > 21) {
    phase = 'over';
    revealDealer = true;
    msg = 'Kamu melebihi 21 — kalah!';
    draw();
    moveTimer = setTimeout(newRound, 1500);
  }
}

function stand() {
  if (phase !== 'player') return;
  phase = 'dealer';
  revealDealer = true;
  draw();
  moveTimer = setTimeout(dealerStep, 350);
}

function dealerStep() {
  if (!running) return;
  if (handValue(dHand) < 17) {
    dHand.push(deal());
    draw();
    moveTimer = setTimeout(dealerStep, 450);
    return;
  }
  settle();
}

function settle() {
  if (!running) return;
  const pv = handValue(pHand), dv = handValue(dHand);
  const pBJ = pHand.length === 2 && pv === 21;
  const dBJ = dHand.length === 2 && dv === 21;
  let payout = 0;
  if (pBJ && dBJ) { payout = BET; msg = 'Dua-duanya Blackjack — seri!'; }
  else if (pBJ) { payout = BET * 2.5; msg = 'Blackjack! Bayar 2.5x 🎉'; }
  else if (dv > 21) { payout = BET * 2; msg = 'Dealer lebih dari 21 — kamu menang!'; }
  else if (pv > dv) { payout = BET * 2; msg = 'Kamu menang!'; }
  else if (pv === dv) { payout = BET; msg = 'Seri (push) — taruhan kembali.'; }
  else { msg = 'Dealer menang.'; }
  chips += payout;
  phase = 'over';
  updateHud();
  draw();
  moveTimer = setTimeout(newRound, 1500);
}

function finishGame() {
  running = false; phase = 'idle';
  clearTimeout(moveTimer);
  score = chips;
  scoreEl.textContent = score;
  const res = submitScore('blackjack', score);
  bestEl.textContent = res.best;
  overlay.innerHTML = `
    <h2>Selesai!</h2>
    <p>Chip akhir: <strong>${score}</strong>${res.isBest ? ' — Rekor baru! 🎉' : ''}</p>
    ${res.unlocked.length ? '<p class="unlock">Achievement baru! 🏆</p>' : ''}
    <button id="againBtn" class="btn">Main Lagi</button>`;
  overlay.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', start);
}

function inRect(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

canvas.addEventListener('click', e => {
  if (!running || phase !== 'player') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  if (inRect(x, y, BTN_HIT)) hit();
  else if (inRect(x, y, BTN_STAND)) stand();
});

function start() {
  init();
  overlay.classList.add('hidden');
}

startBtn.addEventListener('click', start);
init();
