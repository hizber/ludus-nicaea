// Nicaea, c. AD 325, seen at golden hour from the hills east of the city:
// the Late-Roman walls (opus mixtum, round & square towers, four gates), the
// Hippodamian grid with colonnaded cardo & decumanus, theatre in the south-west,
// the palace on the lake shore, olive groves, and Lake Ascania between its mountains.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Noise, mulberry, makePaving, makeWallTex, makeRoofTex, makeHewnStone, makeLeafTex } from './textures.js';

const PLAIN = -100;
const WATER_Y = -106;
const CITY = { x: -1650, z: 0, R: 790 };
const noise = new Noise(101);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function shoreEast(z) { return CITY.x - CITY.R - 40 + 300 * (z / 2600) ** 2 + (noise.v(z * 0.0015, 3.3) - 0.5) * 160; }
function lakeHalfW(x) {
  const d = shoreEast(0) - x;
  if (d < 0) return 0;
  return Math.min(5600, 2600 + d * 0.9) * (1 - smooth(26000, 33000, d));
}
function lakeInside(x, z) { return Math.min(shoreEast(z) - x, lakeHalfW(x) - Math.abs(z)); }

export function elevation(x, z) {
  const m = lakeInside(x, z);
  if (m > 0) return WATER_Y - 2 - 30 * smooth(0, 1500, m);
  let h = PLAIN + (noise.fbm(x * 0.0012, z * 0.0012, 4) - 0.5) * 16;
  // our hill: a ridge with a steep western brow just below the terrace
  const brow = -Math.min(0, x + 10);
  const hill = -(PLAIN * -1) * (1 - Math.exp(-brow / 150)) * (1 - 0.15 * smooth(800, 4000, Math.abs(z)));
  const hillH = mix(0, hill, 1) + 4 * smooth(-10, 30, x) + 70 * smooth(40, 1800, x) + (noise.fbm(x * 0.004, z * 0.004, 3) - 0.5) * 18 * smooth(15, 80, Math.hypot(x, z));
  const onHill = smooth(-900, -300, x);
  h = mix(h, Math.max(h, hillH), onHill);
  // mountains around the lake (Samanlı to the north, Katırlı to the south)
  const az = Math.abs(z);
  const ridged = 1 - Math.abs(noise.fbm(x * 0.00028 + 9, z * 0.00035, 5) * 2 - 1);
  const mtnStart = 3400 + 900 * noise.v(x * 0.0003, 1);
  h += smooth(mtnStart, mtnStart + 6000, az) * (520 + 820 * ridged) * smooth(-45000, -900, x);
  h += smooth(1500, 9000, x) * (200 + 300 * ridged);
  // flatten the city plain
  const dc = Math.hypot(x - CITY.x, z - CITY.z);
  h = mix(PLAIN + (noise.v(x * 0.01, z * 0.01) - 0.5) * 2, h, smooth(CITY.R * 0.95, CITY.R * 1.5, dc));
  // the terrace itself
  h = mix(-0.08, h, smooth(9, 22, Math.hypot(x - 1, z)));
  // shore
  return mix(WATER_Y + 1.2, h, smooth(0, 260, -m));
}

