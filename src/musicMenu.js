import { KEYS, loadString, saveString } from './storage.js';
import { STYLES, playMusic, stopMusic, isPlaying, setMusicVolume } from './music.js';

export function initMusicMenu() {
  const tab = document.getElementById('music-tab');
  const panel = document.getElementById('music-panel');
  const select = document.getElementById('music-select');
  const toggle = document.getElementById('music-toggle');
  const volume = document.getElementById('music-volume');
  const status = document.getElementById('music-status');

  const saved = loadString(KEYS.music, 'none');
  let choice = STYLES.some((s) => s.id === saved) ? saved : 'none';
  volume.value = loadString(KEYS.musicVolume, '50');

  select.append(
    ...STYLES.map((s) => new Option(s.name, s.id, false, s.id === choice)),
    new Option('No music', 'none', false, choice === 'none'),
  );

  function render() {
    const playing = isPlaying();
    toggle.disabled = choice === 'none';
    toggle.textContent = playing ? 'Pause' : 'Play';
    tab.classList.toggle('is-playing', playing);
    if (choice === 'none') status.textContent = 'Music is off.';
    else if (playing) status.textContent = `Now playing: ${STYLES.find((s) => s.id === choice).nowPlaying}`;
    else status.textContent = 'Press Play to start.';
  }

  function setOpen(open) {
    panel.hidden = !open;
    tab.setAttribute('aria-expanded', String(open));
    if (open) select.focus();
  }

  tab.addEventListener('click', () => setOpen(panel.hidden));

  select.addEventListener('change', () => {
    choice = select.value;
    saveString(KEYS.music, choice);
    if (choice === 'none') stopMusic();
    else playMusic(choice, Number(volume.value));
    render();
  });

  toggle.addEventListener('click', () => {
    if (isPlaying()) stopMusic();
    else playMusic(choice, Number(volume.value));
    render();
  });

  volume.addEventListener('input', () => {
    saveString(KEYS.musicVolume, volume.value);
    setMusicVolume(Number(volume.value));
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      tab.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('#music-menu')) setOpen(false);
  });

  render();
}
