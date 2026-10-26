const KEYS = { settings: 'pixelarcade.settings', progress: 'pixelarcade.progress' };

const GAMES = [
  { id: 'snake',        title: 'Snake',              category: 'Arcade',     desc: 'Makan, tumbuh, jangan menabrak.' },
  { id: '2048',         title: '2048',               category: 'Puzzle',     desc: 'Gabungkan angka sampai 2048.' },
  { id: 'memory',       title: 'Memory Match',       category: 'Puzzle',     desc: 'Temukan semua pasangan kartu.' },
  { id: 'tetris',       title: 'Block Drop',         category: 'Puzzle',     desc: 'Susun blok jatuh, bersihkan baris.' },
  { id: 'flappy',       title: 'Flappy Dash',        category: 'Reflex',     desc: 'Tap untuk terbang, hindari pipa.' },
  { id: 'breakout',     title: 'Breakout',           category: 'Arcade',     desc: 'Hancurkan semua bata dengan bola.' },
  { id: 'pong',         title: 'Pong',               category: 'Arcade',     desc: 'Adu refleks lawan komputer, pertama ke 11.' },
  { id: 'invaders',     title: 'Space Invaders',     category: 'Arcade',     desc: 'Tembak semua alien sebelum turun.' },
  { id: 'tictactoe',    title: 'Tic Tac Toe',        category: 'Strategy',   desc: 'Kalahkan AI, X vs O.' },
  { id: 'connect4',     title: 'Connect Four',       category: 'Strategy',   desc: 'Sambungkan 4 bidak sebelum AI.' },
  { id: 'minesweeper',  title: 'Minesweeper',        category: 'Puzzle',     desc: 'Buka kotak aman tanpa kena bom.' },
  { id: 'simon',        title: 'Simon Says',         category: 'Memory',     desc: 'Hafalkan dan ikuti urutan warna.' },
  { id: 'whack',        title: 'Whack-a-Mole',       category: 'Reflex',     desc: 'Pukul tikus sebanyak mungkin dalam 30 detik.' },
  { id: 'dodge',        title: 'Dodge',              category: 'Reflex',     desc: 'Hindari blok jatuh selama mungkin.' },
  { id: 'reaction',     title: 'Reaction Test',      category: 'Reflex',     desc: 'Ukur kecepatan refleksmu.' },
  { id: 'asteroids',    title: 'Asteroids',          category: 'Arcade',     desc: 'Tembak asteroid sebelum menabrak pesawatmu.' },
  { id: 'centipede',    title: 'Centipede',          category: 'Arcade',     desc: 'Tembak kelabang sebelum menyentuhmu.' },
  { id: 'missile',      title: 'Missile Command',    category: 'Arcade',     desc: 'Hancurkan misil sebelum menghantam kota.' },
  { id: 'shooter',      title: 'Star Shooter',       category: 'Arcade',     desc: 'Shooter vertikal, bersihkan gelombang musuh.' },
  { id: 'frogger',      title: 'Frogger',            category: 'Arcade',     desc: 'Seberangi jalan tanpa tertabrak.' },
  { id: 'maze',         title: 'Maze Runner',        category: 'Arcade',     desc: 'Kumpulkan semua koin di labirin.' },
  { id: 'airhockey',    title: 'Air Hockey',         category: 'Arcade',     desc: 'Adu cepat di meja air hockey mini.' },
  { id: 'pinball',      title: 'Pinball',            category: 'Arcade',     desc: 'Jaga bola tetap di meja pinball.' },
  { id: 'putt',         title: 'Mini Putt',          category: 'Physics',    desc: 'Masukkan bola ke lubang dengan sedikit ayunan.' },
  { id: 'lander',       title: 'Lunar Lander',       category: 'Physics',    desc: 'Mendaratkan modul dengan lembut.' },
  { id: 'jump',         title: 'Platform Jumper',    category: 'Platformer', desc: 'Lompat antar platform, jangan jatuh.' },
  { id: 'runner',       title: 'Endless Runner',     category: 'Platformer', desc: 'Lompati rintangan tanpa henti.' },
  { id: 'doodle',       title: 'Doodle Climb',       category: 'Platformer', desc: 'Naik setinggi mungkin dari platform ke platform.' },
  { id: 'stack',        title: 'Tower Stack',        category: 'Reflex',     desc: 'Tumpuk balok setinggi mungkin.' },
  { id: 'pianotiles',   title: 'Piano Tiles',        category: 'Reflex',     desc: 'Tekan ubin hitam mengikuti irama.' },
  { id: 'aim',          title: 'Aim Trainer',        category: 'Reflex',     desc: 'Latih akurasi membidik target.' },
  { id: 'clicker',      title: 'Click Speed',        category: 'Reflex',     desc: 'Tes kecepatan klik dalam 10 detik.' },
  { id: 'schulte',      title: 'Schulte Table',      category: 'Reflex',     desc: 'Cari angka berurutan secepat mungkin.' },
  { id: 'helicopter',   title: 'Cave Flyer',         category: 'Reflex',     desc: 'Terbang lewat gua sempit.' },
  { id: 'rhythm',       title: 'Beat Drop',          category: 'Reflex',     desc: 'Ikuti nada yang jatuh tepat waktu.' },
  { id: 'sudoku',       title: 'Sudoku',             category: 'Puzzle',     desc: 'Isi kotak agar angka 1-9 unik.' },
  { id: 'lightsout',    title: 'Lights Out',         category: 'Puzzle',     desc: 'Matikan semua lampu dengan pola tekan.' },
  { id: 'slidepuzzle',  title: 'Sliding Puzzle',     category: 'Puzzle',     desc: 'Susun kembali ubin angka 1-15.' },
  { id: 'floodfill',    title: 'Flood It',           category: 'Puzzle',     desc: 'Banjiri seluruh papan dengan satu warna.' },
  { id: 'nonogram',     title: 'Nonogram',           category: 'Puzzle',     desc: 'Ungkap gambar tersembunyi dari petunjuk.' },
  { id: 'sokoban',      title: 'Sokoban',            category: 'Puzzle',     desc: 'Dorong semua kotak ke titik tujuan.' },
  { id: 'bubble',       title: 'Bubble Shooter',     category: 'Puzzle',     desc: 'Tembak gelembung, cocokkan 3 warna atau lebih.' },
  { id: 'match3',       title: 'Candy Match',        category: 'Puzzle',     desc: 'Tukar permen, cocokkan tiga sejenis.' },
  { id: 'peg',          title: 'Peg Solitaire',      category: 'Puzzle',     desc: 'Lompati pasak, sisakan sesedikit mungkin.' },
  { id: 'mathsprint',   title: 'Math Sprint',        category: 'Puzzle',     desc: 'Jawab soal matematika secepat mungkin.' },
  { id: 'pipes',        title: 'Pipe Puzzle',        category: 'Puzzle',     desc: 'Putar pipa agar air mengalir ke tujuan.' },
  { id: 'hangman',      title: 'Hangman',            category: 'Word',       desc: 'Tebak kata sebelum kesempatan habis.' },
  { id: 'wordsearch',   title: 'Word Search',        category: 'Word',       desc: 'Temukan kata tersembunyi di grid huruf.' },
  { id: 'scramble',     title: 'Word Scramble',      category: 'Word',       desc: 'Susun ulang huruf acak jadi kata benar.' },
  { id: 'wordguess',    title: 'Word Guess',         category: 'Word',       desc: 'Tebak kata 5 huruf dalam 6 percobaan.' },
  { id: 'nummemory',    title: 'Number Memory',      category: 'Memory',     desc: 'Ingat urutan angka, lalu ulangi.' },
  { id: 'gomoku',       title: 'Gomoku',             category: 'Strategy',   desc: 'Sambungkan lima batu berturut-turut.' },
  { id: 'othello',      title: 'Reversi',            category: 'Strategy',   desc: 'Balik bidak lawan dan kuasai papan.' },
  { id: 'nim',          title: 'Nim',                category: 'Strategy',   desc: 'Ambil batu terakhir untuk menang.' },
  { id: 'dotsandboxes', title: 'Dots and Boxes',     category: 'Strategy',   desc: 'Tutup kotak, kumpulkan poin terbanyak.' },
  { id: 'battleship',   title: 'Battleship',         category: 'Strategy',   desc: 'Tenggelamkan seluruh armada musuh.' },
  { id: 'mastermind',   title: 'Mastermind',         category: 'Strategy',   desc: 'Pecahkan kode empat warna rahasia.' },
  { id: 'checkers',     title: 'Checkers',           category: 'Strategy',   desc: 'Main dam melawan komputer.' },
  { id: 'snakeladder',  title: 'Ular Tangga',        category: 'Board',      desc: 'Balapan dadu ke kotak 100 lawan komputer.' },
  { id: 'blackjack',    title: 'Blackjack',          category: 'Card',       desc: 'Dekati angka 21 tanpa melewatinya.' },
  { id: 'rps',          title: 'Rock Paper Scissors', category: 'Casual',    desc: 'Batu gunting kertas melawan komputer.' },
  { id: 'plinko',       title: 'Plinko',             category: 'Casual',     desc: 'Jatuhkan bola dan kumpulkan poin.' },
  { id: 'dice',         title: 'Dice Roller',        category: 'Casual',     desc: 'Lempar lima dadu dan cetak skor terbaik.' },
  { id: 'higherlower',  title: 'Higher or Lower',    category: 'Casual',     desc: 'Tebak angka berikutnya lebih tinggi atau rendah.' },
  { id: 'quiz',         title: 'Quick Quiz',         category: 'Casual',     desc: 'Kuis pengetahuan umum cepat, 10 soal.' }
];