function terrainColor(x, z, h, out) {
  const m = lakeInside(x, z);
  if (m > -60) { out.setRGB(0.55, 0.5, 0.36); return; }
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const fx = Math.floor((x + noise.v(z * 0.004, 1) * 80) / 140), fz = Math.floor((z + noise.v(x * 0.004, 2) * 80) / 95);
  const f = hash(fx, fz);
  const plainCols = [[0.62, 0.52, 0.28], [0.40, 0.42, 0.20], [0.30, 0.33, 0.18], [0.46, 0.34, 0.21], [0.55, 0.47, 0.26]];
  const pc = plainCols[Math.floor(f * plainCols.length)];
  const rel = h - PLAIN;
  const v = noise.fbm(x * 0.01, z * 0.01, 3);
  let r = pc[0], g = pc[1], b = pc[2];
  const hillT = smooth(15, 120, rel);
  const scrub = [0.42 + v * 0.12, 0.40 + v * 0.08, 0.22];
  r = mix(r, scrub[0], hillT); g = mix(g, scrub[1], hillT); b = mix(b, scrub[2], hillT);
  const forest = smooth(150, 400, rel) * (1 - smooth(900, 1300, rel));
  r = mix(r, 0.2, forest * 0.8); g = mix(g, 0.26, forest * 0.8); b = mix(b, 0.14, forest * 0.8);
  const rock = smooth(1000, 1350, rel);
  r = mix(r, 0.52, rock); g = mix(g, 0.5, rock); b = mix(b, 0.46, rock);
  const dc = Math.hypot(x - CITY.x, z - CITY.z);
  if (dc < CITY.R) { r = 0.52; g = 0.46; b = 0.36; }
  out.setRGB(r * (0.9 + v * 0.2), g * (0.9 + v * 0.2), b * (0.9 + v * 0.2));
}

export function buildScenery(scene, renderer, opts = {}) {
  const sunEl = THREE.MathUtils.degToRad(15), sunAz = THREE.MathUtils.degToRad(22);
  const sunDir = new THREE.Vector3(-Math.cos(sunEl) * Math.cos(sunAz), Math.sin(sunEl), Math.cos(sunEl) * Math.sin(sunAz)).normalize();

  // Sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  const u = sky.material.uniforms;
  u.turbidity.value = 5.5; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.86;
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const sky2 = new Sky(); sky2.scale.setScalar(450000);
  Object.assign(sky2.material.uniforms.turbidity, { value: 5.5 });
  sky2.material.uniforms.rayleigh.value = 1.6; sky2.material.uniforms.mieCoefficient.value = 0.006;
  sky2.material.uniforms.mieDirectionalG.value = 0.86; sky2.material.uniforms.sunPosition.value.copy(sunDir);
  envScene.add(sky2);
  const ground = new THREE.Mesh(new THREE.SphereGeometry(1000, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6b5d45, side: THREE.BackSide }));
  envScene.add(ground);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.fog = new THREE.FogExp2(0xc9b39a, 0.000022);

  // Lights
  const sun = new THREE.DirectionalLight(0xffd2a0, 4.2);
  sun.position.copy(sunDir).multiplyScalar(30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xb8cbe6, 0x6b5338, 0.35);
  scene.add(hemi);
  // soft warm bounce from the paving to lift faces
  const bounce = new THREE.DirectionalLight(0xffc895, 0.45);
  bounce.position.set(3, 1.2, 2);
  scene.add(bounce);

  // Terrain on a grid that is dense near the terrace and sparse at the horizon
  const SEG = opts.mobile ? 300 : 420, S = 38000, P = 2.6;
  const tg = new THREE.PlaneGeometry(2, 2, SEG, SEG);
  tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  const colors = new Float32Array(tp.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const ux = tp.getX(i), uz = tp.getZ(i);
    const x = Math.sign(ux) * S * Math.abs(ux) ** P + 1;
    const z = Math.sign(uz) * S * Math.abs(uz) ** P;
    const h = elevation(x, z);
    tp.setXYZ(i, x, h, z);
    terrainColor(x, z, h, c);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Lake Ascania
  const water = new Water(new THREE.PlaneGeometry(90000, 90000), {
    textureWidth: opts.mobile ? 256 : 512, textureHeight: opts.mobile ? 256 : 512,
    waterNormals: new THREE.TextureLoader().load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }),
    sunDirection: sunDir.clone(), sunColor: 0xffe2b8, waterColor: 0x1f3d48, distortionScale: 2.2, fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(-30000, WATER_Y, 0);
  water.material.uniforms.size.value = 0.6;
  scene.add(water);

  const far = new THREE.Group();
  scene.add(far);
  buildCity(far, opts);
  buildBoats(far);
  const terrace = buildTerrace(scene, opts);

  return { sun, sunDir, water, sky, terrain, far, terrace, update(t) { water.material.uniforms.time.value = t * 0.35; } };
}

