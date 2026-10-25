// The gaming slab (modelled on the İznik museum stone), the marble mensa it rests on,
// stools, glass counters, bone dice, and everything clickable.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Noise, makeBoardTop, makeHewnStone, makeWood, makeWool, makeDieFaces, makeLabel } from './textures.js';
import { cellOf, posOf } from './rules.js';

export const TABLE_Y = 0.72;
const L = 0.98, D = 0.54, BASE_H = 0.10, RIM_H = 0.032, RIM_W = 0.06;
export const SURF = TABLE_Y + BASE_H;
export const RIM_TOP = SURF + RIM_H;
const PITCH = 0.058, GAP = 0.09, CELL_HALF = 0.024;
export const ROW_Z = [0.13, 0, -0.13];
export const PIECE_STEP = 0.0088;
export const DIE = 0.017;

export function cellXZ(r, c) {
  const x = c < 6 ? -GAP / 2 - (5 - c + 0.5) * PITCH : GAP / 2 + (c - 6 + 0.5) * PITCH;
  return { x, z: ROW_Z[r] };
}

// Waiting pieces sit on the mensa at each player's left; borne-off ones go in a red-slip dish at their right.
const POOL = { A: new THREE.Vector3(-0.66, TABLE_Y, 0.33), B: new THREE.Vector3(0.66, TABLE_Y, -0.33) };
const DISH = { A: new THREE.Vector3(0.6, TABLE_Y, 0.31), B: new THREE.Vector3(-0.6, TABLE_Y, -0.31) };

export function slotPosition(player, pos, idx) {
  const sgn = player === 'A' ? 1 : -1;
  if (pos === 0) {
    const stack = Math.floor(idx / 5), lvl = idx % 5;
    const b = POOL[player];
    return new THREE.Vector3(b.x + sgn * stack * 0.046, b.y + lvl * PIECE_STEP, b.z + sgn * (stack % 2) * 0.012);
  }
  if (pos === 31) {
    const b = DISH[player];
    const ring = idx % 6, lvl = Math.floor(idx / 6);
    const a = ring * 1.047 + lvl * 0.5;
    const rr = ring === 0 && lvl % 2 === 0 ? 0 : 0.026;
    return new THREE.Vector3(b.x + Math.cos(a) * rr, b.y + 0.007 + lvl * PIECE_STEP, b.z + Math.sin(a) * rr);
  }
  const { r, c } = cellOf(player, pos);
  const p = cellXZ(r, c);
  return new THREE.Vector3(p.x, SURF + idx * PIECE_STEP, p.z);
}

function worldUV(geo, tile) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = pos.getZ(i); v = pos.getY(i); }
    else if (ay >= az) { u = pos.getX(i); v = pos.getZ(i); }
    else { u = pos.getX(i); v = pos.getY(i); }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Rough the outside of a box with a continuous noise field, so coincident vertices stay together.
function roughen(geo, noise, amp, keep) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (keep && keep(x, y, z)) continue;
    const s = 9;
    p.setXYZ(i,
      x + (noise.fbm(y * s + 3.1, z * s + 1.7, 4) - 0.5) * amp,
      y + (noise.fbm(x * s + 5.3, z * s + 8.2, 4) - 0.5) * amp,
      z + (noise.fbm(x * s + 2.2, y * s + 6.6, 4) - 0.5) * amp);
  }
  geo.computeVertexNormals();
}

