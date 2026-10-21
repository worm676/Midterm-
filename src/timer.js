import { createWheel } from './wheel.js';

const MAX_HOURS = 12;
const MINUTE_STEP = 5;
const DEFAULT_HOURS = 0;
const DEFAULT_MINUTES = 25;

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

export function initTimer() {
  const picker = document.getElementById('timer-picker');
  const running = document.getElementById('timer-running');
  const timeEl = document.getElementById('timer-time');
  const bar = document.getElementById('timer-bar');
  const status = document.getElementById('timer-status');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');

  let duration = 0;
  let remaining = 0;
  let endsAt = 0;
  let tick = null;
  // "idle" shows the wheels; any other state shows the countdown.
  let state = 'idle';

  const hours = createWheel(document.getElementById('wheel-hours'), {
    values: range(0, MAX_HOURS),
    format: String,
    describe: (n) => plural(n, 'hour'),
    initial: DEFAULT_HOURS,
    onChange: updateFromWheels,
  });
  const minutes = createWheel(document.getElementById('wheel-minutes'), {
    values: range(0, 60 - MINUTE_STEP, MINUTE_STEP),
    format: (n) => String(n).padStart(2, '0'),
    describe: (n) => plural(n, 'minute'),
    initial: DEFAULT_MINUTES,
    onChange: updateFromWheels,
  });

  function updateFromWheels() {
    duration = (hours.value * 60 + minutes.value) * 60 * 1000;
    remaining = duration;
    startBtn.disabled = duration === 0;
    status.textContent = duration === 0 ? 'Pick a length above 0 to start.' : 'Ready when you are.';
  }

  function render() {
    picker.hidden = state !== 'idle';
    running.hidden = state === 'idle';
    timeEl.textContent = format(remaining);
    bar.style.width = duration ? `${((duration - remaining) / duration) * 100}%` : '0';
    document.title = state === 'running' ? `${format(remaining)} · Study Sprint Planner` : 'Study Sprint Planner';
    startBtn.disabled = state === 'running' || duration === 0;
    pauseBtn.disabled = state !== 'running';
    startBtn.textContent = { idle: 'Start', paused: 'Resume', done: 'Start again' }[state] ?? 'Start';
  }

  function stopInterval() {
    clearInterval(tick);
    tick = null;
  }

  function start() {
    if (state === 'running' || duration === 0) return;
    if (remaining <= 0) remaining = duration;
    endsAt = Date.now() + remaining;
    state = 'running';
    tick = setInterval(() => {
      remaining = endsAt - Date.now();
      if (remaining <= 0) {
        remaining = 0;
        stopInterval();
        state = 'done';
        status.textContent = 'Sprint complete. Take a short break!';
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
    // Hidden scroll areas lose their position, so restore the wheels.
    hours.sync();
    minutes.sync();
  }

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);

  updateFromWheels();
  render();
  hours.sync();
  minutes.sync();
}
