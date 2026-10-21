import { KEYS, load, save } from './storage.js';

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MAX_MINUTES = 999;

// Optional time estimate: a whole number of minutes, or null when left blank.
function parseMinutes(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_MINUTES ? n : NaN;
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Compact stamp for the task row ("3:42 PM" today, "Mar 4, 3:42 PM" this year,
// "Mar 4, 2025" before that), plus the full wording for screen readers.
function formatCompleted(iso) {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (date.toDateString() === now.toDateString()) {
    return { short: time, full: `Completed today at ${time}` };
  }
  if (date.getFullYear() === now.getFullYear()) {
    return { short: `${day}, ${time}`, full: `Completed ${day} at ${time}` };
  }
  const year = date.getFullYear();
  return { short: `${day}, ${year}`, full: `Completed ${day}, ${year} at ${time}` };
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => t && typeof t.title === 'string' && t.title.trim())
    .map((t) => {
      const minutes = parseMinutes(t.minutes);
      return {
        id: String(t.id ?? makeId()),
        title: t.title.trim(),
        done: Boolean(t.done),
        minutes: Number.isNaN(minutes) ? null : minutes,
        completedAt: t.done ? validDate(t.completedAt) : null,
      };
    });
}

export function initTasks() {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const minutesInput = document.getElementById('task-minutes');
  const error = document.getElementById('task-error');
  const list = document.getElementById('task-list');
  const empty = document.getElementById('task-empty');
  const summary = document.getElementById('task-summary');

  let tasks = sanitize(load(KEYS.tasks, []));
  let editingId = null;

  function persist() {
    save(KEYS.tasks, tasks);
  }

  function focusTask(id, selector = '.task-check') {
    const el = list.querySelector(`[data-id="${CSS.escape(id)}"] ${selector}`);
    el?.focus();
  }

  function buildViewRow(task) {
    const li = document.createElement('li');
    li.className = `task${task.done ? ' is-done' : ''}`;
    li.dataset.id = task.id;

    const label = document.createElement('label');
    label.className = 'check-row task-main';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'task-check';
    box.checked = task.done;
    box.addEventListener('change', () => {
      task.done = box.checked;
      task.completedAt = box.checked ? new Date().toISOString() : null;
      persist();
      render();
      focusTask(task.id);
    });

    const text = document.createElement('span');
    text.className = 'task-text';
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    text.append(title);
    if (task.minutes) {
      const time = document.createElement('span');
      time.className = 'task-time';
      const hint = document.createElement('span');
      hint.className = 'visually-hidden';
      hint.textContent = 'Time needed: ';
      time.append(hint, formatMinutes(task.minutes));
      text.append(time);
    }

    label.append(box, text);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-small';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit "${task.title}"`);
    editBtn.addEventListener('click', () => {
      editingId = task.id;
      render();
      focusTask(task.id, '.edit-input');
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-small btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('aria-label', `Delete "${task.title}"`);
    delBtn.addEventListener('click', () => {
      const index = tasks.findIndex((t) => t.id === task.id);
      tasks.splice(index, 1);
      persist();
      render();
      // Keep keyboard focus somewhere sensible after the row disappears.
      const next = tasks[index] ?? tasks[index - 1];
      if (next) focusTask(next.id);
      else input.focus();
    });

    // Completion time sits just left of the Edit button.
    if (task.done && task.completedAt) {
      const { short, full } = formatCompleted(task.completedAt);
      const stamp = document.createElement('time');
      stamp.className = 'task-completed';
      stamp.dateTime = task.completedAt;
      stamp.title = full;
      const visible = document.createElement('span');
      visible.setAttribute('aria-hidden', 'true');
      visible.textContent = short;
      const spoken = document.createElement('span');
      spoken.className = 'visually-hidden';
      spoken.textContent = full;
      stamp.append(visible, spoken);
      actions.append(stamp);
    }
    actions.append(editBtn, delBtn);
    li.append(label, actions);
    return li;
  }

  function buildEditRow(task) {
    const li = document.createElement('li');
    li.className = 'task is-editing';
    li.dataset.id = task.id;

    const editForm = document.createElement('form');
    editForm.className = 'edit-form';

    const fieldId = `edit-${task.id}`;
    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = fieldId;
    label.textContent = 'Edit task title';

    const field = document.createElement('input');
    field.type = 'text';
    field.id = fieldId;
    field.className = 'edit-input';
    field.maxLength = 120;
    field.required = true;
    field.value = task.title;

    const minutesId = `edit-minutes-${task.id}`;
    const minutesLabel = document.createElement('label');
    minutesLabel.className = 'visually-hidden';
    minutesLabel.htmlFor = minutesId;
    minutesLabel.textContent = 'Time needed in minutes (optional)';

    const minutesField = document.createElement('input');
    minutesField.type = 'number';
    minutesField.id = minutesId;
    minutesField.className = 'edit-minutes';
    minutesField.inputMode = 'numeric';
    minutesField.min = '1';
    minutesField.max = String(MAX_MINUTES);
    minutesField.step = '1';
    minutesField.placeholder = 'min';
    minutesField.value = task.minutes ?? '';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn-small btn-primary';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-small';
    cancelBtn.textContent = 'Cancel';

    function close() {
      editingId = null;
      render();
      focusTask(task.id, '.btn');
    }

    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = field.value.trim();
      if (!value) {
        field.focus();
        return;
      }
      const minutes = parseMinutes(minutesField.value);
      if (Number.isNaN(minutes)) {
        minutesField.focus();
        return;
      }
      task.title = value;
      task.minutes = minutes;
      persist();
      close();
    });
    cancelBtn.addEventListener('click', close);
    [field, minutesField].forEach((el) =>
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      }),
    );

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(saveBtn, cancelBtn);

    editForm.append(label, field, minutesLabel, minutesField, actions);
    li.append(editForm);
    return li;
  }

  function render() {
    list.replaceChildren(
      ...tasks.map((task) => (task.id === editingId ? buildEditRow(task) : buildViewRow(task))),
    );
    const done = tasks.filter((t) => t.done).length;
    empty.hidden = tasks.length > 0;
    list.hidden = tasks.length === 0;
    const minutesLeft = tasks.reduce((sum, t) => sum + (t.done ? 0 : t.minutes ?? 0), 0);
    summary.textContent = tasks.length
      ? `${done} of ${tasks.length} done${minutesLeft ? ` · ${formatMinutes(minutesLeft)} left` : ''}`
      : '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) {
      error.textContent = 'Please enter a task name.';
      input.focus();
      return;
    }
    const minutes = parseMinutes(minutesInput.value);
    if (Number.isNaN(minutes)) {
      error.textContent = `Time needed must be a whole number of minutes from 1 to ${MAX_MINUTES}, or left blank.`;
      minutesInput.focus();
      return;
    }
    error.textContent = '';
    tasks.push({ id: makeId(), title, done: false, minutes, completedAt: null });
    persist();
    input.value = '';
    minutesInput.value = '';
    render();
    input.focus();
  });

  [input, minutesInput].forEach((el) =>
    el.addEventListener('input', () => {
      error.textContent = '';
    }),
  );

  render();
}
