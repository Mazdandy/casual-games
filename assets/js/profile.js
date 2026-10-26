import { getProgress, listGames, listAchievements, applyTheme } from './store.js';

applyTheme();
const p = getProgress();
document.getElementById('level').textContent = p.level;
document.getElementById('xp').textContent = p.xp;
document.getElementById('plays').textContent = Object.values(p.gamesPlayed).reduce((a, b) => a + b, 0);

const bests = document.getElementById('bests');
listGames().forEach(g => {
  const el = document.createElement('div');
  el.className = 'card static';
  el.innerHTML = `<h3>${g.title}</h3><p>Best: <strong>${p.bestScores[g.id] || 0}</strong></p><span class="best">Main ${p.gamesPlayed[g.id] || 0}×</span>`;
  bests.appendChild(el);
});

const have = new Set(p.achievements);
const ach = document.getElementById('ach');
listAchievements().forEach(a => {
  const done = have.has(a.id);
  const el = document.createElement('div');
  el.className = 'card static ' + (done ? 'unlocked' : 'locked');
  el.innerHTML = `<h3>${done ? '🏆' : '🔒'} ${a.title}</h3><p>${a.desc}</p>`;
  ach.appendChild(el);
});
