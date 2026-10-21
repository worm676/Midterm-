import { createWheel } from './wheel.js';
import { RINGS, playRing, unlockAudio } from './sound.js';
import { getRing } from './ringMenu.js';
import { KEYS, load, save } from './storage.js';

const MAX_HOURS = 12;
const MINUTE_STEP = 1;
const DEFAULT_HOURS = 0;
const DEFAULT_MINUTES = 25;
const APP_TITLE = 'Study Sprint Planner';
const MAX_SIDE_TIMERS = 4;

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

// Countdown state machine shared by regular and side timers.
// States: "idle" (not started), "running", "paused", "done".
function createCountdown({ onTick, onDone, ring = getRing }) {
  let duration = 0;
  let remaining = 0;
  let endsAt = 0;
  let tick = null;
  let state = 'idle';

  function stop() {
    clearInterval(tick);
    tick = null;
  }

  return {
    get state() {
      return state;
    },
    get remaining() {
      return remaining;
    },
    get duration() {
      return duration;
    },
    setDuration(ms) {
      stop();
      duration = ms;
      remaining = ms;
      state = 'idle';
    },
    start() {
      if (state === 'running' || duration === 0) return false;
      if (remaining <= 0) remaining = duration;
      unlockAudio();
      endsAt = Date.now() + remaining;
      state = 'running';
      tick = setInterval(() => {
        remaining = endsAt - Date.now();
        if (remaining <= 0) {
          remaining = 0;
          stop();
          state = 'done';
          playRing(ring());
          onDone();
        }
        onTick();
      }, 250);
      onTick();
      return true;
    },
    pause() {
      if (state !== 'running') return;
      remaining = endsAt - Date.now();
      stop();
      state = 'paused';
      onTick();
    },
    reset() {
      stop();
      remaining = duration;
      state = 'idle';
      onTick();
    },
    destroy: stop,
  };
}

