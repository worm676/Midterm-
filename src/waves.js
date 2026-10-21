import { KEYS, load, save } from './storage.js';

const WAVES = [
  { id: 'wave-1', title: 'Wave 1: Add due dates and priority tags to tasks' },
  { id: 'wave-2', title: 'Wave 2: Track completed sprints and a daily streak' },
  { id: 'wave-3', title: 'Wave 3: Play a sound or notification when the timer ends' },
  { id: 'wave-4', title: 'Wave 4: Export and import study data as a file' },
];

export function initWaves() {
  const list = document.getElementById('waves-list');
  const summary = document.getElementById('waves-summary');
  const bar = document.getElementById('waves-bar');

  const saved = load(KEYS.waves, {});
  const state = typeof saved === 'object' && saved !== null ? saved : {};

  function updateSummary() {
    const done = WAVES.filter((w) => state[w.id]).length;
    summary.textContent = `${done} of ${WAVES.length} complete`;
    bar.style.width = `${(done / WAVES.length) * 100}%`;
  }

  WAVES.forEach((wave) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'check-row';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = wave.id;
    box.checked = Boolean(state[wave.id]);
    box.addEventListener('change', () => {
      state[wave.id] = box.checked;
      save(KEYS.waves, state);
      updateSummary();
    });

    const text = document.createElement('span');
    text.textContent = wave.title;

    label.append(box, text);
    li.append(label);
    list.append(li);
  });

  updateSummary();
}
