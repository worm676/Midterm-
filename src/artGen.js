// Generates the "Study break art" illustrations as SVG, so no image files or
// external services are needed. Ten classics never change; ten more are drawn
// fresh every week (new styles and new layouts), seeded by the week number.

const W = 800;
const H = 600;

// ---------- Seeded randomness ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const between = (rng, a, b) => a + rng() * (b - a);

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Weeks since 1970, rolling over on Monday in the viewer's time zone.
export function currentWeek(date = new Date()) {
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  return Math.floor((days + 3) / 7);
}

// ---------- SVG building blocks ----------

const f = (n) => n.toFixed(1);

function linear(id, colors, x2 = 0, y2 = 1) {
  const stops = colors
    .map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`)
    .join('');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
}

function radial(id, stops, cx, cy, r) {
  const s = stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('');
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>`;
}

const rect = (fill, y = 0, h = H, extra = '') =>
  `<rect y="${f(y)}" width="${W}" height="${f(h)}" fill="${fill}" ${extra}/>`;

// Jagged mountain ridge via midpoint displacement.
function ridge(rng, base, rough, steps = 8) {
  let pts = [
    [0, base + between(rng, -rough, rough)],
    [W, base + between(rng, -rough, rough)],
  ];
  let disp = rough;
  for (let s = 0; s < steps; s++) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      next.push(pts[i], [(x1 + x2) / 2, (y1 + y2) / 2 + between(rng, -disp, disp)]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    disp *= 0.55;
  }
  return `M0 ${H} ` + pts.map(([x, y]) => `L${f(x)} ${f(y)}`).join(' ') + ` L${W} ${H} Z`;
}

// Smooth rolling curve through random heights.
function rolling(rng, base, amp, count = 5) {
  const pts = Array.from({ length: count }, (_, i) => [(i * W) / (count - 1), base + between(rng, -amp, amp)]);
  let d = `M0 ${H} L${f(pts[0][0])} ${f(pts[0][1])} `;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)} `;
  }
  const last = pts[pts.length - 1];
  return d + `L${f(last[0])} ${f(last[1])} L${W} ${H} Z`;
}

function stars(rng, n, ymax) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = [0.6, 0.8, 1, 1.2, 1.6][Math.floor(rng() * 5)];
    out += `<circle cx="${f(between(rng, 0, W))}" cy="${f(between(rng, 0, ymax))}" r="${r}" fill="#fff" opacity="${between(rng, 0.4, 1).toFixed(2)}"/>`;
  }
  return out;
}

function birds(rng, n, x0, y0, color, spread = 140) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + between(rng, -spread, spread);
    const y = y0 + between(rng, -40, 40);
    const s = between(rng, 6, 11);
    out += `<path d="M${f(x - s)} ${f(y)} Q${f(x - s / 2)} ${f(y - s * 0.6)} ${f(x)} ${f(y)} Q${f(x + s / 2)} ${f(y - s * 0.6)} ${f(x + s)} ${f(y)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return out;
}

function clouds(rng, n, color) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = between(rng, 40, W - 40);
    const y = between(rng, 50, 200);
    const s = between(rng, 0.7, 1.3);
    out += `<g fill="${color}" opacity=".85" transform="translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="0" rx="50" ry="16"/><ellipse cx="-20" cy="-10" rx="24" ry="18"/><ellipse cx="14" cy="-14" rx="28" ry="22"/></g>`;
  }
  return out;
}

function pine(x, base, h, color) {
  const parts = [];
  const w = h * 0.42;
  for (let i = 0; i < 4; i++) {
    const top = base - h + i * h * 0.2;
    const bot = top + h * 0.38;
    const ww = w * (0.45 + i * 0.2);
    parts.push(`M${f(x)} ${f(top)} L${f(x + ww / 2)} ${f(bot)} L${f(x - ww / 2)} ${f(bot)} Z`);
  }
  parts.push(`M${f(x - h * 0.03)} ${f(base - h * 0.1)} h${f(h * 0.06)} V${f(base)} h${f(-h * 0.06)} Z`);
  return `<path d="${parts.join(' ')}" fill="${color}"/>`;
}

