import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildScenery } from './scenery.js';
import { Board, slotPosition, SURF, TABLE_Y, DIE } from './board.js';
import { buildPerson } from './people.js';
import { Sfx } from './audio.js';
import { Net } from './net.js';
import { CHARACTERS, CONVERSATIONS, REACTIONS } from './dialogs.js';
import { newGame, rollDice, applyMove, allOptions, anyMoves, other, posOf, N, OFF } from './rules.js';

// ---------------------------------------------------------------- i18n
const STR = {
  tr: {
    load1: 'Mermer ocaktan çıkarılıyor…', load2: 'Nikaia surları örülüyor…', load3: 'Askania Gölü dolduruluyor…', load4: 'Oyuncular yerlerini alıyor…',
    era: 'Nikaia · Milattan Sonra 325',
    lede: 'Romalıların “On İki Yazıt Oyunu”, İznik Müzesi’ndeki taş tablanın benzeri Prokonnesos mermerinden bir tablada. Üç zar, onbeşer taş ve aşağıda uzanan şehir.',
    yourName: 'Adınız', namePh: 'ör. Theodoros', host: 'Çevrimiçi oyun kur', local: 'Bu cihazda oyna', code: 'Kod', join: 'Katıl', howto: 'Nasıl oynanır?',
    inviteKicker: 'Arkadaşını davet et', inviteTitle: 'Bu bağlantıyı gönder', copy: 'Kopyala', share: 'Paylaş…', waiting: 'Rakibinin masaya oturması bekleniyor…',
    roomCode: 'Oda kodu', keepOpen: 'Bu sekmeyi açık tutun.', close: 'Kapat', copied: 'Bağlantı kopyalandı!',
    roll: 'Zarları at', view: 'Görünüm', talk: 'Sohbet', voice: 'Seslendirme', sound: 'Ses', rules: 'Kurallar', invite: 'Davet', rematch: 'Yeniden oyna',
    yourTurn: 'Sıra sizde', turnOf: 'Sıra: {n}', waitingOpp: 'Rakip bekleniyor',
    hintRoll: 'Üç zarı birden atın.', hintEnter: 'Taşlarınızı 1–6 hücrelerine sokun: altın halkaya tıklayın.',
    hintMove: 'Bir taşınızı seçin, sonra altın halkaya tıklayın.', hintBack: 'Kırmızı zar: bir taşı geri götürmelisiniz.',
    hintOff: 'Taşı tabladan almak için kaseye tıklayın.', hintWait: 'Rakibin hamlesi bekleniyor…',
    noMoves: 'Oynanabilecek hamle yok — kalan zarlar yandı.', opening: '{a}: {va} · {b}: {vb} — {w} başlıyor.',
    diceOut: 'Bir zar tabladan düştü! O sayı kadar geri gidilecek.', captured: '{n} bir taşı kırdı!',
    stats: '{w} bekliyor · {b} tablada · {o} çıktı', win: '{n} kazandı!', winSub: 'Fortuna ona gülümsedi. Bir el daha?',
    connOk: 'Bağlı', connWait: 'Bağlanıyor…', connLost: 'Bağlantı koptu, yeniden deneniyor…', hostMissing: 'Oyun kurucusu bekleniyor…',
    idTaken: 'Bu oda başka bir sekmede açık.', connErr: 'Bağlantı hatası: {e}', you: 'siz', p1: 'Oyuncu I', p2: 'Oyuncu II',
    vPlay: 'Oyuncu görünümü', vScene: 'Manzara', vTop: 'Üstten', on: 'açık', off: 'kapalı',
  },
  en: {
    load1: 'Quarrying the marble…', load2: 'Raising the walls of Nicaea…', load3: 'Filling Lake Ascania…', load4: 'The players take their seats…',
    era: 'Nicaea · Anno Domini CCCXXV',
    lede: 'The Roman “game of twelve lines”, on a Proconnesian marble slab like the one kept in the İznik Museum. Three dice, fifteen counters each, and the city below.',
    yourName: 'Your name', namePh: 'e.g. Theodoros', host: 'Create online game', local: 'Play on this device', code: 'Code', join: 'Join', howto: 'How to play',
    inviteKicker: 'Invite your friend', inviteTitle: 'Send this link', copy: 'Copy', share: 'Share…', waiting: 'Waiting for your opponent to take their seat…',
    roomCode: 'Room code', keepOpen: 'Keep this tab open.', close: 'Close', copied: 'Link copied!',
    roll: 'Throw the dice', view: 'View', talk: 'Talk', voice: 'Voice', sound: 'Sound', rules: 'Rules', invite: 'Invite', rematch: 'Play again',
    yourTurn: 'Your turn', turnOf: '{n} to play', waitingOpp: 'Waiting for opponent',
    hintRoll: 'Throw all three dice.', hintEnter: 'Enter your pieces on cells 1–6: click a gold ring.',
    hintMove: 'Pick one of your pieces, then click a gold ring.', hintBack: 'Red die: you must move a piece backwards.',
    hintOff: 'Click the dish to bear the piece off.', hintWait: 'Waiting for your opponent…',
    noMoves: 'No legal moves — the remaining dice are forfeited.', opening: '{a}: {va} · {b}: {vb} — {w} begins.',
    diceOut: 'A die fell off the board! That number must be moved backwards.', captured: '{n} captured a piece!',
    stats: '{w} waiting · {b} on board · {o} off', win: '{n} wins!', winSub: 'Fortuna smiled on them. Another round?',
    connOk: 'Connected', connWait: 'Connecting…', connLost: 'Connection lost, retrying…', hostMissing: 'Waiting for the host…',
    idTaken: 'This room is open in another tab.', connErr: 'Connection error: {e}', you: 'you', p1: 'Player I', p2: 'Player II',
    vPlay: 'Player view', vScene: 'Landscape', vTop: 'From above', on: 'on', off: 'off',
  },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let lang = store.get('ludus-lang', 'tr');
const t = (k, vars = {}) => (STR[lang][k] || k).replace(/\{(\w+)\}/g, (_, x) => vars[x] ?? '');
const $ = (s) => document.querySelector(s);

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-l]').forEach((el) => el.classList.toggle('hidden', el.dataset.l !== lang));
  document.querySelectorAll('[data-setlang]').forEach((b) => b.classList.toggle('on', b.dataset.setlang === lang));
  if (G.view) updateHUD();
}

