import { createWheel } from './wheel.js';
import { playRing, unlockAudio } from './sound.js';
import { getRing } from './ringMenu.js';
import { KEYS, load, save } from './storage.js';

const MAX_HOURS = 12;
const MINUTE_STEP = 1;
const DEFAULT_HOURS = 0;
const DEFAULT_MINUTES = 25;
const APP_TITLE = 'Study Sprint Planner';

let nextId = 0;

function range(start, end, step = 1) {
  const out = [];
  for (let n = start; n <= end; n += step) out.push(n);
  return out;
}

function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

// Builds one timer: name, hour/minute wheels, countdown, and controls.
function createTimer(config, { onChange, onRemove, onTick }) {
  const id = nextId++;
  const el = document.createElement('section');
  el.className = 'timer';
  el.innerHTML = `
    <div class="timer-top">
      <label class="visually-hidden" for="timer-name-${id}">Timer name</label>
      <input type="text" id="timer-name-${id}" class="timer-name" maxlength="40" />
      <button type="button" class="btn btn-small timer-remove">Remove</button>
    </div>
    <div class="timer-picker" role="group" aria-label="Timer length">
      <div class="wheels">
        <div class="picker-band" aria-hidden="true"></div>
        <div class="wheel-group">
          <div class="wheel" tabindex="0" role="spinbutton" aria-label="Hours"></div>
          <span class="wheel-unit" aria-hidden="true">hours</span>
        </div>
        <div class="wheel-group">
          <div class="wheel" tabindex="0" role="spinbutton" aria-label="Minutes"></div>
          <span class="wheel-unit" aria-hidden="true">min</span>
        </div>
      </div>
    </div>
    <div class="timer-running" hidden>
      <div class="timer-display" role="timer"><span class="timer-time"></span></div>
      <div class="progress" aria-hidden="true"><span class="timer-bar"></span></div>
    </div>
    <p class="timer-status muted center" aria-live="polite"></p>
    <div class="timer-controls">
      <button type="button" class="btn btn-primary timer-start">Start</button>
      <button type="button" class="btn timer-pause" disabled>Pause</button>
      <button type="button" class="btn timer-reset">Reset</button>
    </div>`;

  const $ = (selector) => el.querySelector(selector);
  const nameInput = $('.timer-name');
  const removeBtn = $('.timer-remove');
  const picker = $('.timer-picker');
  const running = $('.timer-running');
  const display = $('.timer-display');
  const timeEl = $('.timer-time');
  const bar = $('.timer-bar');
  const status = $('.timer-status');
  const startBtn = $('.timer-start');
  const pauseBtn = $('.timer-pause');
  const resetBtn = $('.timer-reset');
  const [hoursEl, minutesEl] = el.querySelectorAll('.wheel');

  let duration = 0;
  let remaining = 0;
  let endsAt = 0;
  let tick = null;
  // "idle" shows the wheels; any other state shows the countdown.
  let state = 'idle';

  nameInput.value = config.name;

  const hours = createWheel(hoursEl, {
    values: range(0, MAX_HOURS),
    format: String,
    describe: (n) => plural(n, 'hour'),
    initial: config.hours,
    onChange: wheelsChanged,
  });
  const minutes = createWheel(minutesEl, {
    values: range(0, 60 - MINUTE_STEP, MINUTE_STEP),
    format: (n) => String(n).padStart(2, '0'),
    describe: (n) => plural(n, 'minute'),
    initial: config.minutes,
    onChange: wheelsChanged,
  });

  function name() {
    return nameInput.value.trim() || 'Timer';
  }

  function updateLabels() {
    el.setAttribute('aria-label', name());
    display.setAttribute('aria-label', `${name()} time left`);
    removeBtn.setAttribute('aria-label', `Remove ${name()}`);
  }

  function updateFromWheels() {
    duration = (hours.value * 60 + minutes.value) * 60 * 1000;
    remaining = duration;
    status.textContent = duration === 0 ? 'Pick a length above 0 to start.' : 'Ready when you are.';
  }

  function wheelsChanged() {
    updateFromWheels();
    render();
    onChange();
  }

  function render() {
    picker.hidden = state !== 'idle';
    running.hidden = state === 'idle';
    timeEl.textContent = format(remaining);
    bar.style.width = duration ? `${((duration - remaining) / duration) * 100}%` : '0';
    startBtn.disabled = state === 'running' || duration === 0;
    pauseBtn.disabled = state !== 'running';
    startBtn.textContent = { idle: 'Start', paused: 'Resume', done: 'Start again' }[state] ?? 'Start';
    onTick();
  }

  function stopInterval() {
    clearInterval(tick);
    tick = null;
  }

  function start() {
    if (state === 'running' || duration === 0) return;
    if (remaining <= 0) remaining = duration;
    unlockAudio();
    endsAt = Date.now() + remaining;
    state = 'running';
    tick = setInterval(() => {
      remaining = endsAt - Date.now();
      if (remaining <= 0) {
        remaining = 0;
        stopInterval();
        state = 'done';
        status.textContent = `${name()} complete. Take a short break!`;
        playRing(getRing());
        render();
        startBtn.focus();
        return;
      }
      render();
    }, 250);
    status.textContent = 'Focus time. Timer running.';
    render();
    pauseBtn.focus();
  }

  function pause() {
    if (state !== 'running') return;
    remaining = endsAt - Date.now();
    stopInterval();
    state = 'paused';
    status.textContent = 'Paused.';
    render();
    startBtn.focus();
  }

  function reset() {
    stopInterval();
    state = 'idle';
    updateFromWheels();
    render();
    sync();
  }

  // Hidden or newly added scroll areas need their wheel positions restored.
  function sync() {
    hours.sync();
    minutes.sync();
  }

  nameInput.addEventListener('input', () => {
    updateLabels();
    onChange();
  });
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);
  removeBtn.addEventListener('click', () => onRemove(api));

  updateLabels();
  updateFromWheels();

  const api = {
    el,
    sync,
    render,
    focusName: () => nameInput.focus(),
    setRemovable: (removable) => {
      removeBtn.hidden = !removable;
    },
    config: () => ({ name: nameInput.value, hours: hours.value, minutes: minutes.value }),
    runningRemaining: () => (state === 'running' ? remaining : null),
    destroy: () => {
      stopInterval();
      el.remove();
    },
  };
  return api;
}

