// Small synthesized soundscape: bone dice on marble, glass on stone, wind and birds.
export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; }

  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.7 : 0;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ambient();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.1);
  }

  burst(freq, q, dur, gain, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }

  tone(freq, dur, gain, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  rattle() {
    for (let i = 0; i < 9; i++) this.burst(2200 + Math.random() * 1800, 6, 0.03, 0.25, i * 0.045 + Math.random() * 0.02);
  }
  clack(strength = 1) {
    this.burst(3200 + Math.random() * 1200, 8, 0.05, 0.35 * strength);
    this.tone(1900 + Math.random() * 400, 0.04, 0.05 * strength);
  }
  place() {
    this.burst(2600, 4, 0.06, 0.3);
    this.tone(1250 + Math.random() * 150, 0.09, 0.07);
  }
  thud() { this.burst(500, 1.5, 0.12, 0.3); }
  chime() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.9, 0.08, i * 0.12)); }

  ambient() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    const bird = () => {
      if (this.enabled) {
        const t = ctx.currentTime;
        const n = 2 + Math.floor(Math.random() * 4);
        const base = 2600 + Math.random() * 1600;
        for (let i = 0; i < n; i++) {
          const o = ctx.createOscillator(); const gg = ctx.createGain();
          const s = t + i * 0.13;
          o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * 1.35, s + 0.07);
          gg.gain.setValueAtTime(0.0001, s); gg.gain.exponentialRampToValueAtTime(0.025, s + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
          o.connect(gg); gg.connect(this.master); o.start(s); o.stop(s + 0.12);
        }
      }
      setTimeout(bird, 3000 + Math.random() * 9000);
    };
    setTimeout(bird, 2500);
  }
}