// ---------------------------------------------------------------- renderer & scene
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 60000);
camera.position.set(2.2, 1.5, 1.7);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.35;
controls.maxDistance = 7;
controls.maxPolarAngle = 1.5;
controls.target.set(-0.2, 0.9, 0);
controls.enablePan = true;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < innerHeight ? 62 : 45;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
dispatchEvent(new Event('resize'));

const sfx = new Sfx();
sfx.setEnabled(store.get('ludus-sound', true));

// ---------------------------------------------------------------- game state
const G = {
  mode: null, me: null, s: null, view: null, names: { A: '', B: '' }, code: null,
  sel: null, opts: [], animating: false, queue: Promise.resolve(), viewMode: 'play', stamp: 100,
};
let board, scenery, figs = {};
const net = new Net({ onMessage, onStatus });

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot() {
  applyLang();
  const step = async (k, pct) => { $('#loadmsg').textContent = t(k); $('#loadbar').style.width = pct + '%'; await nextFrame(); };
  await step('load1', 10);
  board = new Board(scene);
  await step('load2', 45);
  scenery = buildScenery(scene, renderer, { mobile });
  await step('load3', 75);
  await step('load4', 85);
  buildPeople();
  await step('load4', 100);
  renderer.compile(scene, camera);
  G.view = newGame();
  updateHUD();
  $('#loading').style.opacity = 0;
  setTimeout(() => $('#loading').classList.add('hidden'), 800);
  routeFromURL();
}

function buildPeople() {
  figs.A = buildPerson('elder');
  figs.A.root.position.set(0, 0, 0.8);
  figs.A.root.rotation.y = Math.PI;
  figs.B = buildPerson('young');
  figs.B.root.position.set(0, 0, -0.8);
  for (const p of ['A', 'B']) {
    const f = figs[p];
    scene.add(f.root);
    f.root.updateMatrixWorld(true);
    const l = f.root.localToWorld(new THREE.Vector3(0.17, TABLE_Y + 0.025, 0.42));
    const r = f.root.localToWorld(new THREE.Vector3(-0.16, TABLE_Y + 0.025, 0.4));
    f.setRest(r, l); // side -1 is the figure's right hand
    f.lookAt(new THREE.Vector3(0, SURF, 0));
  }
  loadModels();
}

// Optional sculpted characters: drop assets/models/theodoros.glb and markianos.glb
// (seated, facing the table) and they replace the procedural figures.
async function loadModels() {
  let cfg = {};
  try { const r = await fetch('assets/models/config.json'); if (r.ok) cfg = await r.json(); } catch (e) {}
  const loader = new GLTFLoader();
  for (const [p, file] of [['A', 'theodoros'], ['B', 'markianos']]) {
    const c = cfg[file] || {};
    try {
      const head = await fetch(`assets/models/${file}.glb`, { method: 'HEAD' });
      if (!head.ok) continue;
      const gltf = await loader.loadAsync(`assets/models/${file}.glb`);
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = (c.height || 1.34) / size.y;
      m.scale.setScalar(k);
      const b2 = new THREE.Box3().setFromObject(m), ctr = b2.getCenter(new THREE.Vector3());
      m.position.set(-ctr.x + (c.x || 0), -b2.min.y + (c.y || 0), -ctr.z + (c.z || 0.06));
      const holder = new THREE.Group();
      holder.rotation.y = THREE.MathUtils.degToRad(c.rotY || 0);
      holder.add(m);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1; } });
      const f = figs[p];
      f.root.traverse((o) => { if (o.isMesh) o.visible = false; });
      f.root.add(holder);
      f.model = holder;
    } catch (e) { console.warn('model', file, e); }
  }
}

// ---------------------------------------------------------------- routing / lobby
function randomCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...Array(5)].map(() => a[Math.floor(Math.random() * a.length)]).join('');
}

