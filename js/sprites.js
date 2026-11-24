/* Kódexfestmény-stílusú, procedurális karakterek (láncing, sandító szemek, arany glória, levélkorona).
   1 egység = 1 mező, a láb az origóban, y felfelé negatív, a figura +x felé néz. */
(function (root) {
  'use strict';
  const OL = '#1c1310', TAU = Math.PI * 2;
  const C = { mail: '#8aa3bd', mailD: '#2f4660', steel: '#3d424d', steelL: '#cfd5dd', gold: '#d9a935', goldD: '#9c7218', wood: '#8a5a2b', woodD: '#5b3a1a', leather: '#6b3f22', parch: '#efe3c0', blue: '#3b5ea6', red: '#b8322a', green: '#4a7a3a' };
  const THEMES = {
    white: { id: 'white', name: 'Fehér',  main: '#f3ecd4', dark: '#cbbf94', light: '#fffdf0', accent: '#d4a437', trim: '#3f8a4a', sleeve: '#3f8a4a', hex: '#e6f3ff' },
    black: { id: 'black', name: 'Fekete', main: '#3a3560', dark: '#25223f', light: '#5e5890', accent: '#d4a437', trim: '#d4a437', sleeve: '#8a3a4a', hex: '#7a3af0' },
    red:   { id: 'red',   name: 'Vörös',  main: '#c23a2c', dark: '#7e1f17', light: '#e66a58', accent: '#efe3b0', trim: '#d4a437', sleeve: '#3f8a4a', hex: '#ff3a2a' },
    gold:  { id: 'gold',  name: 'Arany',  main: '#d8a02c', dark: '#9c6c16', light: '#ffe07a', accent: '#8a2a1c', trim: '#b8322a', sleeve: '#3b5ea6', hex: '#ffc200' },
  };
  const CHAR = { main: '#2d2a28', dark: '#151413', light: '#4a4543', accent: '#5a5551', trim: '#3a3532', sleeve: '#3a3532' };
  const SKINS = ['#f3dfc3', '#efd2ac', '#e6c29a', '#f6e6cf', '#d9b087'];
  const HATS = ['coif', 'cap', 'hood', 'bald', 'band', 'straw'];
  const HEIGHT = { P: 1.32, N: 1.68, B: 1.62, R: 1.5, Q: 1.7, K: 1.75 };

  /* ---------- rajzoló segédek ---------- */
  /* ---------- színkeverés + gradiens-gyorsítótár (fény balfelülről) ---------- */
  let QUAL = 1; const cc = new Map(), gc = new Map(); let BB = null; const DEFBB = [-0.5, -1.8, 0.5, 0];
  const isHex = c => typeof c === 'string' && c[0] === '#';
  function mixc(c, k) {
    const key = c + k; let v = cc.get(key); if (v) return v;
    let h = c; if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16), t = k > 0 ? [255, 246, 218] : [28, 14, 40], a = Math.abs(k);
    v = 'rgb(' + Math.round(r + (t[0] - r) * a) + ',' + Math.round(g + (t[1] - g) * a) + ',' + Math.round(b + (t[2] - b) * a) + ')'; cc.set(key, v); return v;
  }
  function stopsFor(color) {
    if (color === '#aab3bf') return [[0, '#f6f9fc'], [0.25, '#c4ccd6'], [0.5, '#8a94a1'], [0.75, '#b4bcc7'], [1, '#5d6672']];
    if (color === '#d9a935') return [[0, '#fff3b0'], [0.28, '#e8c04e'], [0.55, '#a77a1c'], [0.8, '#d9a935'], [1, '#8a6212']];
    return [[0, mixc(color, 0.12)], [0.5, color], [1, mixc(color, -0.16)]];
  }
  function linGrad(ctx, color, bb) {
    const key = color + '|' + bb.map(v => Math.round(v * 25)).join(','); let g = gc.get(key); if (g) return g;
    if (gc.size > 4000) gc.clear();
    g = ctx.createLinearGradient(bb[0], bb[1], bb[2], bb[3]); for (const [o, c] of stopsFor(color)) g.addColorStop(o, c); gc.set(key, g); return g;
  }
  function radGrad(ctx, color, rx, ry) {
    const key = 'r' + color + '|' + Math.round(rx * 60) + '|' + Math.round(ry * 60); let g = gc.get(key); if (g) return g;
    if (gc.size > 4000) gc.clear();
    const R = Math.max(rx, ry); g = ctx.createRadialGradient(-rx * 0.38, -ry * 0.42, 0, 0, 0, R * 1.18);
    if (color === '#aab3bf' || color === '#d9a935') { for (const [o, c] of stopsFor(color)) g.addColorStop(Math.min(1, o), c); }
    else { g.addColorStop(0, mixc(color, 0.18)); g.addColorStop(0.45, color); g.addColorStop(1, mixc(color, -0.22)); }
    gc.set(key, g); return g;
  }
  function ln(ctx, w) { ctx.lineWidth = Math.max(0.03, (w || 0.02) * 1.35); ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function paint(ctx, color, lw) {
    const bb = BB || DEFBB; BB = null;
    ctx.fillStyle = (QUAL && isHex(color)) ? linGrad(ctx, color, bb) : color; ctx.fill(); ln(ctx, lw); ctx.stroke();
  }
  function ell(ctx, x, y, rx, ry, color, rot, lw) {
    if (!QUAL || !isHex(color)) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); BB = null; ctx.fillStyle = color; ctx.fill(); ln(ctx, lw); ctx.stroke(); return; }
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, rot || 0, 0, TAU);
    ctx.fillStyle = radGrad(ctx, color, rx, ry); ctx.fill(); ln(ctx, lw); ctx.stroke(); ctx.restore();
  }
  function bboxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, Math.max(x1, x0 + 0.02), Math.max(y1, y0 + 0.02)]; }
  function poly(ctx, pts, color, lw) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); BB = bboxOf(pts); paint(ctx, color, lw); }
  function rrect(ctx, x, y, w, h, r, color, lw) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); BB = [x, y, x + Math.max(w, 0.02), y + Math.max(h, 0.02)]; paint(ctx, color, lw);
  }
  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = OL; ctx.lineWidth = w + 0.06; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    if (QUAL && isHex(color)) {
      const L = Math.hypot(x2 - x1, y2 - y1) || 1; let nx = -(y2 - y1) / L, ny = (x2 - x1) / L; if (nx + ny > 0) { nx = -nx; ny = -ny; }
      const o = w * 0.24; ctx.lineWidth = w * 0.3; ctx.strokeStyle = mixc(color, 0.2); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x1 + nx * o, y1 + ny * o); ctx.lineTo(x2 + nx * o, y2 + ny * o); ctx.stroke();
      ctx.strokeStyle = mixc(color, -0.22); ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(x1 - nx * o * 1.1, y1 - ny * o * 1.1); ctx.lineTo(x2 - nx * o * 1.1, y2 - ny * o * 1.1); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  function hatch(ctx, x, y, w, h, n) {
    ctx.save(); ctx.strokeStyle = 'rgba(43,27,16,.24)'; ctx.lineWidth = 0.011; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < (n || 5); i++) { const px = x + w * (i / ((n || 5) - 1 || 1)); ctx.moveTo(px, y + h); ctx.lineTo(px + w * 0.16, y + h * 0.45); } ctx.stroke(); ctx.restore();
  }
  function mlimb(ctx, x1, y1, x2, y2, w, base) {
    limb(ctx, x1, y1, x2, y2, w, base || C.mail);
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L, n = Math.max(2, Math.round(L / 0.055));
    ctx.fillStyle = C.mailD; ctx.beginPath();
    for (let i = 1; i < n; i++) { const t = i / n, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t; for (const s of [-0.24, 0.24]) { const ax = px + nx * w * s, ay = py + ny * w * s; ctx.moveTo(ax + 0.011, ay); ctx.arc(ax, ay, 0.011, 0, TAU); } }
    ctx.fill();
  }
  /* kitöltés + láncing-pontozás egy tetszőleges útvonalra */
  function mailShape(ctx, pathFn, bbox_, base) {
    const bbox = bbox_;
    ctx.save(); ctx.beginPath(); pathFn(); ctx.fillStyle = (QUAL && isHex(base || C.mail)) ? linGrad(ctx, base || C.mail, bbox_) : (base || C.mail); ctx.fill(); ctx.clip();
    ctx.fillStyle = C.mailD; ctx.beginPath();
    for (let y = bbox[1]; y < bbox[3]; y += 0.055) for (let x = bbox[0] + (((y * 18) | 0) & 1) * 0.027; x < bbox[2]; x += 0.055) { ctx.moveTo(x + 0.011, y); ctx.arc(x, y, 0.011, 0, TAU); }
    ctx.fill(); ctx.restore(); ctx.beginPath(); pathFn(); ln(ctx); ctx.stroke();
  }
  function hand(ctx, x, y, ang, skin, sc) {
    sc = sc || 1; ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-0.03 * sc, -0.045 * sc); ctx.lineTo(0.06 * sc, -0.04 * sc); ctx.lineTo(0.2 * sc, -0.012 * sc); ctx.lineTo(0.2 * sc, 0.012 * sc); ctx.lineTo(0.07 * sc, 0.045 * sc); ctx.lineTo(0.06 * sc, 0.075 * sc); ctx.lineTo(-0.03 * sc, 0.05 * sc); ctx.closePath(); paint(ctx, skin, 0.016);
    ctx.restore();
  }
  function goldEdge(ctx, pts, w) { ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = w || 0.02; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore(); }
  function armAng(e, rest) {
    const a = e.atk || 0;
    if (a <= 0.001) return rest;
    if (a < 0.4) return rest + (-2.3 - rest) * (a / 0.4);
    if (a < 0.55) return -2.3 + 2.6 * ((a - 0.4) / 0.15);
    return 0.3 + (rest - 0.3) * ((a - 0.55) / 0.45);
  }
  function glint(ctx, e, x, y) {
    const a = e.atk || 0;
    if (a > 0.45 && a < 0.65) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x, y, 0.09, 0, TAU); ctx.fill(); }
  }
  function blade(ctx, x, y, ang, len, w, e) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    poly(ctx, [[0, -w], [len, -w * 0.8], [len + w * 3, 0], [len, w * 0.8], [0, w]], '#4a505c', 0.02);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(0.03, -w * 0.3); ctx.lineTo(len, -w * 0.3); ctx.stroke();
    rrect(ctx, -0.015, -w * 3.2, 0.05, w * 6.4, 0.015, C.gold, 0.02); ell(ctx, -0.06, 0, 0.04, 0.04, C.gold, 0, 0.02);
    ctx.restore(); if (e) glint(ctx, e, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }
  const STEEL = '#aab3bf', STEEL_D = '#6f7782';
  function traits(e) {
    if (e._tr) return e._tr;
    let sd = Math.floor((e.ph || 0.37) * 100000) % 2147483646 + 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const pk = a => a[Math.floor(r() * a.length)];
    e._tr = { sep: 0.9 + r() * 0.3, nose: 0.85 + r() * 0.75, stache: r() < 0.4 ? pk(['#6b4a2a', '#2b1b10', '#c9772e', '#b9a98a']) : null, scar: r() < 0.25, patch: r() < 0.1,
      freckles: r() < 0.3, teeth: r() < 0.3, wart: r() < 0.1, rednose: r() < 0.2, bigEars: r() < 0.3, helm: Math.floor(r() * 3), brow: r(), hairC: pk(['#b9873a', '#6b4a2a', '#2b1b10', '#c9772e', '#d8cdb0']) };
    return e._tr;
  }
  const sway = (e, a) => Math.sin((e.T || 0) * 2.2 + e.ph) * (a || 0.012);
  function crownGfx(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const [fx, fy, k] of [[-0.27, -0.4, 0.8], [0, -0.52, 1], [0.27, -0.4, 0.8]]) {
      poly(ctx, [[fx - 0.05, -0.1], [fx, fy + 0.1], [fx + 0.05, -0.1]], C.gold, 0.025);
      for (const [dx, dy] of [[-0.07, 0.03], [0.07, 0.03], [0, -0.05], [0, 0.04]]) ell(ctx, fx + dx * k, fy + dy * k, 0.065 * k, 0.065 * k, '#f0cc55', 0, 0.025);
    }
    rrect(ctx, -0.34, -0.14, 0.68, 0.16, 0.04, C.gold, 0.025);
    for (const [gx, gc] of [[-0.2, '#2a6fb0'], [0, '#c22'], [0.2, '#2a8a4a']]) ell(ctx, gx, -0.06, 0.035, 0.035, gc, 0, 0.018);
    ctx.restore();
  }

  /* ---------- arc ---------- */
  function face(ctx, e, x, y, r, o) {
    o = o || {}; const t = e.T || 0, skin = e.skin || SKINS[0];
    let ex = e.expr || 'idle';
    if (e.hurt > 0.01) ex = 'pain'; else if (e.atk > 0.01 && e.atk < 0.95) ex = 'angry';
    if (e.state === 'dead' || e.state === 'ash') ex = 'dead';
    const burnt = e.burn > 0.5;
    if (o.coif) mailShape(ctx, () => { ctx.ellipse(x - r * 0.05, y + r * 0.08, r * 1.3, r * 1.32, 0, 0, TAU); }, [x - r * 1.4, y - r * 1.4, x + r * 1.4, y + r * 1.5], burnt ? '#3a3330' : C.mail);
    const tr = o.tr || {}, earK = tr.bigEars ? 1.6 : 1;
    for (const sd of [-1, 1]) ell(ctx, x + sd * r * 0.84, y + r * 0.08, r * 0.16 * earK, r * 0.24 * earK, burnt ? '#3a2f2a' : skin, 0, 0.016);
    ell(ctx, x, y, r * 0.86, r, burnt ? '#3a2f2a' : skin, 0, 0.02);
    if (!burnt) { ctx.fillStyle = 'rgba(206,60,44,.72)'; ctx.beginPath(); ctx.arc(x - r * 0.4, y + r * 0.3, r * 0.2, 0, TAU); ctx.arc(x + r * 0.46, y + r * 0.3, r * 0.2, 0, TAU); ctx.fill(); }
    if (o.hair && !o.coif) { ctx.fillStyle = o.hair; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = Math.PI * 1.05 + i * 0.5; ctx.moveTo(x + Math.cos(a) * r * 0.95 + r * 0.22, y + Math.sin(a) * r * 1.0); ctx.arc(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 1.0, r * 0.22, 0, TAU); } ctx.fill(); ln(ctx, 0.016); ctx.stroke(); }
    const ey = y - r * 0.1, ed = r * 0.36 * (tr.sep || 1), er = r * 0.17, lk = (e.look || 0) * r * 0.06 + r * 0.07;
    const blink = ((t * 0.6 + e.ph * 3) % 5) < 0.09;
    ln(ctx, 0.018);
    if (ex === 'dead') {
      for (const s of [-1, 1]) { const cx = x + s * ed + r * 0.05, d = er * 0.7; ctx.beginPath(); ctx.moveTo(cx - d, ey - d); ctx.lineTo(cx + d, ey + d); ctx.moveTo(cx + d, ey - d); ctx.lineTo(cx - d, ey + d); ctx.stroke(); }
    } else if (ex === 'cheer' || ex === 'laugh') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * ed + r * 0.05, ey + er * 0.5, er * 1.1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    } else if (blink) {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * ed - er, ey); ctx.lineTo(x + s * ed + er, ey); ctx.stroke(); }
    } else {
      const wide = ex === 'pain' ? 1.35 : 1;
      for (const s of [-1, 1]) {
        const cx = x + s * ed + r * 0.04;
        ctx.beginPath(); ctx.ellipse(cx, ey, er * 1.05 * wide, er * 0.7 * wide, 0, 0, TAU); paint(ctx, '#fffdf4', 0.016);
        ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(cx + lk, ey + (ex === 'pain' ? 0 : er * 0.04), er * (ex === 'pain' ? 0.3 : 0.42), 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx + lk - er * 0.14, ey - er * 0.14, er * 0.12, 0, TAU); ctx.fill();
      }
    }
    // szemöldök
    ln(ctx, 0.02);
    const by = ey - er * (ex === 'pain' ? 2.2 : 1.7);
    for (const s of [-1, 1]) {
      const cx = x + s * ed + r * 0.04; ctx.beginPath();
      if (ex === 'angry') { ctx.moveTo(cx - s * er * 1.3, by - er * 0.6); ctx.lineTo(cx + s * er * 0.9, by + er * 0.7); }
      else if (ex === 'pain') { ctx.moveTo(cx - s * er * 1.1, by + er * 0.5); ctx.quadraticCurveTo(cx, by - er * 0.6, cx + s * er * 1.1, by - er * 0.3); }
      else if (o.stern) { ctx.moveTo(cx - s * er * 1.3, by - er * 0.6); ctx.lineTo(cx + s * er * 1.0, by + er * 0.25); }
      else { ctx.moveTo(cx - er * 1.1, by + er * 0.1); ctx.quadraticCurveTo(cx, by - er * 0.5 - (tr.brow || 0) * er * 0.6, cx + er * 1.1, by + er * 0.2 + (tr.brow || 0) * er * 0.5); }
      ctx.stroke();
    }
    // hosszú, ívelt orr
    const nr = o.nose || 1; ln(ctx, 0.02);
    ctx.beginPath(); ctx.moveTo(x + r * 0.06, y - r * 0.08); ctx.quadraticCurveTo(x + r * 0.34 * nr, y + r * 0.2, x + r * 0.2 * nr, y + r * 0.36 * nr); ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.4 * nr, x + r * 0.0, y + r * 0.34 * nr); ctx.stroke();
    if (o.rednose) { ctx.fillStyle = 'rgba(214,84,64,.7)'; ctx.beginPath(); ctx.arc(x + r * 0.2 * nr, y + r * 0.32 * nr, r * 0.12, 0, TAU); ctx.fill(); }
    // száj
    const my = y + r * 0.62; ln(ctx, 0.02);
    if (ex === 'pain' || ex === 'dead') {
      ctx.beginPath(); ctx.ellipse(x + r * 0.08, my, r * 0.17, r * (ex === 'pain' ? 0.24 : 0.16), 0, 0, TAU); paint(ctx, '#5a1010', 0.016);
      if (ex === 'dead') { ctx.fillStyle = '#d9574f'; ctx.beginPath(); ctx.ellipse(x + r * 0.12, my + r * 0.28, r * 0.1, r * 0.2, 0, 0, TAU); ctx.fill(); ln(ctx, 0.014); ctx.stroke(); }
    } else if (ex === 'angry') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.25, my); ctx.lineTo(x + r * 0.35, my - r * 0.04); ctx.stroke();
      ctx.fillStyle = '#fff'; for (let i = -1; i <= 2; i++) ctx.fillRect(x + i * r * 0.1 - r * 0.02, my, r * 0.08, r * 0.08);
    } else if (ex === 'cheer' || ex === 'laugh') {
      ctx.beginPath(); ctx.arc(x + r * 0.05, my - r * 0.1, r * 0.3, 0.05, Math.PI - 0.05); ctx.closePath(); paint(ctx, '#6a1414', 0.016);
    } else if (o.stern) { ctx.beginPath(); ctx.moveTo(x - r * 0.18, my); ctx.lineTo(x + r * 0.34, my - r * 0.03); ctx.stroke();
    } else if (o.tongue || Math.sin(t * 1.3 + e.ph * 5) > 0.94) {
      ctx.beginPath(); ctx.arc(x + r * 0.05, my - r * 0.12, r * 0.24, 0.1, Math.PI - 0.1); ctx.stroke();
      ell(ctx, x + r * 0.1, my + r * 0.16, r * 0.1, r * 0.17, '#d9574f', 0, 0.015);
    } else {
      ctx.beginPath(); ctx.moveTo(x - r * 0.12, my); ctx.quadraticCurveTo(x + r * 0.1, my + r * 0.12, x + r * 0.34, my - r * 0.06); ctx.stroke();
      if (o.teeth) rrect(ctx, x + r * 0.04, my + r * 0.04, r * 0.14, r * 0.17, 0.01, '#fffdf4', 0.012);
    }
    if (o.beard) { ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + r * 0.1); ctx.quadraticCurveTo(x - r * 0.95, y + r * 1.25, x + r * 0.05, y + r * 1.45); ctx.quadraticCurveTo(x + r * 0.95, y + r * 1.25, x + r * 0.8, y + r * 0.1); ctx.quadraticCurveTo(x + r * 0.5, y + r * 0.7, x, y + r * 0.62); ctx.quadraticCurveTo(x - r * 0.5, y + r * 0.7, x - r * 0.8, y + r * 0.1); paint(ctx, o.beard); ln(ctx, 0.012); ctx.strokeStyle = 'rgba(43,27,16,.5)'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.2, y + r * 0.8); ctx.lineTo(x + i * r * 0.22, y + r * 1.25); ctx.stroke(); } }
    if (tr.freckles) { ctx.fillStyle = 'rgba(150,80,40,.7)'; ctx.beginPath(); for (const [dx, dy] of [[-0.5, 0.25], [-0.35, 0.38], [-0.28, 0.22], [0.4, 0.3], [0.5, 0.2], [0.3, 0.4]]) { ctx.moveTo(x + dx * r + 0.01, y + dy * r); ctx.arc(x + dx * r, y + dy * r, 0.01, 0, TAU); } ctx.fill(); }
    if (tr.scar) { ln(ctx, 0.022); ctx.strokeStyle = '#b3443a'; ctx.beginPath(); ctx.moveTo(x + r * 0.28, y - r * 0.42); ctx.lineTo(x + r * 0.58, y + r * 0.45); ctx.stroke(); ctx.lineWidth = 0.012; for (const k of [0.0, 0.3, 0.6]) { ctx.beginPath(); ctx.moveTo(x + r * (0.35 + k * 0.2) - 0.03, y + r * (-0.2 + k * 0.5)); ctx.lineTo(x + r * (0.35 + k * 0.2) + 0.03, y + r * (-0.2 + k * 0.5)); ctx.stroke(); } }
    if (tr.stache) { ell(ctx, x - r * 0.12, y + r * 0.5, r * 0.3, r * 0.09, tr.stache, 0.25, 0.014); ell(ctx, x + r * 0.36, y + r * 0.5, r * 0.3, r * 0.09, tr.stache, -0.25, 0.014); }
    if (tr.patch) { const px = x + ed + r * 0.04; ln(ctx, 0.018); ctx.strokeStyle = '#2b1b10'; ctx.beginPath(); ctx.moveTo(px, ey); ctx.lineTo(x - r * 0.8, y - r * 0.45); ctx.moveTo(px, ey); ctx.lineTo(x + r * 0.85, y - r * 0.5); ctx.stroke(); ell(ctx, px, ey, er * 1.25, er * 1.15, '#1a120c', 0, 0.015); }
    if (o.wart) { ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(x + r * 0.5, y + r * 0.5, r * 0.07, 0, TAU); ctx.fill(); }
  }
  function head(ctx, e, x, y, r, o) {
    if (e.headless) { ell(ctx, x, y + r * 0.85, r * 0.4, r * 0.18, '#b11212', 0, 0.02); ell(ctx, x, y + r * 0.85, r * 0.18, r * 0.08, '#6a0808', 0, 0.01); return false; }
    face(ctx, e, x, y, r, o); return true;
  }

  /* ---------- harcos (gyalog / király / lovas törzse) ---------- */
  function legs(ctx, e, s, hip, th, armor) {
    const mv = e.mv || 0, wp = e.wp || 0, kick = e.kick || 0;
    for (const k of [-1, 1]) {
      const ph = wp + (k > 0 ? Math.PI : 0), dx = Math.sin(ph) * 0.11 * mv * s, lift = Math.max(0, Math.cos(ph)) * 0.07 * mv * s;
      const hx = k * 0.07 * s; let fx = k * 0.1 * s + dx, fy = -0.04 - lift, kx, ky;
      if (k > 0 && kick > 0) { fx = fx + (0.42 * s - fx) * kick; fy = fy + (hip + 0.12 - fy) * kick; }
      kx = (hx + fx) / 2 + 0.06 * s * (1 + kick); ky = (hip + fy) / 2 + (k > 0 && kick > 0 ? -0.05 : 0);
      mlimb(ctx, hx, hip, kx, ky, 0.085 * s); mlimb(ctx, kx, ky, fx, fy - 0.03, 0.075 * s);
      if (armor) { limb(ctx, kx + (fx - kx) * 0.12, ky + (fy - 0.03 - ky) * 0.12, fx - (fx - kx) * 0.05, fy - 0.06, 0.092 * s, STEEL); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(kx + 0.02, ky + 0.06); ctx.lineTo(fx + 0.02, fy - 0.1); ctx.stroke(); }
      ell(ctx, kx, ky, 0.058 * s, 0.058 * s, armor ? STEEL : '#9db3c8', 0, 0.016);
      poly(ctx, [[fx - 0.06, fy - 0.1], [fx - 0.07, fy + 0.01], [fx + 0.3 * s, fy + 0.01], [fx + 0.08, fy - 0.08]], th.trim === '#9aa0b4' ? C.leather : th.trim, 0.02);
    }
  }
  function soldier(ctx, e, th, o) {
    const s = o.s || 1, hip = -0.5 * s, shy = -0.93 * s, b = sway(e), hr = (o.hr || 0.15) * s;
    const tr = traits(e); if (!o.noLegs) legs(ctx, e, s, hip, th, o.armor);
    ctx.save(); ctx.translate(0, b); ctx.rotate((e.atk > 0.3 && e.atk < 0.7) ? 0.1 : 0);
    if (o.cape) {
      poly(ctx, [[-0.14 * s, shy], [-0.52 * s, hip + 0.2], [-0.24 * s, hip + 0.16], [0.08, hip + 0.02]], o.cape === true ? th.dark : o.cape, 0.02);
      if (o.ermine) { ctx.strokeStyle = '#fffdf4'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.52 * s, hip + 0.2); ctx.lineTo(-0.24 * s, hip + 0.16); ctx.stroke(); ctx.fillStyle = '#2b1b10'; for (const t of [0.1, 0.4, 0.7]) { ctx.beginPath(); ctx.ellipse(-0.52 * s + 0.28 * s * t, hip + 0.2 - 0.04 * t, 0.012, 0.025, 0, 0, TAU); ctx.fill(); } }
    }
    // pajzs (hátul, bal kéz)
    // törzs: címeres felsőruha
    const bel = o.belly || 0, w = 0.2 * s;
    ctx.beginPath(); ctx.moveTo(-w, shy); ctx.lineTo(w, shy);
    ctx.bezierCurveTo(w + 0.04 + bel, shy + 0.2 * s, w + 0.05 + bel, hip - 0.1, w + 0.06, hip + 0.1 * s);
    ctx.lineTo(-w - 0.06, hip + 0.1 * s); ctx.bezierCurveTo(-w - 0.04, hip - 0.1, -w - 0.02, shy + 0.2 * s, -w, shy); ctx.closePath(); paint(ctx, th.main);
    ctx.strokeStyle = 'rgba(43,27,16,.35)'; ctx.lineWidth = 0.015; for (const fx of [-0.07, 0.04]) { ctx.beginPath(); ctx.moveTo(fx * s, hip - 0.18); ctx.quadraticCurveTo(fx * s + 0.02, hip, fx * s - 0.01, hip + 0.1 * s); ctx.stroke(); }
    goldEdge(ctx, [[-0.1 * s, shy + 0.01], [0.01, shy + 0.17 * s], [0.12 * s, shy + 0.01]], 0.022); goldEdge(ctx, [[-w - 0.06, hip + 0.1 * s], [w + 0.06, hip + 0.1 * s]], 0.022);
    hatch(ctx, 0.02 * s, shy + 0.12 * s, w * 0.9, hip - shy - 0.18 * s, 4);
    rrect(ctx, -w - 0.03, hip - 0.07 * s, 2 * w + 0.07, 0.07 * s, 0.015, th.trim, 0.018); ell(ctx, 0.02, hip - 0.035 * s, 0.035, 0.035, C.gold, 0, 0.015);
    if (o.emblem) o.emblem(ctx, th, s);
    if (o.armor) { ell(ctx, 0.01, shy + 0.0, 0.14 * s, 0.055 * s, STEEL, 0, 0.018); }
    if (o.collar) { ell(ctx, 0.01, shy + 0.02, 0.21 * s, 0.08 * s, '#fffdf4', 0, 0.018); ctx.fillStyle = '#2b1b10'; for (const dx of [-0.13, -0.04, 0.05, 0.14]) { ctx.beginPath(); ctx.ellipse(0.01 + dx * s, shy + 0.04, 0.012, 0.028, 0, 0, TAU); ctx.fill(); } }
    // nyakvédő
    // fej
    const hy = shy - hr * 1.05;
    if (head(ctx, e, 0.01, hy, hr, { coif: true, tr: o.stern ? { sep: 1 } : tr, stern: o.stern, nose: o.stern ? 1.15 : tr.nose, teeth: o.stern ? false : tr.teeth, beard: o.beard, rednose: o.stern ? false : tr.rednose, wart: o.stern ? false : tr.wart })) { if (o.hat) o.hat(ctx, 0.01, hy, hr, th, e, tr); }
    // bal kar: pajzs / hátra
    const sx0 = -0.16 * s, sy0 = shy + 0.05;
    limb(ctx, sx0, sy0, sx0 - 0.1 * s, sy0 + 0.25 * s * (o.shield ? 0.7 : 1), 0.095 * s, th.sleeve || C.mail);
    if (o.shield) { ctx.save(); ctx.translate(sx0 - 0.15 * s, sy0 + 0.22 * s); poly(ctx, [[-0.16, -0.18], [0.16, -0.18], [0.16, 0.04], [0, 0.3], [-0.16, 0.04]], th.main, 0.022); ctx.fillStyle = th.trim; ctx.fillRect(-0.03, -0.16, 0.06, 0.4); ctx.fillRect(-0.12, -0.06, 0.24, 0.06); ln(ctx, 0.015); ctx.strokeRect(-0.03, -0.16, 0.06, 0.4); ctx.restore(); }
    else ell(ctx, sx0 - 0.1 * s, sy0 + 0.27 * s, 0.05, 0.05, o.armor ? STEEL : e.skin, 0, 0.015);
    if (o.leftItem) o.leftItem(ctx, sx0 - 0.1 * s, sy0 + 0.27 * s, th);
    // jobb kar + fegyver
    const ang = armAng(e, 1.1), sx = 0.17 * s, sy = shy + 0.05, L = 0.28 * s, hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.095 * s, th.sleeve || C.mail); ell(ctx, hx, hy2, 0.058, 0.058, o.armor ? STEEL : e.skin, 0, 0.015);
    if (o.armor) { for (const [px, py] of [[sx, sy + 0.0], [-sx - 0.02, sy]]) { ell(ctx, px, py, 0.105 * s, 0.075 * s, STEEL, 0, 0.018); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.arc(px, py, 0.07 * s, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); } }
    blade(ctx, hx, hy2, ang - (o.sword ? 0.55 : 0.12), o.sword ? 0.55 : 0.24, o.sword ? 0.035 : 0.028, e);
    ctx.restore();
  }
  function helm(ctx, x, y, r, v, th) {
    const dome = (rad, yy) => { ctx.beginPath(); ctx.arc(x, yy, rad, Math.PI, TAU); ctx.lineTo(x + rad, yy + r * 0.12); ctx.lineTo(x - rad, yy + r * 0.12); ctx.closePath(); paint(ctx, STEEL); };
    if (v === 0) { dome(r * 1.12, y - r * 0.28); rrect(ctx, x + r * 0.02, y - r * 0.2, r * 0.14, r * 0.95, 0.01, STEEL_D, 0.016); rrect(ctx, x - r * 1.14, y - r * 0.4, r * 2.28, r * 0.1, 0.01, th.trim, 0.014); }
    else if (v === 1) { dome(r * 0.85, y - r * 0.4); ctx.beginPath(); ctx.ellipse(x, y - r * 0.28, r * 1.5, r * 0.22, 0, 0, TAU); paint(ctx, STEEL); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.75, r * 0.5, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); }
    else {
      const cap = th.main === '#f3ecd4' ? th.sleeve : th.main;
      ctx.fillStyle = '#e0a830'; ctx.beginPath(); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.moveTo(x + sd * r * 1.0 + r * 0.22, y + i * r * 0.32); ctx.arc(x + sd * r * 1.0, y + i * r * 0.32, r * 0.22, 0, TAU); } ctx.fill(); ln(ctx, 0.014); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 1.02, Math.PI * 1.02, TAU * 0.995); ctx.lineTo(x + r * 1.0, y - r * 0.5); ctx.lineTo(x - r * 1.0, y - r * 0.5); ctx.closePath(); paint(ctx, cap);
      rrect(ctx, x - r * 1.08, y - r * 0.62, r * 2.16, r * 0.34, r * 0.1, '#fffdf0', 0.016); ctx.fillStyle = '#6a5a4a'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(x - r * 0.9 + i * r * 0.3, y - r * 0.45, r * 0.04, r * 0.08, 0, 0, TAU); ctx.fill(); }
      poly(ctx, [[x + r * 0.5, y - r * 1.2], [x + r * 1.5, y - r * 1.0], [x + r * 1.1, y - r * 0.7]], cap, 0.016);
    }
  }

  function drawPawn(ctx, e, th) {
    soldier(ctx, e, th, { s: 1, armor: true, hat: (c, x, y, r, t2, ee, tr) => helm(c, x, y, r, tr.helm, t2), emblem: (c, t, s) => { ctx.fillStyle = t.trim; ctx.beginPath(); ctx.arc(0.02, -0.78, 0.045, 0, TAU); ctx.fill(); ln(ctx, 0.014); ctx.stroke(); } });
    ctx.save(); ctx.translate(-0.24, -0.62); ell(ctx, 0, 0, 0.1, 0.14, '#b79563', 0.3, 0.02); ctx.restore();
  }
  function drawKing(ctx, e, th) {
    soldier(ctx, e, th, { s: 1.2, belly: 0.05, sword: true, armor: true, stern: true, cape: '#a8281f', ermine: true, collar: true, beard: '#b98a3a',
      hat: (c, x, y, r) => { crownGfx(c, x + 0.02, y - r * 1.08, 0.58); if (e.crown) { c.strokeStyle = 'rgba(255,230,120,.95)'; c.lineWidth = 0.05; c.beginPath(); c.ellipse(x, y - r * 3.1, 0.24, 0.06, 0, 0, TAU); c.stroke(); } },
      leftItem: (c, hx, hy) => { limb(c, hx, hy + 0.3, hx, hy - 0.55, 0.035, C.gold); ell(c, hx, hy - 0.62, 0.075, 0.075, C.gold, 0, 0.02); ell(c, hx, hy - 0.62, 0.03, 0.03, '#c22', 0, 0.012); c.fillStyle = C.gold; c.fillRect(hx - 0.015, hy - 0.76, 0.03, 0.1); c.fillRect(hx - 0.05, hy - 0.73, 0.1, 0.03); },
      emblem: (c, t, s) => { c.fillStyle = t.accent; c.fillRect(-0.03, -0.98, 0.06, 0.36); c.fillRect(-0.11, -0.86, 0.22, 0.06); ln(c, 0.014); c.strokeRect(-0.03, -0.98, 0.06, 0.36); } });
  }

  function drawKnight(ctx, e, th) {
    const t = e.T || 0, mv = e.mv || 0, gal = Math.sin((e.wp || 0)) * 0.12 * mv, b = sway(e, 0.015);
    const horse = '#d8cdb4', horseD = '#9d9078';
    // lábak
    for (const [lx, ph] of [[-0.3, 0], [-0.18, 2], [0.22, 1], [0.34, 3]]) { const dx = Math.sin((e.wp || 0) + ph) * 0.1 * mv; limb(ctx, lx, -0.38, lx + dx, -0.03, 0.06, horseD); poly(ctx, [[lx + dx - 0.04, -0.06], [lx + dx + 0.05, -0.06], [lx + dx + 0.06, 0.0], [lx + dx - 0.05, 0.0]], '#4a3a2a', 0.016); }
    // farok
    ctx.beginPath(); ctx.moveTo(-0.38, -0.5); ctx.quadraticCurveTo(-0.62, -0.5 + Math.sin(t * 3 + e.ph) * 0.05, -0.55, -0.1); ctx.quadraticCurveTo(-0.45, -0.35, -0.36, -0.4); paint(ctx, '#a89878', 0.02);
    // test
    ell(ctx, 0, -0.48 + b, 0.42, 0.2, horse, 0, 0.022);
    // nyereg-takaró
    ctx.beginPath(); ctx.moveTo(-0.34, -0.66 + b); ctx.lineTo(0.3, -0.66 + b); ctx.lineTo(0.4, -0.2 + b); ctx.lineTo(-0.44, -0.2 + b); ctx.closePath(); paint(ctx, th.main, 0.02);
    ctx.fillStyle = th.trim; ctx.fillRect(-0.43, -0.3 + b, 0.82, 0.07); ctx.fillStyle = th.accent; for (const dx of [-0.3, -0.1, 0.1, 0.3]) { ctx.beginPath(); ctx.arc(dx, -0.265 + b, 0.018, 0, TAU); ctx.fill(); }
    // nyak + fej (kimeredt szemű)
    ctx.beginPath(); ctx.moveTo(0.28, -0.6); ctx.quadraticCurveTo(0.5, -0.78, 0.5, -1.0 + gal * 0.3); ctx.lineTo(0.66, -0.98); ctx.quadraticCurveTo(0.58, -0.62, 0.38, -0.38); ctx.closePath(); paint(ctx, horse, 0.02);
    ctx.strokeStyle = '#a07a3a'; ctx.lineWidth = 0.05; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(0.3 + i * 0.045, -0.7 - i * 0.07); ctx.quadraticCurveTo(0.2 + i * 0.03, -0.64 - i * 0.07, 0.24 + i * 0.03, -0.58 - i * 0.07); } ctx.stroke();
    ctx.save(); ctx.translate(0.6, -1.02 + gal * 0.3); ctx.rotate(0.35 + Math.sin(t * 4 + e.ph) * 0.05);
    ell(ctx, 0, 0, 0.13, 0.1, horse, 0, 0.02); ell(ctx, 0.14, 0.04, 0.12, 0.075, '#e6dcc4', 0, 0.02);
    ell(ctx, 0.19, 0.03, 0.012, 0.016, OL, 0, 0.008);
    ctx.beginPath(); ctx.moveTo(-0.08, -0.1); ctx.quadraticCurveTo(0.14, -0.14, 0.26, 0.0); ctx.lineTo(0.12, 0.02); ctx.quadraticCurveTo(0.02, 0.0, -0.08, 0.02); ctx.closePath(); ctx.globalAlpha = 0.9; paint(ctx, STEEL, 0.016); ctx.globalAlpha = 1;
    poly(ctx, [[-0.06, -0.08], [-0.02, -0.22], [0.03, -0.08]], horse, 0.018);
    ell(ctx, 0.02, -0.02, 0.05, 0.05, '#fffdf4', 0, 0.015); ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(0.035 + (e.look || 0) * 0.01, -0.02, 0.014, 0, TAU); ctx.fill(); // „elképedt" szem
    rrect(ctx, 0.17, 0.07, 0.035, 0.07, 0.008, '#fffdf4', 0.012); rrect(ctx, 0.215, 0.07, 0.035, 0.07, 0.008, '#fffdf4', 0.012);
    ctx.restore();
    // lovas
    ctx.save(); ctx.translate(-0.02, -0.12 + b);
    mlimb(ctx, 0.02, -0.5, 0.16, -0.24, 0.085); poly(ctx, [[0.1, -0.26], [0.1, -0.2], [0.4, -0.2], [0.2, -0.3]], th.trim === '#9aa0b4' ? C.leather : th.trim, 0.018);
    soldier(ctx, e, th, { s: 1, noLegs: true, sword: true, armor: true, hat: (c, x, y, r) => {
      c.beginPath(); c.moveTo(x - r * 1.15, y + r * 0.2); c.quadraticCurveTo(x - r * 1.2, y - r * 1.9, x + r * 0.05, y - r * 2.0); c.quadraticCurveTo(x + r * 1.2, y - r * 1.8, x + r * 1.15, y + r * 0.2); c.lineTo(x + r * 0.95, y - r * 0.55); c.quadraticCurveTo(x, y - r * 0.95, x - r * 0.95, y - r * 0.55); c.closePath(); paint(c, STEEL, 0.02);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.014; c.beginPath(); c.arc(x - r * 0.2, y - r * 1.1, r * 0.8, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
      for (const sd of [-1, 1]) poly(c, [[x + sd * r * 1.15, y + r * 0.2], [x + sd * r * 0.95, y + r * 1.0], [x + sd * r * 0.7, y + r * 0.2]], STEEL, 0.016);
      poly(c, [[x - 0.02, y - r * 1.95], [x - 0.22 + Math.sin(t * 3) * 0.03, y - r * 2.9], [x + 0.02, y - r * 2.4], [x + 0.16, y - r * 3.0], [x + 0.1, y - r * 1.85]], th.accent, 0.016); } });
    ctx.restore();
  }

  function drawBishop(ctx, e, th) {
    const b = sway(e, 0.015);
    for (const k of [-1, 1]) { const dx = Math.sin((e.wp || 0) + (k > 0 ? 3.1 : 0)) * 0.09 * (e.mv || 0); poly(ctx, [[k * 0.1 + dx - 0.06, -0.08], [k * 0.1 + dx - 0.06, 0.0], [k * 0.1 + dx + 0.22, 0.0], [k * 0.1 + dx + 0.05, -0.08]], C.leather, 0.018); }
    ctx.save(); ctx.translate(0, b);
    // csuha
    ctx.beginPath(); ctx.moveTo(-0.17, -1.0); ctx.bezierCurveTo(-0.44, -0.6, -0.42, -0.2, -0.32, -0.05); ctx.lineTo(0.32, -0.05); ctx.bezierCurveTo(0.44, -0.2, 0.46, -0.6, 0.17, -1.0); ctx.closePath(); paint(ctx, th.dark === '#1d1a2b' ? th.main : th.dark);
    ctx.fillStyle = th.main; ctx.beginPath(); ctx.moveTo(-0.17, -1.0); ctx.lineTo(0.17, -1.0); ctx.lineTo(0.1, -0.1); ctx.lineTo(-0.1, -0.1); ctx.closePath(); ctx.fill(); ln(ctx, 0.016); ctx.stroke();
    ctx.fillStyle = th.accent; ctx.fillRect(-0.025, -0.95, 0.05, 0.85); ctx.fillRect(-0.1, -0.78, 0.2, 0.04);
    ctx.strokeStyle = th.trim; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.38, -0.5); ctx.quadraticCurveTo(0, -0.38, 0.4, -0.5); ctx.stroke(); goldEdge(ctx, [[-0.32, -0.05], [0.32, -0.05]], 0.03);
    const hy = -1.17, hr = 0.17;
    // glória
    ctx.beginPath(); ctx.arc(0.02, hy - 0.02, hr * 1.9, 0, TAU); ctx.fillStyle = '#e6bb44'; ctx.fill(); ln(ctx, 0.016); ctx.stroke();
    ctx.strokeStyle = 'rgba(156,114,24,.8)'; ctx.lineWidth = 0.01; for (let i = 0; i < 16; i++) { const a = i * TAU / 16; ctx.beginPath(); ctx.moveTo(0.02 + Math.cos(a) * hr * 1.2, hy - 0.02 + Math.sin(a) * hr * 1.2); ctx.lineTo(0.02 + Math.cos(a) * hr * 1.85, hy - 0.02 + Math.sin(a) * hr * 1.85); ctx.stroke(); }
    const btr = traits(e); if (head(ctx, e, 0.02, hy, hr, { tr: btr, beard: ['#d8d0c0', '#8a6a3a', '#3a2a1a'][Math.floor(btr.brow * 2.99)], nose: btr.nose * 1.1, rednose: btr.rednose })) {
      // püspöksüveg
      poly(ctx, [[-0.16, hy - hr * 0.7], [0.02, hy - 0.62], [0.2, hy - hr * 0.7], [0.17, hy - hr * 0.45], [-0.13, hy - hr * 0.45]], th.main, 0.02);
      poly(ctx, [[-0.16, hy - hr * 0.7], [0.02, hy - 0.62], [0.02, hy - hr * 0.45], [-0.13, hy - hr * 0.45]], th.light, 0.0);
      ln(ctx, 0.02); ctx.beginPath(); ctx.moveTo(-0.16, hy - hr * 0.7); ctx.lineTo(0.02, hy - 0.62); ctx.lineTo(0.2, hy - hr * 0.7); ctx.stroke();
      rrect(ctx, -0.14, hy - hr * 0.6, 0.32, 0.05, 0.01, th.accent, 0.016);
      ctx.fillStyle = th.accent; ctx.fillRect(0.0, hy - 0.5, 0.04, 0.14); ctx.fillRect(-0.04, hy - 0.45, 0.12, 0.04);
    }
    // páncélozott harcos-püspök: nyakvért, vállvért, láncujj
    ell(ctx, 0.02, -1.0, 0.16, 0.055, STEEL, 0, 0.018);
    mlimb(ctx, -0.18, -0.9, -0.34, -0.66, 0.085); ell(ctx, -0.36, -0.63, 0.055, 0.055, STEEL, 0, 0.015); ell(ctx, -0.17, -0.93, 0.1, 0.07, STEEL, 0, 0.018);
    // bal kéz: csirkecomb
    ell(ctx, -0.46, -0.72, 0.06, 0.09, '#c98a4a', 0.6, 0.018); limb(ctx, -0.42, -0.66, -0.37, -0.63, 0.03, '#f3ecd2');
    // jobb kéz: pásztorbot
    const ang = armAng(e, 1.2), sx = 0.18, sy = -0.9, L = 0.28, hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    mlimb(ctx, sx, sy, hx, hy2, 0.085); ell(ctx, sx, sy - 0.02, 0.1, 0.07, STEEL, 0, 0.018);
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang < 0.6 ? ang - Math.PI / 2 + 0.2 : -0.05);
    limb(ctx, 0, 0.65, 0, -0.7, 0.045, C.wood);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0.1, -0.7, 0.1, Math.PI, TAU * 0.9, false); ctx.stroke(); ln(ctx, 0.012); ctx.stroke();
    ctx.restore(); ell(ctx, hx, hy2, 0.058, 0.058, STEEL, 0, 0.015); glint(ctx, e, hx + Math.cos(ang) * 0.3, hy2 + Math.sin(ang) * 0.3 - 0.2);
    ctx.restore();
  }

  function drawRook(ctx, e, th) {
    const t = e.T || 0, shake = e.atk > 0.2 && e.atk < 0.8 ? Math.sin(t * 60) * 0.015 : 0;
    ctx.save(); ctx.translate(shake, 0);
    for (const [px, off] of [[-0.18, 0], [0.18, 1.7]]) {
      const ph = ((t * 0.6 + off + e.ph) % 2.4) / 2.4, up = Math.min(1, ph * 4) * (ph < 0.85 ? 1 : (1 - ph) * 6.6), gy = -1.08 - 0.13 * up, thr = ph > 0.3 && ph < 0.55;
      ctx.save(); ctx.beginPath(); ctx.rect(px - 0.2, -1.5, 0.4, 0.5); ctx.clip();
      const mtr = traits({ ph: off + e.ph * 3 }); face(ctx, { skin: e.skin, ph: off, T: t, expr: thr ? 'angry' : 'idle', look: 0 }, px, gy, 0.1, { coif: true, tr: mtr });
      ctx.beginPath(); ctx.arc(px, gy - 0.03, 0.115, Math.PI, TAU); ctx.lineTo(px + 0.115, gy - 0.0); ctx.lineTo(px - 0.115, gy - 0.0); ctx.closePath(); paint(ctx, STEEL, 0.016); if (mtr.helm === 1) { rrect(ctx, px - 0.15, gy - 0.05, 0.3, 0.035, 0.01, STEEL, 0.014); } else { rrect(ctx, px + 0.0, gy - 0.03, 0.025, 0.1, 0.005, STEEL_D, 0.012); }
      mlimb(ctx, px + 0.08, gy + 0.1, px + 0.16, thr ? gy - 0.16 : gy + 0.04, 0.04);
      ctx.restore();
      if (thr) { const k = (ph - 0.3) / 0.25; ell(ctx, px + 0.18 + k * 0.7, gy - 0.1 - Math.sin(k * Math.PI) * 0.35 + k * 0.3, 0.04, 0.04, k > 0.5 ? '#c33' : '#777', 0, 0.015); }
    }
    ctx.beginPath(); ctx.moveTo(-0.38, 0); ctx.lineTo(0.38, 0); ctx.lineTo(0.31, -0.98); ctx.lineTo(-0.31, -0.98); ctx.closePath(); paint(ctx, '#c9b98e');
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(70,45,20,.4)'; ctx.lineWidth = 0.014;
    for (let y = -0.08; y > -1; y -= 0.13) { ctx.beginPath(); ctx.moveTo(-0.4, y); ctx.lineTo(0.4, y); ctx.stroke(); const off = (Math.round(y * 10) & 1) ? 0.09 : 0; for (let x = -0.34 + off; x < 0.4; x += 0.18) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 0.13); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(70,45,20,.18)'; ctx.fillRect(0.1, -1, 0.3, 1.1); ctx.restore();
    ctx.strokeStyle = OL; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(-0.38, 0); ctx.lineTo(0.38, 0); ctx.lineTo(0.31, -0.98); ctx.lineTo(-0.31, -0.98); ctx.closePath(); ctx.stroke();
    poly(ctx, [[-0.35, -0.6], [0.35, -0.6], [0.33, -0.72], [-0.33, -0.72]], th.main, 0.02);
    ctx.fillStyle = th.trim; for (let i = -3; i <= 3; i++) ctx.fillRect(i * 0.1 - 0.02, -0.7, 0.04, 0.08);
    ctx.beginPath(); ctx.moveTo(-0.12, 0); ctx.lineTo(-0.12, -0.25); ctx.arc(0, -0.25, 0.12, Math.PI, TAU); ctx.lineTo(0.12, 0); ctx.closePath(); paint(ctx, C.woodD);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.02; for (const y of [-0.1, -0.22]) { ctx.beginPath(); ctx.moveTo(-0.12, y); ctx.lineTo(0.12, y); ctx.stroke(); }
    if (Math.sin(t * 0.9 + e.ph * 2) > 0.7) { ell(ctx, 0, -0.25, 0.04, 0.03, '#fffdf4', 0, 0.012); ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(0.012, -0.25, 0.013, 0, TAU); ctx.fill(); }
    rrect(ctx, -0.035, -0.55, 0.07, 0.22, 0.03, '#1a120c', 0.018);
    ctx.beginPath(); ctx.moveTo(-0.4, -0.98); ctx.lineTo(-0.4, -1.12);
    for (let i = 0; i < 3; i++) { const x0 = -0.4 + i * 0.27; ctx.lineTo(x0, -1.12); ctx.lineTo(x0 + 0.14, -1.12); ctx.lineTo(x0 + 0.14, -1.04); ctx.lineTo(x0 + 0.27, -1.04); }
    ctx.lineTo(0.41, -0.98); ctx.closePath(); paint(ctx, '#d5c79c');
    const fw = Math.sin(t * 5 + e.ph) * 0.045;
    limb(ctx, 0, -1.1, 0, -1.55, 0.022, C.woodD);
    ctx.beginPath(); ctx.moveTo(0.01, -1.54); ctx.quadraticCurveTo(0.18, -1.5 + fw, 0.32, -1.46 + fw * 1.4); ctx.lineTo(0.26, -1.4 + fw); ctx.lineTo(0.32, -1.34 + fw * 1.4); ctx.quadraticCurveTo(0.18, -1.36 + fw, 0.01, -1.34); ctx.closePath(); paint(ctx, th.main, 0.02);
    ctx.restore();
  }

  function drawQueen(ctx, e, th) {
    const b = sway(e, 0.015);
    for (const k of [-1, 1]) { const dx = Math.sin((e.wp || 0) + (k > 0 ? 3.1 : 0)) * 0.09 * (e.mv || 0); poly(ctx, [[k * 0.1 + dx - 0.05, -0.07], [k * 0.1 + dx - 0.05, 0.0], [k * 0.1 + dx + 0.2, 0.0], [k * 0.1 + dx + 0.05, -0.07]], C.gold, 0.018); }
    ctx.save(); ctx.translate(0, b);
    // uszályos köpeny (hermelin szegéllyel)
    poly(ctx, [[-0.14, -1.05], [-0.5, -0.05], [-0.1, -0.02], [0.1, -0.5]], th.dark === '#1d1a2b' ? '#3a2a5a' : '#a8281f', 0.02);
    ctx.strokeStyle = '#fffdf4'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.5, -0.05); ctx.lineTo(-0.1, -0.02); ctx.stroke(); ctx.fillStyle = '#2b1b10'; for (const k of [0.15, 0.45, 0.75]) { ctx.beginPath(); ctx.ellipse(-0.5 + 0.4 * k, -0.045 + 0.03 * k, 0.012, 0.025, 0, 0, TAU); ctx.fill(); }
    // díszes ruha
    poly(ctx, [[-0.16, -1.05], [0.16, -1.05], [0.4, -0.04], [-0.4, -0.04]], th.main, 0.022); hatch(ctx, 0.0, -0.9, 0.38, 0.8, 6);
    ctx.strokeStyle = 'rgba(43,27,16,.35)'; ctx.lineWidth = 0.015; for (const x of [-0.18, -0.06, 0.07, 0.19]) { ctx.beginPath(); ctx.moveTo(x * 0.6, -0.6); ctx.quadraticCurveTo(x, -0.35, x * 1.5, -0.06); ctx.stroke(); }
    ctx.strokeStyle = C.gold; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.38, -0.08); ctx.lineTo(0.38, -0.08); ctx.stroke();
    ctx.fillStyle = C.gold; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 0.1, -0.08, 0.018, 0, TAU); ctx.fill(); }
    poly(ctx, [[-0.16, -1.05], [0.16, -1.05], [0.13, -0.88], [-0.13, -0.88]], th.light, 0.018); goldEdge(ctx, [[-0.15, -1.04], [0, -0.86], [0.15, -1.04]], 0.02);
    rrect(ctx, -0.17, -0.82, 0.34, 0.06, 0.015, C.gold, 0.016);
    ctx.fillStyle = th.accent; ctx.beginPath(); ctx.moveTo(0, -0.74); ctx.lineTo(0.03, -0.7); ctx.lineTo(0, -0.34); ctx.lineTo(-0.03, -0.7); ctx.closePath(); ctx.fill(); ln(ctx, 0.012); ctx.stroke();
    // hermelin vállgallér + drágakő nyaklánc
    ell(ctx, 0.0, -1.02, 0.2, 0.07, '#fffdf4', 0, 0.018); ctx.fillStyle = '#2b1b10'; for (const dx of [-0.13, -0.04, 0.05, 0.14]) { ctx.beginPath(); ctx.ellipse(dx, -1.0, 0.011, 0.026, 0, 0, TAU); ctx.fill(); }
    for (const [gx, gc] of [[-0.06, '#2a6fb0'], [0.0, '#c22'], [0.06, '#2a8a4a']]) ell(ctx, gx, -0.93 + Math.abs(gx) * 0.5, 0.025, 0.025, gc, 0, 0.012);
    // bal kar: hosszú ujj
    poly(ctx, [[-0.16, -1.0], [-0.34, -0.7], [-0.5, -0.5], [-0.48, -0.38], [-0.3, -0.5], [-0.12, -0.8]], th.sleeve, 0.02); goldEdge(ctx, [[-0.5, -0.5], [-0.48, -0.38]], 0.03); hand(ctx, -0.47, -0.4, 2.2, e.skin);
    // fej: fátyol, korona
    const hy = -1.22, hr = 0.16;
    if (head(ctx, e, 0.02, hy, hr, { tr: { sep: 1, freckles: false }, stern: true, nose: 1.0 })) {
      ctx.beginPath(); ctx.moveTo(-0.2, hy + 0.38); ctx.quadraticCurveTo(-0.27, hy - 0.2, 0.0, hy - hr * 1.12); ctx.quadraticCurveTo(0.27, hy - 0.2, 0.23, hy + 0.38); ctx.quadraticCurveTo(0.19, hy - 0.02, 0.1, hy - hr * 0.55); ctx.quadraticCurveTo(0.02, hy - hr * 0.85, -0.1, hy - hr * 0.5); ctx.quadraticCurveTo(-0.18, hy - 0.02, -0.2, hy + 0.38); paint(ctx, '#e8e0f0', 0.018);
      crownGfx(ctx, 0.03, hy - hr * 0.98, 0.5);
      if (e.crown) { ctx.strokeStyle = 'rgba(255,230,120,.95)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.ellipse(0.03, hy - 0.55, 0.22, 0.055, 0, 0, TAU); ctx.stroke(); }
    }
    // jobb kar: jogar-buzogány
    const ang = armAng(e, 1.1), sx = 0.16, sy = -1.0, L = 0.3, hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    poly(ctx, [[sx - 0.02, sy - 0.04], [hx, hy2 - 0.07], [hx + 0.14, hy2 + 0.1], [hx - 0.02, hy2 + 0.1], [sx + 0.04, sy + 0.06]], th.sleeve, 0.02); goldEdge(ctx, [[hx + 0.14, hy2 + 0.1], [hx - 0.02, hy2 + 0.1]], 0.03); hand(ctx, hx, hy2, ang * 0.3, e.skin, 0.7);
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang + 0.2); limb(ctx, -0.1, 0, 0.5, 0, 0.04, C.gold); ell(ctx, 0.56, 0, 0.09, 0.09, C.gold, 0, 0.02); ell(ctx, 0.56, 0, 0.035, 0.035, '#c22', 0, 0.012); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; poly(ctx, [[0.56 + Math.cos(a - 0.2) * 0.08, Math.sin(a - 0.2) * 0.08], [0.56 + Math.cos(a) * 0.14, Math.sin(a) * 0.14], [0.56 + Math.cos(a + 0.2) * 0.08, Math.sin(a + 0.2) * 0.08]], C.gold, 0.014); } ctx.restore();
    glint(ctx, e, hx + Math.cos(ang + 0.2) * 0.56, hy2 + Math.sin(ang + 0.2) * 0.56);
    ctx.restore();
  }

  const DRAW = { P: drawPawn, N: drawKnight, B: drawBishop, R: drawRook, Q: drawQueen, K: drawKing };
  function piece(ctx, e) {
    const th = e.burn > 0.55 ? Object.assign({}, CHAR) : e.theme;
    DRAW[e.type](ctx, e, th);
  }

  /* ---------- tömeg és szereplők ---------- */
  function crowd(ctx, c, t) {
    const e = { T: t, ph: c.seed * 6.28, skin: c.skin, expr: c.cheer > 0 ? 'cheer' : (c.expr || 'idle'), look: c.look || 0 };
    const bob = Math.sin(t * 3 + c.seed * 10) * 0.025 + (c.cheer > 0 ? Math.abs(Math.sin(t * 9 + c.seed * 7)) * 0.12 : 0);
    ctx.save(); ctx.translate(0, -bob);
    poly(ctx, [[-0.26, 0], [0.26, 0], [0.22, -0.6], [-0.22, -0.6]], c.cloth, 0.022);
    ctx.fillStyle = 'rgba(43,27,16,.22)'; ctx.fillRect(-0.26, -0.1, 0.52, 0.1);
    ctx.strokeStyle = c.hatC; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.22, -0.28); ctx.lineTo(0.22, -0.28); ctx.stroke();
    const hy = -0.82, r = 0.2, h = c.hat;
    face(ctx, e, 0, hy, r, { coif: h === 'coif', nose: 1 + (c.seed * 7 % 1) * 0.6, teeth: c.seed > 0.7, rednose: c.seed < 0.35, hair: (h === 'bald' || h === 'band') ? '#b9873a' : null });
    if (h === 'straw') { ell(ctx, 0, hy - 0.12, 0.34, 0.07, '#d9bd6a', 0, 0.02); ctx.beginPath(); ctx.ellipse(0, hy - 0.16, 0.16, 0.12, 0, Math.PI, TAU); paint(ctx, '#e6cc7e'); }
    else if (h === 'cap') { ctx.beginPath(); ctx.ellipse(0, hy - 0.1, 0.22, 0.15, 0, Math.PI, TAU); paint(ctx, c.hatC); poly(ctx, [[0.02, hy - 0.1], [0.3, hy - 0.06], [0.24, hy - 0.02], [0.02, hy - 0.04]], c.hatC, 0.018); }
    else if (h === 'hood') { ctx.beginPath(); ctx.arc(0, hy, r * 1.3, Math.PI * 0.85, TAU * 1.07); ctx.lineTo(r * 1.2, hy + 0.14); ctx.lineTo(-r * 1.2, hy + 0.14); ctx.closePath(); ctx.globalCompositeOperation = 'destination-over'; paint(ctx, c.hatC); ctx.globalCompositeOperation = 'source-over'; }
    else if (h === 'band') { rrect(ctx, -r * 0.9, hy - 0.16, r * 1.8, 0.06, 0.02, c.hatC, 0.016); }
    const arm = c.cheer > 0 ? Math.sin(t * 10 + c.seed * 9) * 0.3 : 0;
    for (const s of [-1, 1]) { const hx = s * (0.36 + arm * 0.3), hyy = c.cheer > 0 ? -1.0 + s * arm * 0.3 : -0.24; limb(ctx, s * 0.22, -0.52, hx, hyy, 0.085, c.cloth); ell(ctx, hx, hyy - 0.02, 0.05, 0.05, c.skin, 0, 0.015); }
    if (c.prop === 'mug' && !(c.cheer > 0)) { rrect(ctx, 0.3, -0.34, 0.1, 0.14, 0.02, '#c9923a', 0.018); ell(ctx, 0.35, -0.34, 0.06, 0.025, '#fffdf4', 0, 0.012); }
    if (c.prop === 'fork') { limb(ctx, 0.42, 0.0, 0.42, -1.25, 0.03, C.wood); poly(ctx, [[0.34, -1.25], [0.5, -1.25], [0.5, -1.4], [0.46, -1.32], [0.42, -1.4], [0.38, -1.32], [0.34, -1.4]], '#6f7782', 0.018); }
    if (c.prop === 'torch') { limb(ctx, 0.4, -0.1, 0.4, -0.85, 0.04, C.wood); const f = Math.sin(t * 12 + c.seed * 5) * 0.03; ctx.fillStyle = '#ffb52e'; ctx.beginPath(); ctx.ellipse(0.4, -0.97, 0.07 + f, 0.13, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8481f'; ctx.beginPath(); ctx.ellipse(0.4, -0.93, 0.04, 0.08, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  /* állatok: kimeredt szemű oroszlán (kutya helyett), „derp" macska, malac, tyúk */
  function animal(ctx, a, t) {
    const w = Math.sin(t * 10 + a.seed * 6) * a.mv;
    if (a.kind === 'dog') { // sörényes, ijedt oroszlán
      for (const x of [-0.24, -0.12, 0.14, 0.26]) limb(ctx, x, -0.24, x + w * 0.06 * (x > 0 ? 1 : -1), 0, 0.06, '#9a7040');
      ell(ctx, 0, -0.32, 0.34, 0.18, '#a67a46', 0, 0.02);
      limb(ctx, -0.3, -0.34, -0.46, -0.52 + Math.sin(t * 14) * 0.04, 0.045, '#a67a46'); ell(ctx, -0.48, -0.55, 0.05, 0.05, '#7a5430', 0, 0.015);
      ctx.fillStyle = '#7a5430'; ctx.beginPath(); for (let i = 0; i < 9; i++) { const ang = Math.PI * 0.6 + i * 0.55; ctx.moveTo(0.32 + Math.cos(ang) * 0.2 + 0.08, -0.5 + Math.sin(ang) * 0.2); ctx.arc(0.32 + Math.cos(ang) * 0.2, -0.5 + Math.sin(ang) * 0.2, 0.08, 0, TAU); } ctx.fill(); ln(ctx, 0.016); ctx.stroke();
      ell(ctx, 0.34, -0.5, 0.15, 0.14, '#b98a52', 0, 0.02); ell(ctx, 0.44, -0.46, 0.08, 0.06, '#d9bf90', 0, 0.015);
      for (const ex of [0.3, 0.4]) { ell(ctx, ex, -0.55, 0.035, 0.035, '#fffdf4', 0, 0.012); ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(ex, -0.55, 0.01, 0, TAU); ctx.fill(); }
      if (a.eat) { ctx.fillStyle = '#b11'; ctx.beginPath(); ctx.arc(0.48, -0.38, 0.06, 0, TAU); ctx.fill(); }
    } else if (a.kind === 'cat') {
      for (const x of [-0.16, -0.06, 0.1, 0.2]) limb(ctx, x, -0.18, x + w * 0.05, 0, 0.05, '#efeadb');
      ell(ctx, 0, -0.26, 0.26, 0.14, '#f2eee2', 0, 0.018);
      ctx.beginPath(); ctx.moveTo(-0.24, -0.3); ctx.quadraticCurveTo(-0.5, -0.4 + Math.sin(t * 6) * 0.05, -0.4, -0.62); ctx.strokeStyle = OL; ctx.lineWidth = 0.075; ctx.stroke(); ctx.strokeStyle = '#d9d2c0'; ctx.lineWidth = 0.05; ctx.stroke();
      ell(ctx, 0.26, -0.42, 0.13, 0.12, '#f2eee2', 0, 0.018); poly(ctx, [[0.17, -0.5], [0.2, -0.64], [0.27, -0.52]], '#f2eee2', 0.015); poly(ctx, [[0.28, -0.52], [0.34, -0.64], [0.37, -0.48]], '#f2eee2', 0.015);
      for (const ex of [0.22, 0.31]) { ell(ctx, ex, -0.44, 0.03, 0.035, '#fffdf4', 0, 0.01); ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(ex + 0.005, -0.44, 0.01, 0, TAU); ctx.fill(); }
      ell(ctx, 0.3, -0.35, 0.025, 0.04, '#d9574f', 0, 0.01);
    } else if (a.kind === 'pig') {
      for (const x of [-0.22, -0.1, 0.12, 0.24]) limb(ctx, x, -0.2, x + w * 0.05, 0, 0.07, '#e9a0a0');
      ell(ctx, 0, -0.3, 0.34, 0.2, '#f0aaaa', 0, 0.02);
      ctx.strokeStyle = OL; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.arc(-0.38, -0.32, 0.06, 0, TAU * 0.8); ctx.stroke();
      ell(ctx, 0.32, -0.34, 0.16, 0.14, '#f3b0b0', 0, 0.02); ell(ctx, 0.46, -0.31, 0.07, 0.06, '#e48a8a', 0, 0.015); ell(ctx, 0.3, -0.38, 0.025, 0.03, OL, 0, 0.008);
      poly(ctx, [[0.22, -0.46], [0.3, -0.56], [0.34, -0.45]], '#e48a8a', 0.018);
    } else {
      limb(ctx, -0.04, -0.14, -0.04 + w * 0.04, 0, 0.025, '#d98b2b'); limb(ctx, 0.05, -0.14, 0.05 - w * 0.04, 0, 0.025, '#d98b2b');
      ell(ctx, 0, -0.22, 0.16, 0.12, '#f4efe4', 0, 0.018); poly(ctx, [[-0.14, -0.26], [-0.28, -0.36], [-0.14, -0.14]], '#e0d6bd', 0.015);
      ell(ctx, 0.14, -0.36, 0.07, 0.07, '#f4efe4', 0, 0.018); poly(ctx, [[0.2, -0.38], [0.27, -0.35], [0.2, -0.33]], '#e8a020', 0.012); ell(ctx, 0.14, -0.43, 0.03, 0.03, '#d33', 0, 0.01); ell(ctx, 0.16, -0.37, 0.012, 0.012, OL, 0, 0.005);
    }
  }

  function skeleton(ctx, s, t) {
    const d = Math.sin(t * 8 + s.seed), mv = s.mv === undefined ? 1 : s.mv, bone = '#a9714a', vein = '#ecd9bd';
    ctx.save(); ctx.translate(0, -Math.abs(d) * 0.05);
    for (const k of [-1, 1]) { limb(ctx, k * 0.08, -0.5, k * 0.1 + d * 0.1 * k * mv, -0.02, 0.07, bone); poly(ctx, [[k * 0.1 + d * 0.1 * k * mv - 0.05, -0.05], [k * 0.1 + d * 0.1 * k * mv + 0.2, -0.0], [k * 0.1 + d * 0.1 * k * mv - 0.05, 0.0]], bone, 0.016); }
    limb(ctx, 0, -0.5, 0, -0.95, 0.08, bone);
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = OL; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(-0.17, -0.62 - i * 0.1); ctx.lineTo(0.17, -0.62 - i * 0.1); ctx.stroke(); ctx.strokeStyle = bone; ctx.lineWidth = 0.05; ctx.stroke(); ctx.strokeStyle = vein; ctx.lineWidth = 0.01; ctx.stroke(); }
    ell(ctx, 0, -0.45, 0.14, 0.07, bone, 0, 0.018);
    limb(ctx, -0.17, -0.9, -0.34, -0.7 + d * 0.15, 0.05, bone); limb(ctx, 0.17, -0.9, 0.34, -1.2 - d * 0.1, 0.05, bone);
    poly(ctx, [[-0.2, -0.45], [0.2, -0.45], [0.26, -0.12], [0.08, -0.2], [-0.1, -0.1], [-0.24, -0.2]], '#5a4a3a', 0.016);
    ell(ctx, 0, -1.12, 0.19, 0.2, bone, 0, 0.02); rrect(ctx, -0.11, -1.0, 0.22, 0.1, 0.03, bone, 0.02);
    ell(ctx, -0.07, -1.14, 0.06, 0.065, '#1a0f08', 0, 0.01); ell(ctx, 0.07, -1.14, 0.06, 0.065, '#1a0f08', 0, 0.01);
    poly(ctx, [[0, -1.08], [-0.02, -1.03], [0.02, -1.03]], '#1a0f08', 0.01);
    ctx.strokeStyle = OL; ctx.lineWidth = 0.015; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 0.04, -1.0); ctx.lineTo(i * 0.04, -0.94); ctx.stroke(); }
    if (s.scythe) { limb(ctx, 0.34, 0.1, 0.38, -1.5, 0.04, C.wood); ctx.beginPath(); ctx.moveTo(0.38, -1.5); ctx.quadraticCurveTo(0.0, -1.65, -0.25, -1.3); ctx.quadraticCurveTo(0.0, -1.5, 0.38, -1.42); ctx.closePath(); paint(ctx, '#cfd4da', 0.022); }
    ctx.restore();
  }

  function doctor(ctx, s, t) {
    const w = Math.sin(t * 6 + s.seed) * (s.mv || 0);
    limb(ctx, -0.08, -0.4, -0.08 + w * 0.08, -0.02, 0.08, '#1a1512'); limb(ctx, 0.08, -0.4, 0.08 - w * 0.08, -0.02, 0.08, '#1a1512');
    poly(ctx, [[-0.2, -1.0], [0.2, -1.0], [0.34, -0.1], [-0.34, -0.1]], '#241c18', 0.02);
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(0, -0.15); ctx.stroke();
    limb(ctx, 0.2, -0.9, 0.42, -0.6, 0.07, '#241c18'); limb(ctx, 0.42, -0.6, 0.42, 0.0, 0.03, C.wood);
    ell(ctx, 0, -1.12, 0.17, 0.17, '#241c18', 0, 0.02);
    ell(ctx, -0.06, -1.14, 0.045, 0.045, '#e8d8a0', 0, 0.015); ell(ctx, 0.06, -1.14, 0.045, 0.045, '#e8d8a0', 0, 0.015);
    ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.arc(-0.06, -1.14, 0.015, 0, TAU); ctx.arc(0.06, -1.14, 0.015, 0, TAU); ctx.fill();
    poly(ctx, [[-0.04, -1.12], [0.04, -1.12], [0.0, -0.88]], '#c9b074', 0.022);
    ctx.beginPath(); ctx.ellipse(0, -1.26, 0.25, 0.05, 0, 0, TAU); paint(ctx, '#241c18', 0.02); ctx.beginPath(); ctx.ellipse(0, -1.3, 0.14, 0.09, 0, Math.PI, TAU); paint(ctx, '#241c18', 0.02);
  }

  /* Hóhér: izmos, szőrös felsőtest, fekete csuklya szemnyílással, véres bőrkötény, kétkezes szakállas bárd.
     s.raise (0/1) és s.swing (-0.25 = a feje fölött hátra, 0.85 = lesújtott) a bárd szöge; két csontos kar-IK. */
  function ik(sx, sy, hx, hy, l1, l2, bend) {
    let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1e-3; const mx = l1 + l2 - 1e-3;
    if (d > mx) { hx = sx + dx / d * mx; hy = sy + dy / d * mx; dx = hx - sx; dy = hy - sy; d = mx; }
    const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    return { ex: sx + Math.cos(a + bend * c) * l1, ey: sy + Math.sin(a + bend * c) * l1, hx, hy };
  }
  function executioner(ctx, s, t) {
    const skin = '#d59a73', skinD = '#a8694a', hood = '#17131a', leather = '#5a3520', breathe = Math.sin(t * 2.4) * 0.008;
    const a = s.raise ? -2.3 + (s.swing || 0) * 3.2 : (s.carry ? -2.0 : 1.15), pvx = 0.04, pvy = -1.08 + breathe;
    const dirx = Math.cos(a), diry = Math.sin(a), grip = r => [pvx + dirx * r, pvy + diry * r];
    const [h1x, h1y] = grip(s.raise ? 0.5 : 0.42), [h2x, h2y] = grip(s.raise ? 0.32 : 0.24);
    // lábak: bőrnadrág, csizma
    const st = s.mv ? Math.sin(t * 9) * 0.07 : 0;
    for (const [lx, sw] of [[-0.13, st], [0.13, -st]]) { limb(ctx, lx, -0.6, lx + sw, -0.05, 0.15, '#2e2620'); rrect(ctx, lx + sw - 0.09, -0.2, 0.18, 0.2, 0.03, '#1d140e', 0.02); ell(ctx, lx + sw + 0.04, -0.02, 0.14, 0.05, '#1d140e', 0, 0.018); }
    // hátsó kar (a bárd alsó fogása)
    { const k = ik(-0.22, pvy + 0.02, h2x, h2y, 0.33, 0.31, -1); limb(ctx, -0.22, pvy + 0.02, k.ex, k.ey, 0.14, skinD); limb(ctx, k.ex, k.ey, k.hx, k.hy, 0.12, skinD); limb(ctx, k.ex + (k.hx - k.ex) * 0.35, k.ey + (k.hy - k.ey) * 0.35, k.hx, k.hy, 0.13, '#3a2416'); ell(ctx, k.hx, k.hy, 0.07, 0.065, skinD, 0, 0.016); }
    // törzs: széles váll, sörhas
    ctx.beginPath(); ctx.moveTo(-0.36, pvy); ctx.quadraticCurveTo(0, pvy - 0.07, 0.38, pvy); ctx.quadraticCurveTo(0.44, -0.8, 0.36, -0.62); ctx.quadraticCurveTo(0.3, -0.5, 0, -0.5); ctx.quadraticCurveTo(-0.3, -0.5, -0.33, -0.62); ctx.quadraticCurveTo(-0.4, -0.85, -0.36, pvy); ctx.closePath(); BB = [-0.4, pvy, 0.44, -0.5]; paint(ctx, skin, 0.022);
    ctx.strokeStyle = 'rgba(110,50,30,.55)'; ctx.lineWidth = 0.014; ctx.beginPath(); ctx.moveTo(-0.24, -0.92); ctx.quadraticCurveTo(-0.08, -0.84, -0.01, -0.9); ctx.moveTo(0.26, -0.92); ctx.quadraticCurveTo(0.1, -0.84, 0.03, -0.9); ctx.moveTo(0.0, -0.84); ctx.lineTo(0.0, -0.62); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,10,.55)'; ctx.lineWidth = 0.008; ctx.beginPath(); for (let i = 0; i < 16; i++) { const hx = -0.16 + (i % 8) * 0.045, hy = -0.98 + ((i * 37) % 30) / 100; ctx.moveTo(hx, hy); ctx.lineTo(hx + 0.012, hy + 0.025); } ctx.stroke();
    // öv + bőrkötény, rajta vér
    rrect(ctx, -0.36, -0.64, 0.72, 0.08, 0.02, '#1d140e', 0.02); rrect(ctx, -0.05, -0.645, 0.1, 0.09, 0.015, '#c9a43a', 0.014);
    ctx.beginPath(); ctx.moveTo(-0.3, -0.58); ctx.lineTo(0.31, -0.58); ctx.lineTo(0.27, -0.16); ctx.quadraticCurveTo(0, -0.12, -0.26, -0.16); ctx.closePath(); BB = [-0.3, -0.58, 0.31, -0.12]; paint(ctx, leather, 0.02);
    ctx.fillStyle = 'rgba(120,8,8,.8)'; ctx.beginPath(); ctx.ellipse(0.08, -0.4, 0.07, 0.05, 0.4, 0, TAU); ctx.ellipse(-0.12, -0.28, 0.04, 0.03, 0, 0, TAU); ctx.ellipse(0.16, -0.22, 0.03, 0.05, 0, 0, TAU); ctx.fill();
    ctx.fillRect(0.075, -0.4, 0.014, 0.12); ctx.fillRect(0.155, -0.22, 0.01, 0.07);
    // a bárd: nyél + szakállas penge (a penge éle a lesújtás irányába néz)
    ctx.save(); ctx.translate(pvx, pvy); ctx.rotate(a);
    limb(ctx, 0.05, 0, 1.32, 0, 0.06, '#6b4423'); ctx.strokeStyle = 'rgba(40,20,5,.4)'; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(0.2, -0.008); ctx.lineTo(1.2, -0.01); ctx.stroke();
    rrect(ctx, 1.05, -0.1, 0.2, 0.18, 0.03, '#4a4f58', 0.02);
    ctx.beginPath(); ctx.moveTo(1.06, 0.06); ctx.lineTo(1.24, 0.06); ctx.quadraticCurveTo(1.36, 0.24, 1.46, 0.5); ctx.quadraticCurveTo(1.26, 0.7, 0.9, 0.62); ctx.quadraticCurveTo(1.0, 0.32, 1.06, 0.06); ctx.closePath(); BB = [0.9, 0.06, 1.46, 0.7]; paint(ctx, '#aab3bf', 0.02);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(1.43, 0.5); ctx.quadraticCurveTo(1.25, 0.66, 0.93, 0.6); ctx.stroke();
    ctx.fillStyle = 'rgba(150,10,10,' + (s.bloody ? 0.85 : 0.35) + ')'; ctx.beginPath(); ctx.ellipse(1.22, 0.55, 0.12, 0.05, -0.2, 0, TAU); ctx.fill();
    poly(ctx, [[1.1, -0.1], [1.2, -0.1], [1.15, -0.26]], '#5d6672', 0.016);
    ctx.restore();
    // elülső kar
    { const k = ik(0.3, pvy + 0.02, h1x, h1y, 0.34, 0.32, -1); limb(ctx, 0.3, pvy + 0.02, k.ex, k.ey, 0.16, skin); ell(ctx, (0.3 + k.ex) / 2, (pvy + k.ey) / 2, 0.1, 0.075, skin, Math.atan2(k.ey - pvy, k.ex - 0.3), 0.012); limb(ctx, k.ex, k.ey, k.hx, k.hy, 0.13, skin); limb(ctx, k.ex + (k.hx - k.ex) * 0.35, k.ey + (k.hy - k.ey) * 0.35, k.hx, k.hy, 0.145, '#3a2416'); ell(ctx, k.hx, k.hy, 0.075, 0.07, skin, 0, 0.016); }
    // csuklya: hegyes, a vállra omló gallérral
    ctx.beginPath(); ctx.moveTo(-0.3, pvy + 0.02); ctx.quadraticCurveTo(-0.27, pvy - 0.1, -0.15, pvy - 0.15); ctx.lineTo(-0.14, pvy - 0.36); ctx.quadraticCurveTo(-0.11, pvy - 0.52, 0.02, pvy - 0.55); ctx.lineTo(-0.01, pvy - 0.68); ctx.quadraticCurveTo(0.16, pvy - 0.52, 0.16, pvy - 0.36); ctx.lineTo(0.17, pvy - 0.15); ctx.quadraticCurveTo(0.29, pvy - 0.1, 0.32, pvy + 0.02); ctx.quadraticCurveTo(0, pvy + 0.07, -0.3, pvy + 0.02); ctx.closePath(); BB = [-0.3, pvy - 0.68, 0.32, pvy + 0.07]; paint(ctx, hood, 0.022);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.09, pvy - 0.5); ctx.quadraticCurveTo(-0.12, pvy - 0.34, -0.09, pvy - 0.2); ctx.stroke();
    const look = s.look || 0.03, blink = ((t * 0.5) % 4) < 0.08;
    for (const ex of [-0.04, 0.09]) { ctx.fillStyle = '#0a0708'; ctx.beginPath(); ctx.ellipse(ex + look, pvy - 0.37, 0.045, 0.028, 0, 0, TAU); ctx.fill(); if (!blink) { ctx.fillStyle = '#efe2cf'; ctx.beginPath(); ctx.ellipse(ex + look, pvy - 0.37, 0.03, 0.016, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a0a06'; ctx.beginPath(); ctx.arc(ex + look + 0.01, pvy - 0.37, 0.011, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = '#0a0708'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.01 + look, pvy - 0.25); ctx.quadraticCurveTo(0.03 + look, pvy - 0.23, 0.07 + look, pvy - 0.25); ctx.stroke();
  }
  /* vérfoltos hasítótuskó (s.blood: 0..1) és fejeskosár (s.heads: hány fej van benne) */
  function block(ctx, s) {
    rrect(ctx, -0.34, -0.44, 0.68, 0.44, 0.06, '#7a5030', 0.022);
    ctx.strokeStyle = 'rgba(40,20,5,.5)'; ctx.lineWidth = 0.014; ctx.beginPath(); for (const x of [-0.22, -0.06, 0.12, 0.25]) { ctx.moveTo(x, -0.4); ctx.lineTo(x + 0.02, -0.03); } ctx.stroke();
    ell(ctx, 0, -0.44, 0.34, 0.09, '#c79a62', 0, 0.02); ctx.strokeStyle = 'rgba(90,55,25,.6)'; ctx.lineWidth = 0.01; for (const r of [0.08, 0.16, 0.25]) { ctx.beginPath(); ctx.ellipse(0, -0.44, r, r * 0.26, 0, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = OL; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.05, -0.47); ctx.lineTo(0.12, -0.41); ctx.stroke();
    if (s.blood > 0) { ctx.fillStyle = 'rgba(140,8,8,' + Math.min(0.9, s.blood) + ')'; ctx.beginPath(); ctx.ellipse(0.05, -0.44, 0.2 * Math.min(1, s.blood + 0.3), 0.05, 0, 0, TAU); ctx.fill(); ctx.fillRect(0.2, -0.44, 0.03, 0.16 * s.blood); ctx.fillRect(-0.12, -0.42, 0.025, 0.25 * s.blood); }
  }
  function basket(ctx, s) {
    ctx.beginPath(); ctx.moveTo(-0.3, -0.3); ctx.lineTo(0.3, -0.3); ctx.lineTo(0.24, 0); ctx.lineTo(-0.24, 0); ctx.closePath(); BB = [-0.3, -0.3, 0.3, 0]; paint(ctx, '#b98a45', 0.02);
    ctx.strokeStyle = 'rgba(80,50,15,.6)'; ctx.lineWidth = 0.012; ctx.beginPath(); for (let y = -0.25; y < 0; y += 0.06) { ctx.moveTo(-0.29, y); ctx.lineTo(0.29, y); } for (let x = -0.24; x <= 0.24; x += 0.08) { ctx.moveTo(x, -0.3); ctx.lineTo(x * 0.8, 0); } ctx.stroke();
    ell(ctx, 0, -0.3, 0.3, 0.07, '#4a2a12', 0, 0.018);
    for (let i = 0; i < Math.min(5, s.heads || 0); i++) { const hx = -0.14 + (i % 3) * 0.14, hy = -0.34 - Math.floor(i / 3) * 0.08; ell(ctx, hx, hy, 0.09, 0.08, SKINS[i % SKINS.length], 0, 0.014); ctx.strokeStyle = OL; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.moveTo(hx - 0.04, hy - 0.02); ctx.lineTo(hx - 0.01, hy + 0.01); ctx.moveTo(hx - 0.01, hy - 0.02); ctx.lineTo(hx - 0.04, hy + 0.01); ctx.stroke(); }
    if (s.heads) { ctx.fillStyle = 'rgba(140,8,8,.7)'; ctx.fillRect(-0.2, -0.3, 0.04, 0.18); ctx.fillRect(0.1, -0.3, 0.03, 0.12); }
  }

  function dragon(ctx, d, t) {
    const f = Math.sin(t * 5), g = '#4c8a4a', gd = '#2f6a3a', red = '#b8322a';
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-0.6, 0.0); ctx.bezierCurveTo(-1.4, 0.3 + f * 0.1, -1.8, -0.3, -2.4, 0.1 + f * 0.2); ctx.bezierCurveTo(-1.8, -0.1, -1.3, 0.45, -0.6, 0.35); ctx.closePath(); paint(ctx, gd, 0.03);
    poly(ctx, [[-2.4, 0.1 + f * 0.2], [-2.7, -0.1 + f * 0.2], [-2.55, 0.25 + f * 0.2]], red, 0.025);
    for (const k of [0, 1]) {
      ctx.save(); ctx.translate(-0.1, -0.3); ctx.rotate(-0.4 - f * 0.5 - k * 0.15);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.5, -1.6); ctx.lineTo(0.3, -1.2); ctx.lineTo(0.6, -1.7); ctx.lineTo(1.0, -1.0); ctx.lineTo(1.5, -1.2); ctx.lineTo(1.2, -0.2); ctx.closePath();
      ctx.globalAlpha = k ? 0.65 : 1; paint(ctx, k ? '#8a2018' : red, 0.03); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(43,27,16,.5)'; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.5, -1.6); ctx.moveTo(0, 0); ctx.lineTo(0.6, -1.7); ctx.moveTo(0, 0); ctx.lineTo(1.5, -1.2); ctx.stroke();
      ctx.restore();
    }
    ell(ctx, 0, 0.1, 0.8, 0.45, g, 0, 0.03); ell(ctx, 0.05, 0.25, 0.65, 0.25, '#e6cf8a', 0, 0.02);
    ctx.fillStyle = 'rgba(43,27,16,.3)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-0.5 + i * 0.2, -0.1 + (i & 1) * 0.1, 0.05, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(0.5, -0.1); ctx.quadraticCurveTo(1.1, -0.2, 1.1, -0.7 + f * 0.05); ctx.lineTo(1.35, -0.72 + f * 0.05); ctx.quadraticCurveTo(1.3, 0.0, 0.7, 0.3); ctx.closePath(); paint(ctx, g, 0.03);
    ell(ctx, 1.4, -0.72 + f * 0.05, 0.3, 0.2, g, 0.1, 0.03);
    const open = d.breath ? 0.18 : 0.04;
    poly(ctx, [[1.55, -0.66 + f * 0.05], [1.85, -0.62 + open + f * 0.05], [1.6, -0.55 + f * 0.05]], '#c33', 0.025);
    poly(ctx, [[1.3, -0.9 + f * 0.05], [1.2, -1.2], [1.42, -0.92]], '#e6cf8a', 0.025);
    ell(ctx, 1.42, -0.8 + f * 0.05, 0.07, 0.08, '#fff3a0', 0, 0.02); ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(1.44, -0.8 + f * 0.05, 0.02, 0.05, 0, 0, TAU); ctx.fill();
    limb(ctx, 0.2, 0.4, 0.35, 0.65, 0.12, gd); limb(ctx, -0.3, 0.4, -0.2, 0.65, 0.12, gd);
    ctx.restore();
  }

  root.Sprites = { hand, goldEdge, setQuality: q => { QUAL = q; }, mixc, THEMES, SKINS, HATS, HEIGHT, piece, crowd, animal, skeleton, doctor, executioner, block, basket, ik, dragon, crownGfx, face, ell, poly, limb, rrect, OL };
})(window);
