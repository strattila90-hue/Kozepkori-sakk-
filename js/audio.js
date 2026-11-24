/* Procedurális hangeffektek WebAudio-val: puki, orrfújás, szúrás, sikoly, sárkány, fanfár... */
(function (root) {
  'use strict';
  let ctx = null, master = null, noiseBuf = null, muted = false, musicBus = null;
  const MUSIC_VOL = 0.42; let musicOn = true, mood = null;
  try { musicOn = localStorage.getItem('ps_music') !== '0'; } catch (e) { /* privát mód */ }

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
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(comp);
    if (mood) startMood(mood);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
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

  /* ---------- Középkori zene (saját szerzemények, dór/eol hangnemben) ----------
     Bordó (tekerőlant/duda): kvint-orgonapont; dallam: furulya-szerű hang vibrátóval; lant: pengetett kvint-arpeggio; dob (tábor).
     Ütemező: 25 ms-onként előre beütemez ~0,2 mp-et (pontos időzítés akkor is, ha a rajzolás akad). */
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const TUNES = {
    game: { bpm: 126, beats: 3, drum: true, mel: [
      [74, 1], [72, 0.5], [71, 0.5], [69, 1], [67, 1], [69, 1], [65, 1], [64, 0.5], [65, 0.5], [67, 1], [69, 1], [62, 3],
      [69, 1], [72, 1], [74, 1], [76, 1], [74, 0.5], [72, 0.5], [69, 1], [67, 1], [65, 0.5], [64, 0.5], [65, 1], [62, 3],
      [77, 1], [76, 0.5], [74, 0.5], [72, 1], [74, 1], [69, 2], [72, 1], [71, 0.5], [69, 0.5], [67, 1], [69, 3],
      [74, 0.5], [76, 0.5], [77, 1], [76, 1], [74, 1], [72, 1], [69, 1], [67, 0.5], [69, 0.5], [65, 1], [64, 1], [62, 3]],
      ch: [50, 48, 48, 50, 53, 48, 48, 50, 53, 50, 48, 45, 50, 53, 48, 50] },
    menu: { bpm: 84, beats: 4, drum: false, mel: [
      [69, 2], [67, 1], [65, 1], [64, 1], [65, 1], [62, 2], [65, 1], [67, 1], [69, 1.5], [67, 0.5], [69, 4],
      [72, 2], [69, 1], [67, 1], [65, 1], [64, 1], [62, 2], [64, 1], [65, 0.5], [64, 0.5], [60, 1], [64, 1], [62, 4]],
      ch: [50, 50, 53, 45, 53, 50, 48, 50] },
  };
  let seq = null, timer = null, drone = null;
  function lead(m, t, d) {
    const f = mtof(m), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'square'; o1.frequency.value = f; o2.frequency.value = f; g2.gain.value = 0.18; lp.type = 'lowpass'; lp.frequency.value = 2400;
    lfo.frequency.value = 5.3; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.35, d * 0.6)); lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const v = 0.11, end = t + d * 0.94; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.035); g.gain.setValueAtTime(v * 0.85, Math.max(t + 0.04, end - 0.07)); g.gain.exponentialRampToValueAtTime(0.0001, end);
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(musicBus);
    for (const o of [o1, o2, lfo]) { o.start(t); o.stop(end + 0.05); }
    noise(t, 0.05, 0.012, 'bandpass', f * 2, 3, musicBus);   // fúvás-zaj
  }
  function pluck(m, t, v) {
    const f = mtof(m), o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2.005; lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.28);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.06, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus); o.start(t); o2.start(t); o.stop(t + 0.95); o2.stop(t + 0.95);
  }
  function tabor(t, acc) {
    osc('sine', 115, 52, t, 0.2, 0.22 * acc, musicBus); noise(t, 0.05, 0.06 * acc, 'lowpass', 1100, 1, musicBus);
    if (acc < 1) noise(t, 0.04, 0.025, 'highpass', 6500, 1, musicBus);       // csörgő
  }
  function startDrone(root) {
    stopDrone(); const t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain(), os = [];
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 1.5; lfo.frequency.value = 0.17; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency);
    for (const [m, det] of [[root - 12, -4], [root - 5, 3], [root - 12, 5]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(lp); o.start(t); os.push(o); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 2.5); lp.connect(g); g.connect(musicBus); lfo.start(t); os.push(lfo);
    drone = { g, os };
  }
  function stopDrone() { if (!drone) return; const t = ctx.currentTime, d = drone; d.g.gain.cancelScheduledValues(t); d.g.gain.setTargetAtTime(0.0001, t, 0.5); for (const o of d.os) o.stop(t + 2.5); drone = null; }
  function startMood(m) {
    if (timer) { clearInterval(timer); timer = null; } stopDrone(); seq = null;
    const tune = TUNES[m]; if (!tune) return;
    startDrone(50);
    seq = { tune, beat: 60 / tune.bpm, t: ctx.currentTime + 0.3, i: 0, bt: ctx.currentTime + 0.3, b: 0 };
    timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!seq || !ctx) return; const ahead = ctx.currentTime + 0.2, T = seq.tune, B = seq.beat;
    if (seq.t < ctx.currentTime - 1) { seq.t = seq.bt = ctx.currentTime + 0.05; }        // a lap a háttérben volt: újraszinkron
    while (seq.t < ahead) { const [m, d] = T.mel[seq.i % T.mel.length]; if (m) lead(m, seq.t, d * B); seq.t += d * B; seq.i++; }
    while (seq.bt < ahead) {
      const bar = Math.floor(seq.b / T.beats), inBar = seq.b % T.beats, root = T.ch[bar % T.ch.length], arp = [root, root + 7, root + 12, root + 7];
      pluck(arp[(inBar * 2) % 4], seq.bt, inBar === 0 ? 0.07 : 0.05); pluck(arp[(inBar * 2 + 1) % 4], seq.bt + B / 2, 0.04);
      if (T.drum) tabor(seq.bt, inBar === 0 ? 1 : 0.55);
      seq.bt += B; seq.b++;
    }
  }

  const S = {
    init,
    setMuted(m) { muted = m; if (musicBus) musicBus.gain.setTargetAtTime(!m && musicOn ? MUSIC_VOL : 0, ctx.currentTime, 0.2); },
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
    flap() { // szárnycsapás
      if (!ok()) return; const t = now(); const f = noise(t, 0.35, 0.35, 'lowpass', 260, 1.5); f.frequency.exponentialRampToValueAtTime(700, t + 0.12); f.frequency.exponentialRampToValueAtTime(180, t + 0.33); osc('sine', 70, 40, t, 0.25, 0.25);
    },
    drum(dur) { // pergődob (kivégzés előtt): gyorsuló, erősödő pergés, a végén nagy ütés
      if (!ok()) return; const t = now(); dur = dur || 2;
      for (let x = 0; x < dur; x += 0.05) { const k = x / dur; noise(t + x, 0.05, 0.05 + 0.2 * k, 'bandpass', 1500 + 600 * k, 1.2); if ((x * 20 | 0) % 4 === 0) osc('sine', 140, 90, t + x, 0.06, 0.05 + 0.1 * k); }
      osc('sine', 120, 45, t + dur, 0.5, 0.6); noise(t + dur, 0.3, 0.35, 'lowpass', 900, 1);
    },
    setMusic(on) { musicOn = !!on; try { localStorage.setItem('ps_music', on ? '1' : '0'); } catch (e) { /* */ } if (musicBus) musicBus.gain.setTargetAtTime(on && !muted ? MUSIC_VOL : 0, ctx.currentTime, 0.3); },
    musicOn: () => musicOn,
    mood(m) { if (m === mood) return; mood = m; if (ctx) startMood(m); },
    rand() { const a = ['fart', 'fart', 'honk', 'burp', 'laugh', 'chicken']; S[a[Math.floor(Math.random() * a.length)]](); },
  };
  root.SFX = S;
})(window);