function routeFromURL() {
  const q = new URLSearchParams(location.search);
  const room = (q.get('room') || '').toUpperCase();
  $('#name').value = store.get('ludus-name', '');
  if (room) {
    if (store.get('ludus-host-' + room, null)) startHost(room);
    else startGuest(room);
  } else {
    show('#lobby');
    G.viewMode = 'scene';
    setView('scene', 'A', true);
  }
}

function show(sel) { $(sel).classList.remove('hidden'); }
function hide(sel) { $(sel).classList.add('hidden'); }
function myName() { const n = $('#name').value.trim(); store.set('ludus-name', n); return n; }

$('#btnLocal').onclick = () => { sfx.ensure(); myName(); startLocal(); };
$('#btnHost').onclick = () => { sfx.ensure(); myName(); const code = randomCode(); history.replaceState(null, '', '?room=' + code); startHost(code); };
$('#btnJoin').onclick = () => {
  sfx.ensure(); myName();
  const code = $('#joinCode').value.trim().toUpperCase();
  if (code.length < 4) return;
  history.replaceState(null, '', '?room=' + code);
  startGuest(code);
};
document.querySelectorAll('[data-setlang]').forEach((b) => b.onclick = () => { lang = b.dataset.setlang; store.set('ludus-lang', lang); applyLang(); });
$('#btnLang').onclick = () => { lang = lang === 'tr' ? 'en' : 'tr'; store.set('ludus-lang', lang); applyLang(); talk.cancel(); };

function enterTable() {
  hide('#lobby');
  show('#hud'); show('#tools');
  G.viewMode = 'play';
  setView('play', viewPlayer());
}

function startLocal() {
  G.mode = 'local'; G.me = null;
  G.names = { A: myName() || CHARACTERS.E[lang], B: CHARACTERS.Y[lang] };
  enterTable();
  beginGame();
}

function startHost(code) {
  G.mode = 'host'; G.me = 'A'; G.code = code;
  const saved = store.get('ludus-host-' + code, null);
  G.names.A = myName() || (saved && saved.names && saved.names.A) || CHARACTERS.E[lang];
  G.names.B = (saved && saved.names && saved.names.B) || '';
  if (saved && saved.state && saved.state.started) { G.s = saved.state; if (G.s.phase === 'ending') { G.s.phase = 'roll'; G.s.turn = other(G.s.turn); G.s.dice = []; } }
  store.set('ludus-host-' + code, { state: G.s, names: G.names });
  enterTable();
  show('#btnInvite');
  const link = location.origin + location.pathname + '?room=' + code;
  $('#inviteLink').value = link;
  $('#roomCode').textContent = code;
  if (navigator.share) show('#btnShare');
  if (!G.s) show('#invite');
  else present(G.s, { type: 'sync' });
  setConn('wait', t('connWait'));
  net.host(code);
}

function startGuest(code) {
  G.mode = 'guest'; G.me = 'B'; G.code = code;
  G.names.B = myName() || CHARACTERS.Y[lang];
  hide('#lobby');
  show('#hud'); show('#tools');
  G.viewMode = 'play';
  setView('play', 'B');
  setConn('wait', t('connWait'));
  net.join(code);
}

$('#btnCopy').onclick = async () => {
  const v = $('#inviteLink').value;
  try { await navigator.clipboard.writeText(v); } catch (e) { $('#inviteLink').select(); document.execCommand('copy'); }
  toast(t('copied'));
};
$('#btnShare').onclick = () => navigator.share({ title: 'Ludus Duodecim Scriptorum', text: lang === 'tr' ? 'Nikaia’da bir el XII scripta oynayalım!' : 'Let’s play XII scripta in Nicaea!', url: $('#inviteLink').value }).catch(() => {});
$('#btnInvite').onclick = () => show('#invite');
$('#btnCloseInvite').onclick = () => hide('#invite');

// ---------------------------------------------------------------- networking
function setConn(cls, text) {
  const el = $('#conn');
  el.className = cls; el.textContent = text;
  if (G.mode === 'local') el.classList.add('hidden');
}

function onStatus(st, info) {
  if (st === 'connected') {
    setConn('ok', t('connOk'));
    if (G.mode === 'guest') net.send({ t: 'hello', name: G.names.B });
  } else if (st === 'hosting') setConn('wait', t('waitingOpp'));
  else if (st === 'disconnected') setConn('bad', t('connLost'));
  else if (st === 'host-missing') setConn('wait', t('hostMissing'));
  else if (st === 'id-taken') setConn('bad', t('idTaken'));
  else if (st === 'error') setConn('bad', t('connErr', { e: info }));
}

function onMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (G.mode === 'host') {
    if (msg.t === 'hello') {
      G.names.B = String(msg.name || '').slice(0, 18) || CHARACTERS.Y[lang];
      hide('#invite');
      if (!G.s || !G.s.started) beginGame();
      else commit({ type: 'sync' });
      toast((lang === 'tr' ? 'Masaya oturdu: ' : 'Took a seat: ') + G.names.B);
    } else if (msg.t === 'act') hostAct(msg.act, 'B');
  } else if (G.mode === 'guest') {
    if (msg.t === 'state') {
      G.names = { A: msg.names.A, B: msg.names.B };
      G.s = msg.state;
      present(msg.state, msg.ev);
    }
  }
}

