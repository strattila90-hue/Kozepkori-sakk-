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
    cam: { W: 800, H: 600, F: 1000, cx: 400, cy: 300, sinP: Math.sin(0.9), cosP: Math.cos(0.9), D: 14 },
    uid: 0, cheerT: 0, idleT: 3, shake: 0, godHand: 0, rnd, pick, clamp,
  };
  const cam = W.cam;
  let canvas, ctx, dpr = 1, last = 0;
  var clouds = [], stones = [], tufts = [], wanderers = [], birds = [];

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
  };
  W.sqPos = sq => ({ x: (sq & 7) - 3.5, z: (sq >> 3) - 3.5 });
  W.sqAt = (x, z) => clamp(Math.round(z + 3.5), 0, 7) * 8 + clamp(Math.round(x + 3.5), 0, 7);

  W.resize = function () {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    cam.W = w; cam.H = h;
    cam.F = Math.min(1.343 * w * 0.97, 1.2 * h);
    cam.cx = w / 2; cam.cy = h * 0.5 - 0.02 * cam.F;
  };

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
    W.themes = t;
    for (const e of W.pieces.concat(W.bodies)) e.theme = t[e.color];
  };
  W.setup = function (game) {
    W.pieces = []; W.bodies = []; W.actors = []; W.parts = []; W.decals = []; W.tweens = []; W.emitters = [];
    W.ending = false; W.busy = false; W.hl = { sel: -1, targets: [], last: [-1, -1], check: -1 };
    W.crownFx = null; W.dragonFx = null; W.fog = 0;
    for (const c of W.crowd) { c.hidden = false; c.cheer = 0; }
    game.board.forEach((ch, sq) => { if (ch) W.pieces.push(W.mkPiece(ch, sq)); });
  };
  W.pieceAt = sq => W.pieces.find(e => e.sq === sq) || null;
  W.king = color => W.pieces.find(e => e.type === 'K' && e.color === color);
  W.faceTo = (e, x) => { const dx = (x - e.x) * (W.flip ? -1 : 1); if (Math.abs(dx) > 0.05) e.face = dx > 0 ? 1 : -1; };
  W.say = function (e, text, dur) { e.say = { text, t: dur || 1.4 }; };
  W.setCheer = s => { W.cheerT = Math.max(W.cheerT, s); };

  function buildAmbience() {
    const cl = ['#6b8e3a', '#8a4a2a', '#4a5f8a', '#a8802a', '#7a3a5a', '#5a7a6a', '#9a5a2a', '#6a6a6a'];
    const mk = (x, z) => ({
      x, z, home: { x, z }, seed: Math.random(), skin: pick(S.SKINS), cloth: pick(cl), hat: pick(S.HATS), hatC: pick(cl),
      prop: pick(['mug', 'fork', 'torch', null, null, null]), cheer: 0, hidden: false, expr: 'idle',
    });
    W.crowd = [];
    for (let r = 0; r < 3; r++) for (let x = -7; x <= 7; x += 1.35) W.crowd.push(mk(x + rnd(-0.35, 0.35) + (r & 1) * 0.6, -6.0 - r * 1.0 + rnd(-0.1, 0.1)));
    for (let r = 0; r < 2; r++) for (let x = -7; x <= 7; x += 1.25) W.crowd.push(mk(x + rnd(-0.3, 0.3), 5.5 + r * 0.9 + rnd(-0.1, 0.1)));
    for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) for (let z = -4.2; z <= 4.2; z += 1.1) W.crowd.push(mk(sx * (5.3 + r * 0.9) + rnd(-0.2, 0.2), z + rnd(-0.3, 0.3)));
    clouds = []; for (let i = 0; i < 7; i++) clouds.push({ x: Math.random(), y: rnd(0.02, 0.28), s: rnd(0.6, 1.4), v: rnd(0.004, 0.012) });
    stones = []; for (let i = 0; i < 380; i++) { const x = rnd(-16, 16), z = rnd(-13, 11); if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue; stones.push({ x, z, r: rnd(0.12, 0.4), c: pick(['#8b7a5a', '#7a6a4c', '#9a8962', '#6e5f44', '#a39270']) }); }
    tufts = []; for (let i = 0; i < 60; i++) { const x = rnd(-14, 14), z = rnd(-11, 10); if (Math.abs(x) < 4.5 && Math.abs(z) < 4.5) continue; tufts.push({ x, z, c: pick(['#c9a64a', '#b88f3a', '#5f8a3a']) }); }
    birds = []; for (let i = 0; i < 4; i++) birds.push({ x: Math.random(), y: rnd(0.05, 0.2), v: rnd(0.02, 0.04), ph: Math.random() * 6 });
    wanderers = [];
    const defs = [['doctor', 0.6], ['skeleton', 0.5], ['pig', 0.7], ['hen', 0.4], ['hen', 0.4], ['dog', 0.8], ['monk', 0.4]];
    for (const [kind, sp] of defs) wanderers.push({ kind, x: rnd(-9, 9), z: pick([-7.9, -8.3, -9.2, 7.2]), dir: Math.random() < 0.5 ? -1 : 1, sp, seed: Math.random() * 10, mv: 1, pause: 0 });
  }

  /* ---------- Részecskék ---------- */
  W.part = function (o) {
    if (W.parts.length > 900) W.parts.shift();
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
  const lerp = (a, b, t) => a + (b - a) * t;
  function quad(x0, z0, x1, z1, y) {
    const a = W.P(x0, y || 0, z0), b = W.P(x1, y || 0, z0), c = W.P(x1, y || 0, z1), d = W.P(x0, y || 0, z1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  }

  function drawCloud(x, y, s) {
    const r = 38 * s;
    ctx.fillStyle = '#f6f0e0'; ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
    const bl = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.8], [-1.6, 0.45, 0.5], [1.7, 0.4, 0.55], [0.1, -0.5, 0.7], [-0.7, -0.35, 0.55], [0.8, -0.4, 0.5]];
    ctx.beginPath(); for (const [dx, dy, rr] of bl) { ctx.moveTo(x + dx * r + r * rr, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * rr, 0, TAU); } ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6f0e0'; ctx.beginPath(); for (const [dx, dy, rr] of bl) { ctx.moveTo(x + dx * r + r * rr - 2, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * rr - 2, 0, TAU); } ctx.fill();
  }

  function drawSky(horizonY) {
    const w = cam.W;
    const g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, '#d9b45a'); g.addColorStop(0.5, '#e9cf8a'); g.addColorStop(1, '#f3e3b0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizonY + 4);
    // sugarak a napból
    const sx = w * 0.17, sy = horizonY * 0.3;
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff6c8';
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + W.time * 0.05; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, w, a, a + 0.1); ctx.fill(); }
    ctx.restore();
    // nap arccal
    const r = Math.min(w, horizonY) * 0.1;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(W.time * 0.05);
    ctx.fillStyle = '#f2b830'; ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate(i * TAU / 16); ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.12); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 0.9, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    ctx.save(); ctx.translate(sx, sy); const u = r; ctx.scale(u, u);
    S.ell(ctx, 0, 0, 0.9, 0.9, '#ffd24a', 0, 0.04);
    ctx.lineWidth = 0.04; ctx.strokeStyle = S.OL; ctx.beginPath(); ctx.arc(-0.3, -0.12, 0.1, 0, TAU); ctx.arc(0.3, -0.12, 0.1, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.2, 0.4, 0.2, Math.PI - 0.2); ctx.stroke(); S.ell(ctx, 0, 0.1, 0.1, 0.07, '#e88a3a', 0, 0.03);
    ctx.restore();
    // hold
    ctx.save(); ctx.translate(w * 0.34, horizonY * 0.16); ctx.fillStyle = '#f7efc8'; ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0.5, TAU - 0.5); ctx.arc(r * 0.15, 0, r * 0.3, TAU - 0.9, 0.9, true); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // felhők
    for (const c of clouds) { c.x += c.v * 0.016 * W.speed; if (c.x > 1.3) c.x = -0.3; drawCloud(c.x * w, horizonY * (0.1 + c.y * 2), c.s * w / 700); }
    // madarak
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
    for (const b of birds) { b.x += b.v * 0.016; if (b.x > 1.1) b.x = -0.1; const bx = b.x * w, by = horizonY * (0.3 + b.y), f = Math.sin(W.time * 8 + b.ph) * 5; ctx.beginPath(); ctx.moveTo(bx - 9, by - f); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 9, by - f); ctx.stroke(); }
    // isteni kéz a felhőből
    if (W.godHand > 0) {
      const gh = W.godHand; ctx.save(); ctx.translate(w * 0.86, horizonY * 0.28); ctx.rotate(-0.4); ctx.scale(w / 520 * gh, w / 520 * gh);
      drawCloud(60, 10, 1.2);
      S.poly(ctx, [[-40, -20], [60, -30], [70, 20], [-30, 30]], '#b3261e', 3);
      S.poly(ctx, [[-40, -20], [-120, -10], [-170, 10], [-160, 22], [-110, 20], [-40, 30]], '#f2c9a0', 3);
      S.poly(ctx, [[-150, 8], [-190, 40], [-184, 48], [-140, 22]], '#f2c9a0', 3);
      ctx.restore();
    }
  }

  function drawWall(horizonY, k) {
    const w = cam.W, wh = Math.max(50, k * 4.6), by = horizonY + k * 0.5;
    // távoli dombok
    ctx.fillStyle = '#9a8a5a'; ctx.beginPath(); ctx.moveTo(0, by - wh * 0.9); for (let x = 0; x <= w; x += 30) ctx.lineTo(x, by - wh * (0.95 + 0.25 * Math.sin(x * 0.011) + 0.12 * Math.sin(x * 0.03))); ctx.lineTo(w, by); ctx.lineTo(0, by); ctx.fill();
    // fal
    const wallTop = by - wh * 0.72;
    ctx.fillStyle = '#b3a07a'; ctx.fillRect(0, wallTop, w, by - wallTop);
    ctx.strokeStyle = 'rgba(60,40,20,.35)'; ctx.lineWidth = 1;
    for (let y = wallTop + 14; y < by; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); for (let x = ((y / 14) & 1) * 20; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); ctx.stroke(); } }
    ctx.fillStyle = '#b3a07a'; ctx.strokeStyle = S.OL; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 36) { ctx.fillRect(x, wallTop - 14, 22, 15); ctx.strokeRect(x, wallTop - 14, 22, 15); }
    ctx.fillStyle = 'rgba(40,25,10,.25)'; ctx.fillRect(0, by - 10, w, 10);
    // tornyok + zászlók
    const tcols = [W.themes.w.main, W.themes.b.main, '#b3261e', '#e2ae2c'];
    const tw = wh * 0.5;
    [[0.1, 0], [0.5, 1], [0.9, 2]].forEach(([fx, i]) => {
      const x = fx * w - tw / 2, top = wallTop - wh * 0.45;
      ctx.fillStyle = '#a8946a'; ctx.fillRect(x, top, tw, by - top); ctx.strokeRect(x, top, tw, by - top);
      ctx.fillStyle = tcols[i + 1] || '#b3261e'; ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + tw / 2, top - tw * 0.9); ctx.lineTo(x + tw + 6, top); ctx.closePath(); ctx.fill(); ctx.stroke();
      const f = Math.sin(W.time * 4 + i) * 4; ctx.strokeStyle = S.OL; ctx.beginPath(); ctx.moveTo(x + tw / 2, top - tw * 0.9); ctx.lineTo(x + tw / 2, top - tw * 1.35); ctx.stroke();
      ctx.fillStyle = tcols[(i + 2) % 4]; ctx.beginPath(); ctx.moveTo(x + tw / 2, top - tw * 1.35); ctx.lineTo(x + tw / 2 + tw * 0.55, top - tw * 1.2 + f); ctx.lineTo(x + tw / 2, top - tw * 1.05); ctx.fill(); ctx.stroke();
      // ablak + figura
      const wx = x + tw / 2 - 9, wy = top + tw * 0.4;
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(wx, wy + 26); ctx.lineTo(wx, wy + 8); ctx.arc(wx + 9, wy + 8, 9, Math.PI, TAU); ctx.lineTo(wx + 18, wy + 26); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(wx, wy - 2, 18, 28); ctx.clip();
      const sp = { skin: S.SKINS[i], ph: i, T: W.time, expr: i === 1 ? 'cheer' : 'idle', look: 0 };
      ctx.translate(wx + 9, wy + 30 - Math.abs(Math.sin(W.time * 3 + i)) * 3); ctx.scale(24, 24); S.face(ctx, sp, 0, -0.5, 0.3, {}); ctx.restore();
    });
    // kapu
    const gx = w * 0.3, gw = tw * 0.9;
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.moveTo(gx - gw / 2, by); ctx.lineTo(gx - gw / 2, by - wh * 0.42); ctx.arc(gx, by - wh * 0.42, gw / 2, Math.PI, TAU); ctx.lineTo(gx + gw / 2, by); ctx.fill(); ctx.strokeStyle = S.OL; ctx.stroke();
    ctx.strokeStyle = '#6a4a2a'; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(gx - gw / 2 + i * gw / 5, by); ctx.lineTo(gx - gw / 2 + i * gw / 5, by - wh * 0.4); ctx.stroke(); }
  }

  function drawGround(horizonY) {
    const w = cam.W, h = cam.H;
    const g = ctx.createLinearGradient(0, horizonY, 0, h);
    g.addColorStop(0, '#7a6a48'); g.addColorStop(0.45, '#8b7a54'); g.addColorStop(1, '#6e5e3e');
    ctx.fillStyle = g; ctx.fillRect(0, horizonY, w, h - horizonY);
    for (const s of stones) {
      const p = W.P(s.x, 0, s.z); if (p.x < -50 || p.x > w + 50 || p.y > h + 20) continue;
      ctx.fillStyle = s.c; ctx.strokeStyle = 'rgba(40,25,10,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, s.r * p.k, s.r * p.k * cam.sinP * 0.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (const t of tufts) {
      const p = W.P(t.x, 0, t.z); if (p.x < -20 || p.x > w + 20) continue;
      ctx.strokeStyle = t.c; ctx.lineWidth = Math.max(1, p.k * 0.03);
      ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + i * p.k * 0.12, p.y - p.k * 0.25); } ctx.stroke();
    }
  }

  function drawBoard() {
    const half = 4, fr = 4.5;
    // kerete + oldala
    const nz = W.flip ? -fr : fr;
    ctx.fillStyle = '#3a2410';
    for (const [a, b, c, d] of [[-fr, nz, fr, nz], [-fr, -fr, -fr, fr], [fr, -fr, fr, fr]]) {
      const p1 = W.P(a, 0, b), p2 = W.P(c, 0, d), p3 = W.P(c, -0.3, d), p4 = W.P(a, -0.3, b);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    }
    quad(-fr, -fr, fr, fr, 0); ctx.fillStyle = '#6b4423'; ctx.fill(); ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 3; ctx.stroke();
    quad(-half - 0.15, -half - 0.15, half + 0.15, half + 0.15, 0); ctx.fillStyle = '#c99a2e'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    // mezők
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f, x0 = f - 4, z0 = r - 4;
      quad(x0, z0, x0 + 1, z0 + 1, 0);
      ctx.fillStyle = (r + f) & 1 ? '#7a5230' : '#e1cb98'; ctx.fill();
      const lm = W.hl.last;
      if (sq === lm[0] || sq === lm[1]) { ctx.fillStyle = 'rgba(255,215,60,.38)'; ctx.fill(); }
      if (sq === W.hl.check) { ctx.fillStyle = `rgba(220,20,20,${0.35 + 0.25 * Math.sin(W.time * 8)})`; ctx.fill(); }
      ctx.strokeStyle = 'rgba(40,20,5,.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // koordináták
    ctx.fillStyle = '#3a2410'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      const a = W.P(i - 3.5, 0, nz > 0 ? 4.32 : -4.32), b = W.P(W.flip ? 4.32 : -4.32, 0, i - 3.5);
      ctx.font = `bold ${Math.max(9, a.k * 0.22)}px serif`;
      ctx.fillText('abcdefgh'[i], a.x, a.y); ctx.fillText(String(8 - i), b.x, b.y);
    }
    // vérfoltok
    for (const d of W.decals) {
      ctx.beginPath();
      d.pts.forEach((m, i) => { const a = d.rot + i * TAU / d.pts.length, p = W.P(d.x + Math.cos(a) * d.r * m, 0, d.z + Math.sin(a) * d.r * m); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.fillStyle = d.color; ctx.fill();
    }
    // célpontok
    const sel = W.hl.sel;
    if (sel >= 0) { const q = W.sqPos(sel); quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(120,255,120,.4)'; ctx.fill(); ctx.strokeStyle = '#2f9a2f'; ctx.lineWidth = 3; ctx.stroke(); }
    for (const t of W.hl.targets) {
      const q = W.sqPos(t.sq), p = W.P(q.x, 0, q.z), pulse = 1 + 0.12 * Math.sin(W.time * 6);
      if (t.cap) { quad(q.x - 0.5, q.z - 0.5, q.x + 0.5, q.z + 0.5, 0); ctx.fillStyle = 'rgba(220,30,30,.4)'; ctx.fill(); ctx.strokeStyle = '#c01818'; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.k * 0.17 * pulse, p.k * 0.17 * cam.sinP * pulse, 0, 0, TAU); ctx.fillStyle = 'rgba(60,200,60,.8)'; ctx.fill(); ctx.strokeStyle = '#1b6a1b'; ctx.lineWidth = 2; ctx.stroke(); }
    }
  }

  function shadow(x, z, r, a) {
    const p = W.P(x, 0, z); ctx.fillStyle = `rgba(30,15,5,${a || 0.32})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * p.k, r * p.k * cam.sinP, 0, 0, TAU); ctx.fill();
  }

  function drawBubble(text, x, y, k) {
    const fs = Math.max(11, k * 0.26); ctx.font = `bold ${fs}px "IM Fell English", Georgia, serif`;
    const w = ctx.measureText(text).width + fs * 0.9, h = fs * 1.5;
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h); ctx.lineTo(w / 2 - 6, -h); ctx.quadraticCurveTo(w / 2, -h, w / 2, -h + 6); ctx.lineTo(w / 2, -6); ctx.quadraticCurveTo(w / 2, 0, w / 2 - 6, 0);
    ctx.lineTo(6, 0); ctx.lineTo(0, fs * 0.6); ctx.lineTo(-6, 0); ctx.lineTo(-w / 2 + 6, 0); ctx.quadraticCurveTo(-w / 2, 0, -w / 2, -6); ctx.lineTo(-w / 2, -h + 6); ctx.quadraticCurveTo(-w / 2, -h, -w / 2 + 6, -h); ctx.closePath();
    ctx.fillStyle = '#f7ecc8'; ctx.fill(); ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2a170b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -h / 2); ctx.restore();
  }

  function drawPieceEnt(e, bodyMode) {
    const X = e.x + e.ox, Z = e.z + e.oz, p = W.P(X, e.y, Z);
    if (p.x < -150 || p.x > cam.W + 150) return;
    if (!bodyMode && e.state !== 'dead') shadow(X, Z, 0.38 * (1 - Math.min(0.6, e.y * 0.25)));
    else shadow(X, Z, e.state === 'dead' ? 0.6 : 0.4, 0.25);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * e.face, p.k);
    if (e.alpha < 1) ctx.globalAlpha = Math.max(0, e.alpha);
    const sq = 1 + (e.sq2 || 0); ctx.scale(e.sx * sq, e.sy / sq);
    if (e.rot) ctx.rotate(e.rot * e.face);
    e.T = W.time;
    if (e.cheering && e.state !== 'dead') { e.expr = 'cheer'; }
    if (e.mv > 0 || W.hl.check === e.sq) { /* mozgás */ }
    S.piece(ctx, e);
    ctx.restore();
    // égő láng
    if (e.burn > 0.05 && e.state !== 'dead') {
      if (Math.random() < 0.6) W.part({ x: X + rnd(-0.2, 0.2), y: e.y + rnd(0.1, 1.2), z: Z + rnd(-0.1, 0.1), vy: rnd(1, 2.5), vx: rnd(-0.3, 0.3), g: 0, life: rnd(0.3, 0.6), size: rnd(0.1, 0.22), kind: 'fire', color: pick(['#ff5a1f', '#ffb52e', '#ffe34a']) });
    }
    if (e.say) {
      const hp = W.P(X, e.y + S.HEIGHT[e.type] + 0.35, Z); drawBubble(e.say.text, hp.x, hp.y, p.k);
    }
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
      else if (p.kind === 'fire') { ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(q.x, q.y, s * a * 0.8, s * a * 1.3, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.kind === 'text') { ctx.globalAlpha = a; ctx.font = `bold ${Math.max(12, q.k * p.size)}px "IM Fell English", Georgia, serif`; ctx.fillStyle = p.color; ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(p.text, q.x, q.y); ctx.fillText(p.text, q.x, q.y); ctx.globalAlpha = 1; }
      else if (p.kind === 'head') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.scale(q.k, q.k); S.face(ctx, { skin: p.skin, ph: 1, T: 0, state: 'dead', expr: 'dead' }, 0, -0.2, 0.2, {}); ctx.restore(); }
      else if (p.kind === 'gib') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-s, -s * 0.5, s * 2, s); ctx.restore(); }
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
  function sortedItems() {
    const items = [];
    for (const e of W.pieces) items.push({ z: W.depth(e.z + e.oz) + e.y * 0.001, f: () => drawPieceEnt(e) });
    for (const e of W.bodies) items.push({ z: W.depth(e.z) - 0.2, f: () => drawPieceEnt(e, true) });
    for (const a of W.actors) items.push({ z: W.depth(a.z) + 0.01, f: () => drawActor(a) });
    for (const c of W.crowd) {
      if (c.hidden) continue;
      items.push({ z: W.depth(c.z), f: () => {
        const p = W.P(c.x, 0, c.z); if (p.x < -80 || p.x > cam.W + 80) return;
        shadow(c.x, c.z, 0.3, 0.2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k, p.k); S.crowd(ctx, c, W.time); ctx.restore();
      } });
    }
    for (const w of wanderers) {
      items.push({ z: W.depth(w.z), f: () => {
        const p = W.P(w.x, 0, w.z); if (p.x < -80 || p.x > cam.W + 80) return;
        shadow(w.x, w.z, 0.3, 0.2); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * w.dir, p.k);
        if (w.kind === 'doctor') S.doctor(ctx, w, W.time); else if (w.kind === 'skeleton') S.skeleton(ctx, w, W.time);
        else if (w.kind === 'monk') S.crowd(ctx, { seed: 0.5, skin: S.SKINS[1], cloth: '#6a4a2a', hat: 'hood', hatC: '#6a4a2a', prop: null, cheer: 0 }, W.time);
        else S.animal(ctx, { kind: w.kind, seed: w.seed, mv: w.mv }, W.time);
        ctx.restore();
      } });
    }
    for (const [x, z] of [[-4.9, -4.9], [4.9, -4.9], [-4.9, 4.9], [4.9, 4.9]]) items.push({ z: W.depth(z), f: () => drawTorch(x, z) });
    items.sort((a, b) => a.z - b.z);
    return items;
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016) * W.speed; last = ts;
    W.time += dt;
    updateTweens(dt); updateParts(dt); updateWanderers(dt);
    for (const e of W.pieces.concat(W.bodies)) {
      if (e.mv > 0) e.wp += dt * 14;
      if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
      if (e.cheering && e.state !== 'dead' && !e.busyAnim) e.y = Math.abs(Math.sin(W.time * 7 + e.ph)) * 0.22;
    }
    for (const a of W.actors) if (a.say) { a.say.t -= dt; if (a.say.t <= 0) a.say = null; }
    if (W.cheerT > 0) { W.cheerT -= dt; for (const c of W.crowd) c.cheer = 1; } else for (const c of W.crowd) c.cheer = 0;
    if (W.shake > 0) W.shake = Math.max(0, W.shake - dt * 2);
    if (W.onTick) W.onTick(dt);
    render();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W.shake > 0) ctx.translate(rnd(-1, 1) * W.shake * 8, rnd(-1, 1) * W.shake * 8);
    const hz = W.P(0, 0, W.flip ? 11 : -11), horizonY = hz.y;
    drawSky(horizonY); drawWall(horizonY, hz.k); drawGround(horizonY);
    if (W.fog > 0) { /* kezdő köd az alján */ }
    drawBoard();
    for (const it of sortedItems()) it.f();
    if (W.dragonFx) {
      const d = W.dragonFx, p = W.P(d.x, d.y, d.z); ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.k * 1.0 * d.face, p.k * 1.0); S.dragon(ctx, d, W.time); ctx.restore();
    }
    if (W.crownFx) { const c = W.crownFx, p = W.P(c.x, c.y, c.z); S.crownGfx(ctx, p.x, p.y, p.k * 0.55); }
    drawParts();
    if (W.fog > 0) { ctx.fillStyle = `rgba(80,140,60,${W.fog * 0.28})`; ctx.fillRect(-20, -20, cam.W + 40, cam.H + 40); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  W.hitTest = function (px, py) {
    // 1) kijelölt bábu szabályos célmezői élveznek elsőbbséget (mező vagy a rajta álló báb teste)
    let pref = -1, pd = 1e9;
    for (const t of W.hl.targets) {
      const q = W.sqPos(t.sq), b = W.P(q.x, 0.5, q.z);
      if (inQuad(px, py, sqQuad(t.sq))) { const d = Math.hypot(px - b.x, py - b.y) * 0.5; if (d < pd) { pd = d; pref = t.sq; } }
      else if (t.cap && Math.hypot(px - b.x, (py - b.y) * 0.8) < b.k * 0.4) { const d = Math.hypot(px - b.x, py - b.y); if (d < pd) { pd = d; pref = t.sq; } }
    }
    if (pref >= 0) return pref;
    let best = -1, bd = 1e9;
    for (const e of W.pieces) {
      const p = W.P(e.x, 0.55, e.z), d = Math.hypot(px - p.x, (py - p.y) * 0.8);
      if (d < p.k * 0.55 && d < bd) { bd = d; best = e.sq; }
    }
    if (best >= 0) return best;
    for (let sq = 0; sq < 64; sq++) if (inQuad(px, py, sqQuad(sq))) return sq;
    return -1;
  };

  W.start = function (cv) {
    canvas = cv; ctx = cv.getContext('2d'); W.ctx = ctx;
    buildAmbience(); W.resize();
    window.addEventListener('resize', W.resize);
    requestAnimationFrame(frame);
  };
  W.getCanvas = () => canvas;
})(window);