export function initTimers() {
  const list = document.getElementById('timer-list');
  const addBtn = document.getElementById('timer-add');
  const timers = [];

  function persist() {
    save(KEYS.timers, timers.map((t) => t.config()));
  }

  // Show the soonest-finishing running timer in the browser tab title.
  function updateTitle() {
    const left = timers.map((t) => t.runningRemaining()).filter((ms) => ms !== null);
    document.title = left.length ? `${format(Math.min(...left))} · ${APP_TITLE}` : APP_TITLE;
  }

  function updateRemovable() {
    timers.forEach((t) => t.setRemovable(timers.length > 1));
  }

  function remove(timer) {
    const index = timers.indexOf(timer);
    timer.destroy();
    timers.splice(index, 1);
    updateRemovable();
    updateTitle();
    persist();
    addBtn.focus();
  }

  function add(config) {
    const timer = createTimer(config, { onChange: persist, onRemove: remove, onTick: updateTitle });
    timers.push(timer);
    list.append(timer.el);
    timer.render();
    timer.sync();
    updateRemovable();
    return timer;
  }

  const saved = load(KEYS.timers, null);
  const configs = Array.isArray(saved) && saved.length ? saved : [{ name: 'Timer 1' }];
  configs.forEach((c, i) =>
    add({
      name: typeof c?.name === 'string' ? c.name : `Timer ${i + 1}`,
      hours: clampInt(c?.hours, 0, MAX_HOURS, DEFAULT_HOURS),
      minutes: clampInt(c?.minutes, 0, 59, DEFAULT_MINUTES),
    }),
  );

  addBtn.addEventListener('click', () => {
    const timer = add({ name: `Timer ${timers.length + 1}`, hours: DEFAULT_HOURS, minutes: DEFAULT_MINUTES });
    persist();
    timer.focusName();
    timer.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