// ---------------------------------------------------------------- authority (host or local)
function beginGame() {
  G.s = newGame();
  G.s.started = true;
  let va, vb;
  do { va = 1 + Math.floor(Math.random() * 6); vb = 1 + Math.floor(Math.random() * 6); } while (va === vb);
  G.s.turn = va > vb ? 'A' : 'B';
  G.s.phase = 'roll';
  commit({ type: 'opening', va, vb });
}

function commit(ev) {
  const s = G.s;
  s.seq++;
  if (G.mode === 'host') {
    store.set('ludus-host-' + G.code, { state: s, names: G.names });
    net.send({ t: 'state', state: s, ev, names: G.names });
  }
  present(JSON.parse(JSON.stringify(s)), ev);
}

function dispatch(act) {
  if (G.mode === 'guest') net.send({ t: 'act', act });
  else hostAct(act, G.mode === 'local' ? G.s.turn : 'A');
}

function diceVisuals(dice) {
  const used = [];
  return dice.map((d) => {
    let x, z, ok, tries = 0;
    do {
      if (d.out) { x = (Math.random() < 0.5 ? -1 : 1) * (0.56 + Math.random() * 0.12); z = (Math.random() - 0.5) * 0.3; }
      else { const lanes = [0.065, -0.065, 0.186, -0.186]; z = lanes[Math.floor(Math.random() * 4)] + (Math.random() - 0.5) * 0.012; x = (Math.random() - 0.5) * 0.74; }
      ok = used.every((u) => Math.hypot(u.x - x, u.z - z) > 0.035);
    } while (!ok && ++tries < 40);
    const v = { x, z, yaw: Math.random() * Math.PI * 2, axis: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], spin: 9 + Math.random() * 8 };
    used.push(v);
    return v;
  });
}

function hostAct(act, who) {
  const s = G.s;
  if (!s || !act) return;
  if (act.type === 'roll') {
    if (s.phase !== 'roll' || s.turn !== who) return;
    rollDice(s);
    commit({ type: 'roll', player: who, vis: diceVisuals(s.dice) });
    afterAction();
  } else if (act.type === 'move') {
    const ev = applyMove(s, who, act.die | 0, act.from | 0, act.to | 0);
    if (!ev) return;
    commit(ev);
    afterAction();
  } else if (act.type === 'rematch') {
    if (s.phase === 'over') beginGame();
  }
}

function afterAction() {
  const s = G.s;
  if (s.phase === 'over' || anyMoves(s)) return;
  const forfeited = s.dice.some((d) => !d.used);
  s.phase = 'ending';
  setTimeout(() => {
    s.turn = other(s.turn);
    s.phase = 'roll';
    s.dice = [];
    commit({ type: 'turn', forfeited });
  }, forfeited ? 2600 : 900);
}

// ---------------------------------------------------------------- presentation
function present(state, ev) {
  G.queue = G.queue.then(() => render(state, ev || { type: 'sync' })).catch((e) => console.error(e));
}

async function render(state, ev) {
  G.animating = true;
  refreshOptions();
  const prev = G.view;
  if (ev.type === 'opening') {
    G.view = state;
    syncPieces(state, false);
    hide('#winner');
    toast(t('opening', { a: G.names.A, b: G.names.B, va: ev.va, vb: ev.vb, w: G.names[state.turn] }), 3800);
  } else if (ev.type === 'roll') {
    G.view = { ...prev, dice: [] };
    updateHUD();
    await animateRoll(ev.player, state.dice, ev.vis);
    if (state.dice.some((d) => d.out)) { toast(t('diceOut'), 3000); talk.react(ev.player, 'out'); }
  } else if (ev.type === 'move') {
    await animateMove(ev);
    if (ev.hit) {
      toast(t('captured', { n: G.names[ev.player] }), 2200);
      talk.react(ev.player, 'hit');
      setTimeout(() => talk.react(ev.hit.player, 'wasHit'), 2600);
    }
  } else if (ev.type === 'turn') {
    if (ev.forfeited) toast(t('noMoves'), 2400);
  }
  G.view = state;
  syncPieces(state, true);
  updateHUD();
  if (state.phase === 'over') {
    sfx.chime();
    talk.react(state.winner, 'win');
    $('#winText').textContent = t('win', { n: G.names[state.winner] });
    $('#winSub').textContent = t('winSub');
    show('#winner');
    $('#btnRematch').classList.toggle('hidden', G.mode === 'guest');
  }
  if (G.mode === 'local' && G.viewMode === 'play' && state.turn) setView('play', state.turn);
  G.animating = false;
  refreshOptions();
}

const tweens = [];
function tween(dur, fn) { return new Promise((res) => tweens.push({ t: 0, dur, fn, res })); }
const ease = (k) => 1 - Math.pow(1 - k, 3);

function handOf(p, side = -1) { return figs[p].arms[side].hand.getWorldPosition(new THREE.Vector3()); }

