import { KEYS, loadString, saveString } from './storage.js';

const CHOICES = ['light', 'dark', 'system'];
const media = window.matchMedia('(prefers-color-scheme: dark)');

function apply(choice) {
  const dark = choice === 'dark' || (choice === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function initTheme() {
  let choice = loadString(KEYS.theme, 'system');
  if (!CHOICES.includes(choice)) choice = 'system';

  const radios = document.querySelectorAll('input[name="theme"]');
  radios.forEach((radio) => {
    radio.checked = radio.value === choice;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      choice = radio.value;
      saveString(KEYS.theme, choice);
      apply(choice);
    });
  });

  // Follow the OS setting live while "System" is selected.
  media.addEventListener('change', () => {
    if (choice === 'system') apply(choice);
  });

  apply(choice);
}
