// An iPhone-style scroll wheel picker built on CSS scroll snapping.
// Works with touch swipes, mouse wheel / trackpad, mouse dragging, clicks, and the keyboard.

const ITEM_HEIGHT = 44;
const DRAG_THRESHOLD = 4;
const MOMENTUM_MS = 120;
const MAX_MOMENTUM_ROWS = 5;

export function createWheel(el, { values, format, describe, initial, onChange }) {
  const list = document.createElement('ul');
  list.className = 'wheel-list';
  list.setAttribute('aria-hidden', 'true');

  const items = values.map((value, i) => {
    const li = document.createElement('li');
    li.className = 'wheel-item';
    li.textContent = format(value);
    li.addEventListener('click', () => setIndex(i, true));
    return li;
  });
  list.append(...items);
  el.append(list);

  el.setAttribute('aria-valuemin', String(values[0]));
  el.setAttribute('aria-valuemax', String(values[values.length - 1]));

  let index = Math.max(0, values.indexOf(initial));
  let settleTimer = null;
  let frame = null;
  let drag = null;

  function clamp(i) {
    return Math.min(values.length - 1, Math.max(0, i));
  }

  // Tilt and fade rows away from the centre, like the iOS drum.
  function paint() {
    frame = null;
    const offset = el.scrollTop / ITEM_HEIGHT;
    items.forEach((item, i) => {
      const d = Math.max(-3, Math.min(3, i - offset));
      item.style.transform = `rotateX(${d * -20}deg) scale(${1 - Math.abs(d) * 0.06})`;
      item.style.opacity = String(1 - Math.abs(d) * 0.28);
      item.classList.toggle('is-selected', Math.round(offset) === i);
    });
  }

  function requestPaint() {
    if (frame === null) frame = requestAnimationFrame(paint);
  }

  function commit(i) {
    if (i === index) return;
    index = i;
    updateAria();
    onChange(values[index]);
  }

  function updateAria() {
    el.setAttribute('aria-valuenow', String(values[index]));
    el.setAttribute('aria-valuetext', describe(values[index]));
  }

  function scrollToIndex(i, smooth) {
    el.scrollTo({ top: i * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'instant' });
  }

  function setIndex(i, smooth) {
    i = clamp(i);
    scrollToIndex(i, smooth);
    commit(i);
  }

  el.addEventListener('scroll', () => {
    requestPaint();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      // Hiding the wheel resets its scroll position; that is not a user choice.
      if (el.clientHeight === 0 || drag) return;
      commit(clamp(Math.round(el.scrollTop / ITEM_HEIGHT)));
    }, 120);
  });

  // Mouse dragging (touch already scrolls natively).
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { startY: e.clientY, startTop: el.scrollTop, moved: false, lastY: e.clientY, lastTime: e.timeStamp, velocity: 0 };
  });

  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    }
    const dt = e.timeStamp - drag.lastTime;
    if (dt > 0) drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastTime = e.timeStamp;
    el.scrollTop = drag.startTop - dy;
  });

  function endDrag(e) {
    if (!drag) return;
    const { moved, lastTime } = drag;
    // No momentum if the mouse had come to rest before release.
    const velocity = e.timeStamp - lastTime > 80 ? 0 : drag.velocity;
    drag = null;
    if (!moved) return;
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Carry a little momentum, then snap to the nearest value.
    const fling = Math.max(-MAX_MOMENTUM_ROWS, Math.min(MAX_MOMENTUM_ROWS, (-velocity * MOMENTUM_MS) / ITEM_HEIGHT));
    setIndex(Math.round(el.scrollTop / ITEM_HEIGHT + fling), true);
    // Swallow the click that follows a drag so it doesn't select the row under the cursor.
    el.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
  }

  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  el.addEventListener('keydown', (e) => {
    const steps = { ArrowUp: 1, ArrowDown: -1, PageUp: 3, PageDown: -3 };
    if (e.key in steps) setIndex(index + steps[e.key], true);
    else if (e.key === 'Home') setIndex(0, true);
    else if (e.key === 'End') setIndex(values.length - 1, true);
    else return;
    e.preventDefault();
  });

  updateAria();

  return {
    get value() {
      return values[index];
    },
    // Re-apply the scroll position, e.g. after the picker was hidden.
    sync() {
      scrollToIndex(index, false);
      paint();
    },
    setDisabled(disabled) {
      el.tabIndex = disabled ? -1 : 0;
      el.setAttribute('aria-disabled', String(disabled));
    },
  };
}