const ACHIEVEMENTS = [
  { id: 'first_play', title: 'Langkah Pertama', desc: 'Mainkan game pertamamu.' },
  { id: 'score_100',  title: 'Pemanasan',       desc: 'Cetak skor 100 di game apa pun.' },
  { id: 'score_1000', title: 'Kelas Berat',     desc: 'Cetak skor 1000 di game apa pun.' },
  { id: 'level_5',    title: 'Naik Kelas',      desc: 'Capai level 5.' }
];

const DEFAULT_SETTINGS = { sound: true, theme: 'dark' };
const DEFAULT_PROGRESS = { xp: 0, level: 1, gamesPlayed: {}, bestScores: {}, achievements: [], unlockedThemes: ['classic', 'neon'] };

function safeGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

export function getSettings() { return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.settings, {}) }; }
export function saveSettings(s) { safeSet(KEYS.settings, s); }
export function getProgress() { return { ...DEFAULT_PROGRESS, ...safeGet(KEYS.progress, {}) }; }
export function saveProgress(p) { safeSet(KEYS.progress, p); }
export function resetProgress() { safeSet(KEYS.progress, DEFAULT_PROGRESS); }
export function listGames() { return GAMES; }
export function listAchievements() { return ACHIEVEMENTS; }

export function applyTheme() {
  document.documentElement.setAttribute('data-theme', getSettings().theme);
}

