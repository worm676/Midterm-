// Small localStorage helpers that never throw (private mode, blocked storage, bad JSON).

export const KEYS = {
  tasks: 'ssp.tasks',
  waves: 'ssp.waves',
  theme: 'ssp.theme',
  ring: 'ssp.ring',
  timers: 'ssp.timers',
  music: 'ssp.music',
  musicVolume: 'ssp.musicVolume',
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable; the app keeps working for this session.
  }
}

export function loadString(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore.
  }
}