async function animateRoll(player, dice, vis) {
  const f = figs[player];
  const sgn = player === 'A' ? 1 : -1;
  const gather = new THREE.Vector3(0.12 * sgn, SURF + 0.16, 0.26 * sgn);
  f.lookAt(new THREE.Vector3(0, SURF, 0));
  f.reach(-1, gather);
  sfx.ensure();
  const dm = board.dice;
  const startPos = dm.map((m) => m.position.clone());
  const offs = [new THREE.Vector3(0.012, -0.03, 0), new THREE.Vector3(-0.012, -0.03, 0.006), new THREE.Vector3(0, -0.035, -0.012)];
  await tween(0.45, (k) => {
    const h = handOf(player);
    dm.forEach((m, i) => m.position.lerpVectors(startPos[i], h.clone().add(offs[i]), ease(k)));
  });
  sfx.rattle();
  await tween(0.55, (k) => {
    const h = handOf(player);
    const shake = Math.sin(k * 40) * 0.015;
    f.reach(-1, gather.clone().add(new THREE.Vector3(shake, Math.abs(shake), 0)));
    dm.forEach((m, i) => { m.position.copy(h).add(offs[i]); m.rotation.x += 0.4; m.rotation.y += 0.3; });
  });
  const S = dm.map((m) => m.position.clone());
  const Q0 = dm.map((m) => m.quaternion.clone());
  const E = vis.map((v, i) => new THREE.Vector3(v.x, (dice[i].out ? TABLE_Y : SURF) + DIE / 2 + 0.0004, v.z));
  const QF = vis.map((v, i) => board.dieQuaternion(dice[i].v, v.yaw));
  const AX = vis.map((v) => new THREE.Vector3(...v.axis).normalize());
  const hits = [0.42, 0.68, 0.85];
  const played = dm.map(() => [false, false, false]);
  f.reach(-1, gather.clone().add(new THREE.Vector3(-0.1 * sgn, 0.05, -0.15 * sgn)));
  setTimeout(() => f.reach(-1, null), 350);
  const q = new THREE.Quaternion();
  await tween(1.35, (k) => {
    dm.forEach((m, i) => {
      const base = E[i].y;
      const hk = ease(Math.min(1, k * 1.15));
      m.position.x = S[i].x + (E[i].x - S[i].x) * hk;
      m.position.z = S[i].z + (E[i].z - S[i].z) * hk;
      let y;
      if (k < hits[0]) { const u = k / hits[0]; y = S[i].y + (base - S[i].y) * u * u + 0.09 * u * (1 - u); }
      else if (k < hits[1]) { const u = (k - hits[0]) / (hits[1] - hits[0]); y = base + 0.035 * 4 * u * (1 - u); }
      else if (k < hits[2]) { const u = (k - hits[1]) / (hits[2] - hits[1]); y = base + 0.012 * 4 * u * (1 - u); }
      else y = base;
      m.position.y = y;
      const rem = Math.pow(1 - Math.min(1, k / 0.9), 2);
      q.setFromAxisAngle(AX[i], vis[i].spin * rem);
      m.quaternion.copy(QF[i]).premultiply(q);
      if (k < 0.15) m.quaternion.slerp(Q0[i], 1 - k / 0.15);
      hits.forEach((h, j) => { if (!played[i][j] && k >= h + i * 0.01) { played[i][j] = true; sfx.clack(1 - j * 0.35); } });
    });
  });
  dm.forEach((m, i) => { m.position.copy(E[i]); m.quaternion.copy(QF[i]); });
  dm.forEach((m, i) => m.material.forEach((mat) => mat.color.set(dice[i].out ? 0xf0b8a8 : 0xffffff)));
}

function stackOf(player, pos) {
  return board.pieces[player].filter((m) => m.userData.pos === pos).sort((a, b) => a.userData.stamp - b.userData.stamp);
}

async function animateMove(ev) {
  const p = ev.player, f = figs[p];
  const from = stackOf(p, ev.from);
  const mesh = from[from.length - 1];
  if (!mesh) return;
  const destIdx = stackOf(p, ev.to).length;
  const end = slotPosition(p, ev.to, destIdx);
  const start = mesh.position.clone();
  f.lookAt(start);
  f.reach(-1, start.clone().add(new THREE.Vector3(0, 0.03, 0)));
  await sleep(260);
  mesh.userData.pos = ev.to;
  mesh.userData.stamp = ++G.stamp;
  const lift = 0.06 + start.distanceTo(end) * 0.15;
  f.lookAt(end);
  await tween(0.55, (k) => {
    const e = ease(k);
    mesh.position.lerpVectors(start, end, e);
    mesh.position.y += Math.sin(Math.PI * k) * lift;
    f.reach(-1, mesh.position.clone().add(new THREE.Vector3(0, 0.035, 0)));
  });
  mesh.position.copy(end);
  sfx.place();
  f.reach(-1, null);
  if (ev.hit) {
    const op = ev.hit.player;
    const st = stackOf(op, ev.hit.pos);
    const victim = st[st.length - 1];
    if (victim) {
      const v0 = victim.position.clone();
      victim.userData.pos = 0;
      victim.userData.stamp = ++G.stamp;
      const v1 = slotPosition(op, 0, stackOf(op, 0).length - 1);
      figs[op].lookAt(v0);
      sfx.thud();
      await tween(0.6, (k) => {
        victim.position.lerpVectors(v0, v1, ease(k));
        victim.position.y += Math.sin(Math.PI * k) * 0.14;
      });
    }
  }
  f.lookAt(new THREE.Vector3(0, SURF, 0));
}

