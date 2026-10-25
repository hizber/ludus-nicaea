// Two seated Nicaeans of the early 4th century.
//  • Elder: Greek-speaking citizen in tunic and himation, full beard (philosopher's fashion of the East).
//  • Younger: long-sleeved tunica with purple clavi, chlamys pinned by a crossbow fibula, leather belt,
//    leg wrappings and closed calcei — the dress of a Constantinian official.
// Built procedurally, with a simple two-bone IK so the hands really reach for counters and dice.
import * as THREE from 'three';
import { Noise, makeWool, makeHairTex, makeSkinNormal } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x) => Math.exp(-x * x);
const noise = new Noise(17);

function headGeometry(seed) {
  const g = new THREE.SphereGeometry(1, 96, 72);
  const p = g.attributes.position;
  const n2 = new Noise(seed);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const jaw = smooth(0.05, -1, y);
    x *= 1 - 0.30 * jaw * jaw;
    if (z < 0) z *= 1 - 0.5 * jaw * jaw;
    if (z > 0.55) z = 0.55 + (z - 0.55) * 0.72;
    let X = x * 0.074, Y = y * 0.104, Z = z * (z < 0 ? 0.1 : 0.094);
    const f = Math.max(0, z) ** 2;
    // nose
    const noseY = smooth(0.03, -0.03, Y) * smooth(-0.058, -0.035, Y);
    Z += 0.024 * gauss(X / (0.009 + 0.006 * smooth(0.02, -0.04, Y))) * noseY * f;
    Z += 0.006 * gauss(X / 0.016) * gauss((Y + 0.04) / 0.008) * f; // nose tip / alae
    // brow ridge, sockets, cheekbones
    Z += 0.006 * gauss((Y - 0.03) / 0.011) * gauss(X / 0.05) * f;
    for (const s of [-1, 1]) {
      Z -= 0.009 * gauss((X - s * 0.031) / 0.015) * gauss((Y - 0.012) / 0.012) * f;
      Z += 0.004 * gauss((X - s * 0.046) / 0.015) * gauss((Y + 0.018) / 0.014) * f;
    }
    // mouth & chin
    Z += 0.005 * gauss(X / 0.022) * gauss((Y + 0.062) / 0.009) * f;
    Z -= 0.0025 * gauss(X / 0.02) * gauss((Y + 0.064) / 0.0025) * f;
    Z += 0.007 * gauss(X / 0.022) * gauss((Y + 0.092) / 0.013) * f;
    Z += (n2.v(x * 9, y * 9 + z * 9) - 0.5) * 0.0015;
    p.setXYZ(i, X, Y, Z);
  }
  g.computeVertexNormals();
  return g;
}

// Offset a copy of the head outward where mask>0, inward (hidden) elsewhere: hair & beard that fit exactly.
function shell(headG, mask, thick, curl) {
  const g = headG.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const m = mask(x, y, z);
    const c = (noise.v(x * 260 + y * 40, y * 260 + z * 200) - 0.5) * curl;
    const off = m > 0 ? (thick + c) * m : -0.004;
    p.setXYZ(i, x + n.getX(i) * off, y + n.getY(i) * off, z + n.getZ(i) * off);
  }
  g.computeVertexNormals();
  return g;
}

function lathe(points, seg = 40) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

