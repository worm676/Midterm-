// Ring sounds synthesized with the Web Audio API, so no audio files are needed.

let ctx = null;

// Browsers (especially iOS Safari) only allow audio after a user gesture,
// so call this from a click before the timer finishes.
export function unlockAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// One decaying note. `partials` are [frequency multiple, relative volume] pairs.
function note(ac, out, { freq, at, length = 1, type = 'sine', volume = 0.3, partials = [[1, 1]] }) {
  for (const [mult, level] of partials) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume * level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

const BELL = [[1, 1], [2.76, 0.4], [5.4, 0.2]];
const MARIMBA = [[1, 1], [4, 0.25]];

export const RINGS = [
  {
    id: 'chime',
    name: 'Chime',
    play: (ac, out, t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note(ac, out, { freq: f, at: t + i * 0.18, length: 1.4 })),
  },
  {
    id: 'bell',
    name: 'Bell',
    play: (ac, out, t) => [0, 0.9].forEach((d) =>
      note(ac, out, { freq: 880, at: t + d, length: 2.2, volume: 0.25, partials: BELL })),
  },
  {
    id: 'ding-dong',
    name: 'Ding-dong',
    play: (ac, out, t) => {
      note(ac, out, { freq: 659.25, at: t, length: 1.2, partials: BELL, volume: 0.25 });
      note(ac, out, { freq: 523.25, at: t + 0.55, length: 1.8, partials: BELL, volume: 0.25 });
    },
  },
  {
    id: 'marimba',
    name: 'Marimba',
    play: (ac, out, t) => [523.25, 659.25, 783.99, 659.25, 1046.5].forEach((f, i) =>
      note(ac, out, { freq: f, at: t + i * 0.14, length: 0.5, partials: MARIMBA, volume: 0.35 })),
  },
  {
    id: 'harp',
    name: 'Harp',
    play: (ac, out, t) => [392, 493.88, 587.33, 783.99, 987.77, 1174.66].forEach((f, i) =>
      note(ac, out, { freq: f, at: t + i * 0.08, length: 1.6, type: 'triangle', volume: 0.22 })),
  },
  {
    id: 'digital',
    name: 'Digital alarm',
    play: (ac, out, t) => [0, 0.5].forEach((d) => [0, 0.12, 0.24].forEach((b) =>
      note(ac, out, { freq: 1760, at: t + d + b, length: 0.09, type: 'square', volume: 0.06 }))),
  },
  { id: 'off', name: 'Off (silent)', play: () => {} },
];

export function playRing(id) {
  const ring = RINGS.find((r) => r.id === id) ?? RINGS[0];
  const ac = unlockAudio();
  if (!ac) return;
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(ac.destination);
  ring.play(ac, out, ac.currentTime + 0.05);
}
