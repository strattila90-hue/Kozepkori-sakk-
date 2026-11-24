/* Háttérjelenetek: disznóvágás és kínzás. Kóddal rajzolt, animált, vérző kis vignetták a tábla körül. */
(function (root) {
  'use strict';
  const S = Sprites, TAU = Math.PI * 2, OL = '#1c1310', rnd = (a, b) => a + Math.random() * (b - a);
  const W = () => root.W;
  const wood = '#8a5a2b', woodD = '#5b3a1a';
  function plank(c, x, y, w, h) { S.rrect(c, x, y, w, h, 0.02, wood, 0.02); c.strokeStyle = 'rgba(40,20,5,.45)'; c.lineWidth = 0.012; c.beginPath(); c.moveTo(x + w * 0.1, y + h * 0.4); c.lineTo(x + w * 0.9, y + h * 0.45); c.stroke(); }
  function bloodPool(c, x, y, r) { c.fillStyle = 'rgba(130,12,12,.75)'; c.beginPath(); c.ellipse(x, y, r, r * 0.28, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(190,28,28,.5)'; c.beginPath(); c.ellipse(x - r * 0.2, y - 0.01, r * 0.55, r * 0.14, 0, 0, TAU); c.fill(); }

  /* ---------- 1) Disznóvágás ---------- */
  const butcher = {
    name: 'butcher', x: -3.55, z: -7.7, ph: 0, say: 0, cyc: 0, hit: false, tx: 0,
    tick(dt, w) {
      this.cyc += dt; const T = 4.2, t = this.cyc % T;
      if (t > 3.0 && !this.hit) { this.hit = true; for (let i = 0; i < 18; i++) w.part({ kind: 'blood', x: this.x - 0.35 + rnd(-0.1, 0.1), y: 0.55, z: this.z + rnd(-0.1, 0.1), vx: rnd(-2.4, 0.6), vy: rnd(1, 3.4), vz: rnd(-1, 1), g: 10, size: rnd(0.04, 0.09), color: '#a50f0f', life: 1.2 }); w.shake = Math.max(w.shake, 0.12); if (root.SFX) { SFX.thud(); } }
      if (t < 1) this.hit = false;
      this.say -= dt; if (this.say <= 0 && t > 0.2 && t < 1.2) { this.say = rnd(3.5, 6); this.bub = { text: (Math.random() < 0.55 ? L.pick('butcher') : L.pick('pig')), who: Math.random() < 0.55 ? 'b' : 'p', t: 2.6 }; }
      if (this.bub) { this.bub.t -= dt; if (this.bub.t <= 0) this.bub = null; }
    },
    draw(c, t) {
      const T = 4.2, ph = this.cyc % T, raise = ph > 0.4, swing = ph < 0.4 ? 0 : ph < 2.4 ? -0.15 + Math.sin(ph * 2) * 0.05 : ph < 3.0 ? -0.15 + (ph - 2.4) / 0.6 * 0.15 : ph < 3.15 ? 0.15 + (ph - 3.0) / 0.15 * 0.7 : 0.85 - Math.min(1, (ph - 3.15) / 0.9) * 0.9;
      // hasító tuskó + padka
      S.rrect(c, -0.85, -0.5, 0.9, 0.12, 0.03, wood, 0.025); for (const x of [-0.78, -0.04]) S.rrect(c, x, -0.4, 0.09, 0.4, 0.02, woodD, 0.02);
      // a disznó a padkán: vergődik
      const wr = Math.sin(t * (ph > 3.1 ? 3 : 14)) * (ph > 3.1 ? 0.01 : 0.03);
      c.save(); c.translate(-0.4, -0.7 + wr); S.ell(c, 0, 0, 0.36, 0.2, '#f0b2b2', 0, 0.025); S.ell(c, 0.4, 0.01, 0.16, 0.14, '#f3bcbc', 0, 0.022); S.ell(c, 0.53, 0.03, 0.07, 0.05, '#e48a8a', 0, 0.015);
      c.fillStyle = OL; c.beginPath(); c.arc(0.43, -0.03, 0.015, 0, TAU); c.fill(); S.poly(c, [[0.3, -0.1], [0.36, -0.22], [0.42, -0.1]], '#e48a8a', 0.016);
      for (const lx of [-0.2, -0.05, 0.12, 0.25]) S.limb(c, lx, 0.12, lx + Math.sin(t * 16 + lx * 9) * 0.05 * (ph > 3.1 ? 0.1 : 1), 0.34, 0.05, '#e9a0a0');
      c.strokeStyle = OL; c.lineWidth = 0.03; c.beginPath(); c.arc(-0.42, -0.02, 0.06, 0, TAU * 0.8); c.stroke();
      c.restore();
      if (ph > 3.1) bloodPool(c, -0.2, -0.38, 0.5);
      // lógó disznó a gerendán + vödör
      S.limb(c, 0.8, 0.0, 0.8, -1.5, 0.07, woodD); S.limb(c, 0.75, -1.5, 1.45, -1.5, 0.06, woodD); S.limb(c, 1.45, -1.5, 1.45, 0.0, 0.07, woodD);
      c.save(); c.translate(1.12, -0.95); c.rotate(Math.sin(t * 1.5) * 0.03); S.limb(c, 0, -0.55, 0, -0.3, 0.025, '#4a3a2a'); S.ell(c, 0, 0, 0.17, 0.42, '#f0b2b2', 0, 0.025); S.ell(c, 0, 0.36, 0.07, 0.09, '#e48a8a', 0, 0.015); c.strokeStyle = '#a50f0f'; c.lineWidth = 0.045; c.beginPath(); c.moveTo(0, -0.28); c.lineTo(0, 0.25); c.stroke(); c.restore();
      S.rrect(c, 0.98, -0.12, 0.28, 0.2, 0.03, '#7a5030', 0.02); c.fillStyle = '#b01212'; c.beginPath(); c.ellipse(1.12, -0.12, 0.13, 0.03, 0, 0, TAU); c.fill();
      if (((t * 3) | 0) % 2) { c.fillStyle = '#b01212'; c.beginPath(); c.ellipse(1.12, -0.38 + ((t * 3) % 1) * 0.26, 0.012, 0.03, 0, 0, TAU); c.fill(); }
      // hentes: kapucnis hóhér-sprite, bárddal, kötényben
      c.save(); c.translate(-1.2, 0); c.scale(0.7, 0.7); S.executioner(c, { raise: raise ? 1 : 0, swing }, t); poly(c); c.restore();
      if (this.bub) bubble(c, this.bub.who === 'b' ? -1.2 : -0.4, this.bub.who === 'b' ? -1.75 : -1.1, this.bub.text);
    },
  };
  function poly(c) { S.poly(c, [[-0.26, -0.5], [0.26, -0.5], [0.3, -0.05], [-0.3, -0.05]], '#efe6cc', 0.02); c.fillStyle = '#b01212'; c.beginPath(); c.arc(-0.1, -0.3, 0.05, 0, TAU); c.arc(0.12, -0.2, 0.04, 0, TAU); c.fill(); }
  function bubble(c, x, y, text) {
    c.save(); c.font = '700 0.24px Georgia, serif'; const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (c.measureText(tt).width > 1.9 && cur) { lines.push(cur); cur = w; } else cur = tt; } if (cur) lines.push(cur);
    let tw = 0; for (const l of lines) tw = Math.max(tw, c.measureText(l).width); const w = tw + 0.3, lh = 0.3, h = lines.length * lh + 0.16;
    c.translate(x, y); c.beginPath(); c.moveTo(-w / 2, -h); c.lineTo(w / 2, -h); c.lineTo(w / 2, 0); c.lineTo(0.06, 0); c.lineTo(0, 0.12); c.lineTo(-0.06, 0); c.lineTo(-w / 2, 0); c.closePath(); c.fillStyle = '#fbf0cf'; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.035; c.stroke();
    c.fillStyle = '#120a06'; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => c.fillText(l, 0, -h + 0.08 + lh * (i + 0.5))); c.restore();
  }

  /* ---------- 2) Kínzás ---------- */
  const torture = {
    name: 'torture', x: 2.35, z: -7.7, cyc: 0, say: 0, crack: false,
    tick(dt, w) {
      this.cyc += dt; const t = this.cyc % 2.6;
      if (t > 1.45 && !this.crack) { this.crack = true; if (root.SFX) SFX.whoosh(); for (let i = 0; i < 6; i++) w.part({ kind: 'blood', x: this.x + 0.5, y: 0.85, z: this.z, vx: rnd(0.4, 2), vy: rnd(0.5, 2.2), vz: rnd(-0.6, 0.6), g: 9, size: rnd(0.03, 0.07), color: '#a50f0f', life: 0.9 }); this.shk = 0.35; if (Math.random() < 0.4 && root.SFX) SFX.ow(); }
      if (t < 1.0) this.crack = false; if (this.shk > 0) this.shk -= dt;
      if (Math.random() < dt * 8) w.part({ kind: 'fire', x: this.x - 1.15 + rnd(-0.08, 0.08), y: 0.62, z: this.z, vx: rnd(-0.2, 0.2), vy: rnd(0.8, 1.6), vz: 0, g: 0, size: rnd(0.1, 0.18), color: ['#ff5a1f', '#ffb52e', '#ffe34a'][Math.random() * 3 | 0], life: rnd(0.4, 0.7) });
      this.say -= dt; if (this.say <= 0) { this.say = rnd(3.5, 6.5); const who = Math.random() < 0.6 ? 'p' : 't'; this.bub = { text: who === 'p' ? L.pick('prisoner') : L.pick('torturer'), who, t: 2.8 }; }
      if (this.bub) { this.bub.t -= dt; if (this.bub.t <= 0) this.bub = null; }
    },
    draw(c, t) {
      const ph = this.cyc % 2.6, sw = ph < 1.0 ? ph * 0.5 : ph < 1.45 ? 0.5 - (ph - 1.0) / 0.45 * 3.2 : -2.7 + (ph - 1.45) / 1.15 * 2.7, hit = this.shk > 0 ? this.shk : 0;
      // pellengér
      S.limb(c, 0.2, 0, 0.2, -1.15, 0.12, woodD); S.limb(c, 1.1, 0, 1.1, -1.15, 0.12, woodD);
      const px = 0.65, shake = Math.sin(t * 40) * 0.015 * (hit > 0 ? 1 : 0);
      c.save(); c.translate(shake, 0);
      // test a pellengér mögött
      S.poly(c, [[0.35, -0.55], [0.95, -0.55], [1.0, 0], [0.3, 0]], '#6b4a2a', 0.022); S.poly(c, [[0.4, -0.55], [0.9, -0.55], [0.9, -0.2], [0.4, -0.2]], '#9b8a6a', 0.02);
      for (const dx of [-0.17, 0.17]) { S.limb(c, px + dx, 0.0, px + dx, -0.15, 0.1, '#6b4a2a'); }
      plank(c, 0.12, -1.05, 1.1, 0.16); plank(c, 0.12, -0.85, 1.1, 0.1);
      c.restore();
      // a fogoly feje és keze a lyukakban
      const ex = hit > 0 ? 'pain' : (ph > 1.0 ? 'pain' : 'idle');
      S.face(c, { skin: '#e6c29a', ph: 2.3, T: t, expr: hit > 0 ? 'pain' : ex, look: 0, hurt: hit }, px, -1.22, 0.2, { tr: { bigEars: true, freckles: true }, rednose: true, nose: 1.3 });
      S.ell(c, px - 0.42, -0.83, 0.07, 0.06, '#e6c29a', 0, 0.018); S.ell(c, px + 0.42, -0.83, 0.07, 0.06, '#e6c29a', 0, 0.018);
      if (hit > 0.1) { c.strokeStyle = '#a50f0f'; c.lineWidth = 0.035; c.beginPath(); c.moveTo(px - 0.1, -1.05); c.lineTo(px + 0.25, -0.55); c.moveTo(px + 0.05, -1.0); c.lineTo(px + 0.35, -0.6); c.stroke(); }
      // hóhérsegéd ostorral (kapucnis, vörös)
      c.save(); c.translate(1.9, 0); c.scale(-0.95, 0.95);
      const arm = sw;
      S.limb(c, -0.1, -0.5, -0.12, -0.02, 0.1, '#3a2a2a'); S.limb(c, 0.1, -0.5, 0.12, -0.02, 0.1, '#3a2a2a'); S.ell(c, -0.14, -0.02, 0.1, 0.04, '#2a1810', 0, 0.015); S.ell(c, 0.14, -0.02, 0.1, 0.04, '#2a1810', 0, 0.015);
      S.poly(c, [[-0.26, -1.0], [0.26, -1.0], [0.22, -0.45], [-0.22, -0.45]], '#7a2a22', 0.022); c.fillStyle = '#2a2420'; c.fillRect(-0.24, -0.58, 0.48, 0.1);
      S.ell(c, 0, -1.2, 0.18, 0.2, '#1a1614', 0, 0.02); c.fillStyle = '#fffdf4'; c.beginPath(); c.arc(-0.06, -1.22, 0.025, 0, TAU); c.arc(0.06, -1.22, 0.025, 0, TAU); c.fill();
      const sx = 0.24, sy = -0.9, hx = sx + Math.cos(arm - 0.6) * 0.34, hy = sy + Math.sin(arm - 0.6) * 0.34; S.limb(c, sx, sy, hx, hy, 0.1, '#7a2a22'); S.ell(c, hx, hy, 0.055, 0.055, '#e6c29a', 0, 0.015);
      S.limb(c, hx, hy, hx + 0.12, hy - 0.04, 0.04, woodD); c.strokeStyle = '#3a2a1a'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(hx + 0.12, hy - 0.04); c.quadraticCurveTo(hx + 0.5 + Math.sin(t * 20) * 0.04, hy - 0.15 - (ph > 1.0 && ph < 1.5 ? 0.3 : 0), hx + 0.9, hy + (ph > 1.4 && ph < 1.7 ? 0.1 : 0.45)); c.stroke();
      c.restore();
      // parázstál izzó vassal
      S.rrect(c, -1.35, -0.5, 0.4, 0.12, 0.03, '#3a3a3a', 0.02); S.limb(c, -1.3, -0.38, -1.34, 0, 0.05, '#3a3a3a'); S.limb(c, -0.98, -0.38, -0.94, 0, 0.05, '#3a3a3a');
      c.fillStyle = '#ff6a1a'; c.beginPath(); c.ellipse(-1.15, -0.5, 0.18, 0.05, 0, 0, TAU); c.fill(); S.limb(c, -1.2, -0.52, -1.0, -0.95, 0.03, '#d6dbe2'); c.fillStyle = '#ff7a2a'; c.beginPath(); c.arc(-1.0, -0.95, 0.035, 0, TAU); c.fill();
      // lógó ketrec csontvázzal
      const cx = -0.35, sway = Math.sin(t * 1.3) * 0.04; c.save(); c.translate(cx, -1.9); c.rotate(sway);
      S.limb(c, 0, 0, 0, -0.35, 0.02, '#3a3a3a'); S.ell(c, 0, 0.38, 0.22, 0.38, 'rgba(0,0,0,0)', 0, 0.0);
      c.strokeStyle = '#2a2a2a'; c.lineWidth = 0.035; c.beginPath(); c.ellipse(0, 0.4, 0.22, 0.42, 0, 0, TAU); c.moveTo(-0.22, 0.4); c.lineTo(0.22, 0.4); c.moveTo(0, -0.02); c.lineTo(0, 0.82); c.moveTo(-0.13, 0.05); c.lineTo(-0.13, 0.75); c.moveTo(0.13, 0.05); c.lineTo(0.13, 0.75); c.stroke();
      S.ell(c, 0, 0.12, 0.09, 0.1, '#efe9d8', 0, 0.015); c.fillStyle = OL; c.beginPath(); c.arc(-0.035, 0.11, 0.02, 0, TAU); c.arc(0.035, 0.11, 0.02, 0, TAU); c.fill(); c.restore();
      if (this.bub) bubble(c, this.bub.who === 'p' ? px : 1.5, this.bub.who === 'p' ? -1.65 : -1.7, this.bub.text);
    },
  };
  root.Scenes = { list: [butcher, torture] };
})(window);