// Builds one timer: name, hour/minute wheels, countdown, and controls.
function createTimer(config, { onChange, onRemove, onTick, onSide }) {
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
    </div>
    <button type="button" class="btn timer-side">Side timer</button>`;

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
  const sideBtn = $('.timer-side');
  const [hoursEl, minutesEl] = el.querySelectorAll('.wheel');

  let sideFull = false;
  const countdown = createCountdown({
    onTick: render,
    onDone: () => {
      status.textContent = `${name()} complete. Take a short break!`;
      render();
      startBtn.focus();
    },
  });

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
    sideBtn.setAttribute('aria-label', `Start ${name()} as a side timer`);
  }

  function updateFromWheels() {
    countdown.setDuration((hours.value * 60 + minutes.value) * 60 * 1000);
    status.textContent = countdown.duration === 0 ? 'Pick a length above 0 to start.' : 'Ready when you are.';
  }

  function wheelsChanged() {
    updateFromWheels();
    render();
    onChange();
  }

  function render() {
    const { state, remaining, duration } = countdown;
    picker.hidden = state !== 'idle';
    running.hidden = state === 'idle';
    timeEl.textContent = format(remaining);
    bar.style.width = duration ? `${((duration - remaining) / duration) * 100}%` : '0';
    startBtn.disabled = state === 'running' || duration === 0;
    pauseBtn.disabled = state !== 'running';
    startBtn.textContent = { idle: 'Start', paused: 'Resume', done: 'Start again' }[state] ?? 'Start';
    // Side timers are launched from a timer that is set but not started.
    sideBtn.hidden = state !== 'idle';
    sideBtn.disabled = sideFull || duration === 0;
    sideBtn.textContent = sideFull ? `Side timers full (${MAX_SIDE_TIMERS} max)` : 'Side timer';
    onTick();
  }

  function start() {
    if (!countdown.start()) return;
    status.textContent = 'Focus time. Timer running.';
    pauseBtn.focus();
  }

  function pause() {
    countdown.pause();
    status.textContent = 'Paused.';
    startBtn.focus();
  }

  function reset() {
    countdown.reset();
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
  sideBtn.addEventListener('click', () => onSide({ name: name(), duration: countdown.duration }));

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
    setSideFull: (full) => {
      sideFull = full;
      render();
    },
    config: () => ({ name: nameInput.value, hours: hours.value, minutes: minutes.value }),
    runningRemaining: () => (countdown.state === 'running' ? countdown.remaining : null),
    destroy: () => {
      countdown.destroy();
      el.remove();
    },
  };
  return api;
}

// A compact timer in the dock on the right. Tap it to pause, reset, or remove.
function createSideTimer({ name, duration }, { onRemove, onTick }) {
  const id = nextId++;
  const el = document.createElement('div');
  el.className = 'side-timer';
  el.innerHTML = `
    <div class="side-timer-top">
      <button type="button" class="side-timer-chip" aria-expanded="false" aria-controls="side-timer-${id}">
        <span class="side-timer-name"></span>
        <span class="side-timer-time"></span>
      </button>
      <button type="button" class="side-timer-bell" aria-expanded="false" aria-controls="side-timer-ring-${id}">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.5A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.5L18 12.6V9a6 6 0 0 0-6-6Zm-2.5 15a2.5 2.5 0 0 0 5 0Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
    <span class="side-timer-bar" aria-hidden="true"><span></span></span>
    <div class="side-timer-ring" id="side-timer-ring-${id}" hidden>
      <label for="side-timer-ring-select-${id}">Ring for this timer</label>
      <select id="side-timer-ring-select-${id}"></select>
    </div>
    <div class="side-timer-actions" id="side-timer-${id}" hidden>
      <button type="button" class="btn btn-small side-timer-pause">Pause</button>
      <button type="button" class="btn btn-small side-timer-reset">Reset</button>
      <button type="button" class="btn btn-small side-timer-remove">✕</button>
    </div>`;

  const $ = (selector) => el.querySelector(selector);
  const chip = $('.side-timer-chip');
  const timeEl = $('.side-timer-time');
  const bar = $('.side-timer-bar span');
  const actions = $('.side-timer-actions');
  const pauseBtn = $('.side-timer-pause');
  const resetBtn = $('.side-timer-reset');
  const removeBtn = $('.side-timer-remove');
  const bell = $('.side-timer-bell');
  const ringPanel = $('.side-timer-ring');
  const ringSelect = $('.side-timer-ring select');

  // Empty means "use the ring chosen in the Ring tab".
  let ringId = '';

  $('.side-timer-name').textContent = name;
  removeBtn.setAttribute('aria-label', `Remove side timer ${name}`);
  bell.setAttribute('aria-label', `Change ring for ${name}`);
  ringSelect.append(new Option('Same as Ring tab', ''), ...RINGS.map((r) => new Option(r.name, r.id)));

  const countdown = createCountdown({
    ring: () => ringId || getRing(),
    onTick: render,
    onDone: () => setOpen(true),
  });
  countdown.setDuration(duration);

  function render() {
    const { state, remaining } = countdown;
    const done = state === 'done';
    timeEl.textContent = done ? 'Done' : format(remaining);
    bar.style.width = `${((duration - remaining) / duration) * 100}%`;
    el.classList.toggle('is-done', done);
    el.classList.toggle('is-paused', state === 'paused' || state === 'idle');
    pauseBtn.textContent = state === 'running' ? 'Pause' : state === 'paused' ? 'Resume' : 'Start';
    const label = { running: 'running', paused: 'paused', idle: 'ready', done: 'done' }[state];
    chip.setAttribute('aria-label', `Side timer ${name}, ${done ? 'finished' : `${format(remaining)} left`}, ${label}`);
    onTick();
  }

  function setOpen(open) {
    actions.hidden = !open;
    chip.setAttribute('aria-expanded', String(open));
  }

  chip.addEventListener('click', () => setOpen(actions.hidden));
  bell.addEventListener('click', () => {
    const open = ringPanel.hidden;
    ringPanel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
    if (open) ringSelect.focus();
  });
  ringSelect.addEventListener('change', () => {
    ringId = ringSelect.value;
    bell.classList.toggle('is-custom', ringId !== '');
    playRing(ringId || getRing());
  });
  ringSelect.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ringPanel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
    bell.focus();
  });
  pauseBtn.addEventListener('click', () => {
    if (countdown.state === 'running') countdown.pause();
    else countdown.start();
  });
  resetBtn.addEventListener('click', () => countdown.reset());
  removeBtn.addEventListener('click', () => onRemove(api));

  render();

  const api = {
    el,
    start: () => countdown.start(),
    runningRemaining: () => (countdown.state === 'running' ? countdown.remaining : null),
    destroy: () => {
      countdown.destroy();
      el.remove();
    },
  };
  return api;
}

export function initTimers() {
  const list = document.getElementById('timer-list');
  const addBtn = document.getElementById('timer-add');
  const dock = document.getElementById('side-timers');
  const timers = [];
  const sideTimers = [];

  function persist() {
    save(KEYS.timers, timers.map((t) => t.config()));
  }

  // Show the soonest-finishing running timer in the browser tab title.
  function updateTitle() {
    const left = [...timers, ...sideTimers].map((t) => t.runningRemaining()).filter((ms) => ms !== null);
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

  function updateSideFull() {
    const full = sideTimers.length >= MAX_SIDE_TIMERS;
    timers.forEach((t) => t.setSideFull(full));
    document.body.classList.toggle('has-side-timers', sideTimers.length > 0);
  }

  function removeSide(side) {
    side.destroy();
    sideTimers.splice(sideTimers.indexOf(side), 1);
    updateSideFull();
    updateTitle();
    (dock.querySelector('.side-timer-chip') ?? addBtn).focus();
  }

  function addSide(config) {
    if (sideTimers.length >= MAX_SIDE_TIMERS || !config.duration) return;
    const side = createSideTimer(config, { onRemove: removeSide, onTick: updateTitle });
    sideTimers.push(side);
    dock.append(side.el);
    side.start();
    updateSideFull();
  }

  function add(config) {
    const timer = createTimer(config, { onChange: persist, onRemove: remove, onTick: updateTitle, onSide: addSide });
    timers.push(timer);
    list.append(timer.el);
    timer.setSideFull(sideTimers.length >= MAX_SIDE_TIMERS);
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
