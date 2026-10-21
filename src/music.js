// Relaxing background music, generated live with the Web Audio API.
// A small look-ahead scheduler calls each style's `step` once per grid step
// (8th or 16th note), and the style schedules its notes slightly ahead of time.

import { unlockAudio, note, piano, flute } from './sound.js';

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const chance = (p) => Math.random() < p;

// ---------- Shared building blocks ----------

let noiseBuffer = null;
let reverbBuffer = null;

function getNoise(ac) {
  if (noiseBuffer?.sampleRate === ac.sampleRate) return noiseBuffer;
  noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// A simple decaying-noise impulse response for a soft room reverb.
function getReverb(ac) {
  if (reverbBuffer?.sampleRate === ac.sampleRate) return reverbBuffer;
  const length = ac.sampleRate * 2.5;
  reverbBuffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = reverbBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return reverbBuffer;
}

function envelope(ac, at, { attack = 0.01, peak, sustain = peak, hold = 0, release = 0.3 }) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  return g;
}

function noiseHit(c, at, { type = 'highpass', freq = 7000, q = 0.7, decay = 0.05, vol = 0.1, attack = 0.002 }) {
  const src = c.ac.createBufferSource();
  src.buffer = c.noise;
  const filter = c.ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = envelope(c.ac, at, { attack, peak: vol, release: decay });
  src.connect(filter).connect(g).connect(c.out);
  src.start(at, Math.random() * 1.5);
  src.stop(at + attack + decay + 0.05);
}

// ---------- Instruments ----------

function kick(c, at, vol = 0.45) {
  const osc = c.ac.createOscillator();
  osc.frequency.setValueAtTime(110, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  const g = envelope(c.ac, at, { attack: 0.003, peak: vol, release: 0.32 });
  osc.connect(g).connect(c.out);
  osc.start(at);
  osc.stop(at + 0.4);
}

const snare = (c, at, vol = 0.14) => noiseHit(c, at, { type: 'bandpass', freq: 1800, q: 0.8, decay: 0.16, vol });
const hat = (c, at, vol = 0.04) => noiseHit(c, at, { freq: 7500, decay: 0.04, vol });
const ride = (c, at, vol = 0.04) => noiseHit(c, at, { freq: 6000, decay: 0.32, vol });
const brush = (c, at, vol = 0.05) => noiseHit(c, at, { type: 'bandpass', freq: 3000, q: 0.5, attack: 0.03, decay: 0.22, vol });
const snap = (c, at, vol = 0.12) => noiseHit(c, at, { type: 'bandpass', freq: 2600, q: 2.5, decay: 0.05, vol });

function epiano(c, midi, at, length, vol = 0.06) {
  note(c.ac, c.out, { freq: mtof(midi), at, length, volume: vol, partials: [[1, 1], [2, 0.2], [7, 0.02]] });
}

function vibes(c, midi, at, length, vol = 0.07) {
  note(c.ac, c.out, { freq: mtof(midi), at, length: length + 1, volume: vol, partials: [[1, 1], [4, 0.1]] });
}

function musicBox(c, midi, at, vol = 0.11) {
  note(c.ac, c.out, { freq: mtof(midi), at, length: 1.4, volume: vol, partials: [[1, 1], [3, 0.12], [5.4, 0.05]] });
}

function bass(c, midi, at, length, vol = 0.22) {
  const osc = c.ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = mtof(midi);
  const filter = c.ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const g = envelope(c.ac, at, { attack: 0.01, peak: vol, sustain: vol * 0.5, hold: length * 0.6, release: length * 0.4 });
  osc.connect(filter).connect(g).connect(c.out);
  osc.start(at);
  osc.stop(at + length + 0.1);
}

function pad(c, midis, at, length, vol = 0.03) {
  const filter = c.ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = envelope(c.ac, at, { attack: 0.8, peak: vol, hold: Math.max(0.1, length - 1.6), release: 0.8 });
  filter.connect(g).connect(c.out);
  for (const m of midis) {
    for (const detune of [-7, 7]) {
      const osc = c.ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = mtof(m);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.2);
    }
  }
}

