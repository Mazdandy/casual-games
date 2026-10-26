import { listGames, getProgress, applyTheme } from './store.js';

applyTheme();
document.getElementById('year').textContent = new Date().getFullYear();

const p = getProgress();
const wrap = document.getElementById('games');
listGames().forEach(g => {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = `games/${g.id}/index.html`;
  card.innerHTML = `
    <span class="tag">${g.category}</span>
    <h2>${g.title}</h2>
    <p>${g.desc}</p>
    <span class="best">Best: ${p.bestScores[g.id] || 0}</span>
    <span class="play">Main ▸</span>`;
  wrap.appendChild(card);
});
