function format(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function initTimer() {
  const select = document.getElementById('timer-minutes');
  const timeEl = document.getElementById('timer-time');
  const bar = document.getElementById('timer-bar');
  const status = document.getElementById('timer-status');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');

  let duration = Number(select.value) * 60 * 1000;
  let remaining = duration;
  let endsAt = 0;
  let tick = null;

  function render() {
    timeEl.textContent = format(remaining);
    bar.style.width = `${((duration - remaining) / duration) * 100}%`;
    document.title = tick ? `${format(remaining)} · Study Sprint Planner` : 'Study Sprint Planner';
  }

  function setRunning(running) {
    startBtn.disabled = running;
    pauseBtn.disabled = !running;
    select.disabled = running;
  }

  function stopInterval() {
    clearInterval(tick);
    tick = null;
  }

  function start() {
    if (tick) return;
    if (remaining <= 0) remaining = duration;
    endsAt = Date.now() + remaining;
    tick = setInterval(() => {
      remaining = endsAt - Date.now();
      if (remaining <= 0) {
        remaining = 0;
        stopInterval();
        setRunning(false);
        startBtn.textContent = 'Start again';
        status.textContent = 'Sprint complete. Take a short break!';
        startBtn.focus();
      }
      render();
    }, 250);
    setRunning(true);
    status.textContent = 'Focus time. Timer running.';
    render();
    pauseBtn.focus();
  }

  function pause() {
    if (!tick) return;
    remaining = endsAt - Date.now();
    stopInterval();
    setRunning(false);
    startBtn.textContent = 'Resume';
    status.textContent = 'Paused.';
    render();
    startBtn.focus();
  }

  function reset() {
    stopInterval();
    remaining = duration;
    setRunning(false);
    startBtn.textContent = 'Start';
    status.textContent = 'Ready when you are.';
    render();
  }

  select.addEventListener('change', () => {
    duration = Number(select.value) * 60 * 1000;
    reset();
  });
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);

  render();
}
