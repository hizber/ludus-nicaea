// Link between the two players through public MQTT brokers over secure websockets.
// Works on any network (no direct browser-to-browser connection needed).
// The host (Player A) owns the game state and publishes it retained, so a guest who
// joins late or reloads gets the current game at once. Messages go out on every
// broker that is connected and are de-duplicated by id on arrival.

const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const ROOT = 'ludus-nicaea/v1/';
const BEAT = 4000, ALIVE = 14000;

export class Net {
  constructor({ onMessage, onStatus }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.clients = [];
    this.seen = new Set();
    this.lastSeen = 0;
    this.status = null;
    this.me = Math.random().toString(36).slice(2, 10);
  }

  host(code) { this.start(code, 'host'); }
  join(code) { this.start(code, 'guest'); }

  start(code, role) {
    this.role = role;
    const base = ROOT + code + '/';
    this.out = base + (role === 'host' ? 'h2g' : 'g2h');
    this.inTopic = base + (role === 'host' ? 'g2h' : 'h2g');
    for (const url of BROKERS) {
      const c = window.mqtt.connect(url, {
        clientId: 'ludus_' + this.me + '_' + Math.random().toString(36).slice(2, 6),
        clean: true, connectTimeout: 10000, reconnectPeriod: 3000, keepalive: 30,
      });
      c.on('connect', () => {
        c.subscribe(this.inTopic, { qos: 1 });
        this.setStatus(this.role === 'host' ? 'hosting' : 'host-missing');
        if (this.role === 'guest') this.onStatus('link');
      });
      c.on('message', (topic, payload, packet) => this.receive(payload, packet));
      c.on('error', () => {});
      this.clients.push(c);
    }
    setInterval(() => {
      this.raw({ t: 'ping' }, false);
      this.refresh();
    }, BEAT);
  }

  receive(payload, packet) {
    let msg;
    try { msg = JSON.parse(payload.toString()); } catch (e) { return; }
    if (!msg || msg.from === this.me) return;
    if (msg.id) {
      if (this.seen.has(msg.id)) return;
      this.seen.add(msg.id);
      if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-200));
    }
    if (!packet.retain) { this.lastSeen = Date.now(); this.refresh(); }
    if (msg.t === 'ping') return;
    if (packet.retain) msg.retained = true;
    this.onMessage(msg);
  }

  refresh() {
    const alive = Date.now() - this.lastSeen < ALIVE;
    if (alive) this.setStatus('connected');
    else if (this.status === 'connected') this.setStatus('disconnected');
  }

  setStatus(s) {
    if (s === this.status) return;
    const was = this.status;
    this.status = s;
    this.onStatus(s, was);
  }

  raw(msg, retain) {
    const body = JSON.stringify({ ...msg, from: this.me, id: this.me + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) });
    for (const c of this.clients) if (c.connected) c.publish(this.out, body, { qos: msg.t === 'ping' ? 0 : 1, retain: !!retain });
  }

  send(msg) { this.raw(msg, this.role === 'host' && msg.t === 'state'); }

  get connected() { return this.status === 'connected'; }
}