function hipRoof() {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], R1 = [-0.22, 1, 0], R2 = [0.22, 1, 0];
  const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
  const pos = new Float32Array(tris.flat());
  const uv = new Float32Array(tris.length * 2);
  tris.forEach((p, i) => { uv[i * 2] = p[0] + p[2]; uv[i * 2 + 1] = p[1]; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function gableRoof() {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], R1 = [-0.5, 1, 0], R2 = [0.5, 1, 0];
  const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, A, D, R1, C, B, R2];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris.flat()), 3));
  const uv = new Float32Array(tris.length * 2);
  tris.forEach((p, i) => { uv[i * 2] = p[0] * 2; uv[i * 2 + 1] = p[1] + p[2]; });
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function localUV(g, tile) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let a, b;
    if (ax >= ay && ax >= az) { a = pos.getZ(i); b = pos.getY(i); }
    else if (ay >= az) { a = pos.getX(i); b = pos.getZ(i); }
    else { a = pos.getX(i); b = pos.getY(i); }
    uv.setXY(i, a / tile, b / tile);
  }
  return g;
}

function placed(g, x, y, z, ry = 0) {
  g.rotateY(ry); g.translate(x, y, z); return g;
}

function buildCity(group, opts) {
  const rnd = mulberry(77);
  const cx = CITY.x, cz = CITY.z, R = CITY.R;
  const wallTex = makeWallTex();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
  const marble = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.7 });
  const roofTex = makeRoofTex();
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85, color: 0xffffff });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

  // --- walls, towers and gates
  const pts = [];
  const M = 78;
  for (let i = 0; i < M; i++) {
    const a = (i / M) * Math.PI * 2;
    const r = R * (1 + 0.045 * Math.sin(3 * a + 1) + (noise.v(a * 3, 7) - 0.5) * 0.05);
    let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    x = Math.max(x, shoreEast(z) + 12);
    pts.push({ x, z, a });
  }
  const gates = [0, M / 4, M / 2, (3 * M) / 4].map(Math.round);
  const wallGeos = [], towerGeos = [], gateGeos = [];
  for (let i = 0; i < M; i++) {
    const p = pts[i], q = pts[(i + 1) % M];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    const ang = Math.atan2(q.z - p.z, q.x - p.x);
    const g = localUV(new THREE.BoxGeometry(len, 10, 4), 6);
    wallGeos.push(placed(g, (p.x + q.x) / 2, PLAIN + 5, (p.z + q.z) / 2, -ang));
    // crenellations
    for (let k = -len / 2 + 1; k < len / 2 - 1; k += 2.4) {
      const m = localUV(new THREE.BoxGeometry(1.2, 1.3, 0.8), 6);
      m.translate(k, 10.6, 1.6);
      wallGeos.push(placed(m, (p.x + q.x) / 2, PLAIN, (p.z + q.z) / 2, -ang));
    }
    if (gates.includes(i)) {
      // gate: triumphal arch (Vespasian / Hadrian) flanked by tall round towers
      const out = new THREE.Vector2(p.x - cx, p.z - cz).normalize();
      const arch = localUV(new THREE.BoxGeometry(9, 15, 22), 6);
      gateGeos.push(placed(arch, p.x + out.x * 3, PLAIN + 7.5, p.z + out.y * 3, -Math.atan2(out.y, out.x)));
      for (const s of [-1, 1]) {
        const t = localUV(new THREE.CylinderGeometry(6, 6.5, 19, 20), 6);
        towerGeos.push(placed(t, p.x + out.x * 2 - out.y * s * 15, PLAIN + 9.5, p.z + out.y * 2 + out.x * s * 15));
      }
      continue;
    }
    const tg = i % 2 === 0
      ? localUV(new THREE.CylinderGeometry(5, 5.4, 14, 16), 6)
      : localUV(new THREE.BoxGeometry(9, 14, 9), 6);
    const out = new THREE.Vector2(p.x - cx, p.z - cz).normalize();
    towerGeos.push(placed(tg, p.x + out.x * 3, PLAIN + 7, p.z + out.y * 3, -p.a));
  }
  const walls = new THREE.Mesh(mergeGeometries([...wallGeos, ...towerGeos]), wallMat);
  group.add(walls);
  const gateMesh = new THREE.Mesh(mergeGeometries(gateGeos), marble);
  group.add(gateMesh);
  // dark arch openings
  const archMat = new THREE.MeshBasicMaterial({ color: 0x1b1611 });
  for (const gi of gates) {
    const p = pts[gi];
    const out = new THREE.Vector2(p.x - cx, p.z - cz).normalize();
    const shp = new THREE.Shape();
    shp.moveTo(-3, 0); shp.lineTo(-3, 6); shp.absarc(0, 6, 3, Math.PI, 0, true); shp.lineTo(3, 0);
    const og = new THREE.ShapeGeometry(shp, 12);
    const m = new THREE.Mesh(og, archMat);
    m.position.set(p.x + out.x * 7.6, PLAIN, p.z + out.y * 7.6);
    m.rotation.y = Math.PI / 2 - Math.atan2(out.y, out.x);
    group.add(m);
  }

  const reserved = [];
  const reserve = (x, z, w, d) => reserved.push({ x0: cx + x - w / 2, x1: cx + x + w / 2, z0: cz + z - d / 2, z1: cz + z + d / 2 });
  const isReserved = (x, z) => reserved.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

  // --- public buildings
  const pubGeos = [], pubRoofs = [], cols = [];
  const roofG = gableRoof(), hipG = hipRoof();
  const addBuilding = (x, z, w, d, h, roofH, gable = true, ry = 0) => {
    const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h / 2, 0);
    pubGeos.push(placed(b, cx + x, PLAIN, cz + z, ry));
    const r = (gable ? roofG : hipG).clone(); r.scale(w + 1.2, roofH, d + 1.2); r.translate(0, h, 0);
    pubRoofs.push(placed(r, cx + x, PLAIN, cz + z, ry));
  };
  const colonnade = (x0, z0, x1, z1, step, h = 7) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / step);
    for (let i = 0; i <= n; i++) cols.push([cx + x0 + (x1 - x0) * i / n, cz + z0 + (z1 - z0) * i / n, h]);
  };

  // forum with basilica & temple
  reserve(60, -70, 150, 110);
  colonnade(-10, -120, 130, -120, 5); colonnade(-10, -20, 130, -20, 5); colonnade(-10, -120, -10, -20, 5); colonnade(130, -120, 130, -20, 5);
  addBuilding(60, -140, 110, 30, 16, 6);
  addBuilding(60, -70, 22, 34, 14, 5, true, Math.PI / 2);
  colonnade(45, -83, 75, -83, 4, 12);
  // temples
  reserve(230, 190, 50, 60); addBuilding(230, 190, 20, 34, 13, 5); colonnade(218, 172, 242, 172, 4, 11);
  reserve(-170, -330, 50, 60); addBuilding(-170, -330, 18, 30, 12, 5); colonnade(-180, -346, -160, -346, 4, 10);
  // baths
  reserve(330, -260, 100, 80); addBuilding(330, -260, 90, 60, 15, 4, false);
  // imperial palace on the shore (where the Council met in 325)
  reserve(-640, -170, 170, 200);
  addBuilding(-660, -220, 120, 40, 15, 5);
  addBuilding(-660, -110, 120, 34, 12, 4);
  addBuilding(-700, -165, 30, 80, 13, 4, true, 0);
  colonnade(-720, -195, -600, -195, 5); colonnade(-720, -130, -600, -130, 5);
  // gymnasium / palaestra
  reserve(380, 330, 110, 90); addBuilding(380, 300, 100, 22, 11, 4); colonnade(330, 330, 430, 330, 5); colonnade(330, 370, 430, 370, 5);

  // theatre (built under Pliny the Younger's governorship), south-west quarter
  reserve(-280, 420, 150, 130);
  const prof = [];
  for (let k = 0; k <= 18; k++) prof.push(new THREE.Vector2(16 + k * 2.4, k * 1.25));
  prof.push(new THREE.Vector2(60, 22.5), new THREE.Vector2(60, 0));
  const cav = new THREE.LatheGeometry(prof, 40, Math.PI * 0.5, Math.PI);
  const cavM = new THREE.Mesh(cav, new THREE.MeshStandardMaterial({ color: 0xd5c8b2, roughness: 0.9, side: THREE.DoubleSide }));
  cavM.position.set(cx - 280, PLAIN, cz + 440);
  group.add(cavM);
  addBuilding(-280, 412, 110, 10, 18, 3, false);

  // colonnaded cardo & decumanus
  colonnade(-R + 40, -9, R - 40, -9, 5); colonnade(-R + 40, 9, R - 40, 9, 5);
  colonnade(-9, -R + 40, -9, R - 40, 5); colonnade(9, -R + 40, 9, R - 40, 5);

  const pubMesh = new THREE.Mesh(mergeGeometries(pubGeos), marble);
  group.add(pubMesh);
  const pubRoofMesh = new THREE.Mesh(mergeGeometries(pubRoofs), roofMat);
  group.add(pubRoofMesh);

  const colG = new THREE.CylinderGeometry(0.45, 0.5, 1, 8); colG.translate(0, 0.5, 0);
  const colMesh = new THREE.InstancedMesh(colG, marble, cols.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  cols.forEach(([x, z, h], i) => { mtx.compose(ps.set(x, PLAIN, z), q.identity(), sc.set(1, h, 1)); colMesh.setMatrixAt(i, mtx); });
  group.add(colMesh);

  // --- houses: insulae on the Hippodamian grid
  const houses = [];
  const BX = 72, BZ = 52, ST = 7;
  for (let gx = -R; gx < R; gx += BX) for (let gz = -R; gz < R; gz += BZ) {
    for (let k = 0; k < 6; k++) {
      const w = 12 + rnd() * 16, d = 10 + rnd() * 14;
      const x = gx + ST + rnd() * (BX - ST * 2 - w) + w / 2;
      const z = gz + ST + rnd() * (BZ - ST * 2 - d) + d / 2;
      if (Math.abs(x) < 16 || Math.abs(z) < 16) continue;
      const wx = cx + x, wz = cz + z;
      if (Math.hypot(x, z) > R * 0.93 || isReserved(wx, wz) || wx < shoreEast(wz) + 40) continue;
      houses.push({ x: wx, z: wz, w, d, h: 5 + rnd() * 6 + (rnd() < 0.08 ? 5 : 0) });
    }
  }
  // a few suburban villas outside the walls on the way up the hill
  for (let i = 0; i < 90; i++) {
    const x = CITY.x + R + 60 + rnd() * 600, z = (rnd() - 0.5) * 2600;
    houses.push({ x, z, w: 10 + rnd() * 14, d: 10 + rnd() * 12, h: 4 + rnd() * 4, y: elevation(x, z) });
  }
  const bodyG = new THREE.BoxGeometry(1, 1, 1); bodyG.translate(0, 0.5, 0);
  const bodies = new THREE.InstancedMesh(bodyG, plaster, houses.length);
  const roofs = new THREE.InstancedMesh(hipG, roofMat, houses.length);
  const palette = [0xeee4d0, 0xe8d6b4, 0xdcc49a, 0xf2ebe0, 0xd9b48c, 0xe4cdb6, 0xc9a27a];
  const col = new THREE.Color();
  houses.forEach((h, i) => {
    const y = h.y !== undefined ? h.y - 1 : PLAIN;
    mtx.compose(ps.set(h.x, y, h.z), q.identity(), sc.set(h.w, h.h + (h.y !== undefined ? 1 : 0), h.d));
    bodies.setMatrixAt(i, mtx);
    col.set(palette[Math.floor(rnd() * palette.length)]); bodies.setColorAt(i, col);
    mtx.compose(ps.set(h.x, y + h.h + (h.y !== undefined ? 1 : 0), h.z), q.identity(), sc.set(h.w + 1, 2.2 + rnd() * 1.2, h.d + 1));
    roofs.setMatrixAt(i, mtx);
    col.setHSL(0.04 + rnd() * 0.02, 0.45, 0.62 + rnd() * 0.2); roofs.setColorAt(i, col);
  });
  group.add(bodies, roofs);

  // --- trees: cypresses and olive groves
  const cypG = new THREE.LatheGeometry([[0, 0], [0.12, 0.05], [0.16, 0.25], [0.13, 0.6], [0.06, 0.9], [0, 1]].map(([a, b]) => new THREE.Vector2(a, b)), 7);
  const olvG = new THREE.IcosahedronGeometry(1, 1); olvG.scale(1, 0.75, 1); olvG.translate(0, 1.4, 0);
  const cyps = [], olives = [];
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R * 0.9;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (isReserved(x, z)) continue;
    cyps.push([x, PLAIN, z, 9 + rnd() * 9]);
  }
  for (let i = 0; i < 500; i++) {
    const x = -40 - rnd() * 900, z = (rnd() - 0.5) * 3000;
    const y = elevation(x, z);
    if (y < PLAIN + 3 && Math.hypot(x - cx, z - cz) < R * 1.05) continue;
    if (Math.hypot(x, z) < 30) continue;
    cyps.push([x, y, z, 8 + rnd() * 10]);
  }
  const NOL = opts.mobile ? 4000 : 9000;
  for (let i = 0; i < NOL; i++) {
    const gx = Math.floor(rnd() * 120), gz = Math.floor(rnd() * 160);
    const x = CITY.x - 600 + gx * 30 + (rnd() - 0.5) * 6 + 1200 * (rnd() - 0.3);
    const z = (gz - 80) * 32 + (rnd() - 0.5) * 6;
    if (lakeInside(x, z) > -40) continue;
    if (Math.hypot(x - cx, z - cz) < R * 1.08) continue;
    if (Math.hypot(x, z) < 40) continue;
    const y = elevation(x, z);
    if (y - PLAIN > 250) continue;
    const hash = Math.sin(Math.floor(x / 140) * 127.1 + Math.floor(z / 95) * 311.7) * 43758.5;
    if (hash - Math.floor(hash) > 0.55) continue;
    olives.push([x, y, z, 2.2 + rnd() * 1.6]);
  }
  const cypMesh = new THREE.InstancedMesh(cypG, new THREE.MeshStandardMaterial({ color: 0x24341c, roughness: 1 }), cyps.length);
  cyps.forEach(([x, y, z, h], i) => { mtx.compose(ps.set(x, y - 0.5, z), q.identity(), sc.set(h * 1.1, h, h * 1.1)); cypMesh.setMatrixAt(i, mtx); });
  const olvMesh = new THREE.InstancedMesh(olvG, new THREE.MeshStandardMaterial({ color: 0x6b7651, roughness: 1 }), olives.length);
  olives.forEach(([x, y, z, s], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
    mtx.compose(ps.set(x, y, z), q, sc.set(s, s, s)); olvMesh.setMatrixAt(i, mtx);
  });
  group.add(cypMesh, olvMesh);
}