// Bring the meshes in line with the authoritative counts.
function syncPieces(state, animate) {
  for (const p of ['A', 'B']) {
    const meshes = board.pieces[p];
    const want = state.counts[p];
    const have = new Array(32).fill(0);
    meshes.forEach((m) => have[m.userData.pos]++);
    const spare = [];
    for (let pos = 0; pos < 32; pos++) {
      if (have[pos] > want[pos]) {
        const st = stackOf(p, pos);
        spare.push(...st.slice(want[pos]));
      }
    }
    for (let pos = 0; pos < 32; pos++) {
      let need = want[pos] - meshes.filter((m) => m.userData.pos === pos).length + spare.filter((m) => m.userData.pos === pos).length;
      while (need > 0 && spare.length) {
        const m = spare.pop();
        if (m.userData.pos === pos) continue;
        m.userData.pos = pos; m.userData.stamp = ++G.stamp; need--;
      }
    }
    for (let pos = 0; pos < 32; pos++) {
      stackOf(p, pos).forEach((m, i) => {
        const target = slotPosition(p, pos, i);
        if (m.position.distanceTo(target) < 0.001) return;
        if (!animate) { m.position.copy(target); return; }
        const s0 = m.position.clone();
        tween(0.35, (k) => { m.position.lerpVectors(s0, target, ease(k)); m.position.y += Math.sin(Math.PI * k) * 0.03; });
      });
    }
  }
  board.updateLabels(state);
  if (!state.dice || !state.dice.length) board.dice.forEach((m) => m.material.forEach((mat) => mat.color.set(0xffffff)));
}

// ---------------------------------------------------------------- HUD
function canAct() {
  const v = G.view;
  return v && !G.animating && v.phase === 'move' && (G.mode === 'local' || v.turn === G.me) && G.mode;
}
function canRoll() {
  const v = G.view;
  return v && !G.animating && v.phase === 'roll' && v.turn && (G.mode === 'local' || v.turn === G.me) && G.mode && (G.mode !== 'host' || net.connected || G.s.started);
}

function dieHTML(d) {
  const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[d.v];
  let h = '';
  for (let i = 1; i <= 9; i++) h += pips.includes(i) ? '<i></i>' : '<span></span>';
  return `<div class="die${d.used ? ' used' : ''}${d.out ? ' out' : ''}">${h}</div>`;
}

function updateHUD() {
  const v = G.view;
  if (!v) return;
  for (const p of ['A', 'B']) {
    const c = v.counts[p];
    let onb = 0; for (let i = 1; i <= 30; i++) onb += c[i];
    const nm = G.names[p] || (p === 'A' ? t('p1') : t('p2'));
    $('#name' + p).textContent = nm + (G.me === p ? ` (${t('you')})` : '');
    $('#stats' + p).textContent = t('stats', { w: c[0], b: onb, o: c[OFF] });
    $('#card' + p).classList.toggle('active', v.turn === p && v.phase !== 'over');
  }
  const mine = G.mode === 'local' || v.turn === G.me;
  $('#turnText').textContent = !v.turn ? t('waitingOpp') : mine ? (G.mode === 'local' ? t('turnOf', { n: G.names[v.turn] }) : t('yourTurn')) : t('turnOf', { n: G.names[v.turn] });
  $('#diceTray').innerHTML = (v.dice || []).map(dieHTML).join('');
  $('#btnRoll').classList.toggle('hidden', !canRoll());
  let hint = '';
  if (v.phase === 'roll') hint = mine ? t('hintRoll') : t('hintWait');
  else if (v.phase === 'move' && !mine) hint = t('hintWait');
  else if (canAct() && G.opts.length) {
    const tg = G.opts.filter((o) => o.from === G.sel);
    if (G.opts.some((o) => o.from === 0)) hint = t('hintEnter');
    else if (tg.some((o) => o.to === OFF)) hint = t('hintOff');
    else if (v.dice.some((d) => d.out && !d.used)) hint = t('hintBack');
    else hint = t('hintMove');
  }
  $('#hint').textContent = hint;
  $('#btnTalk').classList.toggle('off', !talk.enabled);
  $('#btnVoice').classList.toggle('off', !talk.voice);
  $('#btnSound').classList.toggle('off', !sfx.enabled);
}

function refreshOptions() {
  if (!board) return;
  if (!canAct()) { G.opts = []; G.sel = null; board.showMarkers([], [], null); updateHUD(); return; }
  const v = G.view;
  G.opts = allOptions(v);
  const froms = [...new Set(G.opts.map((o) => o.from))];
  if (!froms.includes(G.sel)) G.sel = froms.includes(0) ? 0 : froms.length === 1 ? froms[0] : null;
  const p = v.turn;
  const targets = G.opts.filter((o) => o.from === G.sel).map((o) => ({ player: p, pos: o.to }));
  const movable = froms.filter((f) => f !== G.sel).map((f) => ({ player: p, pos: f }));
  board.showMarkers(targets, movable, G.sel !== null ? { player: p, pos: G.sel } : null);
  updateHUD();
}