// A soft, muted horn for the noir style.
function horn(c, midi, at, length, vol = 0.07) {
  const osc = c.ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = mtof(midi);
  const vibrato = c.ac.createOscillator();
  const depth = c.ac.createGain();
  vibrato.frequency.value = 5;
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(mtof(midi) * 0.01, at + length);
  vibrato.connect(depth).connect(osc.frequency);
  const filter = c.ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1300;
  filter.Q.value = 1;
  const g = envelope(c.ac, at, { attack: 0.05, peak: vol, sustain: vol * 0.8, hold: length * 0.8, release: 0.12 });
  osc.connect(filter).connect(g).connect(c.out);
  for (const node of [osc, vibrato]) {
    node.start(at);
    node.stop(at + length + 0.2);
  }
}

function tom(c, at, freq, vol = 0.2) {
  const osc = c.ac.createOscillator();
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, at + 0.25);
  const g = envelope(c.ac, at, { attack: 0.003, peak: vol, release: 0.3 });
  osc.connect(g).connect(c.out);
  osc.start(at);
  osc.stop(at + 0.35);
}

// A ride cymbal with a metallic "ping" on top of the wash.
function jazzRide(c, at, vol = 0.05) {
  noiseHit(c, at, { freq: 5500, decay: 0.45, vol });
  for (const freq of [3150, 4630, 6210]) {
    const osc = c.ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const filter = c.ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    const g = envelope(c.ac, at, { attack: 0.002, peak: vol * 0.08, release: 0.5 });
    osc.connect(filter).connect(g).connect(c.out);
    osc.start(at);
    osc.stop(at + 0.55);
  }
}

// Plucked guitar string (Karplus-Strong), cached per note.
const stringCache = new Map();

function stringBuffer(ac, midi) {
  const key = `${ac.sampleRate}:${midi}`;
  if (stringCache.has(key)) return stringCache.get(key);
  const sr = ac.sampleRate;
  const buffer = ac.createBuffer(1, Math.floor(sr * 2.5), sr);
  const data = buffer.getChannelData(0);
  const period = Math.round(sr / mtof(midi));
  // Start from softened noise for a warm, fingerpicked attack.
  let prev = 0;
  for (let i = 0; i < period; i++) {
    prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5;
    data[i] = prev;
  }
  const damping = 0.996 - Math.max(0, midi - 60) * 0.0004;
  for (let i = period; i < data.length; i++) {
    data[i] = damping * 0.5 * (data[i - period] + data[Math.max(0, i - period - 1)]);
  }
  stringCache.set(key, buffer);
  return buffer;
}

function guitar(c, midi, at, vol = 0.22) {
  const src = c.ac.createBufferSource();
  src.buffer = stringBuffer(c.ac, midi);
  const body = c.ac.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 220;
  body.gain.value = 4;
  const tone = c.ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  const g = c.ac.createGain();
  g.gain.value = vol;
  src.connect(body).connect(tone).connect(g).connect(c.out);
  src.start(at);
}

// ---------- Ambient layers (looping noise beds) ----------

function vinyl(c) {
  const ac = c.ac;
  const buffer = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.004;
    if (Math.random() < 0.0004) {
      const amp = (Math.random() * 2 - 1) * 0.35;
      for (let k = 0; k < 40 && i + k < data.length; k++) data[i + k] += amp * (1 - k / 40);
    }
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = ac.createGain();
  g.gain.value = 0.5;
  src.connect(g).connect(c.dry);
  src.start();
  return src;
}

