// Procedural textures: Proconnesian marble, incised board, wool, wood, brick, tiles.
import * as THREE from 'three';

export function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Noise {
  constructor(seed = 1) {
    const r = mulberry(seed);
    this.perm = new Uint8Array(512);
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.g = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.g[i] = r();
  }
  // value noise, optionally periodic (period in lattice cells)
  v(x, y, px = 256, py = 256) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const P = this.perm, G = this.g;
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    const y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = G[P[P[x0 & 255] + (y0 & 255)]], b = G[P[P[x1 & 255] + (y0 & 255)]];
    const c = G[P[P[x0 & 255] + (y1 & 255)]], d = G[P[P[x1 & 255] + (y1 & 255)]];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }
  fbm(x, y, oct = 5, px = 256, py = 256) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) {
      s += a * this.v(x * f, y * f, px * f, py * f); n += a; a *= 0.5; f *= 2;
    }
    return s / n;
  }
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function heightToNormal(h, w, hh, strength, wrap) {
  const img = new ImageData(w, hh);
  const d = img.data;
  const at = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + hh) % hh; }
    else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(hh - 1, y)); }
    return h[y * w + x];
  };
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    d[i] = (dx / l * 0.5 + 0.5) * 255;
    d[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    d[i + 3] = 255;
  }
  return img;
}

function toTex(img, srgb, repeat) {
  const c = canvas(img.width, img.height);
  c.getContext('2d').putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// Grey-veined Proconnesian marble colour at (x,y) in metres
function marbleColor(n, x, y, out) {
  const m = n.fbm(x * 9, y * 9, 4);
  const band = n.fbm(x * 2.2 + 30, y * 14, 4);
  const t = Math.sin((y * 34 + x * 6) + band * 9);
  const vein = Math.pow(1 - Math.abs(t), 6) * 0.55;
  const fine = n.v(x * 160, y * 160);
  let g = 0.70 + (m - 0.5) * 0.2 - vein * 0.32 + (fine - 0.5) * 0.05;
  out[0] = g * 0.98; out[1] = g * 0.97; out[2] = g * 0.93;
  // ochre patina from centuries of handling and earth
  const pat = smooth(0.55, 0.8, n.fbm(x * 5 + 7, y * 5 + 3, 3));
  out[0] = out[0] * (1 - pat * 0.12) + 0.62 * pat * 0.12;
  out[1] = out[1] * (1 - pat * 0.12) + 0.55 * pat * 0.12;
  out[2] = out[2] * (1 - pat * 0.12) + 0.42 * pat * 0.12;
  return out;
}

// The playing field: incised squares like the İznik slab, with three hexafoil rosettes.
export function makeBoardTop(geo) {
  const { innerW, innerD, cellXZ, rowZ, cellHalf } = geo;
  const PX = 1900; // px per metre
  const W = Math.round(innerW * PX), H = Math.round(innerD * PX);
  const n = new Noise(7), n2 = new Noise(19);
  const height = new Float32Array(W * H);
  const col = new ImageData(W, H), rough = new ImageData(W, H);
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) cells.push(cellXZ(r, c));
  const rnd = mulberry(5);
  const pits = [...Array(420)].map(() => ({
    x: (rnd() - 0.5) * innerW, z: (rnd() - 0.5) * innerD, r: 0.0006 + rnd() * rnd() * 0.004, d: 0.3 + rnd() * 0.7,
  }));
  const scratches = [...Array(60)].map(() => {
    const a = rnd() * Math.PI;
    return { x: (rnd() - 0.5) * innerW, z: (rnd() - 0.5) * innerD, dx: Math.cos(a), dz: Math.sin(a), len: 0.01 + rnd() * 0.08 };
  });
  const groove = 0.0013;
  const rc = [0, 0, 0];
  for (let py = 0; py < H; py++) {
    const z = (py / H - 0.5) * innerD;
    for (let px = 0; px < W; px++) {
      const x = (px / W - 0.5) * innerW;
      marbleColor(n, x, z, rc);
      let h = (n2.fbm(x * 60, z * 60, 4) - 0.5) * 0.25;
      let g = 0; // groove depth 0..1
      // incised squares: hand-cut, slightly wavy
      const row = Math.round((rowZ[0] - z) / (rowZ[0] - rowZ[1]));
      if (row >= 0 && row <= 2 && Math.abs(z - rowZ[row]) < cellHalf + 0.005) {
        for (let c = 0; c < 12; c++) {
          const p = cells[row * 12 + c];
          const dx = x - p.x, dz = z - p.z;
          if (Math.abs(dx) > cellHalf + 0.004) continue;
          const wob = (n.v(x * 120 + c * 3, z * 120 + row * 5) - 0.5) * 0.0012;
          const dq = Math.abs(Math.max(Math.abs(dx), Math.abs(dz)) - cellHalf - wob);
          if (dq < groove) g = Math.max(g, 1 - (dq / groove) ** 2);
        }
        // hexafoil "daisy wheel" rosette in the central gap
        const R = 0.026, dz0 = z - rowZ[row], d0 = Math.hypot(x, dz0);
        if (d0 < R + groove) {
          const ring = Math.abs(d0 - R);
          if (ring < groove) g = Math.max(g, 1 - (ring / groove) ** 2);
          for (let k = 0; k < 6; k++) {
            const a = k * Math.PI / 3;
            const dd = Math.abs(Math.hypot(x - Math.cos(a) * R, dz0 - Math.sin(a) * R) - R);
            if (dd < groove * 0.8 && d0 < R) g = Math.max(g, 0.85 * (1 - (dd / (groove * 0.8)) ** 2));
          }
        }
      }
      // pits and scratches
      let dark = 0;
      for (const pt of pits) {
        const dx = x - pt.x, dz = z - pt.z;
        if (Math.abs(dx) > pt.r || Math.abs(dz) > pt.r) continue;
        const d = Math.hypot(dx, dz) / pt.r;
        if (d < 1) { h -= (1 - d * d) * pt.d; dark = Math.max(dark, (1 - d) * 0.5 * pt.d); }
      }
      for (const s of scratches) {
        const rx = x - s.x, rz = z - s.z;
        const along = rx * s.dx + rz * s.dz;
        if (along < 0 || along > s.len) continue;
        const across = Math.abs(-rx * s.dz + rz * s.dx);
        if (across < 0.0004) { h -= 0.25 * (1 - across / 0.0004); dark = Math.max(dark, 0.12); }
      }
      h -= g * 1.6;
      const i = py * W + px;
      height[i] = h;
      // central area is polished by hands; grooves keep dirt
      const wear = 1 - smooth(0.12, 0.4, Math.hypot(x / innerW * 2, z / innerD * 2) * 0.5);
      const dirt = g * 0.45 + dark;
      const o = i * 4;
      col.data[o] = Math.min(255, rc[0] * (1 - dirt) * 255 * (1 + wear * 0.03));
      col.data[o + 1] = Math.min(255, rc[1] * (1 - dirt * 1.02) * 255 * (1 + wear * 0.03));
      col.data[o + 2] = Math.min(255, rc[2] * (1 - dirt * 1.08) * 255);
      col.data[o + 3] = 255;
      const ro = 0.5 - wear * 0.18 + g * 0.35 + (n2.v(x * 300, z * 300) - 0.5) * 0.12;
      rough.data[o] = 255; rough.data[o + 1] = Math.max(0, Math.min(255, ro * 255)); rough.data[o + 2] = 0; rough.data[o + 3] = 255;
    }
  }
  return {
    map: toTex(col, true),
    normalMap: toTex(heightToNormal(height, W, H, 1.2, false), false),
    roughnessMap: toTex(rough, false),
  };
}