let toastTimer;
function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

$('#btnRoll').onclick = () => { sfx.ensure(); if (canRoll()) { $('#btnRoll').classList.add('hidden'); dispatch({ type: 'roll' }); } };
addEventListener('keydown', (e) => { if (e.code === 'Space' && canRoll() && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#btnRoll').click(); } });
$('#btnRematch').onclick = () => { hide('#winner'); dispatch({ type: 'rematch' }); };
$('#btnSound').onclick = () => { sfx.ensure(); sfx.setEnabled(!sfx.enabled); store.set('ludus-sound', sfx.enabled); updateHUD(); };
$('#btnTalk').onclick = () => { talk.setEnabled(!talk.enabled); updateHUD(); };
$('#btnVoice').onclick = () => { talk.setVoice(!talk.voice); updateHUD(); };
document.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => show('#' + b.dataset.open));
document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => b.closest('.modal').classList.add('hidden'));
$('#rules').onclick = (e) => { if (e.target.id === 'rules') hide('#rules'); };

// ---------------------------------------------------------------- input
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  down = null;
  sfx.ensure();
  if (!canAct()) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(board.hit, false)[0];
  if (!hit) return;
  const u = hit.object.userData, me = G.view.turn;
  let pos = null;
  if (u.kind === 'cell') pos = posOf(me, u.r, u.c);
  else if (u.kind === 'dish' && u.player === me) pos = OFF;
  else if (u.kind === 'pool' && u.player === me) pos = 0;
  if (pos === null) return;
  const opt = G.opts.find((o) => o.from === G.sel && o.to === pos);
  if (opt && pos !== 0) {
    G.opts = []; board.showMarkers([], [], null);
    dispatch({ type: 'move', die: opt.die, from: opt.from, to: opt.to });
  } else if (G.opts.some((o) => o.from === pos)) {
    G.sel = pos; refreshOptions();
  }
});

// ---------------------------------------------------------------- camera views
function viewPlayer() { return G.mode === 'guest' ? 'B' : G.mode === 'local' && G.view && G.view.turn ? G.view.turn : 'A'; }
const VIEWS = {
  play: (z) => ({ pos: [0.78 * z, 2.12, 1.02 * z], tgt: [0, 0.79, -0.06 * z] }),
  scene: (z) => ({ pos: [2.3, 1.8, 1.75 * z], tgt: [-0.7, 0.86, 0.05 * z] }),
  top: (z) => ({ pos: [0, 2.05, 0.22 * z], tgt: [0, 0.82, 0] }),
};
let camTween = null;
function setView(mode, player, instant) {
  const z = player === 'B' ? -1 : 1;
  const v = VIEWS[mode](z);
  const p1 = new THREE.Vector3(...v.pos), t1 = new THREE.Vector3(...v.tgt);
  if (instant) { camera.position.copy(p1); controls.target.copy(t1); return; }
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const id = {};
  camTween = id;
  tween(1.2, (k) => {
    if (camTween !== id) return;
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(p0, p1, e);
    controls.target.lerpVectors(t0, t1, e);
  });
}
const viewOrder = ['play', 'scene', 'top'];
$('#btnView').onclick = () => {
  G.viewMode = viewOrder[(viewOrder.indexOf(G.viewMode) + 1) % viewOrder.length];
  setView(G.viewMode, viewPlayer());
  toast(t({ play: 'vPlay', scene: 'vScene', top: 'vTop' }[G.viewMode]), 1200);
};