function evaluate(p, score, totalPlays) {
  const have = new Set(p.achievements);
  const out = [];
  if (totalPlays >= 1 && !have.has('first_play')) out.push('first_play');
  if (score >= 100 && !have.has('score_100')) out.push('score_100');
  if (score >= 1000 && !have.has('score_1000')) out.push('score_1000');
  if (totalPlays >= 5 && !have.has('play_5')) out.push('play_5');
  if (p.level >= 5 && !have.has('level_5')) out.push('level_5');
  return out;
}

export function submitScore(gameId, score) {
  const p = getProgress();
  p.gamesPlayed[gameId] = (p.gamesPlayed[gameId] || 0) + 1;
  const prevBest = p.bestScores[gameId] || 0;
  const isBest = score > prevBest;
  if (isBest) p.bestScores[gameId] = score;
  const totalPlays = Object.values(p.gamesPlayed).reduce((a, b) => a + b, 0);
  p.xp += Math.round(score / 10) + 5;
  p.level = Math.floor(p.xp / 100) + 1;
  const unlocked = evaluate(p, score, totalPlays);
  p.achievements = Array.from(new Set([...p.achievements, ...unlocked]));
  saveProgress(p);
  return { isBest, best: p.bestScores[gameId], unlocked, level: p.level, xp: p.xp };
}
