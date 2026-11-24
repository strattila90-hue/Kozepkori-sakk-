/* Játékvilág: kamera, rajzolás, entitások, tween-rendszer, részecskék, háttér. */
(function (root) {
  'use strict';
  const S = Sprites, TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const W = root.W = {
    pieces: [], bodies: [], actors: [], parts: [], decals: [], crowd: [], things: [],
    tweens: [], emitters: [], time: 0, speed: 1, flip: false, busy: false, ending: false,
    themes: { w: S.THEMES.white, b: S.THEMES.black }, hl: { sel: -1, targets: [], last: [-1, -1], check: -1 },
    cam: { W: 800, H: 600, F: 1000, F0: 1000, cx: 400, cy: 300, bx: 400, by: 300, zoom: 1, tz: 1, tcx: 400, tcy: 300, sinP: Math.sin(1.1), cosP: Math.cos(1.1), D: 18 },
    q: 2, uid: 0, cheerT: 0, idleT: 3, shake: 0, godHand: 0, rnd, pick, clamp,
  };
  const cam = W.cam;
  let canvas, ctx, dpr = 1, last = 0;
  var dirt = [], clouds = [], stones = [], tufts = [], wanderers = [], birds = [];

  /* ---------- Kamera ---------- */
  W.P = function (X, Y, Z) {
    if (W.flip) { X = -X; Z = -Z; }
    const dep = cam.D - Z * cam.cosP - Y * cam.sinP, k = cam.F / dep;
    return { x: cam.cx + X * k, y: cam.cy + (Z * cam.sinP - Y * cam.cosP) * k, k };
  };
  W.depth = (Z) => (W.flip ? -Z : Z);
  W.setFlip = function (f) {
    f = !!f; if (f === W.flip) return; W.flip = f;
    for (const c of W.crowd) { c.z = -c.z; c.home.z = -c.home.z; }
    for (const w of wanderers) w.z = -w.z;
    for (const t of (W.strips || []).concat(W.scenery || [], typeof Scenes !== 'undefined' ? Scenes.list : [])) t.z = -t.z;
  };
  W.sqPos = sq => ({ x: (sq & 7) - 3.5, z: (sq >> 3) - 3.5 });
  W.sqAt = (x, z) => clamp(Math.round(z + 3.5), 0, 7) * 8 + clamp(Math.round(x + 3.5), 0, 7);

  W.resize = function (keepCam) {
    const dev = window.devicePixelRatio || 1; dpr = W.q >= 2 ? Math.min(2, dev) : W.q === 1 ? Math.min(1.5, dev) : Math.min(1, dev) * 0.85;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    cam.W = w; cam.H = h;
    const dn = cam.D - 4.5 * cam.cosP, df = cam.D + 4.5 * cam.cosP;
    const fW = 0.985 * w * dn / 9, fH = 0.6 * h / (4.5 * cam.sinP * (1 / dn + 1 / df));
    cam.F0 = Math.min(fW, fH); cam.bx = w / 2; cam.by = h * 0.5 + 6;
    if (!keepCam) { cam.zoom = cam.tz = 1; cam.F = cam.F0; cam.cx = cam.tcx = cam.bx; cam.cy = cam.tcy = cam.by; W.userCam = false; }
    for (const k in layers) delete layers[k]; shGrad = null;
  };
  function clampPan() {
    const F = cam.F0 * cam.tz, dn = cam.D - 4.5 * cam.cosP, halfW = 4.5 * F / dn, halfH = 4.5 * cam.sinP * F / cam.D;
    const lim = (c, half, size, base) => { const mn = size * 0.85 - half, mx = size * 0.15 + half; return mn > mx ? base : Math.max(mn, Math.min(mx, c)); };
    cam.tcx = lim(cam.tcx, halfW, cam.W, cam.bx); cam.tcy = lim(cam.tcy, halfH, cam.H, cam.by);
  }
  const snap = () => { cam.zoom = cam.tz; cam.cx = cam.tcx; cam.cy = cam.tcy; cam.F = cam.F0 * cam.zoom; };
  W.zoomAt = function (factor, ax, ay) {
    const nz = clamp(cam.tz * factor, 1, 2.8), f = nz / cam.tz; cam.tcx = ax - (ax - cam.tcx) * f; cam.tcy = ay - (ay - cam.tcy) * f; cam.tz = nz;
    clampPan(); W.userCam = nz > 1.02; snap();
  };
  W.panBy = function (dx, dy) { cam.tcx += dx; cam.tcy += dy; clampPan(); W.userCam = cam.tz > 1.02; snap(); };
  W.camReset = function () { cam.tz = 1; cam.tcx = cam.bx; cam.tcy = cam.by; W.userCam = false; };
  W.cycleZoom = function () { const z = cam.tz < 1.2 ? 1.6 : cam.tz < 2 ? 2.3 : 1; if (z === 1) W.camReset(); else W.zoomAt(z / cam.tz, cam.W / 2, cam.by); };
  W.focusOn = function (x, z, zoom) {
    if (W.userCam) return; const F = cam.F0 * zoom, X = W.flip ? -x : x, Z = W.flip ? -z : z, dep = cam.D - Z * cam.cosP;
    cam.tz = zoom; cam.tcx = cam.W / 2 - X * F / dep; cam.tcy = cam.by - Z * cam.sinP * F / dep; clampPan();
  };
  W.unfocus = function () { if (!W.userCam) { cam.tz = 1; cam.tcx = cam.bx; cam.tcy = cam.by; } };

  /* ---------- Teljesítmény: rétegek gyorsítótára, minőségi szintek ---------- */
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } } };
  const layers = {};
  function layer(name, key, drawFn, maxAge) {
    let L = layers[name]; const w = Math.ceil(cam.W * dpr), h = Math.ceil(cam.H * dpr);
    if (!L || L.c.width !== w || L.c.height !== h) { L = layers[name] = { c: document.createElement('canvas'), key: '', t: -9 }; L.c.width = w; L.c.height = h; L.g = L.c.getContext('2d'); }
    if (L.key !== key || (maxAge && W.time - L.t > maxAge)) {
      const main = ctx; ctx = L.g; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cam.W, cam.H);
      try { drawFn(); } finally { ctx = main; } L.key = key; L.t = W.time;
    }
    ctx.drawImage(L.c, 0, 0, cam.W, cam.H);
  }
  W.perfMode = store.get('ps_perf') || 'auto';
  W.setPerf = function (m) { W.perfMode = m; store.set('ps_perf', m); initQuality(); W.resize(); };
  function initQuality() {
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 4) <= 3 || /Android.*(SM-A|Redmi|Moto G|Lite)/i.test(navigator.userAgent);
    W.q = W.perfMode === 'low' ? 0 : W.perfMode === 'high' ? 2 : (weak ? 1 : 2); W.autoQ = W.perfMode === 'auto'; W.fpsCap = W.q === 0 ? 30 : 0; W._n = 0; W._ema = 0.016;
    S.setQuality(W.q ? 1 : 0);
  }
  W.setQ = function (q) { W.q = q; S.setQuality(q ? 1 : 0); W.fpsCap = q === 0 ? 30 : 0; W.resize(true); };
  const maxParts = () => (W.q >= 2 ? 900 : W.q === 1 ? 500 : 240);

  /* ---------- Tween ---------- */
  const lin = t => t, eio = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), eout = t => 1 - (1 - t) * (1 - t), ein = t => t * t;
  W.ease = { lin, eio, eout, ein };
  W.tw = function (obj, to, dur, ease, onUpd) {
    return new Promise(res => {
      const from = {}; for (const k in to) from[k] = obj[k];
      W.tweens.push({ obj, from, to, dur: Math.max(0.001, dur), t: 0, ease: ease || eio, res, onUpd });
    });
  };
  W.wait = s => new Promise(res => W.tweens.push({ wait: true, dur: s, t: 0, res }));
  W.every = (dur, interval, fn) => W.emitters.push({ t: 0, dur, interval, acc: 0, fn });
  function updateTweens(dt) {
    for (let i = W.tweens.length - 1; i >= 0; i--) {
      const q = W.tweens[i]; q.t += dt;
      const p = Math.min(1, q.t / q.dur);
      if (!q.wait) { const e = q.ease(p); for (const k in q.to) q.obj[k] = q.from[k] + (q.to[k] - q.from[k]) * e; if (q.onUpd) q.onUpd(q.obj, p); }
      if (p >= 1) { W.tweens.splice(i, 1); q.res(); }
    }
    for (let i = W.emitters.length - 1; i >= 0; i--) {
      const m = W.emitters[i]; m.t += dt; m.acc += dt;
      while (m.acc >= m.interval) { m.acc -= m.interval; m.fn(m.t); }
      if (m.t >= m.dur) W.emitters.splice(i, 1);
    }
  }

  /* ---------- Entitások ---------- */
  W.mkPiece = function (ch, sq) {
    const color = ch === ch.toUpperCase() ? 'w' : 'b', p = W.sqPos(sq);
    return {
      id: ++W.uid, type: ch.toUpperCase(), color, sq, x: p.x, z: p.z, y: 0, ox: 0, oz: 0, theme: W.themes[color],
      skin: pick(S.SKINS), ph: Math.random() * TAU, T: 0, face: color === 'w' ? 1 : -1, mv: 0, wp: 0, atk: 0, hurt: 0, burn: 0,
      expr: 'idle', state: 'idle', look: 0, rot: 0, headless: false, crown: false, sx: 1, sy: 1, alpha: 1, say: null, cheering: false,
    };
  };
  W.setThemes = function (t) {
    W.themes = t; if (window.Figures) Figures.load([t.w.id, t.b.id, 'black']);
    for (const e of W.pieces.concat(W.bodies)) e.theme = t[e.color];
  };
  W.setup = function (game) {
    W.pieces = []; W.bodies = []; W.actors = []; W.parts = []; W.decals = []; W.tweens = []; W.emitters = [];
    W.ending = false; W.busy = false; W.hl = { sel: -1, targets: [], last: [-1, -1], check: -1 };
    W.skip = false; W.moverEnt = null; W.crownFx = null; W.dragonFx = null; W.fog = 0;
    for (const c of W.crowd) { c.hidden = false; c.cheer = 0; }
    game.board.forEach((ch, sq) => { if (ch) W.pieces.push(W.mkPiece(ch, sq)); });
  };
  W.pieceAt = sq => W.pieces.find(e => e.sq === sq) || null;
  W.king = color => W.pieces.find(e => e.type === 'K' && e.color === color);
  W.faceTo = (e, x, z) => { const dx = (x - e.x) * (W.flip ? -1 : 1); if (Math.abs(dx) > 0.05) e.face = dx > 0 ? 1 : -1; if (Math.abs(x - e.x) > 0.01 || (z !== undefined && Math.abs(z - e.z) > 0.01)) { e.dir = { x: x - e.x, z: z === undefined ? 0 : z - e.z }; e.dirT = 2.5; } };
  W.say = function (e, text, dur, lift) { e.say = { text, t: dur || 1.4, lift: lift || 0 }; };
  W.crowdSay = function (text, dur) {
    if (W.useStrips && W.strips) {
      const cand = W.strips.filter(t => { if (t.say) return false; const p = W.P(t.x, 0, t.z); return p.x > 40 && p.x < cam.W - 40; }), t = cand.length ? pick(cand) : null;
      if (t) t.say = { text, t: dur || L.dur(text), dx: rnd(-1.2, 1.2) }; return;
    }
    const cand = W.crowd.filter(c => { if (c.hidden || c.say) return false; const p = W.P(c.x, 0, c.z); return p.x > 60 && p.x < cam.W - 60 && Math.abs(c.z) < 7.5; });
    const c = cand.length ? pick(cand) : null; if (c) c.say = { text, t: dur || L.dur(text) };
  };
  W.setCheer = s => { W.cheerT = Math.max(W.cheerT, s); };

  function buildScenery() {
    W.strips = []; const rows = [['crowd2', -0.2, -6.3, 2.1, 1], ['crowd1', -0.5, -7.7, 2.3, 1],
      ['crowd2', -3.4, 6.7, 1.55, 1], ['crowd4', 0.2, 6.7, 1.55, 0], ['crowd1', 3.6, 6.7, 1.55, 1], ['crowd4', -6.8, 0.5, 1.7, 0], ['crowd1', 6.8, 0.5, 1.7, 1], ['crowd2', -7.0, -3, 1.9, 1], ['crowd4', 7.1, -3, 1.9, 0]];
    for (const [k, x, z, h, flip] of rows) W.strips.push({ k, x, z, h, flip, ph: Math.random() * 6, say: null });
    W.scenery = [{ k: 'tavern', x: -5.6, z: -9.6, h: 3.7 }, { k: 'pigfarm', x: 5.5, z: -9.4, h: 2.6 },
      { k: 'devil', x: -5.6, z: -3.9, h: 2.0, stat: 1 }, { k: 'angel', x: 5.6, z: -3.9, h: 2.2, stat: 1 }];
  }
  function buildAmbience() {
    buildScenery();
    const cl = ['#3b5ea6', '#b8322a', '#4a7a3a', '#c9923a', '#7a3a5a', '#5a7a8a', '#9a5a2a', '#6a6a8a'];
    const mk = (x, z) => ({
      x, z, home: { x, z }, seed: Math.random(), skin: pick(S.SKINS), cloth: pick(cl), hat: pick(S.HATS), hatC: pick(cl),
      prop: pick(['mug', 'fork', 'torch', null, null, null]), cheer: 0, hidden: false, expr: 'idle',
    });
    W.crowd = [];
    for (let r = 0; r < 3; r++) for (let x = -7; x <= 7; x += 1.35) W.crowd.push(mk(x + rnd(-0.35, 0.35) + (r & 1) * 0.6, -6.0 - r * 1.0 + rnd(-0.1, 0.1)));
    for (let r = 0; r < 2; r++) for (let x = -7; x <= 7; x += 1.25) W.crowd.push(mk(x + rnd(-0.3, 0.3), 5.5 + r * 0.9 + rnd(-0.1, 0.1)));
    for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) for (let z = -4.2; z <= 4.2; z += 1.1) W.crowd.push(mk(sx * (5.3 + r * 0.9) + rnd(-0.2, 0.2), z + rnd(-0.3, 0.3)));
    clouds = []; for (let i = 0; i < 7; i++) clouds.push({ x: Math.random(), y: rnd(0.02, 0.28), s: rnd(0.6, 1.4), v: rnd(0.004, 0.012) });
    stones = []; for (let i = 0; i < 380; i++) { const x = rnd(-16, 16), z = rnd(-13, 11); if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue; stones.push({ x, z, r: rnd(0.12, 0.4), c: pick(['#a58d5e', '#97804f', '#b49d6c', '#8a7446', '#c0aa78']) }); }
    dirt = []; for (let i = 0; i < 160; i++) { const x = rnd(-6.5, 6.5), z = rnd(-6.5, 6.5); if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue; dirt.push({ x, z, r: rnd(0.3, 1.1), c: Math.random() < 0.5 ? 'rgba(90,60,25,.14)' : 'rgba(255,240,190,.12)' }); }
    tufts = []; for (let i = 0; i < 60; i++) { const x = rnd(-14, 14), z = rnd(-11, 10); if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue; tufts.push({ x, z, c: pick(['#3f7a38', '#6aa04a', '#2f6a30']), f: Math.random() < 0.4 ? pick(['#fffdf4', '#d9a935', '#b8322a', '#3b5ea6']) : null }); }
    birds = []; for (let i = 0; i < 4; i++) birds.push({ x: Math.random(), y: rnd(0.05, 0.2), v: rnd(0.02, 0.04), ph: Math.random() * 6 });
    wanderers = [];
    const defs = [['doctor', 0.6], ['skeleton', 0.5], ['pig', 0.7], ['hen', 0.4], ['dog', 0.8], ['cat', 0.5], ['donkey', 0.5], ['horse', 0.45], ['monk', 0.4], ['dog', 0.7]];
    for (const [kind, sp] of defs) wanderers.push({ kind, x: rnd(-9, 9), z: pick([-7.9, -8.3, -9.2, 7.2]), dir: Math.random() < 0.5 ? -1 : 1, sp, seed: Math.random() * 10, mv: 1, pause: 0 });
  }

  /* ---------- Részecskék ---------- */
  W.part = function (o) {
    if (W.q < 2 && o.kind === 'smoke' && Math.random() < (W.q ? 0.4 : 0.7)) return;
    if (W.parts.length > maxParts()) W.parts.shift();
    W.parts.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 9, life: 1, max: 1, size: 0.05, color: '#a00', kind: 'dot', rot: 0, vr: 0, drag: 0 }, o, { max: o.life || 1 }));
  };
  W.decal = function (x, z, r, color) {
    if (Math.abs(x) > 4.3 || Math.abs(z) > 4.3) return;
    if (W.decals.length > 110) W.decals.shift();
    W.decals.push({ x, z, r, color: color || 'rgba(120,10,10,.55)', rot: Math.random() * 3, pts: Array.from({ length: 9 }, () => rnd(0.6, 1.15)) });
  };
  function updateParts(dt) {
    for (let i = W.parts.length - 1; i >= 0; i--) {
      const p = W.parts[i];
      p.life -= dt; if (p.life <= 0) { W.parts.splice(i, 1); continue; }
      p.vy -= p.g * dt;
      if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vz *= d; p.vy *= (p.kind === 'smoke' || p.kind === 'fire' ? d : 1); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.y < 0 && p.kind !== 'smoke' && p.kind !== 'fire') {
        p.y = 0;
        if (p.kind === 'blood') { if (Math.random() < 0.5) W.decal(p.x, p.z, p.size * rnd(1.2, 2.6)); W.parts.splice(i, 1); continue; }
        if (p.kind === 'head' || p.kind === 'gib') { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.vz *= 0.7; p.vr *= 0.7; if (Math.abs(p.vy) < 0.4) { p.vy = 0; p.g = 0; p.vx *= 0.8; p.vz *= 0.8; if (p.kind === 'head') p.life = Math.min(p.life, 6); } else if (Math.random() < 0.7) W.decal(p.x, p.z, 0.1); }
        else { p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; }
      }
    }
  }

  /* ---------- Rajzolás ---------- */
  function quad(x0, z0, x1, z1, y) {
    const a = W.P(x0, y || 0, z0), b = W.P(x1, y || 0, z0), c = W.P(x1, y || 0, z1), d = W.P(x0, y || 0, z1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  }

  function drawCloud(x, y, s) {
    const r = 34 * s;
    const bl = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.8], [-1.6, 0.45, 0.5], [1.7, 0.4, 0.55], [0.1, -0.5, 0.7], [-0.7, -0.35, 0.55], [0.8, -0.4, 0.5]];
    ctx.fillStyle = '#f4f1e6'; ctx.strokeStyle = '#6a7a9a'; ctx.lineWidth = 2;
    ctx.beginPath(); for (const [dx, dy, rr] of bl) { ctx.moveTo(x + dx * r + r * rr, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * rr, 0, TAU); } ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (const [dx, dy, rr] of bl) { ctx.moveTo(x + dx * r + r * rr - 2, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * rr - 2, 0, TAU); } ctx.fill();
    ctx.strokeStyle = 'rgba(106,122,154,.5)'; ctx.lineWidth = 1.2; for (const [dx, dy, rr] of bl.slice(0, 4)) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * rr * 0.6, 0.3, 1.6); ctx.stroke(); }
  }
  function tree(x, y, s, c) {
    ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2; ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5); ctx.strokeRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
    { const rg = ctx.createRadialGradient(x - s * 0.12, y - s * 0.88, 0, x, y - s * 0.75, s * 0.4); rg.addColorStop(0, S.mixc(c, 0.4)); rg.addColorStop(0.5, c); rg.addColorStop(1, S.mixc(c, -0.4)); ctx.fillStyle = rg; } ctx.beginPath(); ctx.arc(x, y - s * 0.75, s * 0.32, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,50,20,.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - s * 0.1 + i * s * 0.07, y - s * 0.8 + (i & 1) * s * 0.1, s * 0.07, 0, Math.PI); ctx.stroke(); }
  }
  function castleFar(x, y, s) {
    ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2;
    for (const [dx, h, w, roof] of [[-0.5, 0.7, 0.22, '#b8322a'], [0, 1.0, 0.3, '#3b5ea6'], [0.5, 0.6, 0.2, '#b8322a'], [-0.2, 0.5, 0.5, null]]) {
      ctx.fillStyle = '#b9b2a2'; ctx.fillRect(x + dx * s - w * s / 2, y - h * s, w * s, h * s); ctx.strokeRect(x + dx * s - w * s / 2, y - h * s, w * s, h * s);
      if (roof) { ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x + dx * s - w * s * 0.6, y - h * s); ctx.lineTo(x + dx * s, y - h * s - w * s * 1.3); ctx.lineTo(x + dx * s + w * s * 0.6, y - h * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
  }

  let skyC = null, skyKey = '', gndC = null, gndKey = '', vigG = null;
  function skyCache(w, hz) {
    const key = w + 'x' + (hz | 0) + 'x' + dpr; if (skyKey === key) return skyC; skyKey = key;
    const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil((hz + 4) * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
    const gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#243f7c'); gr.addColorStop(0.55, '#4a6eb0'); gr.addColorStop(1, '#a9c0e0'); g.fillStyle = gr; g.fillRect(0, 0, w, hz + 4);
    const st = Math.max(28, w / 14); g.save(); g.beginPath(); g.rect(0, 0, w, hz + 4); g.clip(); g.strokeStyle = 'rgba(240,225,170,.30)'; g.lineWidth = 1.6; g.beginPath();
    for (let i = -hz; i < w + hz; i += st) { g.moveTo(i, 0); g.lineTo(i + hz, hz); g.moveTo(i, hz); g.lineTo(i + hz, 0); } g.stroke();
    g.fillStyle = 'rgba(245,220,130,.65)'; g.beginPath(); for (let x = 0; x < w + st; x += st) for (let y = 0; y < hz + st; y += st) { g.moveTo(x + 2.5, y); g.arc(x, y, 2.5, 0, TAU); } g.fill();
    let sd = 7; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 900; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(10,20,60,.06)'; g.fillRect(rr() * w, rr() * hz, 2 + rr() * 6, 1); }
    const sh = g.createLinearGradient(0, hz * 0.6, 0, hz); sh.addColorStop(0, 'rgba(255,240,200,0)'); sh.addColorStop(1, 'rgba(255,240,200,.35)'); g.fillStyle = sh; g.fillRect(0, hz * 0.6, w, hz * 0.4 + 4);
    g.restore(); skyC = c; return c;
  }
  function groundCache(w, h, hz) {
    const key = w + 'x' + h + 'x' + (hz | 0) + 'x' + dpr; if (gndKey === key) return gndC; gndKey = key;
    const gh = h - hz; const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(gh * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
    const gr = g.createLinearGradient(0, 0, 0, gh); gr.addColorStop(0, '#8fb865'); gr.addColorStop(0.4, '#5f9347'); gr.addColorStop(1, '#3f6e2e'); g.fillStyle = gr; g.fillRect(0, 0, w, gh);
    let sd = 11; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 26; i++) { const x = rr() * w, y = rr() * gh, R = 40 + rr() * 140, bl = g.createRadialGradient(x, y, 0, x, y, R); const lt = rr() < 0.5; bl.addColorStop(0, lt ? 'rgba(190,230,120,.22)' : 'rgba(20,60,20,.22)'); bl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bl; g.fillRect(x - R, y - R, R * 2, R * 2); }
    const cols = ['#78a855', '#4f8338', '#9cc46c', '#376a2a', '#6aa04a']; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < Math.min(5200, w * gh / 180); i++) { const x = rr() * w, y = rr() * gh, sc = 0.5 + y / gh * 1.6; g.strokeStyle = cols[(rr() * 5) | 0]; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 4 * sc, y - (3 + rr() * 5) * sc); g.stroke(); }
    g.globalAlpha = 1; gndC = c; return c;
  }
  function drawSky(horizonY) {
    const w = cam.W;
    const sk = skyCache(w, horizonY); ctx.drawImage(sk, 0, 0, w, horizonY + 4);
    // nap arccal
    const sx = w * 0.16, sy = horizonY * 0.3, r = Math.min(w, horizonY) * 0.09;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(W.time * 0.05); ctx.fillStyle = '#f2b830'; ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate(i * TAU / 16); ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.12); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 0.9, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.translate(sx, sy); ctx.scale(r, r); S.ell(ctx, 0, 0, 0.9, 0.9, '#f6cf4a', 0, 0.03);
    ctx.lineWidth = 0.03; ctx.strokeStyle = S.OL; ctx.beginPath(); ctx.ellipse(-0.3, -0.1, 0.12, 0.07, 0, 0, TAU); ctx.ellipse(0.3, -0.1, 0.12, 0.07, 0, 0, TAU); ctx.fillStyle = '#fffdf4'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b1b10'; ctx.beginPath(); ctx.arc(-0.26, -0.1, 0.04, 0, TAU); ctx.arc(0.34, -0.1, 0.04, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.25, 0.3, 0.3, Math.PI - 0.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0.05, -0.1); ctx.quadraticCurveTo(0.2, 0.1, 0.05, 0.16); ctx.stroke(); ctx.restore();
    // hold
    ctx.save(); ctx.translate(w * 0.36, horizonY * 0.14); ctx.fillStyle = '#f7efc8'; ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0.5, TAU - 0.5); ctx.arc(r * 0.15, 0, r * 0.28, TAU - 0.9, 0.9, true); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    for (const c of clouds) { c.x += c.v * 0.016 * W.speed; if (c.x > 1.3) c.x = -0.3; drawCloud(c.x * w, horizonY * (0.12 + c.y * 2), c.s * w / 760); }
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 2;
    for (const b of birds) { b.x += b.v * 0.016; if (b.x > 1.1) b.x = -0.1; const bx = b.x * w, by = horizonY * (0.3 + b.y), f = Math.sin(W.time * 8 + b.ph) * 5; ctx.beginPath(); ctx.moveTo(bx - 9, by - f); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 9, by - f); ctx.stroke(); }
    if (W.godHand > 0) {
      const gh = W.godHand; ctx.save(); ctx.translate(w * 0.84, horizonY * 0.3); ctx.rotate(-0.4); ctx.scale(w / 520 * gh, w / 520 * gh);
      drawCloud(60, 10, 1.2);
      S.poly(ctx, [[-40, -20], [60, -30], [70, 20], [-30, 30]], '#b8322a', 2);
      S.poly(ctx, [[-40, -20], [-120, -10], [-170, 10], [-160, 22], [-110, 20], [-40, 30]], '#f2d9b8', 2);
      S.poly(ctx, [[-150, 8], [-190, 40], [-184, 48], [-140, 22]], '#f2d9b8', 2);
      ctx.restore();
    }
  }

  function drawWall(horizonY, k) {
    const w = cam.W, wh = Math.max(46, k * 4.2), by = horizonY + k * 0.5;
    // tájkép: kék távoli dombok kastéllyal, zöld közeli dombok fákkal
    { const hg = ctx.createLinearGradient(0, by - wh * 1.7, 0, by); hg.addColorStop(0, '#9db6d8'); hg.addColorStop(1, '#5d7fae'); ctx.fillStyle = hg; } ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, by);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, by - wh * (1.25 + 0.3 * Math.sin(x * 0.008 + 1) + 0.12 * Math.sin(x * 0.03)));
    ctx.lineTo(w, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    castleFar(w * 0.72, by - wh * 1.45, wh * 0.55);
    { const hg = ctx.createLinearGradient(0, by - wh, 0, by); hg.addColorStop(0, '#8cc060'); hg.addColorStop(1, '#4a7f38'); ctx.fillStyle = hg; } ctx.beginPath(); ctx.moveTo(0, by);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, by - wh * (0.78 + 0.2 * Math.sin(x * 0.012 + 3) + 0.08 * Math.sin(x * 0.04)));
    ctx.lineTo(w, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,70,30,.45)'; ctx.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const x = (i * 97) % w, y = by - wh * (0.2 + ((i * 53) % 50) / 100); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI); ctx.stroke(); }
    tree(w * 0.1, by - wh * 0.55, wh * 0.9, '#3f7a38'); tree(w * 0.45, by - wh * 0.6, wh * 0.7, '#4a8a3f'); tree(w * 0.9, by - wh * 0.58, wh * 0.85, '#3f7a38');
    if (Figures.extra('castle')) {
      const im = Figures.extra('castle'), cw = Math.min(cam.W * 1.5, Math.max(cam.W * 1.15, wh * 7)), ch = cw * im.height / im.width, cy = by + 2;
      ctx.save(); ctx.globalAlpha = 0.97; ctx.drawImage(im, cam.W / 2 - cw / 2, cy - ch, cw, ch); ctx.restore();
      // légköri pára a torony alján + fű-dombok eltakarják a vár tövét (rétegezés)
      const hg = ctx.createLinearGradient(0, cy - ch * 0.55, 0, cy); hg.addColorStop(0, 'rgba(160,195,225,0)'); hg.addColorStop(1, 'rgba(170,200,205,.55)'); ctx.fillStyle = hg; ctx.fillRect(0, cy - ch * 0.55, cam.W, ch * 0.55);
      ctx.fillStyle = '#6fa04c'; ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, cy + 12);
      for (let x = 0; x <= cam.W; x += 16) ctx.lineTo(x, cy - 6 - 7 * Math.sin(x * 0.045) - 4 * Math.sin(x * 0.13)); ctx.lineTo(cam.W, cy + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,70,30,.5)'; ctx.lineWidth = 1.3; for (let x = 6; x < cam.W; x += 14) { const yy = cy - 3 - 6 * Math.sin(x * 0.045); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 2, yy - 6); ctx.moveTo(x, yy); ctx.lineTo(x + 3, yy - 5); ctx.stroke(); }
      return;
    }
    // alacsony udvari fal kapuval
    const wallTop = by - wh * 0.42;
    { const wg = ctx.createLinearGradient(0, wallTop, 0, by); wg.addColorStop(0, '#e2d3a6'); wg.addColorStop(1, '#a8966a'); ctx.fillStyle = wg; } ctx.fillRect(0, wallTop, w, by - wallTop);
    ctx.strokeStyle = 'rgba(70,45,20,.45)'; ctx.lineWidth = 1;
    for (let y = wallTop + 12; y < by; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); for (let x = ((y / 12) & 1) * 18; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.stroke(); } }
    ctx.fillStyle = '#c9b98e'; ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 34) { ctx.fillRect(x, wallTop - 12, 20, 13); ctx.strokeRect(x, wallTop - 12, 20, 13); }
    ctx.strokeRect(-2, wallTop, w + 4, by - wallTop);
    ctx.fillStyle = 'rgba(40,25,10,.22)'; ctx.fillRect(0, by - 8, w, 8);
    const tw = wh * 0.34, tcols = ['#3b5ea6', '#b8322a', '#3b5ea6'], fl = [W.themes.w.main, W.themes.b.main, '#d9a935'];
    [[0.08, 0], [0.5, 1], [0.92, 2]].forEach(([fx, i]) => {
      const x = fx * w - tw / 2, top = wallTop - wh * 0.5;
      { const tg = ctx.createLinearGradient(x, 0, x + tw, 0); tg.addColorStop(0, '#e0d0a2'); tg.addColorStop(0.55, '#bba97c'); tg.addColorStop(1, '#8a7a52'); ctx.fillStyle = tg; } ctx.fillRect(x, top, tw, by - top); ctx.strokeRect(x, top, tw, by - top);
      ctx.fillStyle = tcols[i]; ctx.beginPath(); ctx.moveTo(x - 5, top); ctx.lineTo(x + tw / 2, top - tw * 1.0); ctx.lineTo(x + tw + 5, top); ctx.closePath(); ctx.fill(); ctx.stroke();
      const f = Math.sin(W.time * 4 + i) * 4; ctx.beginPath(); ctx.moveTo(x + tw / 2, top - tw); ctx.lineTo(x + tw / 2, top - tw * 1.45); ctx.stroke();
      ctx.fillStyle = fl[i]; ctx.beginPath(); ctx.moveTo(x + tw / 2, top - tw * 1.45); ctx.lineTo(x + tw / 2 + tw * 0.6, top - tw * 1.3 + f); ctx.lineTo(x + tw / 2, top - tw * 1.15); ctx.fill(); ctx.stroke();
      const wx = x + tw / 2 - 8, wy = top + tw * 0.35;
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(wx, wy + 24); ctx.lineTo(wx, wy + 8); ctx.arc(wx + 8, wy + 8, 8, Math.PI, TAU); ctx.lineTo(wx + 16, wy + 24); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy - 2, 16, 26); ctx.clip();
      const sp = { skin: S.SKINS[i], ph: i, T: W.time, expr: i === 1 ? 'cheer' : 'idle', look: 0 };
      ctx.translate(wx + 8, wy + 26 - Math.abs(Math.sin(W.time * 3 + i)) * 3); ctx.scale(22, 22); S.face(ctx, sp, 0, -0.5, 0.3, { coif: true }); ctx.restore();
    });
    const gx = w * 0.28, gw = tw * 1.1;
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.moveTo(gx - gw / 2, by); ctx.lineTo(gx - gw / 2, by - wh * 0.3); ctx.arc(gx, by - wh * 0.3, gw / 2, Math.PI, TAU); ctx.lineTo(gx + gw / 2, by); ctx.fill(); ctx.strokeStyle = '#2b1b10'; ctx.stroke();
    ctx.strokeStyle = '#7a5a3a'; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - gw / 2 + i * gw / 5, by); ctx.lineTo(gx - gw / 2 + i * gw / 5, by - wh * 0.28); ctx.stroke(); }
  }

  function drawGround(horizonY) {
    const w = cam.W, h = cam.H;
    ctx.drawImage(groundCache(w, h, horizonY), 0, horizonY, w, h - horizonY);
    // taposott föld az udvaron
    quad(-6.6, -6.6, 6.6, 6.6, 0); { const a0 = W.P(-6.6, 0, -6.6), a1 = W.P(6.6, 0, 6.6), yg = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y); yg.addColorStop(0, '#d2b87e'); yg.addColorStop(0.5, '#b79c68'); yg.addColorStop(1, '#8f7648'); ctx.fillStyle = yg; ctx.fill(); }
    ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2; ctx.stroke();
    for (const d of dirt) { const p = W.P(d.x, 0, d.z); if (p.x < -40 || p.x > w + 40) continue; ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, d.r * p.k, d.r * p.k * cam.sinP, 0, 0, TAU); ctx.fill(); }
    for (const s of stones) {
      const p = W.P(s.x, 0, s.z); if (p.x < -50 || p.x > w + 50 || p.y > h + 20) continue;
      const inYard = Math.abs(s.x) < 6.4 && Math.abs(s.z) < 6.4;
      ctx.fillStyle = inYard ? s.c : '#9a9a8a'; ctx.strokeStyle = 'rgba(43,27,16,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, s.r * p.k * 0.8, s.r * p.k * cam.sinP * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (const t of tufts) {
      const p = W.P(t.x, 0, t.z); if (p.x < -20 || p.x > w + 20) continue;
      ctx.strokeStyle = t.c; ctx.lineWidth = Math.max(1, p.k * 0.03);
      ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + i * p.k * 0.12, p.y - p.k * 0.25); } ctx.stroke();
      if (t.f) { ctx.fillStyle = t.f; ctx.beginPath(); ctx.arc(p.x + p.k * 0.14, p.y - p.k * 0.12, Math.max(1.5, p.k * 0.05), 0, TAU); ctx.fill(); }
    }
  }

  function drawBoardBase() {
    const half = 4, fr = 4.5, nz = W.flip ? -fr : fr;
    ctx.fillStyle = '#4a2c12';
    for (const [a, b, c, d] of [[-fr, nz, fr, nz], [-fr, -fr, -fr, fr], [fr, -fr, fr, fr]]) {
      const p1 = W.P(a, 0, b), p2 = W.P(c, 0, d), p3 = W.P(c, -0.3, d), p4 = W.P(a, -0.3, b);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 2; ctx.stroke();
    }
    { const a0 = W.P(-fr, 0, -fr), a1 = W.P(fr, 0, fr), fg = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y); fg.addColorStop(0, '#fff0a8'); fg.addColorStop(0.35, '#d9a935'); fg.addColorStop(0.7, '#9c7218'); fg.addColorStop(1, '#d9a935'); quad(-fr, -fr, fr, fr, 0); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 3; ctx.stroke(); }
    const cols = ['#b8322a', '#3b5ea6', '#efe3c0'], inn = 4.16, N = 18, st = (2 * fr) / N;
    for (let i = 0; i < N; i++) {
      const a = -fr + i * st, b = a + st, base = cols[i % 3];
      for (const [x0, z0, x1, z1] of [[a, -fr, b, -inn], [a, inn, b, fr], [-fr, a, -inn, b], [inn, a, fr, b]]) {
        const q0 = W.P(x0, 0, z0), q1 = W.P(x1, 0, z1), lg = ctx.createLinearGradient(q0.x, q0.y, q1.x, q1.y); lg.addColorStop(0, S.mixc(base, 0.3)); lg.addColorStop(1, S.mixc(base, -0.3));
        quad(x0, z0, x1, z1, 0); ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(43,27,16,.7)'; ctx.stroke();
      }
    }
    for (const [gx, gz, gc] of [[-fr, -fr, '#c22'], [fr, -fr, '#26c'], [-fr, fr, '#26c'], [fr, fr, '#c22'], [0, -fr, '#2a8a4a'], [0, fr, '#2a8a4a'], [-fr, 0, '#c22'], [fr, 0, '#c22']]) {
      const p = W.P(gx, 0, gz), R = p.k * 0.16; const gg = ctx.createRadialGradient(p.x - R * 0.35, p.y - R * 0.4, 0, p.x, p.y, R * 1.1); gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, gc); gg.addColorStop(1, S.mixc(gc, -0.5));
      ctx.fillStyle = '#d9a935'; ctx.beginPath(); ctx.arc(p.x, p.y, R * 1.35, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2b1b10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill(); ctx.stroke();
    }
    quad(-half - 0.14, -half - 0.14, half + 0.14, half + 0.14, 0); ctx.fillStyle = '#c99a2e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2b1b10'; ctx.stroke();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f, x0 = f - 4, z0 = r - 4, light = !((r + f) & 1), base = light ? '#f2d45e' : '#2a2630';
      const c0 = W.P(x0, 0, z0), c1 = W.P(x0 + 1, 0, z0), c2 = W.P(x0 + 1, 0, z0 + 1), c3 = W.P(x0, 0, z0 + 1);
      const tg = ctx.createLinearGradient(Math.min(c0.x, c2.x), Math.min(c0.y, c2.y), Math.max(c0.x, c2.x), Math.max(c0.y, c2.y));
      tg.addColorStop(0, S.mixc(base, 0.22)); tg.addColorStop(0.5, base); tg.addColorStop(1, S.mixc(base, -0.2));
      quad(x0, z0, x0 + 1, z0 + 1, 0); ctx.fillStyle = tg; ctx.fill();
      // márványerezet
      if (W.q > 0) { ctx.strokeStyle = light ? 'rgba(150,100,20,.18)' : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.beginPath(); const m = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); const v1 = m(c0, c3, 0.2 + ((sq * 37) % 50) / 100), v2 = m(c1, c2, 0.3 + ((sq * 53) % 50) / 100), mid = m(m(c0, c2, 0.5), c1, ((sq * 29) % 40) / 100 - 0.2); ctx.moveTo(v1.x, v1.y); ctx.quadraticCurveTo(mid.x, mid.y, v2.x, v2.y); ctx.stroke(); }
      // élvilágítás: felül/balra fény, lent/jobbra árnyék (képernyő szerint)
      const pts = [c0, c1, c2, c3], mids = pts.map((p, i) => { const q = pts[(i + 1) % 4]; return { i, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; });
      const top = mids.reduce((a, b) => (b.my < a.my ? b : a)), bot = mids.reduce((a, b) => (b.my > a.my ? b : a)), lef = mids.reduce((a, b) => (b.mx < a.mx ? b : a)), rig = mids.reduce((a, b) => (b.mx > a.mx ? b : a));
      const edge = (m, col, w) => { const p = pts[m.i], q = pts[(m.i + 1) % 4]; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); };
      edge(top, 'rgba(255,255,255,.5)', 1.6); edge(lef, 'rgba(255,255,255,.35)', 1.4); edge(bot, 'rgba(30,15,5,.45)', 1.6); edge(rig, 'rgba(30,15,5,.35)', 1.4);
      quad(x0, z0, x0 + 1, z0 + 1, 0); ctx.strokeStyle = 'rgba(43,27,16,.55)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.fillStyle = '#2b1b10'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const a = W.P(i - 3.5, 0, nz > 0 ? 4.33 : -4.33), b = W.P(W.flip ? 4.33 : -4.33, 0, i - 3.5);
      ctx.font = `bold ${Math.max(11, a.k * 0.27)}px "IM Fell English", serif`; ctx.fillStyle = '#f6edd2';
      ctx.fillText('abcdefgh'[i], a.x, a.y); ctx.fillText(String(8 - i), b.x, b.y);
      const a2 = W.P(i - 3.5, 0, -(nz > 0 ? 4.33 : -4.33)), b2 = W.P(-(W.flip ? 4.33 : -4.33), 0, i - 3.5); ctx.fillText('abcdefgh'[i], a2.x, a2.y); ctx.fillText(String(8 - i), b2.x, b2.y);
    }
  }
  function drawBoardDyn() {
    for (const sq of W.hl.last) if (sq >= 0) { const q = W.sqPos(sq); quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(255,215,60,.45)'; ctx.fill(); }
    if (W.hl.check >= 0) { const q = W.sqPos(W.hl.check); quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = `rgba(200,20,20,${0.35 + 0.25 * Math.sin(W.time * 8)})`; ctx.fill(); }
    for (const d of W.decals) {
      ctx.beginPath();
      d.pts.forEach((m, i) => { const a = d.rot + i * TAU / d.pts.length, p = W.P(d.x + Math.cos(a) * d.r * m, 0, d.z + Math.sin(a) * d.r * m); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
    }
    const ar = W.hl.arrow;
    if (ar && ar.from >= 0) {
      const f = W.sqPos(ar.from), t = W.sqPos(ar.to), a = W.P(f.x, 0, f.z), b = W.P(t.x, 0, t.z), k = (a.k + b.k) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      const hw = k * 0.2, w = k * 0.07, head = k * 0.34, e1 = { x: b.x - ux * k * 0.28, y: b.y - uy * k * 0.28 }, s1 = { x: a.x + ux * k * 0.28, y: a.y + uy * k * 0.28 };
      if (L > k * 0.7) {
        ctx.beginPath(); ctx.moveTo(s1.x + nx * w, s1.y + ny * w); ctx.lineTo(e1.x - ux * head + nx * w, e1.y - uy * head + ny * w); ctx.lineTo(e1.x - ux * head + nx * hw, e1.y - uy * head + ny * hw); ctx.lineTo(e1.x, e1.y);
        ctx.lineTo(e1.x - ux * head - nx * hw, e1.y - uy * head - ny * hw); ctx.lineTo(e1.x - ux * head - nx * w, e1.y - uy * head - ny * w); ctx.lineTo(s1.x - nx * w, s1.y - ny * w); ctx.closePath();
        ctx.fillStyle = 'rgba(255,196,40,.78)'; ctx.fill(); ctx.strokeStyle = '#1c1310'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    const sel = W.hl.sel;
    if (sel >= 0) { const q = W.sqPos(sel); quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(120,255,120,.4)'; ctx.fill(); ctx.strokeStyle = '#2f7a2f'; ctx.lineWidth = 3; ctx.stroke(); }
    for (const t of W.hl.targets) {
      const q = W.sqPos(t.sq);
      if (t.cap) { quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(200,30,30,.42)'; ctx.fill(); ctx.strokeStyle = '#8a1010'; ctx.lineWidth = 3; ctx.stroke(); }
      else { quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(80,200,90,.22)'; ctx.fill(); }
    }
  }

  let shGrad = null;
  function shadow(x, z, r, a) {
    const p = W.P(x, 0, z);
    if (W.q === 0) { ctx.fillStyle = 'rgba(24,12,6,' + Math.min(0.5, (a || 0.32) * 1.2) + ')'; ctx.beginPath(); ctx.ellipse(p.x + r * p.k * 0.2, p.y, r * p.k * 1.1, r * p.k * cam.sinP * 0.9, 0, 0, TAU); ctx.fill(); return; }
    if (!shGrad) { shGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); shGrad.addColorStop(0, 'rgba(24,12,6,.62)'); shGrad.addColorStop(0.55, 'rgba(24,12,6,.34)'); shGrad.addColorStop(1, 'rgba(24,12,6,0)'); }
    ctx.save(); ctx.translate(p.x + r * p.k * 0.28, p.y + r * p.k * cam.sinP * 0.12); ctx.scale(r * p.k * 1.35, r * p.k * cam.sinP * 1.15);
    ctx.globalAlpha = Math.min(1, (a || 0.32) / 0.32 * 0.95); ctx.fillStyle = shGrad; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }

  function drawBubble(text, x, y, k) {
    const fs = Math.max(14, Math.min(19, k * 0.24)); ctx.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
    const maxW = Math.max(130, Math.min(cam.W * 0.62, fs * 12)), words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
    let tw = 0; for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
    const w = tw + fs * 1.2, lh = fs * 1.25, h = lines.length * lh + fs * 0.8, bx = Math.max(w / 2 + 6, Math.min(cam.W - w / 2 - 6, x)), by = Math.max(h + 6, y);
    ctx.save(); ctx.translate(bx, by);
    ctx.beginPath(); ctx.moveTo(-w / 2 + 8, -h); ctx.lineTo(w / 2 - 8, -h); ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + 8); ctx.lineTo(w / 2, -8); ctx.quadraticCurveTo(w / 2, 0, w / 2 - 8, 0);
    const tx = Math.max(-w / 2 + 16, Math.min(w / 2 - 16, x - bx)); ctx.lineTo(tx + 7, 0); ctx.lineTo(tx, fs * 0.7); ctx.lineTo(tx - 7, 0); ctx.lineTo(-w / 2 + 8, 0); ctx.quadraticCurveTo(-w / 2, 0, -w / 2, -8); ctx.lineTo(-w / 2, -h + 8); ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + 8, -h); ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fillStyle = '#fffbe8'; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#1c1310'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#120a06'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; lines.forEach((l, i) => ctx.fillText(l, 0, -h + fs * 0.4 + lh * (i + 0.5))); ctx.restore();
  }
  function drawMarkers() {
    const t = W.time;
    // bejelölt bábu: nagy zöld nyíl + gyűrű
    if (W.hl.sel >= 0) {
      const q = W.sqPos(W.hl.sel), pe = W.pieceAt(W.hl.sel), pr = W.P(q.x, 0, q.z), hh = pe ? S.HEIGHT[pe.type] : 1.2;
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 0.52 * pr.k, 0.52 * pr.k * cam.sinP, 0, 0, TAU); ctx.lineWidth = Math.max(3, pr.k * 0.1); ctx.strokeStyle = '#1c1310'; ctx.stroke(); ctx.lineWidth = Math.max(2, pr.k * 0.06); ctx.strokeStyle = '#7dff7d'; ctx.stroke();
      const mp = W.P(q.x, hh + 0.45 + Math.abs(Math.sin(t * 5)) * 0.15, q.z), a = mp.k * 0.22;
      ctx.beginPath(); ctx.moveTo(mp.x, mp.y); ctx.lineTo(mp.x - a, mp.y - a * 1.5); ctx.lineTo(mp.x + a, mp.y - a * 1.5); ctx.closePath(); ctx.fillStyle = '#7dff7d'; ctx.fill(); ctx.strokeStyle = '#1c1310'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // lehetséges lépések: pulzáló korongok / célkereszt (a figurák fölött is látszanak)
    for (const tg of W.hl.targets) {
      const q = W.sqPos(tg.sq), p = W.P(q.x, 0, q.z), pulse = 1 + 0.14 * Math.sin(t * 6 + tg.sq);
      if (tg.cap) {
        const R = p.k * 0.46 * pulse; ctx.lineWidth = Math.max(3, p.k * 0.09); ctx.strokeStyle = '#1c1310'; ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * cam.sinP, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = Math.max(2, p.k * 0.055); ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * cam.sinP, 0, 0, TAU); ctx.stroke();
        const c = R * 0.55; ctx.lineWidth = Math.max(2.5, p.k * 0.07); ctx.strokeStyle = '#ff3b2f'; ctx.beginPath(); ctx.moveTo(p.x - c, p.y - c * cam.sinP); ctx.lineTo(p.x + c, p.y + c * cam.sinP); ctx.moveTo(p.x + c, p.y - c * cam.sinP); ctx.lineTo(p.x - c, p.y + c * cam.sinP); ctx.stroke();
      } else {
        const R = p.k * 0.2 * pulse; ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * cam.sinP, 0, 0, TAU); ctx.fillStyle = 'rgba(70,220,90,.92)'; ctx.fill(); ctx.lineWidth = Math.max(2, p.k * 0.045); ctx.strokeStyle = '#1c1310'; ctx.stroke();
      }
    }
    // kurzor: a kiválasztott / érintett mező
    if (W.hover >= 0) { const q = W.sqPos(W.hover); quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#1c1310'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function drawPieceEnt(e, bodyMode) {
    const X = e.x + e.ox, Z = e.z + e.oz, p = W.P(X, e.y, Z);
    if (p.x < -150 || p.x > cam.W + 150) return;
    if (!bodyMode && e.state !== 'dead' && W.turn && e.color === W.turn && !W.ending) {
      const pr = W.P(X, 0, Z), pulse = 1 + 0.08 * Math.sin(W.time * 5), isM = W.moverEnt === e, R = (isM ? 0.56 : 0.47) * pulse;
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y, R * pr.k, R * pr.k * cam.sinP, 0, 0, TAU); ctx.lineWidth = Math.max(2.5, pr.k * (isM ? 0.1 : 0.06)); ctx.strokeStyle = 'rgba(28,19,16,.85)'; ctx.stroke();
      ctx.lineWidth = Math.max(1.5, pr.k * (isM ? 0.06 : 0.035)); ctx.strokeStyle = isM ? '#ffd24a' : 'rgba(255,214,90,.8)'; ctx.stroke();
    }
    if (!bodyMode && e.state !== 'dead') shadow(X, Z, 0.38 * (1 - Math.min(0.6, e.y * 0.25)));
    else shadow(X, Z, e.state === 'dead' ? 0.6 : 0.4, 0.25);
    const fig = Figures.ready && Figures.has(e.theme.id);
    if (fig && e.state !== 'dead' && !bodyMode) {   // seregjelző: vékony színes gyűrű a láb körül (nincs talapzat, a bábu a saját lábán áll)
      const pr = W.P(X, 0, Z), R = 0.36; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, R * pr.k, R * pr.k * cam.sinP, 0, 0, TAU);
      ctx.lineWidth = Math.max(3.5, pr.k * 0.085); ctx.strokeStyle = '#1c1310'; ctx.stroke(); ctx.lineWidth = Math.max(2, pr.k * 0.05); ctx.strokeStyle = Figures.ARMY_COLOR[e.theme.id]; ctx.stroke();
    }
    if (fig && e.crown && e.state !== 'dead') { const gp = W.P(X, 0.9, Z), gr = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, gp.k * 1.1); gr.addColorStop(0, 'rgba(255,225,110,.65)'); gr.addColorStop(1, 'rgba(255,225,110,0)'); ctx.fillStyle = gr; ctx.fillRect(gp.x - gp.k * 1.2, gp.y - gp.k * 1.2, gp.k * 2.4, gp.k * 2.4); }
    if (fig) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); if (e.alpha < 1) ctx.globalAlpha = Math.max(0, e.alpha); e.T = W.time; Figures.draw(ctx, e); ctx.restore();
    } else {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * e.face, p.k);
    if (e.alpha < 1) ctx.globalAlpha = Math.max(0, e.alpha);
    const sq = 1 + (e.sq2 || 0); ctx.scale(e.sx * sq, e.sy / sq);
    if (e.rot) ctx.rotate(e.rot * e.face);
    e.T = W.time;
    if (e.cheering && e.state !== 'dead') { e.expr = 'cheer'; }
    if (e.mv > 0 || W.hl.check === e.sq) { /* mozgás */ }
    S.piece(ctx, e);
    ctx.restore();
    }
    // égő láng
    if (e.burn > 0.05 && e.state !== 'dead') {
      if (Math.random() < 0.6) W.part({ x: X + rnd(-0.2, 0.2), y: e.y + rnd(0.1, 1.2), z: Z + rnd(-0.1, 0.1), vy: rnd(1, 2.5), vx: rnd(-0.3, 0.3), g: 0, life: rnd(0.3, 0.6), size: rnd(0.1, 0.22), kind: 'fire', color: pick(['#ff5a1f', '#ffb52e', '#ffe34a']) });
    }
    if (W.moverEnt === e && W.busy) {
      const mp = W.P(X, e.y + S.HEIGHT[e.type] + 0.45 + Math.abs(Math.sin(W.time * 6)) * 0.18, Z), q = mp.k * 0.2;
      ctx.beginPath(); ctx.moveTo(mp.x, mp.y); ctx.lineTo(mp.x - q, mp.y - q * 1.5); ctx.lineTo(mp.x + q, mp.y - q * 1.5); ctx.closePath(); ctx.fillStyle = '#ffd24a'; ctx.fill(); ctx.strokeStyle = '#1c1310'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    if (e.say) {
      const hp = W.P(X, e.y + S.HEIGHT[e.type] + (W.moverEnt === e ? 1.0 : 0.35) + (e.say.lift || 0), Z); drawBubble(e.say.text, hp.x, hp.y, p.k);
    }
  }

  function drawScenery(sc) {
    const im = Figures.extra(sc.k); if (!im) return; const p = W.P(sc.x, 0, sc.z); if (p.x < -400 || p.x > cam.W + 400) return;
    const h = sc.h * p.k, w = im.width * h / im.height; if (sc.stat) shadow(sc.x, sc.z, 0.5, 0.35);
    ctx.drawImage(im, p.x - w / 2, p.y - h + 2, w, h);
  }
  function drawStrip(st) {
    const im = Figures.extra('crowd' + st.k.slice(5)) || Figures.extra(st.k); if (!im) return; const p = W.P(st.x, 0, st.z); if (p.x < -500 || p.x > cam.W + 500) return;
    const h = st.h * p.k, w = im.width * h / im.height, bob = W.cheerT > 0 ? Math.abs(Math.sin(W.time * 9 + st.ph)) * 0.09 * p.k : Math.sin(W.time * 2 + st.ph) * 0.012 * p.k;
    ctx.save(); ctx.translate(p.x, p.y - bob); if (st.flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
    if (st.say) { const hp = W.P(st.x + st.say.dx, st.h + 0.15, st.z); drawBubble(st.say.text, hp.x, hp.y, p.k); }
  }
  function drawActor(a) {
    const p = W.P(a.x, a.y || 0, a.z); if (p.x < -200 || p.x > cam.W + 200) return;
    shadow(a.x, a.z, a.sh || 0.35);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * (a.face || 1) * (a.scale || 1), p.k * (a.scale || 1));
    if (a.alpha !== undefined) ctx.globalAlpha = Math.max(0, a.alpha);
    a.draw(ctx, a, W.time); ctx.restore();
    if (a.say) { const hp = W.P(a.x, 1.6, a.z); drawBubble(a.say.text, hp.x, hp.y, p.k); }
  }

  function drawParts() {
    for (const p of W.parts) {
      const q = W.P(p.x, p.y, p.z), a = clamp(p.life / p.max, 0, 1);
      if (q.x < -50 || q.x > cam.W + 50) continue;
      const s = p.size * q.k;
      if (p.kind === 'smoke') { ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.arc(q.x, q.y, s * (1.6 - a * 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.kind === 'fire') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.8; ctx.beginPath(); ctx.ellipse(q.x, q.y, s * a * 0.9, s * a * 1.4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(q.x, q.y, s * 2.2 * a, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      else if (p.kind === 'text') { ctx.globalAlpha = a; ctx.font = `bold ${Math.max(12, q.k * p.size)}px "IM Fell English", Georgia, serif`; ctx.fillStyle = p.color; ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(p.text, q.x, q.y); ctx.fillText(p.text, q.x, q.y); ctx.globalAlpha = 1; }
      else if (p.kind === 'head' && p.fig) { const f = p.fig; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.scale(q.k * (f.mirror ? -1 : 1), q.k); ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, -f.w / 2, -f.h / 2, f.w, f.h); ctx.restore(); }
      else if (p.kind === 'head') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.scale(q.k, q.k); S.face(ctx, { skin: p.skin, ph: 1, T: 0, state: 'dead', expr: 'dead' }, 0, -0.2, 0.2, {}); ctx.restore(); }
      else if (p.kind === 'gib') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-s, -s * 0.5, s * 2, s); ctx.restore(); }
      else if (p.kind === 'slash') { const rr = p.size * q.k, a0 = a; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(-0.3); ctx.globalAlpha = a0; ctx.lineCap = 'round'; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(3, q.k * 0.09) * a0; ctx.beginPath(); ctx.arc(0, 0, rr, -2.1, 0.9); ctx.stroke(); ctx.lineWidth = Math.max(1.5, q.k * 0.04); ctx.strokeStyle = '#1c1310'; ctx.globalAlpha = a0 * 0.6; ctx.beginPath(); ctx.arc(0, 0, rr * 1.08, -2.0, 0.8); ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'spark') { ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(q.x - s * 0.5, q.y - s * 0.5, s, s); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.2, s), 0, TAU); ctx.fill(); }
    }
  }

  function drawTorch(x, z) {
    const b = W.P(x, 0, z), t = W.P(x, 1.7, z), k = b.k;
    ctx.strokeStyle = S.OL; ctx.lineWidth = k * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = k * 0.06; ctx.stroke();
    const f = Math.sin(W.time * 13 + x * 3) * 0.04, tk = t.k;
    const glow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, tk * 1.2); glow.addColorStop(0, 'rgba(255,190,80,.4)'); glow.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = glow; ctx.fillRect(t.x - tk * 1.3, t.y - tk * 1.3, tk * 2.6, tk * 2.6);
    ctx.fillStyle = '#ffb52e'; ctx.strokeStyle = S.OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(t.x, t.y - tk * 0.2, tk * (0.14 + f), tk * 0.28, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.ellipse(t.x, t.y - tk * 0.12, tk * 0.08, tk * 0.16, 0, 0, TAU); ctx.fill();
  }

  /* ---------- Frissítés ---------- */
  function updateWanderers(dt) {
    for (const w of wanderers) {
      if (w.pause > 0) { w.pause -= dt; w.mv = 0; continue; }
      w.mv = 1; w.x += w.dir * w.sp * dt;
      if (w.x > 10 || w.x < -10) { w.dir *= -1; w.pause = rnd(1, 5); }
      if (Math.random() < 0.002) w.pause = rnd(1, 3);
    }
  }
  const root_Scenes = () => typeof Scenes !== 'undefined';
  function sortedItems() {
    const items = [];
    for (const e of W.pieces) items.push({ z: W.depth(e.z + e.oz) + e.y * 0.001, f: () => drawPieceEnt(e) });
    for (const e of W.bodies) items.push({ z: W.depth(e.z) - 0.2, f: () => drawPieceEnt(e, true) });
    for (const a of W.actors) items.push({ z: W.depth(a.z) + 0.01, f: () => drawActor(a) });
    if (W.useStrips && Figures.extrasReady) {
      for (const sc of W.scenery) items.push({ z: W.depth(sc.z) - 0.05, f: () => drawScenery(sc) });
      for (const st of W.strips) items.push({ z: W.depth(st.z), f: () => drawStrip(st) });
    }
    for (const c of W.crowd) {
      if (c.hidden || (W.useStrips && Figures.extrasReady)) continue;
      items.push({ z: W.depth(c.z), f: () => {
        const p = W.P(c.x, 0, c.z); if (p.x < -80 || p.x > cam.W + 80) return;
        shadow(c.x, c.z, 0.3, 0.2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); S.crowd(ctx, c, W.time); ctx.restore();
        if (c.say) { const hp = W.P(c.x, 1.45, c.z); drawBubble(c.say.text, hp.x, hp.y, p.k); }
      } });
    }
    for (const w of wanderers) {
      items.push({ z: W.depth(w.z), f: () => {
        const p = W.P(w.x, 0, w.z); if (p.x < -80 || p.x > cam.W + 80) return;
        shadow(w.x, w.z, 0.3, 0.2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * w.dir, p.k);
        if (Figures.extra(w.kind)) { Figures.sprite(ctx, w.kind, Figures.EH[w.kind], w.mv ? Math.abs(Math.sin(W.time * 9 + w.seed)) * 0.06 : 0); }
        else if (w.kind === 'doctor') S.doctor(ctx, w, W.time); else if (w.kind === 'skeleton') S.skeleton(ctx, w, W.time);
        else if (w.kind === 'monk') S.crowd(ctx, { seed: 0.5, skin: S.SKINS[1], cloth: '#6a4a2a', hat: 'hood', hatC: '#6a4a2a', prop: null, cheer: 0 }, W.time);
        else S.animal(ctx, { kind: w.kind, seed: w.seed, mv: w.mv }, W.time);
        ctx.restore();
      } });
    }
    if (root_Scenes()) for (const sc of Scenes.list) items.push({ z: W.depth(sc.z), f: () => { const p = W.P(sc.x, 0, sc.z); if (p.x < -300 || p.x > cam.W + 300) return; shadow(sc.x - 0.2, sc.z, 1.6, 0.2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * 0.95, p.k * 0.95); sc.draw(ctx, W.time); ctx.restore(); } });
    for (const [x, z] of [[-4.9, -4.9], [4.9, -4.9], [-4.9, 4.9], [4.9, 4.9]]) items.push({ z: W.depth(z), f: () => drawTorch(x, z) });
    items.sort((a, b) => a.z - b.z);
    return items;
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, (ts - last) / 1000 || 0.016); let dt = rawDt * W.speed * (W.skip ? 2.6 : 1); last = ts;
    if (W.hitstop > 0) { W.hitstop -= rawDt; dt = 0; }
    W.time += dt;
    { const raw = (ts - (W._lt || ts)) / 1000; W._lt = ts;
      if (W.autoQ && raw > 0 && raw < 0.5 && !document.hidden) { W._ema = (W._ema || 0.016) * 0.93 + raw * 0.07; W._n = (W._n || 0) + 1;
        const lim = W.fpsCap ? 0.043 : 0.027; if (W._n > 90 && W._ema > lim && W.q > 0) { W.setQ(W.q - 1); W._n = 0; W._ema = 0.016; } } }
    updateTweens(dt); updateParts(dt); updateWanderers(dt);
    if (root_Scenes() && !document.hidden && W.q >= 1) for (const sc of Scenes.list) sc.tick(dt, W);
    { const kf = 1 - Math.exp(-6 * Math.min(0.05, dt)); cam.zoom += (cam.tz - cam.zoom) * kf; cam.cx += (cam.tcx - cam.cx) * kf; cam.cy += (cam.tcy - cam.cy) * kf; cam.F = cam.F0 * cam.zoom; }
    for (const e of W.pieces.concat(W.bodies)) {
      if (e.mv > 0) e.wp += dt * 14;
      if (e.dirT > 0 && !e.busyAnim) { e.dirT -= dt; if (e.dirT <= 0) e.dir = null; }
      if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
      if (e.cheering && e.state !== 'dead' && !e.busyAnim) e.y = Math.abs(Math.sin(W.time * 7 + e.ph)) * 0.22;
    }
    for (const a of W.actors) if (a.say) { a.say.t -= dt; if (a.say.t <= 0) a.say = null; }
    for (const c of W.crowd) if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
    for (const c of (W.strips || [])) if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
    if (W.cheerT > 0) { W.cheerT -= dt; for (const c of W.crowd) c.cheer = 1; } else for (const c of W.crowd) c.cheer = 0;
    if (W.shake > 0) W.shake = Math.max(0, W.shake - dt * 2);
    if (W.onTick) W.onTick(dt);
    const gap = W.menuMode ? 50 : W.fpsCap ? 1000 / W.fpsCap - 3 : 0;
    if (gap && ts - (W._lr || 0) < gap) return; W._lr = ts;
    render();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W.shake > 0) ctx.translate(rnd(-1, 1) * W.shake * 8, rnd(-1, 1) * W.shake * 8);
    const hz = W.P(0, 0, W.flip ? 11 : -11), horizonY = hz.y;
    const ck = [cam.W, cam.H, dpr, W.flip ? 1 : 0, Math.round(cam.cx * 2), Math.round(cam.cy * 2), Math.round(cam.F * 2)].join('|');
    layer('bg', ck, () => {
      ctx.fillStyle = '#4a6eb0'; ctx.fillRect(0, 0, cam.W, cam.H);
      if (horizonY > 24) drawSky(horizonY);
      if (horizonY + hz.k * 0.5 > 0) drawWall(horizonY, hz.k);
      drawGround(Math.max(0, Math.min(horizonY, cam.H - 4)));
    }, W.q >= 2 ? 0.2 : 2.5);
    layer('board', ck + '|' + W.themes.w.id + W.themes.b.id, drawBoardBase);
    drawBoardDyn();
    for (const it of sortedItems()) it.f();
    drawMarkers();
    if (W.dragonFx) {
      const d = W.dragonFx, p = W.P(d.x, d.y, d.z), key = 'dragon_' + (d.pose || 'front');
      if (Figures.extra(key)) {
        const flap = Math.sin(W.time * (d.y > 1.5 ? 9 : 5)) * 0.04, step = d.walk ? Math.sin(W.time * 9) : 0, br = d.breath ? Math.sin(W.time * 22) * 0.015 : 0;
        shadow(d.x, d.z, (d.h || 3.4) * 0.3, 0.35);
        ctx.save(); ctx.translate(p.x, p.y - Math.abs(step) * 0.14 * p.k); ctx.rotate(step * 0.05 + (d.y > 1.5 ? Math.sin(W.time * 3) * 0.03 : 0)); ctx.scale(p.k * (1 + flap + br), p.k * (1 - flap * 0.8 - br)); Figures.sprite(ctx, key, d.h || 3.4, 0); ctx.restore();
        if (d.breath) { const gp = W.P(d.x, d.y + (d.h || 3.4) * 0.7, d.z), gg = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, gp.k * 1.7); gg.addColorStop(0, 'rgba(255,170,40,.38)'); gg.addColorStop(1, 'rgba(255,100,0,0)'); ctx.fillStyle = gg; ctx.fillRect(gp.x - gp.k * 1.8, gp.y - gp.k * 1.8, gp.k * 3.6, gp.k * 3.6); }
      }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * (d.face || 1), p.k); S.dragon(ctx, d, W.time); ctx.restore(); }
    }
    if (W.crownFx) { const c = W.crownFx, p = W.P(c.x, c.y, c.z); S.crownGfx(ctx, p.x, p.y, p.k * 0.55); }
    drawParts();
    if (W.fog > 0) { ctx.fillStyle = `rgba(80,140,60,${W.fog * 0.28})`; ctx.fillRect(-20, -20, cam.W + 40, cam.H + 40); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layer('ovl', cam.W + 'x' + cam.H + 'x' + dpr, drawOverlay);
  }
  function drawOverlay() {
    // kék kódex-keret arany csillagokkal (mint a Manesse-lapon)
    { const bw = Math.max(14, cam.W * 0.045); const bg = ctx.createLinearGradient(0, 0, bw, 0); bg.addColorStop(0, '#2c64a8'); bg.addColorStop(1, '#4b8ccc');
      for (const side of [0, 1]) {
        ctx.save(); if (side) { ctx.translate(cam.W, 0); ctx.scale(-1, 1); }
        ctx.fillStyle = bg; ctx.fillRect(0, 0, bw, cam.H); ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let y = 0; y < cam.H; y += 9) ctx.fillRect(2 + (y * 7 % 5), y, bw * 0.5, 2);
        ctx.fillStyle = '#b8322a'; ctx.fillRect(bw, 0, 2.5, cam.H); ctx.fillStyle = '#efe3c0'; ctx.fillRect(bw + 2.5, 0, 1.5, cam.H); ctx.fillStyle = '#1c1310'; ctx.fillRect(-1, 0, 1.5, cam.H);
        for (let y = bw; y < cam.H; y += bw * 3.2) { ctx.save(); ctx.translate(bw / 2, y); ctx.fillStyle = '#e8c258'; ctx.strokeStyle = '#7a5a12'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? bw * 0.16 : bw * 0.38; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
        ctx.restore();
      } }
    // fény + vignetta
    { vigG = ctx.createRadialGradient(cam.W / 2, cam.H * 0.48, Math.min(cam.W, cam.H) * 0.45, cam.W / 2, cam.H * 0.48, Math.max(cam.W, cam.H) * 0.78); vigG.addColorStop(0, 'rgba(30,15,5,0)'); vigG.addColorStop(1, 'rgba(25,10,20,.5)'); }
    ctx.fillStyle = vigG; ctx.fillRect(0, 0, cam.W, cam.H);
    { const lg = ctx.createLinearGradient(0, 0, cam.W, cam.H * 0.8); lg.addColorStop(0, 'rgba(255,225,150,.14)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(40,50,120,.14)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, cam.W, cam.H); }
  }


  /* ---------- Találat-teszt ---------- */
  function inQuad(px, py, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if (((pts[i].y > py) !== (pts[j].y > py)) && (px < (pts[j].x - pts[i].x) * (py - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x)) c = !c;
    }
    return c;
  }
  function sqQuad(sq) {
    const q = W.sqPos(sq);
    return [W.P(q.x - 0.5, 0, q.z - 0.5), W.P(q.x + 0.5, 0, q.z - 0.5), W.P(q.x + 0.5, 0, q.z + 0.5), W.P(q.x - 0.5, 0, q.z + 0.5)];
  }
  W.hover = -1;
  W.hitTest = function (px, py) {
    // 1) a kijelölt bábu szabályos célmezői élveznek elsőbbséget
    let pref = -1, pd = 1e9;
    for (const t of W.hl.targets) {
      const q = W.sqPos(t.sq), b = W.P(q.x, 0.5, q.z), onSq = inQuad(px, py, sqQuad(t.sq));
      let hit = onSq; if (!hit && t.cap) { const e = W.pieceAt(t.sq); if (e) { const f = W.P(e.x, 0, e.z), hh = S.HEIGHT[e.type] * f.k; hit = Math.abs(px - f.x) < f.k * 0.45 && py < f.y + f.k * 0.2 && py > f.y - hh; } }
      if (hit) { const d = Math.hypot(px - b.x, py - b.y); if (d < pd) { pd = d; pref = t.sq; } }
    }
    if (pref >= 0) return pref;
    // 2) bábu: a teljes rajzolt alak; egymást fedő bábuknál az nyer, amelyiknek van lépése (majd a közelebbi)
    const cand = [], pix = [];
    for (const e of W.pieces) {
      const f = W.P(e.x, 0, e.z), hh = S.HEIGHT[e.type] * f.k;
      if (Math.abs(px - f.x) < f.k * 0.5 && py < f.y + f.k * 0.22 && py > f.y - hh) {
        cand.push({ sq: e.sq, y: f.y });
        if (Figures.ready && Figures.has(e.theme.id) && Figures.hit(e, (px - f.x) / f.k, (py - f.y) / f.k) === true) pix.push({ sq: e.sq, y: f.y });
      }
    }
    if (pix.length) { pix.sort((a, b) => b.y - a.y); const ok = W.selectable ? pix.find(c => W.selectable(c.sq)) : null; return (ok || pix[0]).sq; }   // a megérintett festett alak; fedésnél az, amelyiknek van lépése, egyébként a legelső
    cand.sort((a, b) => b.y - a.y);
    if (cand.length) { const ok = W.selectable ? cand.find(c => W.selectable(c.sq)) : null; return (ok || cand[0]).sq; }
    for (let sq = 0; sq < 64; sq++) if (inQuad(px, py, sqQuad(sq))) return sq;
    return -1;
  };

  W.start = function (cv) {
    canvas = cv; ctx = cv.getContext('2d'); W.ctx = ctx;
    initQuality(); buildAmbience(); W.resize();
    window.addEventListener('resize', () => W.resize());
    requestAnimationFrame(frame);
  };
  W.getCanvas = () => canvas; W._renderOnce = () => render();
})(window);
