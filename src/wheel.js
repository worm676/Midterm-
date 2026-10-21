// An iPhone-style scroll wheel picker built on CSS scroll snapping.
// Works with touch swipes, mouse wheel / trackpad, clicks, and the keyboard.

const ITEM_HEIGHT = 44;

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
      if (el.clientHeight === 0) return;
      commit(clamp(Math.round(el.scrollTop / ITEM_HEIGHT)));
    }, 120);
  });

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