function rain(c) {
  const ac = c.ac;
  const src = ac.createBufferSource();
  src.buffer = c.noise;
  src.loop = true;
  const low = ac.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 2500;
  const high = ac.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 400;
  const g = ac.createGain();
  g.gain.value = 0.08;
  const gust = ac.createOscillator();
  const gustDepth = ac.createGain();
  gust.frequency.value = 0.08;
  gustDepth.gain.value = 0.02;
  gust.connect(gustDepth).connect(g.gain);
  src.connect(low).connect(high).connect(g).connect(c.dry);
  src.start();
  gust.start();
  return { stop: () => [src, gust].forEach((n) => n.stop()) };
}

// ---------- Styles ----------

const LOFI = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const C_PENTA = [72, 74, 76, 79, 81];

const JAZZ = [
  { root: 38, voicing: [53, 57, 60, 64], tones: [38, 41, 45, 48] },
  { root: 43, voicing: [53, 57, 59, 64], tones: [43, 47, 50, 53] },
  { root: 36, voicing: [52, 55, 59, 62], tones: [36, 40, 43, 47] },
  { root: 45, voicing: [55, 59, 61, 64], tones: [45, 49, 52, 55] },
];

const NOIR = [
  { root: 36, voicing: [51, 55, 57, 60], tones: [36, 39, 43, 45] },
  { root: 44, voicing: [51, 54, 56, 60], tones: [44, 48, 51, 54] },
  { root: 43, voicing: [53, 55, 59, 62], tones: [43, 47, 50, 53] },
  { root: 36, voicing: [51, 55, 57, 60], tones: [36, 39, 43, 45] },
];
const NOIR_RIFFS = [
  [[0, 67, 2], [2, 68, 1], [3, 67, 1], [4, 66, 1], [5, 65, 3]],
  [[0, 63, 2], [2, 65, 1], [3, 66, 1], [4, 67, 3]],
];
const C_BLUES = [60, 63, 65, 66, 67, 70, 72];

// Bach, Prelude in C major (BWV 846), opening bars.
const BACH = [
  [60, 64, 67, 72, 76], [60, 62, 69, 74, 77], [59, 62, 67, 74, 77], [60, 64, 67, 72, 76],
  [60, 64, 69, 76, 81], [60, 62, 66, 69, 74], [59, 62, 67, 74, 79], [59, 60, 64, 67, 72],
  [57, 60, 64, 67, 72], [50, 57, 62, 66, 72], [55, 59, 62, 67, 71], [55, 58, 64, 67, 73],
  [53, 57, 62, 69, 74], [53, 56, 62, 65, 71], [52, 55, 60, 67, 72], [52, 53, 57, 60, 65],
];
const BACH_ORDER = [0, 1, 2, 3, 4, 2, 3, 4];

const FLUTE_CHORDS = [
  { root: 38, pad: [62, 66, 69] },
  { root: 35, pad: [59, 62, 66] },
  { root: 43, pad: [59, 62, 67] },
  { root: 45, pad: [61, 64, 69] },
];
const D_PENTA = [74, 76, 78, 81, 83, 86, 88];

const BOX_CHORDS = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]];

// Piano: vi-IV-I-V in C (Am, F, C, G). `third` is 3 for minor, 4 for major.
const PIANO_CHORDS = [
  { root: 45, third: 3, melody: [69, 72, 76, 79] },
  { root: 41, third: 4, melody: [69, 72, 77, 79] },
  { root: 48, third: 4, melody: [72, 74, 76, 79] },
  { root: 43, third: 4, melody: [71, 74, 79, 81] },
];

// Guitar: open G, Em, C, D shapes (low string to high string).
const GUITAR_CHORDS = [
  [43, 47, 50, 55, 59, 67],
  [40, 47, 52, 55, 59, 64],
  [48, 52, 55, 60, 64],
  [50, 57, 62, 66],
];
// Fingerpicking order over the strings, one per 8th note.
const PICK_ORDER = [0, 3, 2, 4, 1, 3, 2, 5];

