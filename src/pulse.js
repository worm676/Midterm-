// A soft ripple that spreads from wherever the empty page background is clicked.

const IGNORE = '.card, .site-header, .side-menu, .side-timers, button, a, input, select, label, textarea';

export function initPulse() {
  const layer = document.createElement('div');
  layer.className = 'pulse-layer';
  layer.setAttribute('aria-hidden', 'true');
  // First in the body so the header and cards paint above it.
  document.body.prepend(layer);

  // "click" (not pointerdown) so touch scrolling doesn't set it off.
  document.addEventListener('click', (e) => {
    if (e.target.closest(IGNORE)) return;
    const ring = document.createElement('span');
    ring.className = 'pulse';
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    ring.addEventListener('animationend', () => ring.remove());
    layer.append(ring);
  });
}
