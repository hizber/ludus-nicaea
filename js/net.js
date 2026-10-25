// Peer-to-peer link between the two players (PeerJS, no game server needed).
// The host (Player A) owns the game state; the guest sends actions.

const PREFIX = 'ludus-nicaea-';
const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export class Net {
  constructor({ onMessage, onStatus }) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.conn = null;
    this.peer = null;
    this.role = null;
  }

  host(code) {
    this.role = 'host';
    this.peer = new window.Peer(PREFIX + code, { config: { iceServers: ICE } });
    this.peer.on('open', () => this.onStatus('hosting'));
    this.peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) this.conn.close();
      this.bind(conn);
    });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) {} });
    this.peer.on('error', (e) => {
      if (e.type === 'unavailable-id') this.onStatus('id-taken');
      else this.onStatus('error', e.type);
    });
  }

  join(code) {
    this.role = 'guest';
    this.code = code;
    this.peer = new window.Peer({ config: { iceServers: ICE } });
    this.peer.on('open', () => this.dial());
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) {} });
    this.peer.on('error', (e) => {
      if (e.type === 'peer-unavailable') {
        this.onStatus('host-missing');
        clearTimeout(this.retry);
        this.retry = setTimeout(() => this.dial(), 3000);
      } else this.onStatus('error', e.type);
    });
  }

  dial() {
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    this.bind(conn);
  }

  bind(conn) {
    conn.on('open', () => {
      this.conn = conn;
      this.onStatus('connected');
    });
    conn.on('data', (d) => this.onMessage(d));
    conn.on('close', () => {
      if (this.conn === conn) this.conn = null;
      this.onStatus('disconnected');
      if (this.role === 'guest') {
        clearTimeout(this.retry);
        this.retry = setTimeout(() => this.dial(), 2000);
      }
    });
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  get connected() { return !!(this.conn && this.conn.open); }
}
