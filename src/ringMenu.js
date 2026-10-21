import { KEYS, loadString, saveString } from './storage.js';
import { RINGS, playRing, unlockAudio } from './sound.js';

let current = RINGS[0].id;

export function getRing() {
  return current;
}

export function initRingMenu() {
  const tab = document.getElementById('ring-tab');
  const panel = document.getElementById('ring-panel');
  const select = document.getElementById('ring-select');
  const preview = document.getElementById('ring-preview');

  const saved = loadString(KEYS.ring, current);
  current = RINGS.some((r) => r.id === saved) ? saved : current;

  select.append(...RINGS.map((r) => new Option(r.name, r.id, false, r.id === current)));
  preview.disabled = current === 'off';

  function setOpen(open) {
    panel.hidden = !open;
    tab.setAttribute('aria-expanded', String(open));
    if (open) select.focus();
  }

  tab.addEventListener('click', () => {
    // Unlock audio on this tap: on iPhone, picking from the dropdown may not count as one.
    unlockAudio();
    setOpen(panel.hidden);
  });

  select.addEventListener('change', () => {
    current = select.value;
    saveString(KEYS.ring, current);
    preview.disabled = current === 'off';
    playRing(current);
  });

  preview.addEventListener('click', () => playRing(current));

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      tab.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('#ring-menu')) setOpen(false);
  });
}