function forestRow(rng, base, hmin, hmax, color, count, jitter = 12) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (i * W) / (count - 1) + between(rng, -jitter, jitter);
    out += pine(x, base + between(rng, 0, 14), between(rng, hmin, hmax), color);
  }
  return out + rect(color, base + 8, H - base);
}

function palm(x, base, h, lean, color) {
  const tx = x + lean;
  const ty = base - h;
  let out = `<path d="M${f(x - 7)} ${base} Q${f(x + lean * 0.3)} ${f(base - h * 0.5)} ${f(tx - 3)} ${f(ty)} L${f(tx + 3)} ${f(ty)} Q${f(x + lean * 0.3 + 10)} ${f(base - h * 0.5)} ${f(x + 7)} ${base} Z" fill="${color}"/>`;
  for (const [ang, len] of [[-160, 95], [-130, 105], [-95, 70], [-55, 105], [-20, 95], [10, 75], [-190, 75]]) {
    const a = (ang * Math.PI) / 180;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.6 + len * 0.35;
    const cx = tx + Math.cos(a) * len * 0.5;
    const cy = ty + Math.sin(a) * len * 0.6 - 20;
    out += `<path d="M${f(tx)} ${f(ty)} Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)} Q${f(cx)} ${f(cy + 14)} ${f(tx)} ${f(ty + 6)} Z" fill="${color}"/>`;
  }
  return out;
}

function reflection(rng, x, top, color, rows = 12) {
  let out = '';
  for (let i = 0; i < rows; i++) {
    const w = Math.max(20, 130 - i * 8 + between(rng, -20, 20));
    out += `<rect x="${f(x - w / 2)}" y="${f(top + i * 13)}" width="${f(w)}" height="3" rx="1.5" fill="${color}" opacity="${(0.85 - i * 0.06).toFixed(2)}"/>`;
  }
  return out;
}