// Rough-hewn stone for the slab sides & rims (tileable, 1 tile ≈ 0.5 m)
export function makeHewnStone(seed = 3, tint = [1, 1, 1], size = 512, metres = 0.5) {
  const n = new Noise(seed);
  const height = new Float32Array(size * size);
  const col = new ImageData(size, size), rough = new ImageData(size, size);
  const rc = [0, 0, 0];
  const P = 8;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const X = u * metres, Y = v * metres;
    const f = n.fbm(u * P, v * P, 5, P, P);
    const chis = Math.sin((u * 44 + n.fbm(u * 4, v * 4, 2, 4, 4) * 3) * Math.PI * 2) * 0.5 + 0.5;
    const h = f * 1.4 + chis * 0.18 + n.fbm(u * 64, v * 64, 2, 64, 64) * 0.35;
    height[y * size + x] = h;
    // tileable colour via periodic noise only
    const m = n.fbm(u * 4 + 11, v * 4 + 5, 4, 4, 4);
    const band = Math.sin((v * 6 + m * 2.5) * Math.PI * 2);
    const vein = Math.pow(1 - Math.abs(band), 7) * 0.4;
    let g = 0.74 + (m - 0.5) * 0.25 - vein * 0.25 + (f - 0.5) * 0.15;
    rc[0] = g * 0.98 * tint[0]; rc[1] = g * 0.965 * tint[1]; rc[2] = g * 0.92 * tint[2];
    const o = (y * size + x) * 4;
    const ao = 0.75 + h * 0.2;
    col.data[o] = Math.min(255, rc[0] * ao * 255);
    col.data[o + 1] = Math.min(255, rc[1] * ao * 255);
    col.data[o + 2] = Math.min(255, rc[2] * ao * 255);
    col.data[o + 3] = 255;
    rough.data[o] = 255; rough.data[o + 1] = 200 + f * 50; rough.data[o + 3] = 255;
  }
  return {
    map: toTex(col, true, true),
    normalMap: toTex(heightToNormal(height, size, size, 5, true), false, true),
    roughnessMap: toTex(rough, false, true),
  };
}

