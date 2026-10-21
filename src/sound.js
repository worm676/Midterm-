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

// 808-style cowbell: two detuned square waves through a band-pass filter.
function cowbell(ac, out, at, pitch = 1, volume = 0.35) {
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000 * pitch;
  filter.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(volume * 0.3, at + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
  filter.connect(gain).connect(out);
  for (const freq of [540, 800]) {
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq * pitch;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + 0.5);
  }
}

// Piano-like tone: a bright hammer attack that mellows as it decays.
function piano(ac, out, freq, at, length = 1.6, volume = 0.22) {
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 8, at);
  filter.frequency.exponentialRampToValueAtTime(freq * 2, at + length);
  filter.connect(out);
  for (const [mult, level, detune] of [[1, 1, 0], [1, 0.5, 4], [2, 0.35, 0], [3, 0.12, 0], [4, 0.06, 0]]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq * mult;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume * level, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(volume * level * 0.4, at + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

// Flute-like tone: soft attack, gentle vibrato, and a little breath noise.
function flute(ac, out, freq, at, length = 0.5, volume = 0.18) {
  const end = at + length;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const vibrato = ac.createOscillator();
  const vibratoDepth = ac.createGain();
  vibrato.frequency.value = 5.2;
  vibratoDepth.gain.value = freq * 0.008;
  vibrato.connect(vibratoDepth).connect(osc.frequency);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.08);
  gain.gain.setValueAtTime(volume, end - 0.1);
  gain.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(out);

  const noise = ac.createBufferSource();
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  const breath = ac.createBiquadFilter();
  breath.type = 'bandpass';
  breath.frequency.value = freq * 2;
  breath.Q.value = 1.5;
  const breathGain = ac.createGain();
  breathGain.gain.setValueAtTime(0.0001, at);
  breathGain.gain.linearRampToValueAtTime(volume * 0.25, at + 0.05);
  breathGain.gain.linearRampToValueAtTime(volume * 0.06, at + 0.2);
  breathGain.gain.linearRampToValueAtTime(0.0001, end);
  noise.connect(breath).connect(breathGain).connect(out);

  for (const node of [osc, vibrato, noise]) {
    node.start(at);
    node.stop(end + 0.05);
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
      note(ac, out, { freq: 1760, at: t + d + b, length: 0.09, type: 'square', volume: 0.15 }))),
  },
  {
    id: 'cowbell',
    name: 'Cowbell',
    // A bouncy hi-lo trap pattern, played twice.
    play: (ac, out, t) => [0, 0.96].forEach((bar) =>
      [[0, 1], [0.24, 1], [0.36, 1.5], [0.6, 1], [0.72, 1.5]].forEach(([beat, pitch]) =>
        cowbell(ac, out, t + bar + beat, pitch))),
  },
  {
    id: 'piano',
    name: 'Piano',
    play: (ac, out, t) => {
      [261.63, 329.63, 392, 523.25].forEach((f, i) => piano(ac, out, f, t + i * 0.16, 1.2));
      [261.63, 329.63, 392, 523.25].forEach((f) => piano(ac, out, f, t + 0.75, 2, 0.14));
    },
  },
  {
    id: 'flute',
    name: 'Flute',
    play: (ac, out, t) => [[587.33, 0.3], [659.25, 0.3], [783.99, 0.3], [880, 0.9]].reduce((at, [freq, len]) => {
      flute(ac, out, freq, at, len);
      return at + len;
    }, t),
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