function waves(color, ys) {
  return ys
    .map(([y, op]) => {
      let d = `M0 ${y} `;
      for (let x = 0; x < W; x += 100) d += `Q${x + 25} ${y - 6} ${x + 50} ${y} T${x + 100} ${y} `;
      return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>`;
    })
    .join('');
}

// ---------- Scene templates ----------

function mountains(rng, p) {
  const sx = between(rng, 220, 580);
  const sy = between(rng, 300, 360);
  const bases = [330, 380, 430, 500].map((b) => b + between(rng, -15, 15));
  const rough = [70, 60, 50, 30];
  const opacity = [0.55, 0.75, 1, 1];
  const defs =
    linear('sky', p.sky) + radial('glow', [[0, p.sun, 0.9], [0.35, p.glow, 0.45], [1, p.glow, 0]], sx / W, sy / H, 0.45);
  let body = rect('url(#sky)') + rect('url(#glow)');
  body += p.night ? stars(rng, 110, 330) : birds(rng, 5, between(rng, 200, 600), 170, p.layers[3]);
  body += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${p.night ? 30 : 52}" fill="${p.sun}"/>`;
  bases.forEach((b, i) => {
    body += `<path d="${ridge(rng, b, rough[i])}" fill="${p.layers[i]}" opacity="${opacity[i]}"/>`;
  });
  return { defs, body };
}

function ocean(rng, p) {
  const horizon = between(rng, 320, 360);
  const sx = between(rng, 220, 580);
  const sy = p.high ? between(rng, 100, 160) : horizon - 8;
  const defs = linear('sky', p.sky) + linear('sea', p.sea);
  let body = rect('url(#sky)', 0, horizon + 5);
  if (p.night) body += stars(rng, 120, horizon - 40);
  else if (p.high) body += clouds(rng, 3, '#ffffff');
  else body += birds(rng, 4, between(rng, 180, 620), 150, p.bird ?? '#2a2140', 90);
  body += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${p.night ? 30 : 60}" fill="${p.sun}"/>`;
  body += rect('url(#sea)', horizon, H - horizon);
  if (!p.high) body += reflection(rng, sx, horizon + 10, p.sun, 13);
  body += waves('#ffffff', [[horizon + 80, 0.12], [horizon + 130, 0.1], [horizon + 180, 0.08], [horizon + 225, 0.07]]);
  return { defs, body };
}

function forest(rng, p) {
  const sx = between(rng, 150, 650);
  const defs =
    linear('sky', p.sky) +
    `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.mist}" stop-opacity="0"/><stop offset=".5" stop-color="${p.mist}" stop-opacity="${p.night ? 0.25 : 0.55}"/><stop offset="1" stop-color="${p.mist}" stop-opacity="0"/></linearGradient>`;
  let body = rect('url(#sky)');
  if (p.night) body += stars(rng, 110, 300);
  body += `<circle cx="${f(sx)}" cy="${f(between(rng, 110, 180))}" r="${p.night ? 30 : 46}" fill="${p.sun}" opacity=".95"/>`;
  body += `<path d="${ridge(rng, 300, 60)}" fill="${p.ridge}"/>`;
  body += forestRow(rng, 380, 90, 150, p.layers[0], 26) + rect('url(#mist)', 340, 120);
  body += forestRow(rng, 450, 120, 200, p.layers[1], 18) + rect('url(#mist)', 420, 110);
  body += forestRow(rng, 540, 170, 280, p.layers[2], 11, 20);
  if (p.snow) body += rect('#f4f8fc', 560, 40);
  return { defs, body };
}

function dunes(rng, p) {
  const defs = linear('sky', p.sky) + p.dunes.map((c, i) => linear(`d${i}`, c)).join('');
  let body = rect('url(#sky)');
  if (p.night) body += stars(rng, 130, 330);
  else body += birds(rng, 3, between(rng, 450, 650), 180, p.dunes[2][1], 60);
  body += `<circle cx="${f(between(rng, 140, 660))}" cy="${f(between(rng, 150, 260))}" r="${p.night ? 30 : 48}" fill="${p.sun}"/>`;
  [[360, 40], [440, 40], [515, 30]].forEach(([base, amp], i) => {
    const y = () => f(base + between(rng, -amp, amp));
    body += `<path d="M0 ${H} L0 ${y()} C${f(between(rng, 120, 240))} ${y()} ${f(between(rng, 260, 360))} ${y()} 420 ${y()} S${f(between(rng, 620, 720))} ${y()} 800 ${y()} L800 ${H} Z" fill="url(#d${i})"/>`;
  });
  return { defs, body };
}

function aurora(rng, p) {
  const defs =
    linear('sky', p.sky) +
    linear('au', p.aurora, 1, 0) +
    linear('lake', ['#123150', '#040b16']) +
    '<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>' +
    `<clipPath id="lakeClip"><rect y="440" width="${W}" height="${H - 440}"/></clipPath>`;
  let bands = '';
  for (const [y, sw, op] of [[between(rng, 130, 170), 70, 0.55], [between(rng, 180, 230), 50, 0.45], [between(rng, 100, 140), 30, 0.6]]) {
    const a = between(rng, 40, 90);
    bands += `<path d="M-50 ${f(y)} C150 ${f(y - a)} 300 ${f(y + a)} 450 ${f(y - a / 2)} S700 ${f(y - a)} 850 ${f(y + a / 3)}" fill="none" stroke="url(#au)" stroke-width="${sw}" stroke-linecap="round" opacity="${op}" filter="url(#blur)"/>`;
  }
  let body = rect('url(#sky)') + stars(rng, 120, 380) + bands;
  body += `<path d="${ridge(rng, 330, 150)}" fill="#dbe7f2"/>`;
  body += `<path d="${ridge(rng, 380, 90)}" fill="#7b93ad"/>`;
  body += `<path d="${ridge(rng, 415, 25)}" fill="#1b2a3d"/>`;
  body += rect('url(#lake)', 440, H - 440);
  body += `<g clip-path="url(#lakeClip)"><g transform="translate(0 600) scale(1 -0.42)" opacity=".3">${bands}</g></g>`;
  body += rect('#9fd9ff', 440, 2, 'opacity=".35"');
  return { defs, body };
}

function city(rng, p) {
  const defs = linear('sky', p.sky) + radial('moon', [[0, p.sun, 0.55], [1, p.sun, 0]], 0.5, 0.5, 0.5);
  const blocks = [];
  for (let x = 0; x < W; ) {
    const w = Math.round(between(rng, 36, 80));
    blocks.push([x, w, Math.round(between(rng, 90, 260))]);
    x += w + Math.round(between(rng, 0, 6));
  }
  const mx = between(rng, 120, 680);
  const my = between(rng, 90, 160);
  let body = rect('url(#sky)');
  if (p.night) body += stars(rng, 140, 330);
  body += `<circle cx="${f(mx)}" cy="${f(my)}" r="90" fill="url(#moon)"/><circle cx="${f(mx)}" cy="${f(my)}" r="34" fill="${p.sun}"/>`;
  body += blocks.map(([x, w, h]) => `<rect x="${f(x * 0.9 + 20)}" y="${f(H - h * 0.75 - 60)}" width="${w}" height="${h}" fill="${p.far}"/>`).join('');
  body += blocks.map(([x, w, h]) => `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="${p.building}"/>`).join('');
  for (const [x, w, h] of blocks) {
    for (let wy = H - h + 14; wy < H - 10; wy += 18) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        if (rng() < 0.32) {
          const c = p.windows[Math.floor(rng() * p.windows.length)];
          body += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="${c}" opacity="${between(rng, 0.55, 1).toFixed(2)}"/>`;
        }
      }
    }
  }
  return { defs, body };
}

function palms(rng, p) {
  const horizon = between(rng, 385, 405);
  const sx = between(rng, 320, 560);
  const defs = linear('sky', p.sky) + linear('sea', p.sea);
  let body = rect('url(#sky)', 0, horizon + 5);
  if (p.night) body += stars(rng, 110, horizon - 60);
  else if (p.day) body += clouds(rng, 3, '#ffffff');
  const sy = p.day ? between(rng, 90, 150) : horizon - 4;
  body += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${p.night ? 30 : 58}" fill="${p.sun}"/>`;
  body += rect('url(#sea)', horizon, H - horizon);
  if (!p.day) body += reflection(rng, sx, horizon + 10, p.sun, 10);
  body += `<path d="M0 ${H} L0 520 Q200 ${f(between(rng, 480, 510))} 360 530 T800 545 L800 ${H} Z" fill="${p.ground}"/>`;
  const left = between(rng, 80, 160);
  body += palm(left, 540, between(rng, 260, 320), between(rng, 20, 60), p.trees);
  body += palm(left + between(rng, 70, 110), 535, between(rng, 190, 240), between(rng, 50, 80), p.trees);
  body += palm(between(rng, 640, 740), 548, between(rng, 230, 290), between(rng, -70, -30), p.trees);
  if (!p.night) body += birds(rng, 4, between(rng, 450, 650), 170, p.night ? '#fff' : '#1a1530', 80);
  return { defs, body };
}

function hills(rng, p) {
  const defs = linear('sky', p.sky);
  let body = rect('url(#sky)');
  body += `<circle cx="${f(between(rng, 140, 660))}" cy="${f(between(rng, 110, 210))}" r="50" fill="${p.sun}"/>`;
  if (p.clouds) body += clouds(rng, 4, '#ffffff');
  else body += birds(rng, 4, between(rng, 250, 550), 160, p.hills[3], 100);
  [300, 370, 440, 510].forEach((base, i) => {
    body += `<path d="${rolling(rng, base + between(rng, -10, 10), 35 - i * 4)}" fill="${p.hills[i]}"/>`;
  });
  if (p.rows) {
    for (let k = 0; k < 6; k++) {
      const y = 540 + k * 12;
      body += `<path d="M-20 ${y} Q400 ${f(y - between(rng, 10, 30))} 820 ${y}" fill="none" stroke="${p.rows}" stroke-width="3" stroke-opacity=".45"/>`;
    }
  }
  return { defs, body };
}

function lake(rng, p) {
  const shore = 420;
  const sx = between(rng, 180, 620);
  const sy = between(rng, 110, 200);
  const defs =
    linear('sky', p.sky) +
    linear('water', p.water) +
    `<clipPath id="lakeClip"><rect y="${shore}" width="${W}" height="${H - shore}"/></clipPath>`;
  const far = ridge(rng, 320, 110);
  const near = ridge(rng, 370, 70);
  let body = rect('url(#sky)');
  if (p.night) body += stars(rng, 130, 300);
  body += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${p.night ? 32 : 46}" fill="${p.sun}"/>`;
  body += `<path d="${far}" fill="${p.mountains[0]}"/><path d="${near}" fill="${p.mountains[1]}"/>`;
  body += rect('url(#water)', shore, H - shore);
  body += `<g clip-path="url(#lakeClip)" opacity=".4"><g transform="translate(0 ${shore * 2}) scale(1 -1)"><path d="${far}" fill="${p.mountains[0]}"/><path d="${near}" fill="${p.mountains[1]}"/></g></g>`;
  body += reflection(rng, sx, shore + (shore - sy) * 0.55, p.sun, 6);
  body += rect('#ffffff', shore, 1.5, 'opacity=".3"');
  return { defs, body };
}

// ---------- Styles (template + palette) ----------

const STYLES = [
  // Mountains
  { title: 'Sunrise Over the Peaks', alt: 'A sun rising behind layers of purple mountains.', draw: mountains,
    p: { sky: ['#2b3a67', '#d9667b', '#f6a65a', '#fde1a9'], glow: '#ffd27a', sun: '#fff4cf', layers: ['#b0577a', '#7d3f6d', '#4d2b57', '#2a1c3b'] } },
  { title: 'Alpine Morning', alt: 'Blue mountain ridges under a clear morning sky.', draw: mountains,
    p: { sky: ['#5d9fd6', '#9cc8ea', '#d6ecf7', '#f4f9fc'], glow: '#ffffff', sun: '#fffbe8', layers: ['#9fb8cf', '#6f8eab', '#4a6a88', '#2c465f'] } },
  { title: 'Mountain Dusk', alt: 'Purple mountains under a starry evening sky.', draw: mountains,
    p: { night: true, sky: ['#0d1b3a', '#3b2e6b', '#8a4f8c', '#e08a7a'], glow: '#e08a7a', sun: '#ffe2c4', layers: ['#5f4a86', '#43376b', '#2b2550', '#191736'] } },
  { title: 'Autumn Ridges', alt: 'Warm orange and red ridges under a golden sky.', draw: mountains,
    p: { sky: ['#f2b36b', '#f7cf8f', '#fbe5bd', '#fff3dc'], glow: '#ffe7b8', sun: '#fff6dd', layers: ['#d98a4e', '#b8572e', '#7e3320', '#4a1d14'] } },
  // Ocean
  { title: 'Ocean Sunset', alt: 'The sun setting on the horizon, reflected on calm water.', draw: ocean,
    p: { sky: ['#1d2f5c', '#c4577a', '#f59f62', '#ffd08a'], sea: ['#e07a6b', '#7a4d78', '#16284a'], sun: '#ffe7b0' } },
  { title: 'Moonlit Sea', alt: 'A full moon over a dark, starlit ocean.', draw: ocean,
    p: { night: true, sky: ['#040a18', '#0c1d3c', '#1d3a66', '#2c4f80'], sea: ['#3a5d8a', '#132a4c', '#050d1c'], sun: '#f4f1de' } },
  { title: 'Tropical Noon', alt: 'Turquoise sea under a bright blue sky with clouds.', draw: ocean,
    p: { high: true, sky: ['#2f7fd1', '#5fb0e8', '#a8dcf5', '#e6f7fc'], sea: ['#3cc4c8', '#1a8fb0', '#0b4f7a'], sun: '#fffbe6' } },
  { title: 'Pastel Morning Sea', alt: 'A soft pink and lilac sunrise over the sea.', draw: ocean,
    p: { sky: ['#9db8e8', '#e8b8d0', '#f8d4c0', '#fdebd8'], sea: ['#e6b5c4', '#9a9cc8', '#4e5f94'], sun: '#fff2dc', bird: '#4e5f94' } },
  // Forest
  { title: 'Misty Pine Forest', alt: 'Rows of pine trees fading into morning mist.', draw: forest,
    p: { sky: ['#cfe3dc', '#f2efe1'], ridge: '#a9c7bd', layers: ['#7fa89a', '#4f7d6e', '#24453c'], mist: '#f2efe1', sun: '#fffbea' } },
  { title: 'Autumn Woods', alt: 'A forest of pines in rust and amber tones.', draw: forest,
    p: { sky: ['#f6d3a8', '#fbeedc'], ridge: '#e3b48a', layers: ['#d0874f', '#a5532c', '#5a2a1a'], mist: '#fbeedc', sun: '#fff6e0' } },
  { title: 'Winter Pines', alt: 'Snowy blue pine forest under a pale winter sky.', draw: forest,
    p: { snow: true, sky: ['#c9dcef', '#f3f7fb'], ridge: '#dfe9f3', layers: ['#9fb6cc', '#6f8aa6', '#3b5470'], mist: '#ffffff', sun: '#ffffff' } },
  { title: 'Forest by Moonlight', alt: 'Dark pine silhouettes under the moon and stars.', draw: forest,
    p: { night: true, sky: ['#06101f', '#1b3150'], ridge: '#20344f', layers: ['#182a40', '#101f31', '#081320'], mist: '#3b5677', sun: '#f3efd6' } },
  // Dunes
  { title: 'Desert Dunes', alt: 'Rolling sand dunes in warm golden light.', draw: dunes,
    p: { sky: ['#6f9fd0', '#f3c58e', '#f7d9a6'], sun: '#fff1cf', dunes: [['#e7a462', '#c97a3f'], ['#d58b4c', '#a85a2c'], ['#b9683a', '#7d3d1f']] } },
  { title: 'Desert Night', alt: 'Moonlit dunes beneath a sky full of stars.', draw: dunes,
    p: { night: true, sky: ['#050b1c', '#1a2550', '#3b3a6e'], sun: '#f1ecd2', dunes: [['#5b4a78', '#3f3360'], ['#43365e', '#2c2448'], ['#2b2142', '#171128']] } },
  { title: 'Pink Sands', alt: 'Rose-colored dunes under a soft peach sky.', draw: dunes,
    p: { sky: ['#f6b6a8', '#fbd3c0', '#fde7d8'], sun: '#fff3e6', dunes: [['#efa58f', '#d97f6e'], ['#d98472', '#b75e55'], ['#b8584f', '#80363a']] } },
  // Aurora
  { title: 'Northern Lights', alt: 'Green and violet aurora over snowy mountains and a lake.', draw: aurora,
    p: { sky: ['#030914', '#0d2340', '#173a5c'], aurora: ['#3cf2a6', '#43c6f2', '#a77cf2'] } },
  { title: 'Violet Aurora', alt: 'Pink and purple aurora ribbons above mountains.', draw: aurora,
    p: { sky: ['#07051a', '#1d1240', '#2e2058'], aurora: ['#f27cc6', '#a77cf2', '#5c8cf2'] } },
  { title: 'Emerald Sky', alt: 'Bright green aurora glowing over a quiet lake.', draw: aurora,
    p: { sky: ['#020c0c', '#0a2a2a', '#123c3f'], aurora: ['#7cf29a', '#3cf2d0', '#3c9af2'] } },
  // City
  { title: 'City Lights', alt: 'A city skyline with lit windows under a full moon and stars.', draw: city,
    p: { night: true, sky: ['#050b1a', '#13284d', '#2f4f80'], far: '#1c2c4a', building: '#0e1a2e', windows: ['#ffd27a'], sun: '#fdf6d8' } },
  { title: 'City at Sunset', alt: 'A skyline silhouetted against a pink and orange sunset.', draw: city,
    p: { sky: ['#2a2a5a', '#b2507a', '#f08a5d', '#ffc98a'], far: '#6a3a6a', building: '#2a1a3a', windows: ['#ffe0a0'], sun: '#ffe2b0' } },
  { title: 'Neon Nights', alt: 'A purple city skyline with pink and cyan neon windows.', draw: city,
    p: { night: true, sky: ['#0a0418', '#2a0e4a', '#4a1a6a'], far: '#2a1550', building: '#120826', windows: ['#ff5ec8', '#5ee8ff'], sun: '#f6e9ff' } },
  // Palms
  { title: 'Florida Coast', alt: 'Palm trees silhouetted against a sunset over the ocean.', draw: palms,
    p: { sky: ['#003366', '#6a4b8a', '#e0705f', '#ffc27a'], sea: ['#f08a6a', '#5b4a80', '#0b2547'], sun: '#ffd99a', ground: '#0a1426', trees: '#0a1426' } },
  { title: 'Tropical Day', alt: 'Green palms on a sandy beach by a turquoise sea.', draw: palms,
    p: { day: true, sky: ['#2f8fe0', '#7cc4f0', '#d2effa'], sea: ['#40d0c8', '#1a96b8', '#0c5a85'], sun: '#fffbe0', ground: '#f2d7a0', trees: '#1f5a3e' } },
  { title: 'Palms at Night', alt: 'Palm silhouettes under the moon beside a dark sea.', draw: palms,
    p: { night: true, sky: ['#030a1a', '#0f2346', '#1f3c6a'], sea: ['#2a4a7a', '#0f2240', '#040a16'], sun: '#f6f2dc', ground: '#02060f', trees: '#02060f' } },
  // Hills
  { title: 'Rolling Hills', alt: 'Green rolling hills under a blue sky with clouds.', draw: hills,
    p: { clouds: true, sky: ['#8fc3ea', '#d8eef8'], hills: ['#a8d58a', '#7fbf6a', '#56a052', '#2f7a3e'], sun: '#fff8d8' } },
  { title: 'Lavender Fields', alt: 'Rows of lavender on purple hills at sunset.', draw: hills,
    p: { sky: ['#7b6fb8', '#e8a8c0', '#f8d8c8'], hills: ['#b9a0dc', '#9a7cc8', '#7656ad', '#4e357f'], sun: '#fff0d8', rows: '#d9c6f2' } },
  { title: 'Golden Fields', alt: 'Golden wheat-colored hills under a warm sky.', draw: hills,
    p: { sky: ['#f5b874', '#fadca8', '#fdf0d4'], hills: ['#e8c46a', '#d6a648', '#b98432', '#87591f'], sun: '#fff5dc', rows: '#f7dc94' } },
  // Lake
  { title: 'Moonlit Lake', alt: 'Mountains and the moon reflected in a still lake at night.', draw: lake,
    p: { night: true, sky: ['#060d1f', '#162b52', '#2b4a7a'], water: ['#1d3560', '#08142a'], mountains: ['#22365a', '#152542'], sun: '#f6f1d9' } },
  { title: 'Still Lake at Dawn', alt: 'Soft blue mountains mirrored in a calm lake at sunrise.', draw: lake,
    p: { sky: ['#f0b8a8', '#f8d8c0', '#dfe8f0'], water: ['#b8c4dc', '#6c7ca0'], mountains: ['#9aa8c4', '#6c7ca0'], sun: '#fff3e0' } },
];

const CLASSICS = [
  'Florida Coast', 'Sunrise Over the Peaks', 'Misty Pine Forest', 'Ocean Sunset', 'Northern Lights',
  'Desert Dunes', 'City Lights', 'Rolling Hills', 'Moonlit Lake', 'Lavender Fields',
];

export const WEEKLY_COUNT = 10;

function render(style, seed) {
  const { defs, body } = style.draw(mulberry32(seed), style.p);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Returns 20 artworks: this week's 10 new pieces first, then the 10 classics.
export function artworkForWeek(week = currentWeek()) {
  const classics = STYLES.filter((s) => CLASSICS.includes(s.title));
  const pool = STYLES.filter((s) => !CLASSICS.includes(s.title));
  const weekly = shuffle(pool, mulberry32(week * 7919)).slice(0, WEEKLY_COUNT);
  return [
    ...weekly.map((s) => ({ title: s.title, alt: s.alt, src: render(s, hash(s.title) ^ week), isNew: true })),
    ...classics.map((s) => ({ title: s.title, alt: s.alt, src: render(s, hash(s.title)), isNew: false })),
  ];
}