// Turned/planed wood (walnut / oak)
export function makeWood(base = [0.42, 0.27, 0.15], seed = 9) {
  const S = 512, n = new Noise(seed);
  const col = new ImageData(S, S), height = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const w = n.fbm(u * 2, v * 16, 4, 2, 16);
    const ring = Math.sin((u * 18 + w * 4) * Math.PI * 2) * 0.5 + 0.5;
    const fib = n.v(u * 200, v * 6, 200, 6);
    const k = 0.75 + ring * 0.25 - fib * 0.12;
    const o = (y * S + x) * 4;
    col.data[o] = base[0] * k * 255; col.data[o + 1] = base[1] * k * 255; col.data[o + 2] = base[2] * k * 255; col.data[o + 3] = 255;
    height[y * S + x] = ring * 0.4 + fib * 0.6;
  }
  return { map: toTex(col, true, true), normalMap: toTex(heightToNormal(height, S, S, 2, true), false, true) };
}

// Hand-woven wool, optionally with clavi (the two vertical stripes of a late-Roman tunic).
// On a LatheGeometry, u=0 faces forward, so clavi sit at u≈±0.07 front and 0.43/0.57 back.
export function makeWool(rgb, opts = {}) {
  const S = 512, n = new Noise(opts.seed || 2);
  const col = new ImageData(S, S), height = new Float32Array(S * S);
  const cl = opts.clavi;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const weave = (Math.sin(u * S * Math.PI * 0.5) * Math.sin(v * S * Math.PI * 0.5)) * 0.5 + 0.5;
    const dye = n.fbm(u * 6, v * 6, 4, 6, 6);
    const slub = n.v(u * 8, v * 220, 8, 220);
    let c = rgb;
    if (cl) {
      for (const cu of [0.07, 0.93, 0.43, 0.57]) {
        const du = Math.min(Math.abs(u - cu), 1 - Math.abs(u - cu));
        if (du < 0.022 && v > 0.08) c = cl;
      }
    }
    if (opts.hem && (v > 1 - opts.hem[0])) c = opts.hem[1];
    const k = 0.86 + (dye - 0.5) * 0.18 + weave * 0.06 + (slub - 0.5) * 0.08;
    const o = (y * S + x) * 4;
    col.data[o] = Math.min(255, c[0] * k * 255);
    col.data[o + 1] = Math.min(255, c[1] * k * 255);
    col.data[o + 2] = Math.min(255, c[2] * k * 255);
    col.data[o + 3] = 255;
    height[y * S + x] = weave * 0.6 + slub * 0.4;
  }
  return { map: toTex(col, true, true), normalMap: toTex(heightToNormal(height, S, S, 1.6, true), false, true) };
}

// Terrace paving: large limestone slabs, tile = 4 m
export function makePaving() {
  const S = 1024, n = new Noise(31), r = mulberry(31);
  const c = canvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#6d6052'; g.fillRect(0, 0, S, S);
  const rows = 5;
  const height = new Float32Array(S * S).fill(-1);
  for (let ri = 0; ri < rows; ri++) {
    const y0 = ri * S / rows, hgt = S / rows;
    let x = -r() * 150;
    while (x < S) {
      const w = 140 + r() * 180;
      const t = 0.82 + r() * 0.14;
      const tone = [200 * t, 186 * t, 160 * t];
      g.fillStyle = `rgb(${tone[0] | 0},${tone[1] | 0},${tone[2] | 0})`;
      const drawAt = (xx) => g.fillRect(xx + 3, y0 + 3, w - 6, hgt - 6);
      drawAt(x); if (x < 0) drawAt(x + S); if (x + w > S) drawAt(x - S);
      x += w;
    }
  }
  const img = g.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const o = (y * S + x) * 4;
    const isJoint = img.data[o] < 120;
    const f = n.fbm(x / S * 16, y / S * 16, 5, 16, 16);
    const k = 0.82 + f * 0.3;
    img.data[o] *= k; img.data[o + 1] *= k; img.data[o + 2] *= k * 0.98;
    height[y * S + x] = isJoint ? -1 : f * 0.8;
  }
  return { map: toTex(img, true, true), normalMap: toTex(heightToNormal(height, S, S, 3, true), false, true) };
}