export class Board {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.hit = [];
    this.buildTable();
    this.buildSlab();
    this.buildStools();
    this.buildPieces();
    this.buildDice();
    this.buildMarkers();
  }

  buildTable() {
    const stone = makeHewnStone(12, [1.02, 1.0, 0.97], 512, 0.8);
    const topMat = new THREE.MeshPhysicalMaterial({
      map: stone.map, normalMap: stone.normalMap, normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.32, clearcoat: 0.25, clearcoatRoughness: 0.4,
    });
    const top = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.06, 0.9, 3, 0.012), topMat);
    worldUV(top.geometry, 0.8);
    top.position.set(0, TABLE_Y - 0.03, 0);
    top.castShadow = top.receiveShadow = true;
    this.group.add(top);

    // Trapezophoroi: carved marble supports with arched cut-out and S-curved flanks
    const s = new THREE.Shape();
    s.moveTo(-0.31, 0); s.lineTo(-0.19, 0);
    s.bezierCurveTo(-0.19, 0.24, 0.19, 0.24, 0.19, 0);
    s.lineTo(0.31, 0);
    s.bezierCurveTo(0.22, 0.18, 0.37, 0.44, 0.29, 0.66);
    s.lineTo(-0.29, 0.66);
    s.bezierCurveTo(-0.37, 0.44, -0.22, 0.18, -0.31, 0);
    const supMat = new THREE.MeshStandardMaterial({ map: stone.map, normalMap: stone.normalMap, roughness: 0.55 });
    for (const x of [-0.56, 0.56]) {
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 });
      g.translate(0, 0, -0.035);
      g.computeVertexNormals();
      worldUV(g, 0.6);
      const m = new THREE.Mesh(g, supMat);
      m.rotation.y = Math.PI / 2;
      m.position.set(x, 0, 0);
      m.castShadow = m.receiveShadow = true;
      this.group.add(m);
    }

    // red-slip dishes (terra sigillata) for borne-off pieces
    const prof = [[0, 0], [0.05, 0], [0.062, 0.004], [0.072, 0.014], [0.078, 0.02], [0.075, 0.021], [0.066, 0.012], [0.05, 0.006], [0, 0.006]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const dishMat = new THREE.MeshPhysicalMaterial({ color: 0xa8432a, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    this.dish = {};
    for (const p of ['A', 'B']) {
      const d = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), dishMat);
      d.position.copy(DISH[p]);
      d.castShadow = d.receiveShadow = true;
      this.group.add(d);
      const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 16), new THREE.MeshBasicMaterial({ visible: false }));
      hb.position.copy(DISH[p]).add(new THREE.Vector3(0, 0.04, 0));
      hb.userData = { kind: 'dish', player: p };
      this.group.add(hb); this.hit.push(hb);
      this.dish[p] = d;
      const pool = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
      const sgn = p === 'A' ? 1 : -1;
      pool.position.set(POOL[p].x + sgn * 0.05, TABLE_Y + 0.04, POOL[p].z);
      pool.userData = { kind: 'pool', player: p };
      this.group.add(pool); this.hit.push(pool);
    }
  }

  buildSlab() {
    const noise = new Noise(23);
    const stone = makeHewnStone(5, [1, 1, 1], 512, 0.45);
    const mat = new THREE.MeshStandardMaterial({ map: stone.map, normalMap: stone.normalMap, roughnessMap: stone.roughnessMap, roughness: 1 });
    const innerW = L - 2 * RIM_W, innerD = D - 2 * RIM_W;

    const base = new THREE.BoxGeometry(L, BASE_H, D, 48, 6, 28);
    base.translate(0, TABLE_Y + BASE_H / 2, 0);
    roughen(base, noise, 0.012, (x, y, z) => y > SURF - 0.001 && Math.abs(x) < innerW / 2 + 0.005 && Math.abs(z) < innerD / 2 + 0.005);
    worldUV(base, 0.45);
    const baseM = new THREE.Mesh(base, mat);
    baseM.castShadow = baseM.receiveShadow = true;
    this.group.add(baseM);

    const rims = [
      [L, D / 2 - RIM_W / 2, 'z'], [L, -D / 2 + RIM_W / 2, 'z'],
      [innerD + 0.002, L / 2 - RIM_W / 2, 'x'], [innerD + 0.002, -L / 2 + RIM_W / 2, 'x'],
    ];
    for (const [len, off, axis] of rims) {
      const g = axis === 'z'
        ? new THREE.BoxGeometry(len, RIM_H, RIM_W, 40, 4, 4)
        : new THREE.BoxGeometry(RIM_W, RIM_H, len, 4, 4, 24);
      if (axis === 'z') g.translate(0, SURF + RIM_H / 2, off); else g.translate(off, SURF + RIM_H / 2, 0);
      // a broken corner, as on the museum stone
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const dc = Math.hypot(x - L / 2, z - D / 2);
        if (dc < 0.12 && y > SURF + 0.002) p.setY(i, y - (1 - dc / 0.12) * 0.026 * (0.6 + noise.v(x * 60, z * 60) * 0.8));
        const dc2 = Math.hypot(x + L / 2 + 0.02, z + 0.1);
        if (dc2 < 0.07 && y > SURF + 0.002) p.setY(i, y - (1 - dc2 / 0.07) * 0.015);
      }
      roughen(g, noise, 0.008);
      worldUV(g, 0.45);
      const m = new THREE.Mesh(g, mat);
      m.castShadow = m.receiveShadow = true;
      this.group.add(m);
    }

    // incised playing field
    const top = makeBoardTop({ innerW, innerD, cellXZ, rowZ: ROW_Z, cellHalf: CELL_HALF });
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(innerW, innerD),
      new THREE.MeshStandardMaterial({ map: top.map, normalMap: top.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughnessMap: top.roughnessMap, roughness: 1 }),
    );
    field.rotation.x = -Math.PI / 2;
    field.position.y = SURF + 0.0004;
    field.receiveShadow = true;
    this.group.add(field);

    // bronze coins staked on the rosettes
    const coinMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.85, roughness: 0.45 });
    const coinG = new THREE.CylinderGeometry(0.0095, 0.0095, 0.0016, 24);
    const rnd = (a) => (Math.sin(a * 91.7) * 43758.5) % 1;
    [[0, 3], [1, 1], [2, 2]].forEach(([r, n]) => {
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(coinG, coinMat);
        c.position.set(rnd(r + i) * 0.004, SURF + 0.001 + i * 0.0017, ROW_Z[r] + rnd(r * 3 + i) * 0.004);
        c.rotation.y = i;
        c.castShadow = true;
        this.group.add(c);
      }
    });

    // click targets & highlights per cell
    const hbG = new THREE.BoxGeometry(0.056, 0.2, 0.11);
    const hbM = new THREE.MeshBasicMaterial({ visible: false });
    this.cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
      const p = cellXZ(r, c);
      const hb = new THREE.Mesh(hbG, hbM);
      hb.position.set(p.x, SURF + 0.1, p.z);
      hb.userData = { kind: 'cell', r, c };
      this.group.add(hb); this.hit.push(hb);
    }
  }

  buildStools() {
    const wood = makeWood([0.36, 0.22, 0.12], 4);
    const wmat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, roughness: 0.6 });
    const cushion = makeWool([0.55, 0.16, 0.12], { seed: 5 });
    const cmat = new THREE.MeshStandardMaterial({ map: cushion.map, normalMap: cushion.normalMap, roughness: 0.95 });
    this.seats = {};
    for (const [p, z] of [['A', 0.8], ['B', -0.8]]) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.04, 0.38, 2, 0.01), wmat);
      top.position.y = 0.40;
      g.add(top);
      const legG = new THREE.CylinderGeometry(0.018, 0.022, 0.38, 12);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legG, wmat);
        leg.position.set(sx * 0.18, 0.19, sz * 0.15);
        leg.rotation.z = sx * 0.06; leg.rotation.x = -sz * 0.06;
        g.add(leg);
      }
      for (const sz of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.36, 8), wmat);
        bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.12, sz * 0.15);
        g.add(bar);
      }
      const cu = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.05, 0.36, 4, 0.022), cmat);
      cu.position.y = 0.44;
      g.add(cu);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      g.position.set(0, 0, z);
      this.group.add(g);
      this.seats[p] = g;
    }
  }

  buildPieces() {
    // plano-convex glass counters, the commonest Roman gaming pieces
    const prof = [[0, 0], [0.0195, 0], [0.0205, 0.0015], [0.0195, 0.0045], [0.015, 0.0075], [0.008, 0.0088], [0, 0.009]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.LatheGeometry(prof, 40);
    const mats = {
      A: new THREE.MeshPhysicalMaterial({ color: 0xefe9da, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color(0xfff6e0) }),
      B: new THREE.MeshPhysicalMaterial({ color: 0x0e1424, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1 }),
    };
    this.pieceMats = mats;
    this.pieces = { A: [], B: [] };
    for (const p of ['A', 'B']) {
      for (let i = 0; i < 15; i++) {
        const m = new THREE.Mesh(g, mats[p]);
        m.castShadow = m.receiveShadow = true;
        m.userData = { player: p, pos: 0, stamp: i };
        m.position.copy(slotPosition(p, 0, i));
        this.group.add(m);
        this.pieces[p].push(m);
      }
    }
  }

  buildDice() {
    const faces = makeDieFaces();
    // BoxGeometry groups: +x, -x, +y, -y, +z, -z  (opposite faces sum to seven)
    this.faceValues = [2, 5, 1, 6, 3, 4];
    this.faceNormals = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];
    const mats = this.faceValues.map((v) => new THREE.MeshStandardMaterial({ map: faces[v], roughness: 0.55 }));
    const g = new RoundedBoxGeometry(DIE, DIE, DIE, 3, 0.0032);
    this.dice = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(g, mats.map((x) => x.clone()));
      m.castShadow = true;
      m.position.set(0.66 - i * 0.03, TABLE_Y + DIE / 2, 0.05);
      this.group.add(m);
      return m;
    });
  }

  dieQuaternion(value, yaw) {
    const idx = this.faceValues.indexOf(value);
    const q = new THREE.Quaternion().setFromUnitVectors(this.faceNormals[idx], new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
  }

  buildMarkers() {
    const ringG = new THREE.RingGeometry(0.026, 0.032, 40);
    ringG.rotateX(-Math.PI / 2);
    this.targetMat = new THREE.MeshBasicMaterial({ color: 0xffc95c, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.moveMat = new THREE.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    this.selMat = new THREE.MeshBasicMaterial({ color: 0x9cff9c, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.markers = [];
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(ringG, this.targetMat);
      m.visible = false; m.renderOrder = 5;
      this.group.add(m); this.markers.push(m);
    }
    const bigG = new THREE.RingGeometry(0.085, 0.095, 48); bigG.rotateX(-Math.PI / 2);
    this.bigMarkers = [0, 1].map(() => { const m = new THREE.Mesh(bigG, this.targetMat); m.visible = false; m.renderOrder = 5; this.group.add(m); return m; });
    this.labels = new Map();
  }

  // targets: [{player,pos}], movable: [{player,pos}], selected: {player,pos}|null
  showMarkers(targets, movable, selected) {
    let k = 0, b = 0;
    const place = (player, pos, mat, h) => {
      if (pos === 31 || pos === 0) {
        if (b >= 2) return;
        const m = this.bigMarkers[b++];
        const sgn = player === 'A' ? 1 : -1;
        const c = pos === 31 ? DISH[player] : new THREE.Vector3(POOL[player].x + sgn * 0.05, TABLE_Y, POOL[player].z);
        m.position.set(c.x, TABLE_Y + 0.002, c.z);
        m.material = mat; m.visible = true;
        return;
      }
      if (k >= this.markers.length) return;
      const m = this.markers[k++];
      const { r, c } = cellOf(player, pos);
      const p = cellXZ(r, c);
      m.position.set(p.x, SURF + 0.0015 + (h || 0), p.z);
      m.material = mat; m.visible = true;
    };
    for (const t of movable) place(t.player, t.pos, this.moveMat);
    if (selected) place(selected.player, selected.pos, this.selMat);
    for (const t of targets) place(t.player, t.pos, this.targetMat);
    for (; k < this.markers.length; k++) this.markers[k].visible = false;
    for (; b < 2; b++) this.bigMarkers[b].visible = false;
  }

  pulse(t) {
    this.targetMat.opacity = 0.55 + Math.sin(t * 5) * 0.35;
  }

  // Number badges over tall stacks
  updateLabels(state) {
    const want = new Map();
    if (state) for (const p of ['A', 'B']) for (let pos = 1; pos <= 30; pos++) {
      const n = state.counts[p][pos];
      if (n >= 5) want.set(`${p}${pos}`, { p, pos, n });
    }
    for (const [k, spr] of this.labels) if (!want.has(k) || spr.userData.n !== want.get(k).n) { this.group.remove(spr); spr.material.map.dispose(); this.labels.delete(k); }
    for (const [k, v] of want) {
      if (this.labels.has(k)) continue;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabel(String(v.n)), depthTest: false }));
      spr.scale.set(0.05, 0.025, 1);
      const top = slotPosition(v.p, v.pos, v.n);
      spr.position.set(top.x, top.y + 0.03, top.z);
      spr.renderOrder = 10;
      spr.userData.n = v.n;
      this.group.add(spr); this.labels.set(k, spr);
    }
  }

  poolCenter(p) { return POOL[p].clone(); }
  dishCenter(p) { return DISH[p].clone(); }
}

export { posOf };