// ---------------------------------------------------------------- conversations
class Talk {
  constructor() {
    this.enabled = store.get('ludus-talk', true);
    this.voice = store.get('ludus-voice', true);
    this.busy = false;
    this.next = performance.now() + 9000;
    this.order = CONVERSATIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
    this.idx = 0;
    this.token = 0;
    this.bubbles = { E: $('#bubbleE'), Y: $('#bubbleY') };
    this.active = null;
    this.voices = [];
    const load = () => { this.voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; };
    load();
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = load;
  }
  setEnabled(on) { this.enabled = on; store.set('ludus-talk', on); if (!on) this.cancel(); }
  setVoice(on) {
    this.voice = on; store.set('ludus-voice', on);
    if (!on) { if (window.speechSynthesis) speechSynthesis.cancel(); if (this.audio) this.audio.pause(); }
  }
  cancel() {
    this.token++;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (this.audio) { this.audio.pause(); this.audio = null; }
    Object.values(this.bubbles).forEach((b) => b.classList.remove('show'));
    this.busy = false; this.active = null;
    this.next = performance.now() + 15000;
  }
  figFor(sp) { return sp === 'E' ? figs.A : figs.B; }
  pickVoice(sp) {
    const vs = this.voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
    if (!vs.length) return null;
    const male = vs.filter((v) => /male|erkek|yelda|cem|tolga|daniel|george|arthur|aaron|fred|rishi/i.test(v.name) && !/female/i.test(v.name));
    const pool = male.length ? male : vs;
    return sp === 'E' ? pool[0] : pool[Math.min(1, pool.length - 1)];
  }
  say(sp, text, token, clip) {
    return new Promise((resolve) => {
      if (token !== this.token) return resolve();
      const b = this.bubbles[sp];
      b.querySelector('b').textContent = CHARACTERS[sp][lang];
      b.querySelector('span').textContent = text;
      b.classList.add('show');
      this.active = sp;
      const me = this.figFor(sp), them = this.figFor(sp === 'E' ? 'Y' : 'E');
      me.lookAt(them.head.getWorldPosition(new THREE.Vector3()));
      them.lookAt(me.head.getWorldPosition(new THREE.Vector3()));
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        b.classList.remove('show');
        this.active = null;
        setTimeout(resolve, 450);
      };
      const minMs = 1800 + text.length * 62;
      if (this.voice && clip) {
        // pre-recorded neural voice
        const a = new Audio(`assets/voice/${lang}/${clip}.mp3`);
        a.volume = 0.95;
        this.audio = a;
        a.onended = () => setTimeout(finish, 300);
        a.onerror = () => setTimeout(finish, minMs);
        a.play().catch(() => setTimeout(finish, minMs));
        setTimeout(finish, minMs * 3 + 6000);
        return;
      }
      const voice = this.voice && window.speechSynthesis ? this.pickVoice(sp) : null;
      if (voice) {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice; u.lang = voice.lang;
        u.pitch = sp === 'E' ? 0.72 : 1.08;
        u.rate = sp === 'E' ? 0.9 : 1.0;
        u.volume = 0.95;
        u.onend = () => setTimeout(finish, 350);
        u.onerror = () => setTimeout(finish, minMs);
        speechSynthesis.speak(u);
        setTimeout(finish, minMs * 2.5 + 4000);
      } else setTimeout(finish, minMs);
    });
  }
  async conversation(ci) {
    this.busy = true;
    const token = ++this.token;
    const lines = CONVERSATIONS[ci];
    for (let j = 0; j < lines.length; j++) {
      const [sp, tr, en] = lines[j];
      if (token !== this.token || !this.enabled) break;
      await this.say(sp, lang === 'tr' ? tr : en, token, `c${ci}_${j}`);
    }
    if (token === this.token) {
      this.busy = false;
      figs.A.lookAt(new THREE.Vector3(0, SURF, 0));
      figs.B.lookAt(new THREE.Vector3(0, SURF, 0));
      this.next = performance.now() + 22000 + Math.random() * 20000;
    }
  }
  react(player, kind) {
    if (!this.enabled || this.busy) return;
    const list = REACTIONS[kind];
    const i = Math.floor(Math.random() * list.length);
    const [tr, en] = list[i];
    const sp = player === 'A' ? 'E' : 'Y';
    this.busy = true;
    const token = ++this.token;
    this.say(sp, lang === 'tr' ? tr : en, token, `r_${kind}_${i}_${sp}`).then(() => {
      if (token === this.token) { this.busy = false; this.next = Math.max(this.next, performance.now() + 12000); }
    });
  }
  update(now) {
    if (!this.enabled || this.busy || !G.mode || now < this.next) return;
    if (!$('#lobby').classList.contains('hidden')) return;
    this.conversation(this.order[this.idx++ % this.order.length]);
  }
  place() {
    for (const sp of ['E', 'Y']) {
      const b = this.bubbles[sp];
      if (!b.classList.contains('show')) continue;
      const h = this.figFor(sp).head.getWorldPosition(new THREE.Vector3());
      h.y += 0.3;
      h.project(camera);
      const x = (h.x * 0.5 + 0.5) * innerWidth, y = (-h.y * 0.5 + 0.5) * innerHeight;
      const w = b.offsetWidth / 2;
      b.style.left = Math.max(w + 10, Math.min(innerWidth - w - 10, x)) + 'px';
      b.style.top = Math.max(b.offsetHeight + 150, Math.min(innerHeight - 20, y)) + 'px';
      b.style.visibility = h.z < 1 ? 'visible' : 'hidden';
    }
  }
}
const talk = new Talk();
window.__ludus = { camera, controls, figs, G, scene, setView, get board() { return board; } };

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let lastTween = performance.now(), lastFrame = performance.now();
function runTweens() {
  const now = performance.now();
  const dt = Math.min((now - lastTween) / 1000, 0.25);
  lastTween = now;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
// Background tabs get no animation frames: keep the game moving anyway.
setInterval(() => { if (performance.now() - lastFrame > 300) runTweens(); }, 100);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const el = clock.elapsedTime;
  lastFrame = performance.now();
  runTweens();
  controls.update();
  if (scenery) scenery.update(el);
  if (board) board.pulse(el);
  for (const p in figs) {
    const f = figs[p];
    f.update(dt);
    if (talk.active === (p === 'A' ? 'E' : 'Y')) f.head.rotation.x += Math.sin(el * 9) * 0.025;
  }
  talk.update(performance.now());
  talk.place();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

boot().then(() => loop()).catch((e) => {
  console.error(e);
  $('#loadmsg').textContent = 'Error: ' + e.message;
});
