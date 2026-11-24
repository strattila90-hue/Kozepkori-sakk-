/* Procedurális hangeffektek WebAudio-val: puki, orrfújás, szúrás, sikoly, sárkány, fanfár... */
(function (root) {
  'use strict';
  let ctx = null, master = null, noiseBuf = null, muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ctx && !muted;
  const now = () => ctx.currentTime;

  function env(g, t, a, peak, d, end) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end || 0.0001, t + a + d);
  }
  function osc(type, f0, f1, t, dur, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.01, vol, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  function noise(t, dur, vol, type, freq, q, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1;
    const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return f;
  }

  const S = {
    init,
    setMuted(m) { muted = m; },
    isMuted: () => muted,

    fart(big) {
      if (!ok()) return; const t = now(), dur = big ? 1.1 : 0.35 + Math.random() * 0.4;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(70 + Math.random() * 50, t);
      o.frequency.linearRampToValueAtTime(40 + Math.random() * 30, t + dur);
      lfo.frequency.value = 28 + Math.random() * 30; lg.gain.value = 26;
      lfo.connect(lg); lg.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 6;
      env(g, t, 0.02, 0.55, dur);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
      noise(t, dur * 0.8, 0.12, 'bandpass', 200, 1);
    },
    honk() { // orrfújás
      if (!ok()) return; const t = now();
      osc('sawtooth', 330, 520, t, 0.28, 0.35);
      osc('square', 335, 480, t + 0.02, 0.25, 0.15);
      noise(t + 0.2, 0.3, 0.18, 'bandpass', 900, 2);
      osc('sawtooth', 300, 200, t + 0.32, 0.3, 0.25);
    },
    burp() {
      if (!ok()) return; const t = now();
      osc('sawtooth', 110, 55, t, 0.5, 0.45);
      noise(t, 0.4, 0.15, 'lowpass', 300, 2);
    },
    stab() {
      if (!ok()) return; const t = now();
      noise(t, 0.12, 0.5, 'highpass', 2500, 1);
      osc('triangle', 180, 60, t, 0.14, 0.4);
      noise(t + 0.05, 0.22, 0.4, 'lowpass', 500, 1); // squish
    },
    clang() {
      if (!ok()) return; const t = now();
      [1, 2.76, 5.4, 8.9].forEach((m, i) => osc('square', 520 * m, 500 * m, t, 0.35 / (i + 1), 0.12 / (i + 1)));
      noise(t, 0.08, 0.3, 'highpass', 4000, 1);
    },
    squish() {
      if (!ok()) return; const t = now();
      noise(t, 0.25, 0.45, 'lowpass', 400, 4);
      osc('sine', 220, 70, t, 0.2, 0.3);
    },
    thud() {
      if (!ok()) return; const t = now();
      osc('sine', 120, 40, t, 0.3, 0.7); noise(t, 0.1, 0.25, 'lowpass', 300, 1);
    },
    hop() {
      if (!ok()) return; const t = now();
      osc('sine', 240 + Math.random() * 80, 460, t, 0.12, 0.18);
    },
    step() {
      if (!ok()) return; const t = now();
      noise(t, 0.06, 0.12, 'lowpass', 700 + Math.random() * 400, 1);
    },
    scream() {
      if (!ok()) return; const t = now(), base = 500 + Math.random() * 300;
      const o = osc('sawtooth', base, base * 1.6, t, 0.5, 0.2);
      o.o.frequency.exponentialRampToValueAtTime(base * 0.6, t + 0.6);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 3;
      o.g.disconnect(); o.g.connect(f); f.connect(master);
    },
    ow() { // "au!"
      if (!ok()) return; const t = now(), b = 260 + Math.random() * 160;
      const x = osc('sawtooth', b, b * 0.7, t, 0.22, 0.22);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
      x.g.disconnect(); x.g.connect(f); f.connect(master);
    },
    laugh() {
      if (!ok()) return; const t = now();
      for (let i = 0; i < 5; i++) osc('sawtooth', 300 + Math.random() * 60, 250, t + i * 0.12, 0.09, 0.14);
    },
    nom() {
      if (!ok()) return; const t = now();
      for (let i = 0; i < 4; i++) { noise(t + i * 0.14, 0.08, 0.28, 'lowpass', 900, 3); osc('sine', 160, 90, t + i * 0.14, 0.08, 0.2); }
    },
    whoosh() {
      if (!ok()) return; const t = now();
      const f = noise(t, 0.3, 0.3, 'bandpass', 400, 2);
      f.frequency.exponentialRampToValueAtTime(3000, t + 0.28);
    },
    chop() { // bárd
      if (!ok()) return;
      S.whoosh(); setTimeout(() => { if (!ok()) return; const u = now(); osc('sine', 90, 30, u, 0.4, 0.8); noise(u, 0.2, 0.5, 'lowpass', 500, 1); }, 160);
    },
    roar() { // sárkány
      if (!ok()) return; const t = now();
      noise(t, 1.6, 0.5, 'lowpass', 700, 3);
      osc('sawtooth', 90, 45, t, 1.5, 0.35);
      osc('sawtooth', 94, 47, t, 1.5, 0.3);
    },
    fire() {
      if (!ok()) return; const t = now();
      const f = noise(t, 2.2, 0.35, 'bandpass', 800, 0.7);
      f.frequency.exponentialRampToValueAtTime(300, t + 2);
    },
    cheer() {
      if (!ok()) return; const t = now();
      for (let i = 0; i < 6; i++) noise(t + i * 0.05, 1.0, 0.07, 'bandpass', 700 + i * 180, 1.2);
    },
    boo() {
      if (!ok()) return; const t = now();
      osc('sawtooth', 160, 120, t, 1.0, 0.18); osc('sawtooth', 170, 125, t + 0.05, 1.0, 0.16);
    },
    fanfare() {
      if (!ok()) return; const t = now();
      const seq = [[392, 0], [392, 0.15], [392, 0.3], [523, 0.5], [392, 0.85], [523, 1.05], [659, 1.4]];
      seq.forEach(([f, d]) => { osc('square', f, f, t + d, 0.35, 0.14); osc('sawtooth', f * 2, f * 2, t + d, 0.3, 0.05); });
    },
    funeral() {
      if (!ok()) return; const t = now();
      [[196, 0], [196, 0.6], [196, 1.0], [233, 1.4], [220, 2.0], [220, 2.4], [196, 2.8], [196, 3.2], [185, 3.6], [196, 4.2]]
        .forEach(([f, d]) => osc('triangle', f, f, t + d, 0.5, 0.22));
    },
    ding() {
      if (!ok()) return; const t = now(); osc('sine', 880, 880, t, 0.5, 0.2); osc('sine', 1320, 1320, t + 0.1, 0.5, 0.15);
    },
    check() {
      if (!ok()) return; const t = now(); osc('square', 220, 220, t, 0.18, 0.2); osc('square', 165, 165, t + 0.18, 0.3, 0.2);
    },
    bell() {
      if (!ok()) return; const t = now(); [1, 2.4, 4.1].forEach(m => osc('sine', 200 * m, 200 * m, t, 2, 0.2 / m));
    },
    chicken() {
      if (!ok()) return; const t = now(); for (let i = 0; i < 3; i++) osc('square', 700 + i * 60, 500, t + i * 0.09, 0.07, 0.1);
    },
    oink() {
      if (!ok()) return; const t = now(); osc('sawtooth', 150, 90, t, 0.18, 0.25); osc('sawtooth', 130, 80, t + 0.2, 0.2, 0.25);
    },
    rand() { const a = ['fart', 'fart', 'honk', 'burp', 'laugh', 'chicken']; S[a[Math.floor(Math.random() * a.length)]](); },
  };
  root.SFX = S;
})(window);