// Late-Roman city wall: ashlar courses alternating with brick bands (opus mixtum). Tile ≈ 6 m.
export function makeWallTex() {
  const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = mulberry(4);
  g.fillStyle = '#8d7f6c'; g.fillRect(0, 0, S, S);
  let y = 0;
  const unit = S / 6;
  while (y < S) {
    // three stone courses
    for (let k = 0; k < 3 && y < S; k++) {
      const h = unit * 0.38;
      let x = -r() * 40;
      while (x < S) {
        const w = unit * (0.5 + r() * 0.5);
        const t = 0.75 + r() * 0.2;
        g.fillStyle = `rgb(${(196 * t) | 0},${(182 * t) | 0},${(156 * t) | 0})`;
        g.fillRect(x + 1, y + 1, w - 2, h - 2);
        x += w;
      }
      y += h;
    }
    // five brick courses
    for (let k = 0; k < 5 && y < S; k++) {
      const h = unit * 0.07;
      let x = -r() * 20;
      while (x < S) {
        const w = unit * 0.33;
        const t = 0.8 + r() * 0.25;
        g.fillStyle = `rgb(${(170 * t) | 0},${(82 * t) | 0},${(52 * t) | 0})`;
        g.fillRect(x + 1, y + 1, w - 2, h - 1.5);
        x += w;
      }
      y += h;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

// Terracotta tegulae & imbrices
export function makeRoofTex() {
  const S = 256, c = canvas(S, S), g = c.getContext('2d'), r = mulberry(8);
  for (let x = 0; x < S; x += 16) {
    const t = 0.85 + r() * 0.2;
    const grd = g.createLinearGradient(x, 0, x + 16, 0);
    grd.addColorStop(0, `rgb(${(120 * t) | 0},${(52 * t) | 0},${(32 * t) | 0})`);
    grd.addColorStop(0.5, `rgb(${(196 * t) | 0},${(98 * t) | 0},${(60 * t) | 0})`);
    grd.addColorStop(1, `rgb(${(120 * t) | 0},${(52 * t) | 0},${(32 * t) | 0})`);
    g.fillStyle = grd; g.fillRect(x, 0, 16, S);
  }
  for (let y = 0; y < S; y += 32) { g.fillStyle = 'rgba(40,15,8,0.35)'; g.fillRect(0, y, S, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Bone dice with ring-and-dot pips, as found across the Roman world
export function makeDieFaces() {
  const layout = {
    1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
    6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
  };
  const out = {};
  for (let v = 1; v <= 6; v++) {
    const S = 128, c = canvas(S, S), g = c.getContext('2d'), n = new Noise(40 + v);
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const f = n.fbm(x / 40, y / 40, 4);
      const streak = n.v(x / 6, y / 60);
      const o = (y * S + x) * 4;
      img.data[o] = 214 + f * 30 - streak * 20; img.data[o + 1] = 196 + f * 28 - streak * 22; img.data[o + 2] = 160 + f * 20 - streak * 25; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (const [px, py] of layout[v]) {
      g.strokeStyle = '#3b2a1c'; g.lineWidth = 4.5;
      g.beginPath(); g.arc(px * S, py * S, 11, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#2a1c12'; g.beginPath(); g.arc(px * S, py * S, 3.5, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    out[v] = t;
  }
  return out;
}

// Vine leaf with alpha, for the pergola
export function makeLeafTex() {
  const S = 128, c = canvas(S, S), g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const grd = g.createRadialGradient(0, 0, 4, 0, 0, 60);
  grd.addColorStop(0, '#5b7a2c'); grd.addColorStop(1, '#2f4a17');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const lobes = 0.72 + 0.28 * Math.abs(Math.cos(a * 2.5));
    const teeth = 1 + 0.05 * Math.sin(a * 30);
    const r = 56 * lobes * teeth;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.fill();
  g.strokeStyle = 'rgba(190,210,120,0.5)'; g.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.7; g.beginPath(); g.moveTo(0, 30); g.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeHairTex(rgb) {
  const S = 256, n = new Noise(77);
  const col = new ImageData(S, S), height = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const curl = n.fbm(u * 24, v * 24, 3, 24, 24);
    const k = 0.7 + curl * 0.5;
    const o = (y * S + x) * 4;
    col.data[o] = rgb[0] * k * 255; col.data[o + 1] = rgb[1] * k * 255; col.data[o + 2] = rgb[2] * k * 255; col.data[o + 3] = 255;
    height[y * S + x] = curl;
  }
  return { map: toTex(col, true, true), normalMap: toTex(heightToNormal(height, S, S, 6, true), false, true) };
}

export function makeSkinNormal() {
  const S = 256, n = new Noise(55), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = n.fbm(x / S * 40, y / S * 40, 3, 40, 40);
  return toTex(heightToNormal(h, S, S, 1.2, true), false, true);
}

export function makeLabel(text) {
  const c = canvas(128, 64), g = c.getContext('2d');
  g.fillStyle = 'rgba(30,20,12,0.72)';
  g.beginPath(); g.roundRect(14, 8, 100, 48, 22); g.fill();
  g.fillStyle = '#f1e2c0'; g.font = '600 34px Cinzel, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
