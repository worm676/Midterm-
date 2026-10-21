// Stoody, the study buddy owl who hangs from the red line under the header.
// Press Stoody and one of three things happens: a flip onto (or back under)
// the line, a quick flight away and back, or a little nap with snoring.
// Rarely, Stoody's head spins all the way around instead.

const FLY_AWAY_MS = 1400;
const AWAY_MS = 4000;
const FLIP_MS = 900;
const SNORE_MS = 5000;
const HEAD_SPIN_MS = 1400;
// Spots along the line (percent of the header width) Stoody can land on.
const SPOTS = [14, 28, 42, 56, 70, 84];

const OWL_SVG = `
<svg viewBox="0 0 64 84" width="48" height="63" aria-hidden="true" focusable="false">
  <g class="owl-wings-up">
    <path d="M15 46 C10 30 9 14 12 3 L18 4 C17 16 19 30 22 42 Z" fill="#6e4529"/>
    <path d="M49 46 C54 30 55 14 52 3 L46 4 C47 16 45 30 42 42 Z" fill="#6e4529"/>
    <path d="M10 4 q2 -4 4 0 q2 -4 4 0" fill="none" stroke="#3b2414" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M46 4 q2 -4 4 0 q2 -4 4 0" fill="none" stroke="#3b2414" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <g class="owl-wings-down">
    <path class="owl-wing-left" d="M14 40 C6 50 8 64 16 71 C15 60 15 50 19 42 Z" fill="#6e4529"/>
    <path class="owl-wing-right" d="M50 40 C58 50 56 64 48 71 C49 60 49 50 45 42 Z" fill="#6e4529"/>
  </g>
  <ellipse cx="32" cy="51" rx="20" ry="26" fill="#8b5e3c"/>
  <ellipse cx="32" cy="58" rx="12" ry="15" fill="#ecd4ad"/>
  <path d="M27 52 l2 2 l2 -2 M33 52 l2 2 l2 -2 M30 58 l2 2 l2 -2 M27 64 l2 2 l2 -2 M33 64 l2 2 l2 -2"
    fill="none" stroke="#c9a77a" stroke-width="1.2" stroke-linecap="round"/>
  <g class="owl-head">
    <path d="M15 22 L13 9 L23 17 Z M49 22 L51 9 L41 17 Z" fill="#8b5e3c"/>
    <ellipse cx="32" cy="32" rx="19" ry="16" fill="#8b5e3c"/>
    <g class="owl-eyes-open">
      <circle cx="25" cy="32" r="6.5" fill="#fff"/>
      <circle cx="39" cy="32" r="6.5" fill="#fff"/>
      <circle cx="25.8" cy="32.6" r="3.2" fill="#1b1d29"/>
      <circle cx="38.2" cy="32.6" r="3.2" fill="#1b1d29"/>
      <circle cx="26.8" cy="31.4" r="1" fill="#fff"/>
      <circle cx="39.2" cy="31.4" r="1" fill="#fff"/>
    </g>
    <g class="owl-eyes-closed">
      <circle cx="25" cy="32" r="6.5" fill="#a87650"/>
      <circle cx="39" cy="32" r="6.5" fill="#a87650"/>
      <path d="M20.5 32.5 q4.5 3 9 0 M34.5 32.5 q4.5 3 9 0" fill="none" stroke="#3b2414" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g fill="none" stroke="#1b1d29" stroke-width="2">
      <circle cx="25" cy="32" r="8"/>
      <circle cx="39" cy="32" r="8"/>
      <path d="M31.5 30.5 q0.5 -1.5 1 0 M17 31 l-3 -1.5 M47 31 l3 -1.5" stroke-linecap="round"/>
    </g>
    <path d="M32 37 L29.5 40.5 L32 44 L34.5 40.5 Z" fill="#f2a33a"/>
  </g>
  <path d="M25 76 l-2 5 M27 77 l0 5 M29 76 l2 5 M35 76 l-2 5 M37 77 l0 5 M39 76 l2 5"
    stroke="#f2a33a" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function initStoody() {
  const header = document.querySelector('.site-header');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const wrap = document.createElement('div');
  wrap.className = 'stoody is-hanging';
  wrap.innerHTML = `
    <button type="button" class="stoody-button" title="Stoody">
      <span class="visually-hidden">Stoody the study buddy owl. Press for a surprise.</span>
      ${OWL_SVG}
    </button>
    <span class="stoody-zzz" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></span>
    <span class="visually-hidden stoody-status" aria-live="polite"></span>`;
  header.append(wrap);

  const button = wrap.querySelector('.stoody-button');
  const status = wrap.querySelector('.stoody-status');

  let perched = false;
  let busy = false;
  let spot = 62;

  // Land somewhere new, never the spot Stoody just left.
  function moveToNewSpot() {
    const choices = SPOTS.filter((s) => s !== spot);
    spot = choices[Math.floor(Math.random() * choices.length)];
    wrap.style.setProperty('--stoody-x', `${spot}%`);
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 300) : ms));

  async function play(cls, ms) {
    wrap.classList.add(cls);
    await wait(ms);
    wrap.classList.remove(cls);
  }

  async function flip() {
    status.textContent = perched ? 'Stoody flipped back under the line.' : 'Stoody flipped up onto the line.';
    await play(perched ? 'is-flipping-down' : 'is-flipping-up', FLIP_MS);
    perched = !perched;
    wrap.classList.toggle('is-hanging', !perched);
    wrap.classList.toggle('is-perched', perched);
  }

  async function flyAway() {
    status.textContent = 'Stoody flew away. Back soon!';
    wrap.classList.add('is-flying');
    await play('is-flying-away', FLY_AWAY_MS);
    wrap.classList.add('is-away');
    await wait(AWAY_MS);
    // Always come back to hanging from the line, at a new spot.
    moveToNewSpot();
    perched = false;
    wrap.classList.remove('is-away', 'is-perched');
    wrap.classList.add('is-hanging');
    await play('is-flying-back', FLY_AWAY_MS);
    wrap.classList.remove('is-flying');
    status.textContent = 'Stoody is back.';
  }

  async function snore() {
    status.textContent = 'Stoody is snoring. Zzz.';
    await play('is-sleeping', SNORE_MS);
    status.textContent = 'Stoody woke up.';
  }

  async function headSpin() {
    status.textContent = "Whoa! Stoody's head spun all the way around.";
    await play('is-head-spinning', HEAD_SPIN_MS);
  }

  // Weighted so the head spin is rare (about 1 press in 10).
  const ACTIONS = [
    [flip, 3],
    [flyAway, 3],
    [snore, 3],
    [headSpin, 1],
  ];
  const TOTAL_WEIGHT = ACTIONS.reduce((sum, [, w]) => sum + w, 0);

  function pickAction() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const [action, weight] of ACTIONS) {
      roll -= weight;
      if (roll < 0) return action;
    }
    return ACTIONS[0][0];
  }

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    await pickAction()();
    busy = false;
  });
}