function folds(geo, amp, freq, axis = 'y') {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z);
    const k = amp * (Math.sin(a * freq + noise.v(y * 8, a) * 3) * 0.6 + (noise.v(a * 3, y * 12) - 0.5));
    const r = Math.hypot(x, z) || 1;
    p.setX(i, x + (x / r) * k); p.setZ(i, z + (z / r) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// A flattened cloth band following a curve (for the himation and chlamys)
function ribbon(points, width, thick, foldAmp) {
  const curve = new THREE.CatmullRomCurve3(points);
  const N = 60, M = 10;
  const frames = curve.computeFrenetFrames(N, false);
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= N; i++) {
    const c = curve.getPointAt(i / N);
    const nrm = frames.normals[i], bin = frames.binormals[i];
    for (let side = 0; side < 2; side++) {
      for (let j = 0; j <= M; j++) {
        const t = j / M - 0.5;
        const fold = Math.sin(t * Math.PI * 4 + i * 0.3) * foldAmp;
        const o = side === 0 ? thick / 2 : -thick / 2;
        const v = c.clone().addScaledVector(bin, t * width).addScaledVector(nrm, o + fold);
        pos.push(v.x, v.y, v.z);
        uv.push(j / M, i / N * 3);
      }
    }
  }
  const row = (M + 1) * 2;
  for (let i = 0; i < N; i++) for (let side = 0; side < 2; side++) for (let j = 0; j < M; j++) {
    const a = i * row + side * (M + 1) + j, b = a + 1, c = a + row, d = c + 1;
    if (side === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function handGeometry() {
  // palm on local -z, fingers along -y, thumb toward +x (mirrored for the left hand)
  const parts = [];
  const palm = new THREE.SphereGeometry(1, 16, 12); palm.scale(0.042, 0.05, 0.016); palm.translate(0, -0.045, 0);
  parts.push(palm);
  for (let k = 0; k < 4; k++) {
    const f = new THREE.CapsuleGeometry(0.0085, 0.05 - Math.abs(k - 1.5) * 0.008, 4, 8);
    f.rotateX(0.35); f.translate(-0.027 + k * 0.018, -0.115 + Math.abs(k - 1.5) * 0.004, -0.012);
    parts.push(f);
  }
  const th = new THREE.CapsuleGeometry(0.01, 0.04, 4, 8); th.rotateZ(0.7); th.translate(0.045, -0.055, -0.012);
  parts.push(th);
  const out = new THREE.BufferGeometry();
  // merge manually (geometries share attribute layout)
  const pos = [], nor = [], idx = [];
  let base = 0;
  for (const g of parts) {
    const gi = g.index ? g : g.toNonIndexed();
    const pp = gi.attributes.position, nn = gi.attributes.normal;
    for (let i = 0; i < pp.count; i++) { pos.push(pp.getX(i), pp.getY(i), pp.getZ(i)); nor.push(nn.getX(i), nn.getY(i), nn.getZ(i)); }
    if (gi.index) for (let i = 0; i < gi.index.count; i++) idx.push(gi.index.getX(i) + base);
    base += pp.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

const L1 = 0.29, L2 = 0.27;

export function buildPerson(kind) {
  const elder = kind === 'elder';
  const root = new THREE.Group();
  const skinTone = elder ? 0xb07c58 : 0xc28d66;
  const skin = new THREE.MeshPhysicalMaterial({
    color: skinTone, roughness: 0.58, normalMap: makeSkinNormal(), normalScale: new THREE.Vector2(0.25, 0.25),
    sheen: 0.4, sheenColor: new THREE.Color(0xc8604a), sheenRoughness: 0.6, clearcoat: 0.04,
  });
  const tunicTex = elder
    ? makeWool([0.86, 0.82, 0.72], { seed: 3, clavi: [0.42, 0.22, 0.18] })
    : makeWool([0.88, 0.85, 0.77], { seed: 4, clavi: [0.30, 0.12, 0.26] });
  const tunic = new THREE.MeshStandardMaterial({ map: tunicTex.map, normalMap: tunicTex.normalMap, roughness: 0.95 });
  const plainT = elder ? makeWool([0.86, 0.82, 0.72], { seed: 3 }) : makeWool([0.88, 0.85, 0.77], { seed: 4 });
  const sleeve = new THREE.MeshStandardMaterial({ map: plainT.map, normalMap: plainT.normalMap, roughness: 0.95 });
  const mantleTex = elder ? makeWool([0.58, 0.40, 0.20], { seed: 6, hem: [0.03, [0.36, 0.22, 0.12]] }) : makeWool([0.42, 0.13, 0.11], { seed: 8 });
  const mantle = new THREE.MeshStandardMaterial({ map: mantleTex.map, normalMap: mantleTex.normalMap, roughness: 0.95, side: THREE.DoubleSide });
  const hairT = makeHairTex(elder ? [0.5, 0.47, 0.44] : [0.13, 0.09, 0.06]);
  const hair = new THREE.MeshStandardMaterial({ map: hairT.map, normalMap: hairT.normalMap, roughness: 0.75 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3b2516, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.3 });
  const wraps = new THREE.MeshStandardMaterial({ map: makeWool([0.78, 0.74, 0.64], { seed: 12 }).map, roughness: 1 });
  const eyeW = new THREE.MeshPhysicalMaterial({ color: 0xe8e2d8, roughness: 0.15, clearcoat: 1 });
  const iris = new THREE.MeshPhysicalMaterial({ color: elder ? 0x3a2a1a : 0x2a1a0e, roughness: 0.1, clearcoat: 1 });

  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };

  // ---- pelvis, legs
  const pelvis = new THREE.Group(); pelvis.position.set(0, 0.5, 0); root.add(pelvis);
  const lapMat = elder ? mantle : tunic;
  const lapG = new THREE.CapsuleGeometry(0.085, 0.38, 8, 20); lapG.rotateX(Math.PI / 2);
  for (const s of [-1, 1]) {
    const thigh = add(pelvis, folds(lapG.clone(), 0.006, 7), lapMat, s * 0.1, 0.03, 0.2);
    thigh.scale.set(1.15, 0.95, 1);
  }
  // cloth bridging the thighs and falling over the knees
  const lapTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.42, 6, 2, 8), lapMat);
  lapTop.position.set(0, 0.07, 0.2); lapTop.castShadow = true; pelvis.add(lapTop);
  const drapeG = new THREE.CylinderGeometry(0.21, 0.25, 0.28, 32, 6, true, -Math.PI * 0.5, Math.PI);
  folds(drapeG, 0.01, 11);
  const drape = add(pelvis, drapeG, lapMat, 0, -0.1, 0.36);
  drape.scale.set(1, 1, 0.55);
  const hip = add(pelvis, new THREE.SphereGeometry(0.18, 24, 16), lapMat, 0, 0.04, -0.02);
  hip.scale.set(1.05, 0.55, 0.85);

  for (const s of [-1, 1]) {
    const shin = add(pelvis, new THREE.CylinderGeometry(0.048, 0.034, 0.42, 16), elder ? skin : wraps, s * 0.11, -0.25, 0.46);
    shin.rotation.x = 0.05;
    if (!elder) for (let k = 0; k < 6; k++) { // wrapping bands
      const band = add(pelvis, new THREE.TorusGeometry(0.044 - k * 0.002, 0.004, 6, 20), wraps, s * 0.11, -0.1 - k * 0.055, 0.465);
      band.rotation.x = Math.PI / 2 + 0.3 * (k % 2 ? 1 : -1);
    }
    const foot = add(pelvis, new THREE.SphereGeometry(1, 16, 12), elder ? skin : leather, s * 0.115, -0.46, 0.52);
    foot.scale.set(0.045, 0.035, 0.11);
    if (elder) {
      const sole = add(pelvis, new THREE.BoxGeometry(0.085, 0.012, 0.23), leather, s * 0.115, -0.49, 0.53);
      for (let k = 0; k < 3; k++) { const st = add(pelvis, new THREE.TorusGeometry(0.047, 0.004, 6, 16, Math.PI), leather, s * 0.115, -0.485, 0.47 + k * 0.05); st.scale.set(1, 0.8, 1); }
    }
  }

  // ---- torso (leans toward the table)
  const torso = new THREE.Group(); torso.position.set(0, 0.04, -0.02); pelvis.add(torso);
  const chestG = lathe([[0.001, 0], [0.16, 0.01], [0.15, 0.12], [0.145, 0.22], [0.16, 0.34], [0.17, 0.43], [0.16, 0.5], [0.11, 0.54], [0.055, 0.565], [0.001, 0.57]], 48);
  folds(chestG, 0.003, 9);
  const chest = add(torso, chestG, tunic, 0, 0, 0);
  chest.scale.set(1, 1, 0.68);
  if (!elder) {
    const belt = add(torso, new THREE.TorusGeometry(0.148, 0.012, 8, 40), leather, 0, 0.13, 0);
    belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.7, 1);
    add(torso, new THREE.BoxGeometry(0.03, 0.024, 0.008), gold, 0, 0.13, 0.106);
  }
  const neck = add(torso, new THREE.CylinderGeometry(0.055, 0.068, 0.12, 20), skin, 0, 0.59, 0.005);

  // ---- head
  const headPivot = new THREE.Group(); headPivot.position.set(0, 0.64, 0.01); torso.add(headPivot);
  const head = new THREE.Group(); head.position.set(0, 0.085, 0.012); headPivot.add(head);
  const hg = headGeometry(elder ? 11 : 13);
  add(head, hg, skin);
  for (const s of [-1, 1]) {
    const eye = add(head, new THREE.SphereGeometry(0.0096, 20, 14), eyeW, s * 0.031, 0.01, 0.071);
    add(eye, new THREE.SphereGeometry(0.0049, 16, 10), iris, 0, 0, 0.0068);
    const lid = add(head, new THREE.SphereGeometry(0.0108, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), skin, s * 0.031, 0.011, 0.071);
    lid.rotation.x = 0.55;
    const brow = add(head, new THREE.CapsuleGeometry(0.0035, 0.024, 3, 6), hair, s * 0.031, 0.034, 0.083);
    brow.rotation.z = Math.PI / 2 + s * 0.12;
    const ear = add(head, new THREE.SphereGeometry(1, 12, 10), skin, s * 0.074, 0.0, -0.008);
    ear.scale.set(0.01, 0.03, 0.019);
  }
  // hair: Constantinian cap with fringe for the young man; receding, curly for the elder
  // masks work on the direction from the head centre (n = normalised, in head proportions)
  const dir = (x, y, z) => { const a = x / 0.074, b = y / 0.104, c = z / 0.094, l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
  const hairMask = (x, y, z) => {
    const [nx, ny, nz] = dir(x, y, z);
    const front = smooth(-0.1, 0.8, nz);
    const line = elder ? -0.25 + front * 0.95 : -0.42 + front * 0.82; // nape → forehead hairline
    const ear = gauss(nx * 0) * smooth(0.55, 0.9, Math.abs(nx)) * smooth(0.2, -0.3, ny) * 0.25; // clear the ears
    return smooth(line, line + 0.08, ny + ear * -1);
  };
  add(head, shell(hg, hairMask, elder ? 0.0075 : 0.009, elder ? 0.004 : 0.003), hair);
  if (elder) {
    const beardMask = (x, y, z) => {
      const [nx, ny, nz] = dir(x, y, z);
      if (nz < -0.15) return 0;
      const th = -0.12 - 0.42 * smooth(0.25, 0.85, nz); // jawline on the sides, below the nose in front
      const m = smooth(th, th - 0.1, ny);
      const mouth = gauss(nx / 0.22) * gauss((ny + 0.6) / 0.07) * smooth(0.7, 0.9, nz);
      return Math.max(0, m - mouth * 1.5) * smooth(-0.15, 0.1, nz);
    };
    add(head, shell(hg, beardMask, 0.012, 0.006), hair);
    const mus = add(head, new THREE.CapsuleGeometry(0.006, 0.035, 4, 8), hair, 0, -0.052, 0.088);
    mus.rotation.z = Math.PI / 2; mus.scale.set(1, 1, 0.8);
  }

  // ---- arms (IK chains)
  const arms = {};
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(s * 0.19, 0.47, 0); torso.add(shoulder);
    add(shoulder, new THREE.SphereGeometry(0.062, 20, 14), sleeve);
    const sleeveLong = !elder;
    const up = add(shoulder, new THREE.CylinderGeometry(0.05, 0.043, L1, 18), sleeve, 0, -L1 / 2, 0);
    if (!sleeveLong) up.geometry = new THREE.CylinderGeometry(0.056, 0.055, L1 * 0.62, 18), up.position.y = -L1 * 0.31;
    if (!sleeveLong) add(shoulder, new THREE.CylinderGeometry(0.04, 0.036, L1 * 0.45, 16), skin, 0, -L1 * 0.75, 0);
    const elbow = new THREE.Group(); elbow.position.set(0, -L1, 0); shoulder.add(elbow);
    add(elbow, new THREE.SphereGeometry(sleeveLong ? 0.042 : 0.036, 16, 12), sleeveLong ? sleeve : skin);
    add(elbow, new THREE.CylinderGeometry(sleeveLong ? 0.041 : 0.035, sleeveLong ? 0.032 : 0.026, L2, 16), sleeveLong ? sleeve : skin, 0, -L2 / 2, 0);
    if (sleeveLong) { const cuff = add(elbow, new THREE.TorusGeometry(0.031, 0.005, 6, 16), new THREE.MeshStandardMaterial({ color: 0x4a1a3a, roughness: 0.9 }), 0, -L2 + 0.01, 0); cuff.rotation.x = Math.PI / 2; }
    const hand = new THREE.Group(); hand.position.set(0, -L2, 0); elbow.add(hand);
    const hm = add(hand, handGeometry(), skin);
    hm.scale.set(-s, 1, 1);
    if (elder && s === -1) add(hand, new THREE.TorusGeometry(0.011, 0.0025, 6, 12), gold, -0.018, -0.1, -0.006).rotation.x = Math.PI / 2;
    arms[s] = { shoulder, elbow, hand, side: s, target: V(0, 0, 0), cur: null };
  }

  // ---- mantle
  if (elder) {
    // himation: around the hips, across the chest, over the left shoulder, down the back
    const band = ribbon([V(0.17, 0.0, 0.11), V(0.07, 0.2, 0.135), V(-0.08, 0.4, 0.12), V(-0.19, 0.53, 0.03), V(-0.19, 0.5, -0.09), V(-0.08, 0.3, -0.13), V(0.1, 0.06, -0.13), V(0.19, 0.0, 0.0)], 0.2, 0.012, 0.008);
    add(torso, band, mantle);
    const fall = ribbon([V(-0.21, 0.5, 0.0), V(-0.24, 0.3, 0.05), V(-0.25, 0.05, 0.08), V(-0.23, -0.12, 0.1)], 0.14, 0.01, 0.01);
    add(torso, fall, mantle);
  } else {
    // chlamys pinned at the right shoulder, covering the back and the left side
    const capeG = new THREE.CylinderGeometry(0.2, 0.27, 0.56, 36, 8, true, Math.PI * 0.42, Math.PI * 1.25);
    folds(capeG, 0.008, 13);
    const cape = add(torso, capeG, mantle, 0, 0.26, -0.015);
    cape.scale.set(1.05, 1, 0.78);
    const front = ribbon([V(0.19, 0.53, 0.02), V(0.08, 0.5, 0.12), V(-0.08, 0.45, 0.12), V(-0.2, 0.4, 0.06)], 0.09, 0.01, 0.004);
    add(torso, front, mantle);
    const fib = add(torso, new THREE.BoxGeometry(0.05, 0.012, 0.016), gold, 0.19, 0.55, 0.05);
    fib.rotation.z = 0.4;
    for (const dx of [-0.026, 0.026]) add(fib, new THREE.SphereGeometry(0.008, 10, 8), gold, dx, 0, 0);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ---- behaviour
  const state = {
    lean: 0.22, leanT: 0.22, look: V(0, 0.8, 1), lookCur: V(0, 0.8, 1), t: Math.random() * 10,
    reach: { '-1': null, '1': null }, blinkT: 2,
  };
  const tmp = V(0, 0, 0), up = V(0, -1, 0);

  function solve(arm, worldTarget) {
    const S = arm.shoulder.position.clone();
    const T = torso.worldToLocal(worldTarget.clone());
    const d = T.clone().sub(S);
    let dist = d.length();
    const max = L1 + L2 - 0.005;
    if (dist > max) { d.setLength(max); dist = max; }
    dist = Math.max(dist, 0.08);
    const dn = d.clone().normalize();
    const a1 = Math.acos(THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const pole = V(arm.side * 0.9, -0.55, -0.35).normalize();
    const perp = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
    const upperDir = dn.clone().multiplyScalar(Math.cos(a1)).add(perp.multiplyScalar(Math.sin(a1))).normalize();
    const E = S.clone().addScaledVector(upperDir, L1);
    const foreDir = S.clone().add(d).sub(E).normalize();
    const qS = new THREE.Quaternion().setFromUnitVectors(up, upperDir);
    arm.shoulder.quaternion.copy(qS);
    const qE = new THREE.Quaternion().setFromUnitVectors(up, foreDir);
    arm.elbow.quaternion.copy(qS.clone().invert().multiply(qE));
  }

  return {
    root, torso, head: headPivot, arms,
    restTargets: null,
    setRest(left, right) { this.restTargets = { '-1': left.clone(), '1': right.clone() }; for (const s of [-1, 1]) arms[s].cur = this.restTargets[s].clone(); },
    reach(side, worldPos) { state.reach[side] = worldPos ? worldPos.clone() : null; },
    lookAt(worldPos) { state.look.copy(worldPos); },
    update(dt) {
      state.t += dt;
      // breathing
      chest.scale.set(1 + Math.sin(state.t * 1.6) * 0.008, 1, 0.68 + Math.sin(state.t * 1.6) * 0.008);
      // lean further when a hand reaches far
      let far = 0;
      for (const s of [-1, 1]) {
        const r = state.reach[s];
        if (r) { tmp.copy(r); root.worldToLocal(tmp); far = Math.max(far, smooth(0.35, 0.85, tmp.z)); }
      }
      state.leanT = 0.2 + far * 0.38;
      state.lean += (state.leanT - state.lean) * Math.min(1, dt * 4);
      torso.rotation.x = state.lean;
      torso.rotation.y = Math.sin(state.t * 0.4) * 0.03;
      // head look
      state.lookCur.lerp(state.look, Math.min(1, dt * 3));
      const lp = headPivot.parent.worldToLocal(state.lookCur.clone()).sub(headPivot.position);
      const yaw = Math.atan2(lp.x, lp.z), pitch = -Math.atan2(lp.y, Math.hypot(lp.x, lp.z));
      headPivot.rotation.set(THREE.MathUtils.clamp(pitch, -0.6, 0.7), THREE.MathUtils.clamp(yaw, -0.9, 0.9), 0, 'YXZ');
      // arms
      if (!this.restTargets) return;
      for (const s of [-1, 1]) {
        const goal = state.reach[s] || this.restTargets[s];
        arms[s].cur.lerp(goal, Math.min(1, dt * (state.reach[s] ? 9 : 4)));
        solve(arms[s], arms[s].cur);
      }
    },
  };
}