function buildBoats(group) {
  const rnd = mulberry(12);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.8 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xeee0c4, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hullMat);
    hull.scale.set(5, 1.4, 1.6);
    b.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 5), hullMat);
    mast.position.y = 4.5; b.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.5), sailMat);
    sail.position.set(0.2, 5.2, 0); sail.rotation.y = Math.PI / 2 + 0.3; b.add(sail);
    const x = shoreEast(0) - 300 - rnd() * 4500, z = (rnd() - 0.5) * 3500;
    b.position.set(x, WATER_Y + 0.2, z);
    b.rotation.y = rnd() * 6;
    group.add(b);
  }
}

function buildTerrace(scene, opts) {
  const g = new THREE.Group();
  scene.add(g);
  const pav = makePaving();
  pav.map.repeat.set(4, 4); pav.normalMap.repeat.set(4, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: pav.map, normalMap: pav.normalMap, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(3.5, 0, 0);
  floor.receiveShadow = true;
  g.add(floor);

  const stone = makeHewnStone(41, [1.0, 0.96, 0.88], 512, 1.2);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone.map, normalMap: stone.normalMap, roughness: 0.95 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.45, map: makeHewnStone(42, [1.03, 1.02, 1.0], 256, 0.6).map });

  // parapet on the western brow, and short side walls
  const wall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(localUV(new THREE.BoxGeometry(w, h, d), 1.2), stoneMat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  wall(0.5, 0.56, 16, -4.4, 0.28, 0);
  wall(0.64, 0.08, 16.2, -4.4, 0.6, 0);
  wall(14, 0.78, 0.5, 2.6, 0.39, -8);
  wall(14, 0.78, 0.5, 2.6, 0.39, 8);
  // terrace retaining wall face below the parapet
  wall(0.6, 6, 16.4, -4.5, -3, 0);

  // pergola on marble columns with a grape vine
  const colPos = [[-3.3, -3.0], [-3.3, 3.0], [2.9, -3.0], [2.9, 3.0]];
  for (const [x, z] of colPos) {
    const c = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 24), marbleMat); base.position.y = 0.06;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 8, 24), marbleMat); torus.rotation.x = Math.PI / 2; torus.position.y = 0.15;
    const shaftG = new THREE.CylinderGeometry(0.15, 0.17, 2.4, 24, 1);
    const sp = shaftG.attributes.position;
    for (let i = 0; i < sp.count; i++) { // fluting
      const a = Math.atan2(sp.getZ(i), sp.getX(i)), k = 1 - 0.035 * Math.abs(Math.sin(a * 12));
      sp.setX(i, sp.getX(i) * k); sp.setZ(i, sp.getZ(i) * k);
    }
    shaftG.computeVertexNormals();
    const shaft = new THREE.Mesh(shaftG, marbleMat); shaft.position.y = 1.4;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), marbleMat); cap.position.y = 2.68;
    const ech = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 24), marbleMat); ech.position.y = 2.6;
    for (const s of [-1, 1]) {
      const vol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 16), marbleMat);
      vol.rotation.x = Math.PI / 2; vol.position.set(s * 0.2, 2.6, 0); c.add(vol);
    }
    c.add(base, torus, shaft, ech, cap);
    c.position.set(x, 0, z);
    c.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    g.add(c);
  }
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 });
  for (const z of [-3.0, 3.0]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.18, 0.16), woodMat);
    beam.position.set(-0.2, 2.82, z); beam.castShadow = true; g.add(beam);
  }
  for (let x = -3.5; x <= 3.1; x += 0.5) {
    const raf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 6.8), woodMat);
    raf.position.set(x, 2.96, 0); raf.castShadow = true; g.add(raf);
  }
  const leafTex = makeLeafTex();
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.5 });
  const NL = opts.mobile ? 900 : 1800;
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.17), leafMat, NL);
  leaves.customDepthMaterial = leafDepth;
  leaves.castShadow = true;
  const rnd = mulberry(3);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0;
  while (n < NL) {
    const x = -3.6 + rnd() * 6.8, z = -3.4 + rnd() * 6.8;
    // leave holes so the light falls through in patches
    if (noise.fbm(x * 0.9, z * 0.9, 3) < 0.42) continue;
    // vine trunks climbing the western columns
    p.set(x, 3.02 + rnd() * 0.12 - (Math.abs(z) > 3.1 ? rnd() * 0.5 : 0), z);
    e.set(-Math.PI / 2 + (rnd() - 0.5) * 1.2, rnd() * 6, (rnd() - 0.5) * 0.8);
    q.setFromEuler(e);
    const k = 0.7 + rnd() * 0.7;
    mtx.compose(p, q, s.set(k, k, k));
    leaves.setMatrixAt(n++, mtx);
  }
  g.add(leaves);
  // hanging leaves and grapes along the western edge
  const grapeMat = new THREE.MeshStandardMaterial({ color: 0x3a1f3d, roughness: 0.35 });
  for (let i = 0; i < 9; i++) {
    const bunch = new THREE.Group();
    for (let k = 0; k < 18; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), grapeMat);
      const lv = Math.floor(k / 4);
      b.position.set((rnd() - 0.5) * 0.06 * (1 - lv * 0.15), -lv * 0.025, (rnd() - 0.5) * 0.06 * (1 - lv * 0.15));
      bunch.add(b);
    }
    bunch.position.set(-3.4 + rnd() * 6, 2.88, -2 + rnd() * 4);
    g.add(bunch);
  }
  for (const z of [-3.0, 3.0]) {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 2.8, 8), woodMat);
    vine.position.set(-3.1, 1.4, z * 0.93); vine.rotation.z = 0.06; g.add(vine);
  }

  // two cypresses framing the view and a potted bay laurel
  const cypMat = new THREE.MeshStandardMaterial({ color: 0x24361e, roughness: 1 });
  for (const [x, z, h] of [[-6.2, -6.4, 11], [-7.0, 6.8, 13]]) {
    const geo = new THREE.LatheGeometry([[0, 0], [0.5, 0.1], [0.75, 0.3], [0.62, 0.6], [0.32, 0.88], [0, 1]].map(([a, b]) => new THREE.Vector2(a, b * h)), 24, 0, Math.PI * 2);
    const ps = geo.attributes.position;
    for (let i = 0; i < ps.count; i++) {
      const k = 1 + (noise.fbm(ps.getX(i) * 3, ps.getY(i) * 1.2 + ps.getZ(i) * 3, 3) - 0.5) * 0.5;
      ps.setX(i, ps.getX(i) * k); ps.setZ(i, ps.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const t = new THREE.Mesh(geo, cypMat);
    t.position.set(x, elevation(x, z) - 0.5, z);
    t.castShadow = true;
    scene.add(t);
  }
  const amphMat = new THREE.MeshStandardMaterial({ color: 0xb9744c, roughness: 0.8 });
  const amphProf = [[0, 0], [0.04, 0.02], [0.12, 0.2], [0.2, 0.45], [0.21, 0.6], [0.16, 0.78], [0.07, 0.86], [0.06, 1.0], [0.08, 1.04], [0.06, 1.05]].map(([a, b]) => new THREE.Vector2(a, b));
  const amph = (x, z, rx, rz, ry) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(amphProf, 32), amphMat);
    m.position.set(x, 0, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true;
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16, Math.PI), amphMat);
      h.position.set(s * 0.09, 0.9, 0); h.rotation.z = s * Math.PI / 2; m.add(h);
    }
    g.add(m);
  };
  amph(-3.8, -4.2, 0, 0.18, 0.3);
  amph(-3.75, -4.75, 0, 0.22, 1.2);
  amph(-3.85, 4.4, 0, -0.15, 0.4);
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.3, 0.45], [0.33, 0.5], [0, 0.5]].map(([a, b]) => new THREE.Vector2(a, b)), 32), amphMat);
  pot.position.set(-3.6, 0, 3.2); pot.castShadow = true; g.add(pot);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), new THREE.MeshStandardMaterial({ color: 0x2f4320, roughness: 1, flatShading: true }));
  const bp = bush.geometry.attributes.position;
  for (let i = 0; i < bp.count; i++) { const k = 1 + (noise.v(bp.getX(i) * 6 + 3, bp.getY(i) * 6 + bp.getZ(i) * 6) - 0.5) * 0.5; bp.setXYZ(i, bp.getX(i) * k, bp.getY(i) * k, bp.getZ(i) * k); }
  bush.geometry.computeVertexNormals();
  bush.position.set(-3.6, 1.0, 3.2); bush.castShadow = true; g.add(bush);
  return g;
}