function walkingBass(c, chord, next, beat, at, length, chromatic = false) {
  let midi;
  if (beat === 0) midi = chord.tones[0];
  else if (beat === 3) midi = next.root + (chromatic || chance(0.5) ? -1 : 1);
  else midi = chord.tones[beat === 1 ? pick([1, 2]) : pick([2, 3])];
  bass(c, midi, at, length * 0.9, 0.24);
}

export const STYLES = [
  {
    id: 'lofi',
    name: 'Lo-fi',
    nowPlaying: 'Lo-fi beats',
    bpm: 72,
    perBeat: 4,
    swing: 0.56,
    tone: 2600,
    layers: (c) => [vinyl(c)],
    step(c, s, t, d) {
      const pos = s % 16;
      const chord = LOFI[Math.floor(s / 16) % 4];
      if (pos === 0) chord.forEach((m, i) => epiano(c, m, t + i * 0.025, d * 16, 0.07));
      if (pos === 10 && chance(0.6)) chord.forEach((m, i) => epiano(c, m, t + i * 0.02, d * 5, 0.04));
      if (pos === 0 || pos === 10) bass(c, chord[0] - 12, t, d * (pos ? 5 : 9), 0.22);
      if (pos === 0 || pos === 10 || (pos === 7 && chance(0.5))) kick(c, t);
      if (pos === 4 || pos === 12) snare(c, t);
      if (pos % 2 === 0) hat(c, t, pos % 4 === 0 ? 0.05 : 0.03);
      if (pos % 2 === 0 && chance(0.18)) epiano(c, pick(C_PENTA), t, d * 3, 0.05);
    },
  },
  {
    id: 'jazz',
    name: 'Jazz',
    nowPlaying: 'Smooth jazz trio',
    bpm: 96,
    perBeat: 2,
    swing: 0.64,
    tone: 5000,
    step(c, s, t, d) {
      const bar = Math.floor(s / 8) % 4;
      const pos = s % 8;
      const chord = JAZZ[bar];
      if (pos % 2 === 0) walkingBass(c, chord, JAZZ[(bar + 1) % 4], pos / 2, t, d * 2);
      if ((pos === 0 && chance(0.5)) || (pos === 3 && chance(0.6)) || (pos === 6 && chance(0.3))) {
        chord.voicing.forEach((m) => piano(c.ac, c.out, mtof(m), t, d * 1.5, 0.05));
      }
      if (pos % 2 === 0) ride(c, t, 0.045);
      if (pos === 3 || pos === 7) ride(c, t, 0.03);
      if (pos === 2 || pos === 6) {
        brush(c, t);
        hat(c, t, 0.025);
      }
      if (chance(0.22)) vibes(c, pick(chord.voicing) + 12, t, d * 2);
    },
  },
  {
    id: 'jazzdrums',
    name: 'Jazz drums',
    nowPlaying: 'Jazz drums & bass groove',
    bpm: 120,
    perBeat: 2,
    swing: 0.66,
    tone: 7000,
    step(c, s, t, d) {
      const bar = Math.floor(s / 8) % 4;
      const pos = s % 8;
      const chord = JAZZ[bar];
      if (pos % 2 === 0) walkingBass(c, chord, JAZZ[(bar + 1) % 4], pos / 2, t, d * 2);
      // Classic ride pattern: ding, ding-da, ding, ding-da.
      if (pos % 2 === 0 || pos === 3 || pos === 7) jazzRide(c, t, pos % 2 === 0 ? 0.05 : 0.035);
      // Hi-hat foot on 2 and 4, feathered kick on every beat.
      if (pos === 2 || pos === 6) hat(c, t, 0.05);
      if (pos % 2 === 0) kick(c, t, 0.12);
      if (bar === 3 && pos >= 5) {
        // A short fill into the next phrase: snare, then toms down.
        if (pos === 5) snare(c, t, 0.1);
        if (pos === 6) tom(c, t, 190);
        if (pos === 7) {
          tom(c, t, 140);
          tom(c, t + d * 0.5, 105);
        }
      } else if (pos % 2 === 1 && chance(0.25)) {
        snare(c, t, chance(0.2) ? 0.09 : 0.04);
      }
    },
  },
  {
    id: 'noir',
    name: 'Criminal jazz',
    nowPlaying: 'Criminal jazz (noir detective)',
    bpm: 88,
    perBeat: 2,
    swing: 0.62,
    tone: 3500,
    step(c, s, t, d) {
      const bar = Math.floor(s / 8) % 4;
      const pos = s % 8;
      const chord = NOIR[bar];
      if (pos % 2 === 0) walkingBass(c, chord, NOIR[(bar + 1) % 4], pos / 2, t, d * 2, true);
      if (pos === 2 || pos === 6) {
        snap(c, t);
        brush(c, t, 0.04);
      }
      if (pos % 2 === 0) ride(c, t, 0.03);
      if ((pos === 0 && chance(0.5)) || (pos === 7 && chance(0.3))) {
        chord.voicing.forEach((m) => piano(c.ac, c.out, mtof(m - 12), t, d * 1.2, 0.045));
      }
      if (bar === 0 || bar === 2) {
        for (const [at, midi, len] of NOIR_RIFFS[bar / 2]) if (at === pos) horn(c, midi, t, d * len * 0.95);
      } else if (pos % 2 === 0 && chance(0.3)) {
        horn(c, pick(C_BLUES), t, d * 2 * 0.9, 0.055);
      }
    },
  },
  {
    id: 'classics',
    name: 'Classics',
    nowPlaying: 'Bach: Prelude in C major',
    bpm: 66,
    perBeat: 4,
    swing: 0.5,
    tone: 6000,
    step(c, s, t, d) {
      const chord = BACH[Math.floor(s / 16) % BACH.length];
      const pos = s % 16;
      const idx = BACH_ORDER[pos % 8];
      const length = idx === 0 ? d * 8 : idx === 1 ? d * 7 : d * 1.6;
      piano(c.ac, c.out, mtof(chord[idx]), t, length, idx < 2 ? 0.15 : 0.11);
    },
  },
  {
    id: 'piano',
    name: 'Piano',
    nowPlaying: 'Solo piano',
    bpm: 70,
    perBeat: 2,
    swing: 0.5,
    tone: 6000,
    step(c, s, t, d) {
      const pos = s % 8;
      const { root, third, melody } = PIANO_CHORDS[Math.floor(s / 8) % 4];
      const arpeggio = [root, root + 7, root + 12, root + 12 + third, root + 19, root + 12 + third, root + 12, root + 7];
      piano(c.ac, c.out, mtof(arpeggio[pos]), t, d * 4, 0.11);
      if (pos === 0) piano(c.ac, c.out, mtof(pick(melody)), t, d * 6, 0.16);
      else if ((pos === 3 || pos === 4 || pos === 6) && chance(0.35)) {
        piano(c.ac, c.out, mtof(pick(melody) + pick([0, 0, 2])), t, d * 3, 0.13);
      }
    },
  },
  {
    id: 'guitar',
    name: 'Guitar',
    nowPlaying: 'Acoustic guitar',
    bpm: 76,
    perBeat: 2,
    swing: 0.5,
    tone: 5000,
    step(c, s, t, d) {
      const chord = GUITAR_CHORDS[Math.floor(s / 8) % 4];
      const pos = s % 8;
      const idx = Math.min(PICK_ORDER[pos], chord.length - 1);
      guitar(c, chord[idx], t + Math.random() * 0.01, idx === 0 ? 0.34 : 0.26);
      // Now and then, a little hammer-on above the top string.
      if (pos === 7 && chance(0.3)) guitar(c, chord[chord.length - 1] + 2, t + d * 0.5, 0.18);
    },
  },
  {
    id: 'flute',
    name: 'Flute',
    nowPlaying: 'Calm flute',
    bpm: 60,
    perBeat: 2,
    swing: 0.5,
    tone: 5000,
    step(c, s, t, d) {
      const chord = FLUTE_CHORDS[Math.floor(s / 8) % 4];
      if (s % 8 === 0) {
        pad(c, chord.pad, t, d * 8, 0.022);
        piano(c.ac, c.out, mtof(chord.root + 12), t, 3, 0.06);
      }
      const st = c.state;
      if (s < (st.next ?? 0)) return;
      if (chance(0.25)) {
        st.next = s + pick([1, 2]);
        return;
      }
      st.i = Math.min(D_PENTA.length - 1, Math.max(0, (st.i ?? 2) + pick([-2, -1, -1, 1, 1, 2])));
      const len = pick([1, 2, 2, 3, 4]);
      flute(c.ac, c.out, mtof(D_PENTA[st.i]), t, len * d * 0.95, 0.11);
      st.next = s + len;
    },
  },
  {
    id: 'surprise',
    name: 'Surprise me',
    nowPlaying: 'Surprise: rainy day music box',
    bpm: 70,
    perBeat: 2,
    swing: 0.5,
    tone: 7000,
    layers: (c) => [rain(c)],
    step(c, s, t, d) {
      const chord = BOX_CHORDS[Math.floor(s / 8) % 4];
      const pos = s % 8;
      if (pos === 0) {
        pad(c, chord.map((m) => m - 12), t, d * 8, 0.015);
        piano(c.ac, c.out, mtof(chord[0] - 24), t, 2.5, 0.05);
      }
      if (chance(0.85)) musicBox(c, chord[pos % 4] + (pos >= 4 ? 24 : 12), t);
    },
  },
];

