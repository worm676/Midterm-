// "Study break art" carousel: swipe, scroll, arrow keys, or buttons to browse.
// Advances on its own every 90 seconds unless paused.

const ROTATE_MS = 90 * 1000;
const WHEEL_COOLDOWN_MS = 450;

const ARTWORK = [
  { file: 'florida-coast.svg', title: 'Florida Coast', alt: 'Palm trees silhouetted against a sunset over the ocean.' },
  { file: 'sunrise-peaks.svg', title: 'Sunrise Over the Peaks', alt: 'A sun rising behind layers of purple mountains.' },
  { file: 'misty-forest.svg', title: 'Misty Pine Forest', alt: 'Rows of pine trees fading into morning mist.' },
  { file: 'ocean-sunset.svg', title: 'Ocean Sunset', alt: 'The sun setting on the horizon, reflected on calm water.' },
  { file: 'aurora-lake.svg', title: 'Northern Lights', alt: 'Green and violet aurora over snowy mountains and a lake.' },
  { file: 'desert-dunes.svg', title: 'Desert Dunes', alt: 'Rolling sand dunes in warm golden light.' },
  { file: 'night-city.svg', title: 'City Lights', alt: 'A city skyline with lit windows under a full moon and stars.' },
];

export function initArt() {
  const track = document.getElementById('art-track');
  const caption = document.getElementById('art-caption');
  const counter = document.getElementById('art-counter');
  const prevBtn = document.getElementById('art-prev');
  const nextBtn = document.getElementById('art-next');
  const pauseBtn = document.getElementById('art-pause');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  track.append(
    ...ARTWORK.map((art, i) => {
      const fig = document.createElement('figure');
      fig.className = 'art-slide';
      fig.setAttribute('role', 'group');
      fig.setAttribute('aria-roledescription', 'slide');
      fig.setAttribute('aria-label', `${i + 1} of ${ARTWORK.length}: ${art.title}`);
      const img = document.createElement('img');
      img.src = `/art/${art.file}`;
      img.alt = art.alt;
      img.draggable = false;
      if (i > 0) img.loading = 'lazy';
      fig.append(img);
      return fig;
    }),
  );

  let index = 0;
  let paused = false;
  let rotateTimer = null;
  let settleTimer = null;
  let lastWheel = 0;

  function updateText() {
    caption.textContent = ARTWORK[index].title;
    counter.textContent = `${index + 1} of ${ARTWORK.length}`;
  }

  function scheduleRotate() {
    clearTimeout(rotateTimer);
    if (!paused) rotateTimer = setTimeout(() => goTo(index + 1, true), ROTATE_MS);
  }

  // Wraps around at both ends.
  function goTo(i, wrap = false) {
    const n = ARTWORK.length;
    index = wrap ? (i + n) % n : Math.min(n - 1, Math.max(0, i));
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
    updateText();
    scheduleRotate();
  }

  // Keep the index in sync when the user swipes or scrolls the track directly.
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== index) {
        index = i;
        updateText();
        scheduleRotate();
      }
    }, 120);
  });

  // A vertical mouse wheel over the art flips slides; at either end the page scrolls as normal.
  track.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad sideways scroll works natively
      const dir = Math.sign(e.deltaY);
      const atEdge = (dir < 0 && index === 0) || (dir > 0 && index === ARTWORK.length - 1);
      if (!dir || atEdge) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < WHEEL_COOLDOWN_MS) return;
      lastWheel = now;
      goTo(index + dir);
    },
    { passive: false },
  );

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(index + 1, true);
    else if (e.key === 'ArrowLeft') goTo(index - 1, true);
    else return;
    e.preventDefault();
  });

  prevBtn.addEventListener('click', () => goTo(index - 1, true));
  nextBtn.addEventListener('click', () => goTo(index + 1, true));
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-label', paused ? 'Resume automatic artwork changes' : 'Pause automatic artwork changes');
    scheduleRotate();
  });
  pauseBtn.setAttribute('aria-label', 'Pause automatic artwork changes');

  // Re-align to the current slide if the card is resized.
  window.addEventListener('resize', () => {
    track.scrollTo({ left: index * track.clientWidth, behavior: 'instant' });
  });

  updateText();
  scheduleRotate();
}
