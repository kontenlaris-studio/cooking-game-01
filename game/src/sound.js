// sound.js — every Sizzle Street sound is synthesized with WebAudio at play
// time: the stove's sizzle is filtered noise, serves ding, mistakes buzz.
// No audio files, nothing to load, and a mute switch the HUD button flips.

export class SoundBank {
  constructor() {
    this.context = null;
    this.muted = false;
    this.sizzleGain = null;
  }

  // Browsers only let audio start after a gesture, so build the graph lazily.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    this.context = ctx;

    // Looping noise -> bandpass -> gain(0): the sizzle bed, faded by how much
    // food is on the stove right now.
    const seconds = 1.2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 5200;
    band.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    noise.connect(band).connect(gain).connect(ctx.destination);
    noise.start();
    this.sizzleGain = gain;
  }

  setSizzleLevel(level) {
    if (!this.context || !this.sizzleGain) return;
    const target = this.muted ? 0 : Math.min(0.05, level * 0.02);
    this.sizzleGain.gain.setTargetAtTime(target, this.context.currentTime, 0.15);
  }

  tone(freq, when, dur, type, vol, slideTo) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + when + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.02);
  }

  pop()   { this.tone(340, 0, 0.09, 'square', 0.06, 620); }
  place() { this.tone(190, 0, 0.07, 'triangle', 0.10, 120); }
  ding()  { this.tone(880, 0, 0.16, 'sine', 0.12); this.tone(1318, 0.09, 0.24, 'sine', 0.10); }
  coin()  { this.tone(988, 0, 0.08, 'square', 0.05); this.tone(1319, 0.07, 0.18, 'square', 0.05); }
  buzz()  { this.tone(140, 0, 0.22, 'sawtooth', 0.10, 90); }
  thud()  { this.tone(90, 0, 0.14, 'sine', 0.14, 55); }
}
