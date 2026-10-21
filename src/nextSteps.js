import { KEYS, load, save } from './storage.js';

const DEFAULT_STEPS = [
  'Add due dates and priority tags to tasks',
  'Track completed sprints and a daily streak',
  'Export and import study data as a file',
];

function loadSteps() {
  const saved = load(KEYS.nextSteps, null);
  if (Array.isArray(saved) && saved.length === DEFAULT_STEPS.length) {
    return saved.map((s, i) => ({
      text: typeof s?.text === 'string' && s.text.trim() ? s.text.trim() : DEFAULT_STEPS[i],
      done: Boolean(s?.done),
    }));
  }
  // Carry over check marks from the old "improvement waves" checklist.
  const old = load(KEYS.waves, {}) ?? {};
  return DEFAULT_STEPS.map((text, i) => ({ text, done: Boolean(old[`wave-${[1, 2, 4][i]}`]) }));
}

export function initNextSteps() {
  const list = document.getElementById('steps-list');
  const summary = document.getElementById('steps-summary');
  const bar = document.getElementById('steps-bar');

  const steps = loadSteps();
  let editing = -1;

  function persist() {
    save(KEYS.nextSteps, steps);
  }

  function focusRow(i, selector) {
    list.children[i]?.querySelector(selector)?.focus();
  }

  function buildViewRow(step, i) {
    const li = document.createElement('li');
    li.className = 'step';

    const label = document.createElement('label');
    label.className = 'check-row step-main';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `step-${i + 1}`;
    box.checked = step.done;
    box.addEventListener('change', () => {
      step.done = box.checked;
      persist();
      updateSummary();
    });
    const text = document.createElement('span');
    text.textContent = step.text;
    label.append(box, text);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-small';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit next step ${i + 1}: ${step.text}`);
    editBtn.addEventListener('click', () => {
      editing = i;
      render();
      focusRow(i, 'input[type="text"]');
    });

    li.append(label, editBtn);
    return li;
  }

  function buildEditRow(step, i) {
    const li = document.createElement('li');
    li.className = 'step is-editing';
    const form = document.createElement('form');
    form.className = 'edit-form';

    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = `step-edit-${i}`;
    label.textContent = `Edit next step ${i + 1}`;
    const field = document.createElement('input');
    field.type = 'text';
    field.id = `step-edit-${i}`;
    field.maxLength = 120;
    field.required = true;
    field.value = step.text;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn-small btn-primary';
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-small';
    cancelBtn.textContent = 'Cancel';

    function close() {
      editing = -1;
      render();
      focusRow(i, '.btn');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = field.value.trim();
      if (!value) {
        field.focus();
        return;
      }
      step.text = value;
      persist();
      close();
    });
    cancelBtn.addEventListener('click', close);
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(saveBtn, cancelBtn);
    form.append(label, field, actions);
    li.append(form);
    return li;
  }

  function updateSummary() {
    const done = steps.filter((s) => s.done).length;
    summary.textContent = `${done} of ${steps.length} complete`;
    bar.style.width = `${(done / steps.length) * 100}%`;
  }

  function render() {
    list.replaceChildren(...steps.map((s, i) => (i === editing ? buildEditRow(s, i) : buildViewRow(s, i))));
    updateSummary();
  }

  render();
}
