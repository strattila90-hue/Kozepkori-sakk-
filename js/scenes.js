/* Háttérjelenetek: disznóvágás és kínzás. Kóddal rajzolt, animált, vérző kis vignetták a tábla körül. */
(function (root) {
  'use strict';
  const S = Sprites, TAU = Math.PI * 2, OL = '#1c1310', rnd = (a, b) => a + Math.random() * (b - a);
  const wood = '#8a5a2b', woodD = '#5b3a1a';
  function plank(c, x, y, w, h) { S.rrect(c, x, y, w, h, 0.02, wood, 0.02); c.strokeStyle = 'rgba(40,20,5,.45)'; c.lineWidth = 0.012; c.beginPath(); c.moveTo(x + w * 0.1, y + h * 0.4); c.lineTo(x + w * 0.9, y + h * 0.45); c.stroke(); }

  /* ---------- 1) Disznóvágás (falusi, téli hajnal) ----------
     Körforgás (15 mp): a segéd lefogja a malacot a dikón -> a böllér nyakon szúrja -> az asszony tálban felfogja a vért
     (hurkának), kevergeti -> szalmacsóvával perzselés -> kaparás -> az új malac. Jobbra a gerendán a már felhasított fél disznó. */
  const CYC = 15, PH = { stab: 2.6, bleed: 3.1, dead: 6.4, singe: 6.9, scrape: 10.4, fade: 13.4 };
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function person(c, o, t) {
    // o: x, y0 (talp), skin, cloth, kneel, hands [[x,y],[x,y]], hat, apron, mustache, expr, ph, lean
    const hipY = o.kneel ? -0.38 : -0.55, shY = hipY - 0.5, lean = o.lean || 0, hx = o.x + lean * 0.5;
    if (o.kneel) { S.limb(c, o.x - 0.08, hipY, o.x + 0.12, -0.12, 0.12, o.legs || '#4a3a2a'); S.limb(c, o.x + 0.12, -0.12, o.x - 0.2, -0.05, 0.11, o.legs || '#4a3a2a'); S.ell(c, o.x - 0.24, -0.05, 0.07, 0.04, '#2a1810', 0, 0.014); }
    else for (const d of [-0.1, 0.1]) { S.limb(c, o.x + d, hipY, o.x + d * 1.2, -0.04, 0.12, o.legs || '#4a3a2a'); S.ell(c, o.x + d * 1.2 + 0.04, -0.03, 0.08, 0.04, '#2a1810', 0, 0.014); }
    const back = o.hands[1], front = o.hands[0];
    { const k = S.ik(hx - 0.17, shY + 0.06, back[0], back[1], 0.27, 0.27, 1); S.limb(c, hx - 0.17, shY + 0.06, k.ex, k.ey, 0.1, S.mixc(o.cloth, -0.25)); S.limb(c, k.ex, k.ey, k.hx, k.hy, 0.085, S.mixc(o.cloth, -0.25)); S.ell(c, k.hx, k.hy, 0.05, 0.05, o.skin, 0, 0.012); }
    S.poly(c, [[hx - 0.22, shY], [hx + 0.22, shY], [o.x + 0.26, hipY + 0.12], [o.x - 0.26, hipY + 0.12]], o.cloth, 0.02);
    c.strokeStyle = 'rgba(43,27,16,.5)'; c.lineWidth = 0.035; c.beginPath(); c.moveTo(o.x - 0.24, hipY + 0.02); c.lineTo(o.x + 0.24, hipY + 0.02); c.stroke();
    if (o.apron) { S.poly(c, [[hx - 0.15, shY + 0.12], [hx + 0.15, shY + 0.12], [o.x + 0.2, hipY + 0.28], [o.x - 0.2, hipY + 0.28]], '#ece4cf', 0.016); c.fillStyle = 'rgba(150,12,12,' + (o.apron > 1 ? 0.85 : 0.5) + ')'; c.beginPath(); c.ellipse(o.x + 0.05, hipY - 0.02, 0.06, 0.04, 0, 0, TAU); c.ellipse(o.x - 0.07, hipY + 0.12, 0.04, 0.06, 0, 0, TAU); c.fill(); }
    const hy = shY - 0.2; S.face(c, { T: t, ph: o.ph || 1, skin: o.skin, expr: o.expr || 'idle', look: 0.4 }, hx, hy, 0.16, { nose: 1.3, rednose: o.rednose, teeth: o.teeth });
    if (o.mustache) { c.strokeStyle = '#3a2416'; c.lineWidth = 0.035; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - 0.11, hy + 0.1); c.quadraticCurveTo(hx, hy + 0.03, hx + 0.11, hy + 0.1); c.stroke(); }
    if (o.hat === 'cap') { c.beginPath(); c.ellipse(hx, hy - 0.08, 0.18, 0.12, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#7a2a22'; c.fill(); c.strokeStyle = OL; c.lineWidth = 0.02; c.stroke(); }
    else if (o.hat === 'scarf') { S.poly(c, [[hx - 0.2, hy - 0.02], [hx, hy - 0.22], [hx + 0.2, hy - 0.02], [hx + 0.14, hy + 0.04], [hx - 0.14, hy + 0.04]], '#b8322a', 0.016); c.fillStyle = '#fffdf4'; for (const d of [-0.08, 0.04]) { c.beginPath(); c.arc(hx + d, hy - 0.08, 0.016, 0, TAU); c.fill(); } }
    else if (o.hat === 'fur') { S.ell(c, hx, hy - 0.13, 0.17, 0.08, '#4a3020', 0, 0.016); }
    const arm = () => { const k = S.ik(hx + 0.17, shY + 0.06, front[0], front[1], 0.27, 0.27, 1); S.limb(c, hx + 0.17, shY + 0.06, k.ex, k.ey, 0.1, o.cloth); S.limb(c, k.ex, k.ey, k.hx, k.hy, 0.085, o.cloth); S.ell(c, k.hx, k.hy, 0.05, 0.05, o.skin, 0, 0.012); return k; };
    return o.later ? arm : arm();
  }
  function pig(c, x, y, o, t) {
    // oldalán fekvő disznó, fej jobbra; o: kick (0..1), dead, char (0..1 perzselés), clean (kaparás), alpha, wound, squeal
    c.save(); c.globalAlpha *= o.alpha === undefined ? 1 : o.alpha; c.translate(x, y);
    const k = o.kick || 0, pink = '#f0b0a2', dark = S.mixc(pink, -0.25);
    for (let i = 0; i < 4; i++) { const lx = -0.28 + i * 0.16 + (i > 1 ? 0.06 : 0), sw = Math.sin(t * (14 + i * 3) + i) * 0.07 * k; S.limb(c, lx, 0.08, lx + 0.05 + sw, 0.27 + Math.abs(sw) * 0.3, 0.075, i % 2 ? dark : pink); S.ell(c, lx + 0.05 + sw, 0.29, 0.035, 0.025, '#3a2a20', 0, 0.01); }
    c.strokeStyle = OL; c.lineWidth = 0.02; c.beginPath(); c.moveTo(-0.42, -0.04); c.bezierCurveTo(-0.56, -0.1, -0.5, -0.2, -0.46, -0.13); c.bezierCurveTo(-0.43, -0.08, -0.52, -0.06, -0.55, -0.12); c.stroke();
    S.ell(c, 0, 0, 0.44, 0.21, pink, 0, 0.022); S.ell(c, 0.02, 0.09, 0.32, 0.08, S.mixc(pink, 0.2), 0, 0.0);
    c.strokeStyle = 'rgba(120,60,50,.35)'; c.lineWidth = 0.008; c.beginPath(); for (let i = 0; i < 14; i++) { const bx = -0.36 + i * 0.05; c.moveTo(bx, -0.16 + Math.sin(i) * 0.02); c.lineTo(bx + 0.015, -0.2 + Math.sin(i) * 0.02); } c.stroke();
    // fej
    const hb = Math.sin(t * 18) * 0.02 * k; c.save(); c.translate(0.42, -0.02 + hb); c.rotate(-0.08 + hb);
    S.ell(c, 0, 0, 0.19, 0.16, pink, 0, 0.02); S.poly(c, [[-0.06, -0.12], [0.02, -0.28 - Math.sin(t * 9) * 0.03 * k], [0.08, -0.12]], dark, 0.016);
    S.ell(c, 0.18, 0.02, 0.06, 0.075, '#e48a8a', 0, 0.016); c.fillStyle = '#5a2a2a'; c.beginPath(); c.ellipse(0.19, 0.0, 0.01, 0.017, 0, 0, TAU); c.ellipse(0.19, 0.045, 0.01, 0.017, 0, 0, TAU); c.fill();
    if (o.dead) { c.strokeStyle = OL; c.lineWidth = 0.016; c.beginPath(); c.moveTo(0.03, -0.06); c.lineTo(0.08, -0.02); c.moveTo(0.08, -0.06); c.lineTo(0.03, -0.02); c.stroke(); }
    else { c.fillStyle = '#fffdf4'; c.beginPath(); c.arc(0.06, -0.04, 0.028, 0, TAU); c.fill(); c.fillStyle = OL; c.beginPath(); c.arc(0.07, -0.04, 0.014, 0, TAU); c.fill(); }
    if (o.squeal) { c.fillStyle = '#5a1a1a'; c.beginPath(); c.ellipse(0.1, 0.1, 0.05, 0.03 + Math.abs(Math.sin(t * 20)) * 0.02, 0.2, 0, TAU); c.fill(); }
    else { c.strokeStyle = OL; c.lineWidth = 0.012; c.beginPath(); c.moveTo(0.04, 0.09); c.quadraticCurveTo(0.09, 0.11, 0.13, 0.08); c.stroke(); }
    c.restore();
    if (o.wound) { c.fillStyle = '#8a0808'; c.beginPath(); c.ellipse(0.28, 0.06, 0.05, 0.025, 0.4, 0, TAU); c.fill(); }
    if (o.char > 0) { c.globalAlpha *= Math.min(0.75, o.char * 0.75) * (1 - (o.clean || 0) * 0.7); c.fillStyle = '#4a2c18'; c.beginPath(); c.ellipse(0, 0, 0.44, 0.21, 0, 0, TAU); c.ellipse(0.42, -0.02, 0.19, 0.16, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  const butcher = {
    name: 'butcher', x: -3.55, z: -7.7, cyc: 0, say: 0, ev: {},
    wx(lx) { return this.x + lx * 0.95 * (root.W && root.W.flip ? -1 : 1); },
    tick(dt, w) {
      this.cyc += dt; const t = this.cyc % CYC, ev = this.ev;
      if (t < 0.5) this.ev = {};
      if (t > PH.stab + 0.25 && !ev.stab) { ev.stab = 1; if (root.SFX) { SFX.oink(); SFX.squish(); } for (let i = 0; i < 12; i++) w.part({ kind: 'blood', x: this.wx(0.3), y: 0.55, z: this.z + rnd(-0.05, 0.05), vx: rnd(-0.4, 1.4) * (w.flip ? -1 : 1), vy: rnd(0.5, 2.4), vz: rnd(-0.6, 0.6), g: 10, size: rnd(0.03, 0.07), color: '#a50f0f', life: 1 }); }
      if (t > 0.3 && t < PH.stab && Math.random() < dt * 0.5 && root.SFX && !ev.sq) { ev.sq = 1; SFX.oink(); }
      if (t > PH.singe && t < PH.scrape) {   // perzselés: láng és füst a szalmacsóváról
        const sx = this.strawX(t); if (Math.random() < dt * 22) w.part({ kind: 'fire', x: this.wx(sx), y: 0.85 + rnd(-0.05, 0.1), z: this.z + 0.05, vx: rnd(-0.2, 0.2), vy: rnd(0.5, 1.4), vz: 0, g: 0, size: rnd(0.08, 0.16), color: ['#ff5a1f', '#ffb52e', '#ffe34a'][Math.random() * 3 | 0], life: rnd(0.3, 0.6) });
        if (Math.random() < dt * 6) w.part({ kind: 'smoke', x: this.wx(sx), y: 1.0, z: this.z, vx: rnd(-0.2, 0.2), vy: rnd(0.4, 0.9), vz: 0, g: -0.1, drag: 0.6, size: rnd(0.12, 0.22), color: '#5a524a', life: rnd(1.2, 2) });
      }
      if (t > PH.scrape && t < PH.fade && Math.random() < dt * 10) w.part({ kind: 'dot', x: this.wx(this.scrapeX(t)), y: 0.78, z: this.z + 0.05, vx: rnd(-0.6, 0.6), vy: rnd(0.3, 1.2), vz: 0, g: 6, size: 0.02, color: '#3a2618', life: 0.6 });
      this.say -= dt;
      if (this.say <= 0) {
        this.say = rnd(4.5, 7);
        const pigTalk = t < PH.stab + 0.4, txt = pigTalk && Math.random() < 0.5 ? L.pick('pig') : L.pick('butcher');
        this.bub = { text: txt, t: 2.6, t0: 2.6, lx: pigTalk ? 0.35 : 0.3, ly: pigTalk ? -0.95 : -1.75, born: 0, idle: true };
      }
      if (this.bub) { this.bub.t -= dt; if (this.bub.t <= 0) this.bub = null; }
    },
    strawX(t) { return -0.45 + (Math.sin((t - PH.singe) * 1.9) * 0.5 + 0.5) * 0.95; },
    scrapeX(t) { return -0.3 + ((t - PH.scrape) * 1.4 % 1) * 0.7; },
    draw(c, t) {
      const ph = this.cyc % CYC, stabbed = ph > PH.stab + 0.2, alive = ph < PH.dead, kick = !stabbed ? 0.8 : alive ? Math.max(0, 1 - (ph - PH.bleed) / (PH.dead - PH.bleed)) * 1.2 : 0;
      const char = sm(PH.singe, PH.scrape - 0.5, ph), clean = sm(PH.scrape, PH.fade, ph), alpha = ph > PH.fade ? 1 - sm(PH.fade, PH.fade + 0.8, ph) : ph < 0.6 ? sm(0, 0.6, ph) : 1;
      // akasztófa-gerenda a felhasított fél disznóval, alatta vödör
      S.limb(c, 1.5, 0.0, 1.5, -1.6, 0.07, woodD); S.limb(c, 1.45, -1.6, 2.15, -1.6, 0.06, woodD); S.limb(c, 2.1, -1.6, 2.1, 0.0, 0.07, woodD);
      c.save(); c.translate(1.8, -1.05); c.rotate(Math.sin(t * 1.2) * 0.025); S.limb(c, 0, -0.55, 0, -0.38, 0.02, '#4a3a2a');
      S.ell(c, 0, 0, 0.16, 0.42, '#e9a796', 0, 0.022); c.fillStyle = '#b23a2e'; c.beginPath(); c.ellipse(0.03, 0, 0.09, 0.34, 0, 0, TAU); c.fill(); c.fillStyle = '#f5e6d6'; for (let i = 0; i < 5; i++) { c.fillRect(-0.03, -0.24 + i * 0.1, 0.12, 0.02); }
      S.ell(c, 0, 0.42, 0.06, 0.06, '#d48a7a', 0, 0.014); c.restore();
      S.rrect(c, 1.66, -0.16, 0.28, 0.16, 0.03, '#7a5030', 0.02); c.fillStyle = '#9a0e0e'; c.beginPath(); c.ellipse(1.8, -0.16, 0.13, 0.03, 0, 0, TAU); c.fill();
      if (((t * 2.5) | 0) % 2) { c.fillStyle = '#9a0e0e'; c.beginPath(); c.ellipse(1.81, -0.6 + ((t * 2.5) % 1) * 0.42, 0.012, 0.03, 0, 0, TAU); c.fill(); }
      // segéd: a dikó mögött, lefogja (perzseléskor a szalmacsóvát tartja)
      const singe = ph > PH.singe && ph < PH.scrape, sx = this.strawX(ph);
      const helperHands = singe ? [[sx, -0.98], [sx - 0.18, -0.9]] : [[-0.12 + Math.sin(t * 15) * 0.015 * kick, -0.8], [-0.42, -0.74]];
      const hk = person(c, { x: -0.4, skin: '#e6c29a', cloth: '#5a6a3a', hat: 'fur', hands: helperHands, lean: singe ? 0.1 : 0.25, ph: 2.2, expr: stabbed && alive ? 'laugh' : 'idle', rednose: true, kneel: false }, t);
      if (singe) { S.limb(c, hk.hx - 0.1, hk.hy + 0.05, hk.hx + 0.08, hk.hy - 0.08, 0.06, '#d9bd6a'); c.fillStyle = 'rgba(255,170,40,.85)'; c.beginPath(); c.ellipse(hk.hx + 0.1, hk.hy - 0.12, 0.07, 0.11 + Math.sin(t * 20) * 0.02, 0, 0, TAU); c.fill(); }
      // böllér: a dikó mögött, a disznó feje fölött; a késes karja a disznó előtt (szúrás, majd kaparás)
      let kh;
      if (ph < PH.stab) kh = [0.5 + Math.sin(t * 2) * 0.02, -1.05 - Math.sin(t * 2.4) * 0.03];
      else if (ph < PH.stab + 0.5) { const q = sm(PH.stab, PH.stab + 0.25, ph); kh = [0.5 - q * 0.08, -1.05 + q * 0.4]; }
      else if (ph < PH.scrape) kh = [0.62, -0.85];
      else if (ph < PH.fade) kh = [this.scrapeX(ph) + 0.28, -0.88 + Math.abs(Math.sin(ph * 9)) * 0.04];
      else kh = [0.6, -0.9];
      const knifeArm = person(c, { x: 0.32, skin: '#d9a07a', cloth: '#7a2a22', hat: 'cap', apron: stabbed ? 2 : 1, mustache: true, later: true, hands: [kh, [0.05, -0.82]], ph: 0.7, expr: ph > PH.stab && ph < PH.stab + 1 ? 'angry' : 'idle', lean: ph > PH.stab && ph < PH.stab + 0.6 ? -0.15 : 0, teeth: true }, t);
      // dikó (alacsony vágópad)
      S.rrect(c, -0.75, -0.46, 1.25, 0.1, 0.03, wood, 0.022); for (const x of [-0.68, 0.36]) S.limb(c, x, -0.38, x + (x < 0 ? -0.06 : 0.06), 0.0, 0.06, woodD);
      // a disznó
      pig(c, -0.12, -0.67, { kick, dead: !alive, char, clean, alpha, wound: stabbed, squeal: !stabbed || (alive && Math.sin(t * 3) > 0) }, t);
      // segéd keze a disznón (a disznó előtt)
      if (!singe) for (const [hx, hy] of helperHands) S.ell(c, hx, hy, 0.055, 0.05, '#e6c29a', 0, 0.012);
      S.ell(c, 0.05, -0.82, 0.05, 0.05, '#d9a07a', 0, 0.012);
      { const bk = knifeArm(); c.save(); c.translate(bk.hx, bk.hy); c.rotate(ph > PH.stab && ph < PH.scrape ? 2.3 : Math.PI * 0.62); S.poly(c, [[0.0, -0.02], [0.26, -0.015], [0.3, 0.01], [0.0, 0.02]], '#c7ccd3', 0.012); if (ph > PH.stab) { c.fillStyle = '#a01010'; c.fillRect(0.12, -0.015, 0.16, 0.03); } S.rrect(c, -0.1, -0.025, 0.1, 0.05, 0.015, woodD, 0.012); c.restore(); }
      // vérsugár a tálba + az asszony, aki kavarja (hurkának)
      const bleeding = stabbed && ph < PH.dead + 0.3, flow = bleeding ? Math.max(0.15, 1 - (ph - PH.bleed) / 3.6) : 0;
      if (bleeding) { c.strokeStyle = '#9a0c0c'; c.lineCap = 'round'; c.lineWidth = 0.035 * flow + 0.008 * Math.sin(t * 30); c.beginPath(); c.moveTo(0.17, -0.6); c.quadraticCurveTo(0.42, -0.6, 0.46, -0.16); c.stroke(); }
      const filled = sm(PH.bleed, PH.dead, ph) * (ph < PH.fade ? 1 : 1 - sm(PH.fade, CYC, ph));
      const stir = Math.sin(t * 5) * 0.06;
      person(c, { x: 1.02, skin: '#efd2ac', cloth: '#3b5ea6', hat: 'scarf', kneel: true, hands: [[0.5 + stir, -0.3], [0.4, -0.12]], ph: 4.1, expr: 'idle', lean: -0.2 }, t);
      S.ell(c, 0.47, -0.1, 0.17, 0.06, '#c08a4a', 0, 0.018); c.fillStyle = 'rgba(130,8,8,' + (0.3 + filled * 0.65) + ')'; c.beginPath(); c.ellipse(0.47, -0.12, 0.13 * Math.max(0.2, filled), 0.035 * Math.max(0.2, filled), 0, 0, TAU); c.fill();
      S.limb(c, 0.5 + stir, -0.3, 0.46 + stir * 0.5, -0.1, 0.025, woodD);
    },
  };
  /* ---------- 2) Kínzás ---------- */
  const torture = {
    name: 'torture', x: 2.35, z: -7.7, cyc: 0, say: 0, crack: false,
    tick(dt, w) {
      this.cyc += dt; const t = this.cyc % 2.6;
      if (t > 1.45 && !this.crack) { this.crack = true; if (root.SFX) SFX.whoosh(); for (let i = 0; i < 6; i++) w.part({ kind: 'blood', x: this.x + 0.5, y: 0.85, z: this.z, vx: rnd(0.4, 2), vy: rnd(0.5, 2.2), vz: rnd(-0.6, 0.6), g: 9, size: rnd(0.03, 0.07), color: '#a50f0f', life: 0.9 }); this.shk = 0.35; if (Math.random() < 0.4 && root.SFX) SFX.ow(); }
      if (t < 1.0) this.crack = false; if (this.shk > 0) this.shk -= dt;
      if (Math.random() < dt * 8) w.part({ kind: 'fire', x: this.x - 1.15 + rnd(-0.08, 0.08), y: 0.62, z: this.z, vx: rnd(-0.2, 0.2), vy: rnd(0.8, 1.6), vz: 0, g: 0, size: rnd(0.1, 0.18), color: ['#ff5a1f', '#ffb52e', '#ffe34a'][Math.random() * 3 | 0], life: rnd(0.4, 0.7) });
      this.say -= dt; if (this.say <= 0) { this.say = rnd(3.5, 6.5); const who = Math.random() < 0.6 ? 'p' : 't'; this.bub = { text: who === 'p' ? L.pick('prisoner') : L.pick('torturer'), who, t: 2.8, t0: 2.8, lx: who === 'p' ? 0.65 : 1.5, ly: who === 'p' ? -1.55 : -1.6, idle: true }; }
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
    },
  };
  root.Scenes = { list: [butcher, torture] };
})(window);
