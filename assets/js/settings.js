import { getSettings, saveSettings, resetProgress, applyTheme } from './store.js';

applyTheme();
const sound = document.getElementById('sound');
const theme = document.getElementById('theme');
const s = getSettings();
sound.checked = s.sound;
theme.value = s.theme;

sound.addEventListener('change', () => { const c = getSettings(); c.sound = sound.checked; saveSettings(c); });
theme.addEventListener('change', () => { const c = getSettings(); c.theme = theme.value; saveSettings(c); applyTheme(); });
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Hapus semua progress, skor, dan achievement?')) { resetProgress(); alert('Progress direset.'); }
});