// ---------- Player ----------

let current = null;

export function isPlaying() {
  return current !== null;
}

export function playMusic(id, volume) {
  stopMusic();
  const style = STYLES.find((s) => s.id === id);
  const ac = unlockAudio();
  if (!style || !ac) return;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(volumeToGain(volume), ac.currentTime + 0.6);
  master.connect(ac.destination);

  const dry = ac.createBiquadFilter();
  dry.type = 'lowpass';
  dry.frequency.value = style.tone;
  dry.connect(master);

  const reverb = ac.createConvolver();
  reverb.buffer = getReverb(ac);
  const wet = ac.createGain();
  wet.gain.value = 0.28;
  dry.connect(reverb).connect(wet).connect(master);

  const c = { ac, out: dry, dry, noise: getNoise(ac), state: {} };
  const layers = style.layers?.(c) ?? [];

  const stepDur = 60 / style.bpm / style.perBeat;
  let step = 0;
  let nextTime = ac.currentTime + 0.1;

  function tick() {
    // Schedule further ahead when the tab is hidden, since timers slow down there.
    const ahead = document.hidden ? 1.5 : 0.25;
    while (nextTime < ac.currentTime + ahead) {
      const swingDelay = step % 2 === 1 ? (2 * style.swing - 1) * stepDur : 0;
      style.step(c, step, nextTime + swingDelay, stepDur);
      nextTime += stepDur;
      step++;
    }
  }

  tick();
  current = { ac, master, layers, interval: setInterval(tick, 25) };
}

export function stopMusic() {
  if (!current) return;
  const { ac, master, layers, interval } = current;
  current = null;
  clearInterval(interval);
  const now = ac.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  setTimeout(() => {
    layers.forEach((l) => l.stop());
    master.disconnect();
  }, 500);
}

function volumeToGain(volume) {
  return Math.max(0.0001, (volume / 100) ** 2 * 1.2);
}

export function setMusicVolume(volume) {
  if (!current) return;
  const { ac, master } = current;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(volumeToGain(volume), ac.currentTime, 0.05);
}
