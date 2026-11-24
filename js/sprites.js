/* Procedurális, kézzel rajzolt "kódex-stílusú" karakterek. 1 egység = 1 mező, y felfelé negatív. */
(function (root) {
  'use strict';
  const OL = '#2a170b', TAU = Math.PI * 2;

  const THEMES = {
    white:  { id: 'white',  name: 'Fehér',  main: '#efe6cf', dark: '#b9ab88', light: '#fffaf0', accent: '#caa43a', pants: '#8a6f4d', hex: '#efe6cf' },
    black:  { id: 'black',  name: 'Fekete', main: '#3b3442', dark: '#1d1923', light: '#665b73', accent: '#9aa0b4', pants: '#26212b', hex: '#3b3442' },
    red:    { id: 'red',    name: 'Vörös',  main: '#b3261e', dark: '#6b120d', light: '#e2584c', accent: '#e8c65a', pants: '#5a2a1c', hex: '#b3261e' },
    gold:   { id: 'gold',   name: 'Arany',  main: '#e2ae2c', dark: '#a06f16', light: '#ffdf75', accent: '#7a3a12', pants: '#6a4a22', hex: '#e2ae2c' },
  };
  const CHAR = { main: '#2d2a28', dark: '#151413', light: '#4a4543', accent: '#5a5551', pants: '#1c1a19' };
  const SKINS = ['#f2c9a0', '#e9b98c', '#dca77a', '#f6d6b4', '#c98f62'];
  const METAL = '#a9b0ba', METAL_D = '#6f7782', WOOD = '#8a5a2b', WOOD_D = '#5e3a18';

  /* ---------- rajzoló segédek ---------- */
  function stroke(ctx, lw) { ctx.lineWidth = lw || 0.04; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function paint(ctx, color, lw) { ctx.fillStyle = color; ctx.fill(); stroke(ctx, lw); }
  function ell(ctx, x, y, rx, ry, color, rot, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); paint(ctx, color, lw); }
  function poly(ctx, pts, color, lw) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); paint(ctx, color, lw); }
  function rrect(ctx, x, y, w, h, r, color, lw) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); paint(ctx, color, lw);
  }
  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = OL; ctx.lineWidth = w + 0.06; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
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
  function dagger(ctx, x, y, ang, len, e) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    poly(ctx, [[0, -0.03], [len, -0.02], [len + 0.09, 0], [len, 0.02], [0, 0.03]], '#d6dbe2', 0.03);
    rrect(ctx, -0.02, -0.07, 0.04, 0.14, 0.01, WOOD_D, 0.025);
    ctx.restore(); if (e) glint(ctx, e, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }

  /* ---------- arc ---------- */
  function face(ctx, e, x, y, r, o) {
    o = o || {}; const t = e.T || 0, skin = e.skin || SKINS[0];
    let ex = e.expr || 'idle';
    if (e.hurt > 0.01) ex = 'pain'; else if (e.atk > 0.01 && e.atk < 0.95) ex = 'angry';
    if (e.state === 'dead' || e.state === 'ash') ex = 'dead';
    ell(ctx, x - r * 0.98, y + r * 0.05, r * 0.2, r * 0.28, skin, 0, 0.03);
    ell(ctx, x + r * 0.98, y + r * 0.05, r * 0.2, r * 0.28, skin, 0, 0.03);
    ell(ctx, x, y, r, r * 1.04, e.burn > 0.5 ? '#3a2f2a' : skin);
    if (e.burn <= 0.5) { ctx.fillStyle = 'rgba(222,72,60,.5)'; ctx.beginPath(); ctx.arc(x - r * 0.58, y + r * 0.32, r * 0.2, 0, TAU); ctx.arc(x + r * 0.58, y + r * 0.32, r * 0.2, 0, TAU); ctx.fill(); }
    const ey = y - r * 0.14, ed = r * 0.4, er = r * 0.26, lk = (e.look || 0) * r * 0.1;
    const blink = ((t * 0.6 + e.ph * 3) % 5) < 0.09;
    ctx.lineWidth = 0.035; ctx.strokeStyle = OL; ctx.lineCap = 'round';
    if (ex === 'dead') {
      for (const s of [-1, 1]) { const cx = x + s * ed, d = er * 0.8; ctx.beginPath(); ctx.moveTo(cx - d, ey - d); ctx.lineTo(cx + d, ey + d); ctx.moveTo(cx + d, ey - d); ctx.lineTo(cx - d, ey + d); ctx.stroke(); }
    } else if (ex === 'pain') {
      for (const s of [-1, 1]) { const cx = x + s * ed, d = er * 0.8; ctx.beginPath(); ctx.moveTo(cx - s * d, ey - d); ctx.lineTo(cx + s * d, ey); ctx.lineTo(cx - s * d, ey + d); ctx.stroke(); }
    } else if (ex === 'cheer' || ex === 'laugh') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * ed, ey + er * 0.4, er, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    } else if (blink) {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * ed - er, ey); ctx.lineTo(x + s * ed + er, ey); ctx.stroke(); }
    } else {
      for (const s of [-1, 1]) {
        ell(ctx, x + s * ed, ey, er, er * 1.1, '#fff', 0, 0.03);
        ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(x + s * ed + lk, ey + er * 0.1, er * 0.45, 0, TAU); ctx.fill();
      }
      if (ex === 'angry') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * ed - s * er * 1.3, ey - er * 1.6 - (s > 0 ? 0 : 0)); ctx.lineTo(x + s * ed + s * er * 0.2, ey - er * 0.5); ctx.lineWidth = 0.05; ctx.stroke(); }
    }
    const nr = (o.nose || 1);
    ell(ctx, x, y + r * 0.22, r * 0.21 * nr, r * 0.17 * nr, '#e2837b', 0, 0.03);
    const my = y + r * 0.6;
    ctx.lineWidth = 0.035; ctx.strokeStyle = OL;
    if (ex === 'pain' || ex === 'dead') {
      ell(ctx, x, my, r * 0.2, r * (ex === 'pain' ? 0.26 : 0.18), '#5a1010', 0, 0.03);
      if (ex === 'dead') { ctx.fillStyle = '#e4575f'; ctx.beginPath(); ctx.ellipse(x + r * 0.05, my + r * 0.3, r * 0.12, r * 0.2, 0, 0, TAU); ctx.fill(); stroke(ctx, 0.03); }
    } else if (ex === 'angry') {
      rrect(ctx, x - r * 0.35, my - r * 0.1, r * 0.7, r * 0.26, r * 0.08, '#fff', 0.03);
      ctx.beginPath(); ctx.moveTo(x - r * 0.35, my + r * 0.03); ctx.lineTo(x + r * 0.35, my + r * 0.03); ctx.lineWidth = 0.025; ctx.stroke();
    } else if (ex === 'cheer' || ex === 'laugh') {
      ctx.beginPath(); ctx.arc(x, my - r * 0.12, r * 0.3, 0, Math.PI); ctx.closePath(); paint(ctx, '#6a1414', 0.03);
      ctx.fillStyle = '#e4575f'; ctx.beginPath(); ctx.arc(x, my + r * 0.08, r * 0.14, 0, Math.PI); ctx.fill();
    } else if (o.tongue || (Math.sin(t * 1.3 + e.ph * 5) > 0.93)) {
      ctx.beginPath(); ctx.arc(x, my - r * 0.1, r * 0.28, 0.1, Math.PI - 0.1); ctx.stroke();
      ell(ctx, x + r * 0.05, my + r * 0.2, r * 0.12, r * 0.18, '#e4575f', 0, 0.03);
    } else {
      ctx.beginPath(); ctx.arc(x, my - r * 0.2, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
      if (o.teeth) { rrect(ctx, x - r * 0.08, my + r * 0.04, r * 0.16, r * 0.2, 0.01, '#fff', 0.02); }
    }
    if (o.wart) { ctx.fillStyle = '#6a3b2a'; ctx.beginPath(); ctx.arc(x + r * 0.5, y + r * 0.45, r * 0.09, 0, TAU); ctx.fill(); }
    if (o.stubble) { ctx.fillStyle = 'rgba(40,25,15,.35)'; ctx.beginPath(); ctx.arc(x, y + r * 0.5, r * 0.78, 0.1, Math.PI - 0.1); ctx.fill(); }
  }
  function head(ctx, e, x, y, r, o) {
    if (e.headless) { // nyakcsonk
      ell(ctx, x, y + r * 0.8, r * 0.38, r * 0.2, '#b11212', 0, 0.03);
      return false;
    }
    face(ctx, e, x, y, r, o); return true;
  }

  function legs(ctx, e, spread, hipY, th, pantsOverride) {
    const mv = e.mv || 0, wp = e.wp || 0, col = pantsOverride || th.pants;
    for (const s of [-1, 1]) {
      const ph = wp + (s > 0 ? Math.PI : 0), dx = Math.sin(ph) * 0.1 * mv, lift = Math.max(0, Math.cos(ph)) * 0.06 * mv;
      const fx = s * spread + dx, fy = -0.03 - lift;
      limb(ctx, s * spread * 0.7, hipY, fx, fy - 0.02, 0.11, col);
      ell(ctx, fx + 0.03, fy, 0.09, 0.05, '#4b2e19', 0, 0.03);
    }
  }
  const sway = (e, a) => Math.sin((e.T || 0) * 2.2 + e.ph) * (a || 0.015);

  /* ---------- BÁBUK ---------- */
  function drawPawn(ctx, e, th) {
    const b = sway(e);
    legs(ctx, e, 0.11, -0.26, th);
    ctx.save(); ctx.translate(0, b); ctx.rotate((e.atk > 0.3 && e.atk < 0.7) ? 0.12 : 0);
    // zsák a hátán
    ell(ctx, -0.26, -0.5, 0.12, 0.15, '#b79563', 0.4);
    poly(ctx, [[-0.22, -0.26], [0.22, -0.26], [0.19, -0.62], [-0.19, -0.62]], th.main);
    rrect(ctx, -0.22, -0.34, 0.44, 0.08, 0.02, th.dark);
    ctx.fillStyle = th.accent; ctx.fillRect(-0.04, -0.34, 0.08, 0.08);
    // bal kéz: répa
    limb(ctx, -0.19, -0.56, -0.3, -0.38, 0.09, th.main); ell(ctx, -0.31, -0.35, 0.05, 0.05, e.skin);
    poly(ctx, [[-0.36, -0.36], [-0.26, -0.36], [-0.31, -0.2]], '#e8e2f0', 0.025);
    ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(-0.31, -0.36); ctx.lineTo(-0.34, -0.45); ctx.moveTo(-0.31, -0.36); ctx.lineTo(-0.27, -0.45); ctx.stroke();
    // fej + bádogsapka
    const hy = -0.8;
    head(ctx, e, 0, hy, 0.2, { nose: 1.2 });
    if (!e.headless) {
      ctx.beginPath(); ctx.ellipse(0, hy - 0.08, 0.23, 0.17, 0, Math.PI, TAU); paint(ctx, METAL);
      rrect(ctx, -0.27, hy - 0.1, 0.54, 0.05, 0.02, METAL_D, 0.03);
      ctx.fillStyle = th.main; ctx.beginPath(); ctx.arc(0.0, hy - 0.2, 0.04, 0, TAU); ctx.fill(); stroke(ctx, 0.02);
    }
    // jobb kéz: tőr
    const ang = armAng(e, 1.15), sx = 0.19, sy = -0.56, L = 0.24;
    const hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.09, th.main); ell(ctx, hx, hy2, 0.055, 0.055, e.skin);
    dagger(ctx, hx, hy2, ang - 0.15, 0.26, e);
    ctx.restore();
  }

  function drawKnight(ctx, e, th) {
    const b = sway(e, 0.02), t = e.T || 0;
    const bounce = Math.abs(Math.sin(t * 5 + e.ph)) * 0.03 * (e.mv > 0.1 ? 1 : 0.3);
    ctx.save(); ctx.translate(0, -bounce);
    // hobbilóbot
    limb(ctx, -0.32, -0.02, 0.34, -0.55, 0.06, WOOD);
    // lábak (lovagló ülés)
    for (const s of [-1, 1]) { const dx = Math.sin((e.wp || 0) + (s > 0 ? 3.1 : 0)) * 0.1 * (e.mv || 0); limb(ctx, s * 0.06, -0.3, s * 0.18 + dx, -0.03, 0.1, th.pants); ell(ctx, s * 0.2 + dx, -0.03, 0.09, 0.05, '#4b2e19'); }
    // ló fej
    ctx.save(); ctx.translate(0.46, -0.66); ctx.rotate(-0.15 + Math.sin(t * 4 + e.ph) * 0.06);
    ell(ctx, 0, 0, 0.17, 0.14, '#9a6b3c');
    ell(ctx, 0.17, 0.06, 0.15, 0.1, '#a9794a');
    ell(ctx, 0.3, 0.06, 0.02, 0.03, '#4a2a14', 0, 0.02);
    poly(ctx, [[-0.08, -0.12], [-0.02, -0.3], [0.04, -0.12]], '#9a6b3c', 0.03);
    ctx.strokeStyle = '#e0a02a'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.14, -0.04); ctx.quadraticCurveTo(-0.22, 0.05, -0.18, 0.18); ctx.stroke();
    ell(ctx, 0.05, -0.03, 0.065, 0.075, '#fff', 0, 0.025);
    ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(0.07 + (e.look || 0) * 0.02, -0.01, 0.03, 0, TAU); ctx.fill();
    rrect(ctx, 0.22, 0.1, 0.05, 0.1, 0.01, '#fff', 0.02);
    rrect(ctx, 0.28, 0.1, 0.05, 0.1, 0.01, '#fff', 0.02);
    ctx.restore();
    // törzs
    ctx.save(); ctx.translate(0, b);
    poly(ctx, [[-0.22, -0.28], [0.22, -0.28], [0.19, -0.66], [-0.19, -0.66]], th.main);
    poly(ctx, [[-0.22, -0.28], [0.22, -0.28], [0.2, -0.38], [-0.2, -0.38]], th.dark, 0.03);
    const hy = -0.84;
    if (head(ctx, e, 0, hy, 0.19, { teeth: true })) {
      // bödön sisak tollal
      ctx.beginPath(); ctx.arc(0, hy - 0.04, 0.22, Math.PI, TAU); ctx.lineTo(0.22, hy + 0.0); ctx.lineTo(-0.22, hy + 0.0); ctx.closePath(); paint(ctx, METAL);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-0.22, hy - 0.02, 0.44, 0.03);
      poly(ctx, [[0, hy - 0.24], [-0.12 + Math.sin((e.T || 0) * 3) * 0.03, hy - 0.5], [0.02, hy - 0.4], [0.1, hy - 0.52], [0.06, hy - 0.22]], th.main, 0.03);
    }
    const ang = armAng(e, 1.0), sx = 0.18, sy = -0.58, L = 0.25;
    const hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.09, th.main); ell(ctx, hx, hy2, 0.055, 0.055, e.skin);
    // fakanál-buzogány
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang - 0.1);
    rrect(ctx, 0, -0.025, 0.28, 0.05, 0.02, WOOD); ell(ctx, 0.31, 0, 0.09, 0.09, WOOD_D); ctx.restore();
    glint(ctx, e, hx + Math.cos(ang) * 0.35, hy2 + Math.sin(ang) * 0.35);
    ctx.restore(); ctx.restore();
  }

  function drawBishop(ctx, e, th) {
    const b = sway(e, 0.02);
    legs(ctx, e, 0.12, -0.2, th, th.dark);
    ctx.save(); ctx.translate(0, b);
    // pocakos szerzetesi csuha
    ctx.beginPath(); ctx.moveTo(-0.2, -0.78); ctx.bezierCurveTo(-0.5, -0.5, -0.46, -0.1, -0.3, -0.08); ctx.lineTo(0.3, -0.08);
    ctx.bezierCurveTo(0.46, -0.1, 0.5, -0.5, 0.2, -0.78); ctx.closePath(); paint(ctx, th.main);
    ctx.strokeStyle = th.accent; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.4, -0.2); ctx.quadraticCurveTo(0, -0.04, 0.4, -0.2); ctx.stroke();
    ell(ctx, 0.06, -0.38, 0.22, 0.16, th.light, 0, 0.0); // has
    ctx.strokeStyle = th.accent; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.34, -0.42); ctx.quadraticCurveTo(0, -0.3, 0.36, -0.44); ctx.stroke();
    ell(ctx, 0.3, -0.38, 0.03, 0.08, '#e8e2c0', 0.2, 0.02);
    // kereszt
    ctx.fillStyle = th.accent; ctx.fillRect(-0.03, -0.66, 0.06, 0.2); ctx.fillRect(-0.1, -0.6, 0.2, 0.06);
    // fej + püspöksüveg
    const hy = -0.98;
    if (head(ctx, e, 0, hy, 0.2, { stubble: true, nose: 1.15 })) {
      ctx.fillStyle = 'rgba(0,0,0,.0)';
      poly(ctx, [[-0.2, hy - 0.1], [0, hy - 0.62], [0.2, hy - 0.1], [0.12, hy - 0.04], [-0.12, hy - 0.04]], th.main, 0.04);
      poly(ctx, [[-0.2, hy - 0.1], [0, hy - 0.62], [0.0, hy - 0.1]], th.light, 0.0);
      ctx.strokeStyle = th.accent; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.19, hy - 0.09); ctx.lineTo(0.19, hy - 0.09); ctx.stroke();
      ctx.fillStyle = th.accent; ctx.fillRect(-0.02, hy - 0.46, 0.04, 0.16); ctx.fillRect(-0.06, hy - 0.4, 0.12, 0.04);
    }
    // bal kéz: csirkecomb
    limb(ctx, -0.26, -0.7, -0.4, -0.5, 0.1, th.main); ell(ctx, -0.42, -0.48, 0.06, 0.06, e.skin);
    ell(ctx, -0.5, -0.58, 0.06, 0.09, '#c98a4a', 0.5); limb(ctx, -0.46, -0.52, -0.43, -0.48, 0.03, '#f3ecd2');
    // jobb kéz: pásztorbot
    const ang = armAng(e, 1.2), sx = 0.24, sy = -0.7, L = 0.26;
    const hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.1, th.main);
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang < 0.6 ? ang - Math.PI / 2 + 0.2 : -0.1);
    limb(ctx, 0, 0.5, 0, -0.7, 0.05, WOOD);
    ctx.strokeStyle = th.accent; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.arc(0.1, -0.7, 0.1, Math.PI, TAU * 0.9, false); ctx.stroke();
    ctx.restore(); ell(ctx, hx, hy2, 0.06, 0.06, e.skin); glint(ctx, e, hx + Math.cos(ang) * 0.3, hy2 + Math.sin(ang) * 0.3 - 0.2);
    ctx.restore();
  }

  function drawRook(ctx, e, th) {
    const t = e.T || 0, shake = e.atk > 0.2 && e.atk < 0.8 ? Math.sin(t * 60) * 0.015 : 0;
    ctx.save(); ctx.translate(shake, 0);
    // kis törpék a tetején
    const peas = [[-0.18, 0], [0.18, 1.7]];
    for (const [px, off] of peas) {
      const ph = ((t * 0.6 + off + e.ph) % 2.4) / 2.4; // 0..1
      const up = Math.min(1, ph * 4) * (ph < 0.85 ? 1 : (1 - ph) * 6.6);
      const gy = -1.0 - 0.12 * up;
      ctx.save(); ctx.beginPath(); ctx.rect(px - 0.2, -1.4, 0.4, 0.45); ctx.clip();
      ell(ctx, px, gy + 0.0, 0.1, 0.1, e.skin, 0, 0.03);
      ctx.beginPath(); ctx.ellipse(px, gy - 0.04, 0.11, 0.07, 0, Math.PI, TAU); paint(ctx, th.main, 0.03);
      ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(px - 0.035, gy, 0.015, 0, TAU); ctx.arc(px + 0.035, gy, 0.015, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px, gy + 0.04, 0.025, 0, Math.PI); ctx.stroke();
      const throwing = ph > 0.3 && ph < 0.55;
      limb(ctx, px + 0.08, gy + 0.08, px + 0.16, throwing ? gy - 0.15 : gy + 0.02, 0.04, e.skin);
      ctx.restore();
      if (throwing) { const k = (ph - 0.3) / 0.25; ell(ctx, px + 0.18 + k * 0.7, gy - 0.1 - Math.sin(k * Math.PI) * 0.35 + k * 0.3, 0.04, 0.04, k > 0.5 ? '#d33' : '#777', 0, 0.02); }
    }
    // torony
    poly(ctx, [[-0.36, 0], [0.36, 0], [0.3, -0.92], [-0.3, -0.92]], '#a29a8c');
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(40,25,15,.35)'; ctx.lineWidth = 0.02;
    for (let y = -0.1; y > -0.92; y -= 0.14) { ctx.beginPath(); ctx.moveTo(-0.4, y); ctx.lineTo(0.4, y); ctx.stroke(); for (let x = -0.3 + ((Math.round(y * 10) & 1) ? 0.1 : 0); x < 0.4; x += 0.2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 0.14); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0.12, -1, 0.3, 1.1); ctx.restore();
    // színes öv + zászló
    poly(ctx, [[-0.33, -0.62], [0.33, -0.62], [0.31, -0.72], [-0.31, -0.72]], th.main, 0.03);
    // ajtó + szem
    ctx.beginPath(); ctx.moveTo(-0.11, 0); ctx.lineTo(-0.11, -0.22); ctx.arc(0, -0.22, 0.11, Math.PI, TAU); ctx.lineTo(0.11, 0); ctx.closePath(); paint(ctx, WOOD_D);
    const pe = Math.sin(t * 0.9 + e.ph * 2) > 0.7;
    if (pe) { ell(ctx, 0, -0.22, 0.04, 0.03, '#fff', 0, 0.015); ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(0.01, -0.22, 0.015, 0, TAU); ctx.fill(); }
    rrect(ctx, -0.04, -0.56, 0.08, 0.2, 0.03, '#1a120c', 0.025);
    // tetején zubbonyok
    ctx.beginPath(); ctx.moveTo(-0.38, -0.92); ctx.lineTo(-0.38, -1.06);
    for (let i = 0; i < 3; i++) { const x0 = -0.38 + i * 0.27; ctx.lineTo(x0 + 0.0, -1.06); ctx.lineTo(x0 + 0.14, -1.06); ctx.lineTo(x0 + 0.14, -0.98); ctx.lineTo(x0 + 0.27, -0.98); }
    ctx.lineTo(0.43, -0.92); ctx.closePath(); paint(ctx, '#b8b0a2');
    // zászló
    const fw = Math.sin(t * 5 + e.ph) * 0.04;
    limb(ctx, 0, -1.05, 0, -1.45, 0.025, WOOD_D);
    poly(ctx, [[0.01, -1.44], [0.3, -1.38 + fw], [0.01, -1.3]], th.main, 0.025);
    ctx.restore();
  }

  function drawQueen(ctx, e, th) {
    const b = sway(e, 0.02);
    legs(ctx, e, 0.1, -0.2, th, '#6b4a2a');
    ctx.save(); ctx.translate(0, b);
    // ruha
    poly(ctx, [[-0.2, -0.95], [0.2, -0.95], [0.42, -0.06], [-0.42, -0.06]], th.main);
    poly(ctx, [[-0.12, -0.7], [0.12, -0.7], [0.2, -0.08], [-0.2, -0.08]], '#f0e8d0', 0.03); // kötény
    ctx.strokeStyle = th.accent; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-0.38, -0.12); ctx.lineTo(0.38, -0.12); ctx.stroke();
    ctx.fillStyle = th.dark; ctx.fillRect(-0.2, -0.72, 0.4, 0.06);
    ell(ctx, -0.1, -0.85, 0.05, 0.05, th.accent); ell(ctx, 0.1, -0.85, 0.05, 0.05, th.accent);
    // bal kéz: csípőre / hajlított
    limb(ctx, -0.18, -0.88, -0.34, -0.65, 0.09, th.main); ell(ctx, -0.3, -0.58, 0.055, 0.055, e.skin);
    // hennin kalap + fej
    const hy = -1.12;
    if (head(ctx, e, 0, hy, 0.2, { wart: true, nose: 1.4 })) {
      // copf
      ctx.strokeStyle = '#7a4a1f'; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(-0.17, hy + 0.05); ctx.quadraticCurveTo(-0.3, hy + 0.3, -0.2, hy + 0.5); ctx.stroke();
      poly(ctx, [[-0.2, hy - 0.08], [0.02, hy - 0.72], [0.2, hy - 0.08]], th.main, 0.04);
      ctx.strokeStyle = th.accent; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.17, hy - 0.2); ctx.lineTo(0.17, hy - 0.2); ctx.stroke();
      const w = Math.sin((e.T || 0) * 3 + e.ph) * 0.05;
      ctx.beginPath(); ctx.moveTo(0.02, hy - 0.7); ctx.quadraticCurveTo(0.3 + w, hy - 0.5, 0.34 + w * 2, hy - 0.1); ctx.quadraticCurveTo(0.2, hy - 0.3, 0.1, hy - 0.2); ctx.closePath();
      ctx.globalAlpha = 0.75; paint(ctx, th.light, 0.025); ctx.globalAlpha = 1;
      ell(ctx, 0.02, hy - 0.72, 0.035, 0.035, th.accent, 0, 0.02);
    }
    // jobb kéz: sodrófa
    const ang = armAng(e, 1.1), sx = 0.18, sy = -0.88, L = 0.26;
    const hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.09, th.main); ell(ctx, hx, hy2, 0.055, 0.055, e.skin);
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang + 0.2);
    rrect(ctx, -0.06, -0.045, 0.4, 0.09, 0.04, '#d9b074'); ell(ctx, 0.38, 0, 0.03, 0.03, WOOD_D); ctx.restore();
    glint(ctx, e, hx + Math.cos(ang + 0.2) * 0.38, hy2 + Math.sin(ang + 0.2) * 0.38);
    ctx.restore();
  }

  function drawKing(ctx, e, th) {
    const b = sway(e, 0.025), t = e.T || 0;
    legs(ctx, e, 0.13, -0.24, th, th.pants);
    ctx.save(); ctx.translate(0, b);
    // köpeny hátul
    poly(ctx, [[-0.3, -0.95], [0.3, -0.95], [0.46, -0.05], [-0.46, -0.05]], th.dark, 0.03);
    // törzs: páncél pocakkal
    ctx.beginPath(); ctx.moveTo(-0.26, -0.98); ctx.bezierCurveTo(-0.5, -0.7, -0.44, -0.2, -0.28, -0.2); ctx.lineTo(0.28, -0.2); ctx.bezierCurveTo(0.44, -0.2, 0.5, -0.7, 0.26, -0.98); ctx.closePath(); paint(ctx, METAL);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-0.12, -0.6, 0.07, 0.22, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = th.main; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(-0.4, -0.3); ctx.quadraticCurveTo(0, -0.16, 0.4, -0.3); ctx.stroke();
    ctx.strokeStyle = OL; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(0, -0.92); ctx.lineTo(0, -0.32); ctx.stroke();
    ell(ctx, 0, -0.62, 0.07, 0.07, th.accent, 0, 0.03); // címer
    // vállvédők
    ell(ctx, -0.3, -0.92, 0.12, 0.09, METAL_D); ell(ctx, 0.3, -0.92, 0.12, 0.09, METAL_D);
    // pajzs (bal)
    ctx.save(); ctx.translate(-0.42, -0.58 + Math.sin(t * 2 + e.ph) * 0.01);
    ctx.beginPath(); ctx.moveTo(-0.14, -0.14); ctx.lineTo(0.14, -0.14); ctx.lineTo(0.14, 0.04); ctx.quadraticCurveTo(0.1, 0.2, 0, 0.26); ctx.quadraticCurveTo(-0.1, 0.2, -0.14, 0.04); ctx.closePath(); paint(ctx, th.main);
    ctx.fillStyle = th.accent; ctx.fillRect(-0.025, -0.12, 0.05, 0.34); ctx.fillRect(-0.1, -0.04, 0.2, 0.05); ctx.restore();
    // fej: nagy szakáll + korona
    const hy = -1.17;
    if (head(ctx, e, 0, hy, 0.22, { nose: 1.5 })) {
      ctx.beginPath(); ctx.moveTo(-0.22, hy + 0.02); ctx.quadraticCurveTo(-0.3, hy + 0.5, 0, hy + 0.55); ctx.quadraticCurveTo(0.3, hy + 0.5, 0.22, hy + 0.02);
      ctx.quadraticCurveTo(0.1, hy + 0.3, 0, hy + 0.26); ctx.quadraticCurveTo(-0.1, hy + 0.3, -0.22, hy + 0.02); paint(ctx, '#c9772e');
      if ((e.expr || '') !== 'cheer') { ctx.strokeStyle = OL; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(0, hy + 0.2, 0.05, 0.2, Math.PI - 0.2); ctx.stroke(); }
      // korona
      poly(ctx, [[-0.2, hy - 0.15], [-0.22, hy - 0.4], [-0.1, hy - 0.28], [0, hy - 0.46], [0.1, hy - 0.28], [0.22, hy - 0.4], [0.2, hy - 0.15]], '#f2c230', 0.035);
      ell(ctx, 0, hy - 0.2, 0.035, 0.035, '#d22', 0, 0.02); ell(ctx, -0.12, hy - 0.2, 0.025, 0.025, '#2a6', 0, 0.02); ell(ctx, 0.12, hy - 0.2, 0.025, 0.025, '#26c', 0, 0.02);
      if (e.crown) { // győztes arany korona + glória
        ctx.strokeStyle = 'rgba(255,230,120,.9)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.ellipse(0, hy - 0.62, 0.22, 0.06, 0, 0, TAU); ctx.stroke();
      }
    }
    // izzadságcsepp
    const sw = (t * 1.2 + e.ph) % 2; if (sw < 1 && !e.headless) { ctx.fillStyle = 'rgba(120,190,255,.9)'; ctx.beginPath(); ctx.ellipse(0.26, hy - 0.05 + sw * 0.3, 0.025, 0.04, 0, 0, TAU); ctx.fill(); }
    // jobb kéz: kard
    const ang = armAng(e, 1.0), sx = 0.3, sy = -0.88, L = 0.26;
    const hx = sx + Math.cos(ang) * L, hy2 = sy + Math.sin(ang) * L;
    limb(ctx, sx, sy, hx, hy2, 0.1, METAL); ell(ctx, hx, hy2, 0.06, 0.06, e.skin);
    ctx.save(); ctx.translate(hx, hy2); ctx.rotate(ang - 0.7);
    poly(ctx, [[0, -0.04], [0.55, -0.03], [0.65, 0], [0.55, 0.03], [0, 0.04]], '#e4e8ee', 0.03);
    rrect(ctx, -0.02, -0.12, 0.05, 0.24, 0.02, th.accent, 0.03); ctx.restore();
    glint(ctx, e, hx + Math.cos(ang - 0.7) * 0.6, hy2 + Math.sin(ang - 0.7) * 0.6);
    ctx.restore();
  }

  const DRAW = { P: drawPawn, N: drawKnight, B: drawBishop, R: drawRook, Q: drawQueen, K: drawKing };
  const HEIGHT = { P: 1.05, N: 1.2, B: 1.4, R: 1.45, Q: 1.55, K: 1.6 };

  function piece(ctx, e) {
    const th = e.burn > 0.55 ? Object.assign({}, CHAR) : e.theme;
    DRAW[e.type](ctx, e, th);
  }

  /* ---------- TÖMEG / SZEREPLŐK ---------- */
  const HATS = ['straw', 'cap', 'hood', 'bald', 'bandana', 'pot'];
  function crowd(ctx, c, t) {
    const e = { T: t, ph: c.seed * 6.28, skin: c.skin, expr: c.cheer > 0 ? 'cheer' : (c.expr || 'idle'), look: c.look || 0 };
    const bob = Math.sin(t * 3 + c.seed * 10) * 0.03 + (c.cheer > 0 ? Math.abs(Math.sin(t * 9 + c.seed * 7)) * 0.12 : 0);
    ctx.save(); ctx.translate(0, -bob);
    poly(ctx, [[-0.26, 0], [0.26, 0], [0.22, -0.55], [-0.22, -0.55]], c.cloth);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-0.26, -0.12, 0.52, 0.12);
    const hy = -0.78, r = 0.21;
    face(ctx, e, 0, hy, r, { nose: 1 + (c.seed * 7 % 1) * 0.6, teeth: c.seed > 0.7, stubble: c.seed < 0.3 });
    const h = c.hat;
    if (h === 'straw') { ell(ctx, 0, hy - 0.1, 0.34, 0.07, '#d9bd6a'); ctx.beginPath(); ctx.ellipse(0, hy - 0.14, 0.16, 0.12, 0, Math.PI, TAU); paint(ctx, '#e6cc7e'); }
    else if (h === 'cap') { ctx.beginPath(); ctx.ellipse(0, hy - 0.1, 0.22, 0.15, 0, Math.PI, TAU); paint(ctx, c.hatC); poly(ctx, [[0.0, hy - 0.1], [0.3, hy - 0.08], [0.28, hy - 0.03], [0, hy - 0.04]], c.hatC); }
    else if (h === 'hood') { ctx.beginPath(); ctx.arc(0, hy, r * 1.25, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(r * 1.1, hy + 0.12); ctx.lineTo(-r * 1.1, hy + 0.12); ctx.closePath(); ctx.globalCompositeOperation = 'destination-over'; paint(ctx, c.hatC); ctx.globalCompositeOperation = 'source-over'; }
    else if (h === 'bandana') { rrect(ctx, -r, hy - 0.14, r * 2, 0.07, 0.02, c.hatC); poly(ctx, [[r, hy - 0.12], [r + 0.15, hy - 0.04], [r + 0.1, hy + 0.04]], c.hatC); }
    else if (h === 'pot') { ctx.beginPath(); ctx.ellipse(0, hy - 0.1, 0.23, 0.15, 0, Math.PI, TAU); paint(ctx, METAL); }
    // karok
    const arm = c.cheer > 0 ? Math.sin(t * 10 + c.seed * 9) * 0.3 : 0;
    limb(ctx, -0.22, -0.5, -0.36 - arm * 0.3, c.cheer > 0 ? -0.95 + arm * 0.3 : -0.22, 0.09, c.cloth); ell(ctx, -0.36 - arm * 0.3, c.cheer > 0 ? -0.98 : -0.2, 0.055, 0.055, c.skin);
    limb(ctx, 0.22, -0.5, 0.36 + arm * 0.3, c.cheer > 0 ? -0.95 - arm * 0.3 : -0.22, 0.09, c.cloth); ell(ctx, 0.36 + arm * 0.3, c.cheer > 0 ? -0.98 : -0.2, 0.055, 0.055, c.skin);
    if (c.prop === 'mug' && !(c.cheer > 0)) { rrect(ctx, 0.3, -0.3, 0.1, 0.14, 0.02, '#c9923a'); ell(ctx, 0.31, -0.32, 0.06, 0.025, '#fff'); }
    if (c.prop === 'fork') { limb(ctx, 0.4, 0.0, 0.4, -1.1, 0.03, WOOD); poly(ctx, [[0.33, -1.1], [0.47, -1.1], [0.47, -1.25], [0.44, -1.17], [0.4, -1.25], [0.36, -1.17], [0.33, -1.25]], METAL_D, 0.02); }
    if (c.prop === 'torch') { limb(ctx, 0.38, -0.1, 0.38, -0.8, 0.04, WOOD); const f = Math.sin(t * 12 + c.seed * 5) * 0.03; ctx.fillStyle = '#ffb52e'; ctx.beginPath(); ctx.ellipse(0.38, -0.92, 0.07 + f, 0.13, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.ellipse(0.38, -0.88, 0.04, 0.08, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function animal(ctx, a, t) {
    const w = Math.sin(t * 10 + a.seed * 6) * a.mv;
    if (a.kind === 'dog') {
      for (const x of [-0.2, -0.1, 0.12, 0.22]) limb(ctx, x, -0.2, x + w * 0.06 * (x > 0 ? 1 : -1), 0, 0.06, '#8a6a42');
      ell(ctx, 0, -0.28, 0.3, 0.16, '#9a7a4e');
      limb(ctx, -0.28, -0.32, -0.42, -0.5 + Math.sin(t * 14) * 0.05, 0.05, '#9a7a4e');
      ell(ctx, 0.3, -0.42, 0.14, 0.12, '#a98958'); ell(ctx, 0.42, -0.4, 0.08, 0.06, '#8a6a42'); ell(ctx, 0.46, -0.42, 0.025, 0.025, OL, 0, 0.01);
      ell(ctx, 0.28, -0.46, 0.025, 0.03, '#fff', 0, 0.015); ell(ctx, 0.22, -0.54, 0.05, 0.09, '#7a5a34', 0.3);
      if (a.eat) { ctx.fillStyle = '#c33'; ctx.beginPath(); ctx.arc(0.46, -0.32, 0.06, 0, TAU); ctx.fill(); }
    } else if (a.kind === 'pig') {
      for (const x of [-0.22, -0.1, 0.12, 0.24]) limb(ctx, x, -0.2, x + w * 0.05, 0, 0.07, '#e9a0a0');
      ell(ctx, 0, -0.3, 0.34, 0.2, '#f0aaaa');
      ctx.strokeStyle = OL; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(-0.38, -0.32, 0.06, 0, TAU * 0.8); ctx.stroke();
      ell(ctx, 0.32, -0.34, 0.16, 0.14, '#f3b0b0'); ell(ctx, 0.46, -0.31, 0.07, 0.06, '#e48a8a'); ell(ctx, 0.3, -0.38, 0.025, 0.03, OL, 0, 0.01);
      poly(ctx, [[0.22, -0.46], [0.3, -0.56], [0.34, -0.45]], '#e48a8a', 0.025);
    } else { // csirke
      limb(ctx, -0.04, -0.14, -0.04 + w * 0.04, 0, 0.025, '#d98b2b'); limb(ctx, 0.05, -0.14, 0.05 - w * 0.04, 0, 0.025, '#d98b2b');
      ell(ctx, 0, -0.22, 0.16, 0.12, '#f4efe4'); poly(ctx, [[-0.14, -0.26], [-0.28, -0.36], [-0.14, -0.14]], '#e0d6bd', 0.02);
      ell(ctx, 0.14, -0.36, 0.07, 0.07, '#f4efe4'); poly(ctx, [[0.2, -0.38], [0.27, -0.35], [0.2, -0.33]], '#e8a020', 0.015); ell(ctx, 0.14, -0.43, 0.03, 0.03, '#d33', 0, 0.01); ell(ctx, 0.16, -0.37, 0.012, 0.012, OL, 0, 0.005);
    }
  }

  function skeleton(ctx, s, t) {
    const d = Math.sin(t * 8 + s.seed) , mv = s.mv === undefined ? 1 : s.mv;
    const bone = '#efe9d8';
    ctx.save(); ctx.translate(0, -Math.abs(d) * 0.05);
    for (const k of [-1, 1]) { limb(ctx, k * 0.08, -0.5, k * 0.1 + d * 0.1 * k * mv, -0.02, 0.07, bone); ell(ctx, k * 0.12 + d * 0.1 * k * mv, -0.02, 0.07, 0.035, bone, 0, 0.02); }
    limb(ctx, 0, -0.5, 0, -0.95, 0.07, bone);
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = OL; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(-0.17, -0.62 - i * 0.1); ctx.lineTo(0.17, -0.62 - i * 0.1); ctx.stroke(); ctx.strokeStyle = bone; ctx.lineWidth = 0.05; ctx.stroke(); }
    ell(ctx, 0, -0.45, 0.14, 0.07, bone);
    limb(ctx, -0.17, -0.9, -0.34, -0.7 + d * 0.15, 0.05, bone); limb(ctx, 0.17, -0.9, 0.34, -1.15 - d * 0.1, 0.05, bone);
    ell(ctx, 0, -1.12, 0.19, 0.2, bone); rrect(ctx, -0.11, -1.0, 0.22, 0.1, 0.03, bone, 0.03);
    ell(ctx, -0.07, -1.14, 0.06, 0.065, '#1a0f08', 0, 0.01); ell(ctx, 0.07, -1.14, 0.06, 0.065, '#1a0f08', 0, 0.01);
    poly(ctx, [[0, -1.08], [-0.02, -1.03], [0.02, -1.03]], '#1a0f08', 0.01);
    ctx.strokeStyle = OL; ctx.lineWidth = 0.02; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 0.04, -1.0); ctx.lineTo(i * 0.04, -0.94); ctx.stroke(); }
    if (s.scythe) { limb(ctx, 0.34, 0.1, 0.38, -1.5, 0.04, WOOD); ctx.beginPath(); ctx.moveTo(0.38, -1.5); ctx.quadraticCurveTo(0.0, -1.65, -0.25, -1.3); ctx.quadraticCurveTo(0.0, -1.5, 0.38, -1.42); ctx.closePath(); paint(ctx, '#cfd4da', 0.03); }
    ctx.restore();
  }

  function doctor(ctx, s, t) {
    const w = Math.sin(t * 6 + s.seed) * (s.mv || 0);
    limb(ctx, -0.08, -0.4, -0.08 + w * 0.08, -0.02, 0.08, '#1a1512'); limb(ctx, 0.08, -0.4, 0.08 - w * 0.08, -0.02, 0.08, '#1a1512');
    poly(ctx, [[-0.2, -1.0], [0.2, -1.0], [0.34, -0.1], [-0.34, -0.1]], '#241c18');
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(0, -0.15); ctx.stroke();
    limb(ctx, 0.2, -0.9, 0.42, -0.6, 0.07, '#241c18'); limb(ctx, 0.42, -0.6, 0.42, 0.0, 0.03, WOOD);
    ell(ctx, 0, -1.12, 0.17, 0.17, '#241c18'); // csuklya
    ell(ctx, -0.06, -1.14, 0.045, 0.045, '#e8d8a0', 0, 0.02); ell(ctx, 0.06, -1.14, 0.045, 0.045, '#e8d8a0', 0, 0.02);
    ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.arc(-0.06, -1.14, 0.015, 0, TAU); ctx.arc(0.06, -1.14, 0.015, 0, TAU); ctx.fill();
    poly(ctx, [[-0.04, -1.12], [0.04, -1.12], [0.0, -0.88]], '#c9b074', 0.03); // csőr
    ctx.beginPath(); ctx.ellipse(0, -1.26, 0.25, 0.05, 0, 0, TAU); paint(ctx, '#241c18'); ctx.beginPath(); ctx.ellipse(0, -1.3, 0.14, 0.09, 0, Math.PI, TAU); paint(ctx, '#241c18');
  }

  function executioner(ctx, s, t) {
    const raise = s.raise || 0;
    limb(ctx, -0.12, -0.55, -0.14, -0.02, 0.13, '#2a2420'); limb(ctx, 0.12, -0.55, 0.14, -0.02, 0.13, '#2a2420');
    ell(ctx, -0.15, -0.02, 0.11, 0.05, '#2a1810'); ell(ctx, 0.15, -0.02, 0.11, 0.05, '#2a1810');
    poly(ctx, [[-0.32, -1.1], [0.32, -1.1], [0.28, -0.5], [-0.28, -0.5]], '#d9a982');
    ctx.fillStyle = '#2a2420'; ctx.fillRect(-0.3, -0.62, 0.6, 0.14); stroke(ctx, 0.03);
    ctx.beginPath(); ctx.moveTo(-0.3, -0.62); ctx.lineTo(0.3, -0.62); ctx.stroke();
    ell(ctx, 0, -1.28, 0.2, 0.22, '#1a1614'); // csuklya
    rrect(ctx, -0.14, -1.32, 0.28, 0.07, 0.03, '#000', 0.0);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-0.07, -1.3, 0.022, 0, TAU); ctx.arc(0.07, -1.3, 0.022, 0, TAU); ctx.fill();
    // karok + bárd
    const a = raise ? -2.2 + (s.swing || 0) * 2.6 : 0.9;
    const sx = 0.3, sy = -1.0, hx = sx + Math.cos(a) * 0.4, hy = sy + Math.sin(a) * 0.4;
    limb(ctx, -0.3, -1.0, -0.28, -0.6, 0.12, '#d9a982');
    limb(ctx, sx, sy, hx, hy, 0.12, '#d9a982');
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    limb(ctx, -0.2, 0, 0.9, 0, 0.05, WOOD_D);
    ctx.beginPath(); ctx.moveTo(0.75, -0.04); ctx.quadraticCurveTo(0.95, -0.4, 1.25, -0.3); ctx.quadraticCurveTo(1.3, 0.1, 1.25, 0.34); ctx.quadraticCurveTo(0.95, 0.4, 0.75, 0.05); ctx.closePath(); paint(ctx, '#c7ccd3', 0.035);
    ctx.restore();
  }

  function dragon(ctx, d, t) {
    const f = Math.sin(t * 5);
    ctx.save();
    // farok
    ctx.beginPath(); ctx.moveTo(-0.6, 0.0); ctx.bezierCurveTo(-1.4, 0.3 + f * 0.1, -1.8, -0.3, -2.4, 0.1 + f * 0.2); ctx.bezierCurveTo(-1.8, -0.1, -1.3, 0.45, -0.6, 0.35); ctx.closePath(); paint(ctx, '#2f7d3a', 0.05);
    poly(ctx, [[-2.4, 0.1 + f * 0.2], [-2.7, -0.1 + f * 0.2], [-2.55, 0.25 + f * 0.2]], '#b8341f', 0.04);
    // szárnyak
    for (const k of [0, 1]) {
      ctx.save(); ctx.translate(-0.1, -0.3); ctx.rotate(-0.4 - f * 0.5 - k * 0.15);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-0.5, -1.6); ctx.lineTo(0.3, -1.2); ctx.lineTo(0.6, -1.7); ctx.lineTo(1.0, -1.0); ctx.lineTo(1.5, -1.2); ctx.lineTo(1.2, -0.2); ctx.closePath();
      ctx.globalAlpha = k ? 0.6 : 1; paint(ctx, k ? '#8a2018' : '#b8341f', 0.05); ctx.globalAlpha = 1;
      ctx.restore();
    }
    // test
    ell(ctx, 0, 0.1, 0.8, 0.45, '#3a9448', 0, 0.05);
    ell(ctx, 0.05, 0.25, 0.65, 0.25, '#e8d896', 0, 0.03);
    // nyak + fej
    ctx.beginPath(); ctx.moveTo(0.5, -0.1); ctx.quadraticCurveTo(1.1, -0.2, 1.1, -0.7 + f * 0.05); ctx.lineTo(1.35, -0.72 + f * 0.05); ctx.quadraticCurveTo(1.3, 0.0, 0.7, 0.3); ctx.closePath(); paint(ctx, '#3a9448', 0.05);
    ell(ctx, 1.4, -0.72 + f * 0.05, 0.3, 0.2, '#3a9448', 0.1, 0.05);
    const open = d.breath ? 0.18 : 0.04;
    poly(ctx, [[1.55, -0.66 + f * 0.05], [1.85, -0.62 + open + f * 0.05], [1.6, -0.55 + f * 0.05]], '#c33', 0.04);
    poly(ctx, [[1.3, -0.9 + f * 0.05], [1.2, -1.2], [1.42, -0.92]], '#e8d896', 0.04);
    ell(ctx, 1.42, -0.8 + f * 0.05, 0.06, 0.07, '#ffe34a', 0, 0.03); ctx.fillStyle = OL; ctx.beginPath(); ctx.ellipse(1.44, -0.8 + f * 0.05, 0.02, 0.05, 0, 0, TAU); ctx.fill();
    // lábak
    limb(ctx, 0.2, 0.4, 0.35, 0.65, 0.12, '#2f7d3a'); limb(ctx, -0.3, 0.4, -0.2, 0.65, 0.12, '#2f7d3a');
    ctx.restore();
  }

  function crownGfx(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    poly(ctx, [[-0.3, 0], [-0.34, -0.4], [-0.15, -0.22], [0, -0.5], [0.15, -0.22], [0.34, -0.4], [0.3, 0]], '#f5c530', 0.05);
    ell(ctx, 0, -0.1, 0.05, 0.05, '#d22', 0, 0.03); ell(ctx, -0.17, -0.1, 0.04, 0.04, '#2a6', 0, 0.03); ell(ctx, 0.17, -0.1, 0.04, 0.04, '#26c', 0, 0.03);
    ctx.restore();
  }

  root.Sprites = { THEMES, SKINS, HATS, HEIGHT, piece, crowd, animal, skeleton, doctor, executioner, dragon, crownGfx, face, ell, poly, limb, rrect, OL };
})(window);
