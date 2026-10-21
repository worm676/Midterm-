import { KEYS, load, save } from './storage.js';

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t) => t && typeof t.title === 'string' && t.title.trim())
    .map((t) => ({ id: String(t.id ?? makeId()), title: t.title.trim(), done: Boolean(t.done) }));
}

export function initTasks() {
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
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
      persist();
      render();
      focusTask(task.id);
    });

    const text = document.createElement('span');
    text.className = 'task-title';
    text.textContent = task.title;

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
      task.title = value;
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

    editForm.append(label, field, actions);
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
    summary.textContent = tasks.length ? `${done} of ${tasks.length} done` : '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) {
      error.textContent = 'Please enter a task name.';
      input.focus();
      return;
    }
    error.textContent = '';
    tasks.push({ id: makeId(), title, done: false });
    persist();
    input.value = '';
    render();
    input.focus();
  });

  input.addEventListener('input', () => {
    error.textContent = '';
  });

  render();
}
