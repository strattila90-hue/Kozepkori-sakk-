/* Akciók: lépés-animációk, harc, véres halálnemek, hullaelhurcolás, idle-piszkálódás, végjátékok. */
(function (root) {
  'use strict';
  const W = root.W, S = Sprites, SFX = root.SFX, TAU = Math.PI * 2;
  const { tw, wait, ease, rnd, pick, clamp } = W;
  const OW = ['Au!', 'Jaj!', 'Anyám!', 'Az orrom!', 'Fáj!', 'Segítség!', 'A lábam!', 'Hóóó!', 'Ne már!'];
  const BATTLE = ['Hááá!', 'Megdöglesz!', 'Nyam!', 'Ezt megbánod!', 'Bumm!', 'Hajrá!', 'Vágd meg!'];
  const neckY = e => S.HEIGHT[e.type] * 0.72;
  const scrDir = (a, b) => ((b.x - a.x) * (W.flip ? -1 : 1) >= 0 ? 1 : -1);
  W.idleBusy = 0;

  /* ---------- részecske-segédek ---------- */
  function blood(x, y, z, n, dx, dz, pow) {
    for (let i = 0; i < n; i++) W.part({ kind: 'blood', x, y, z, vx: (dx || 0) * (pow || 2) + rnd(-1.2, 1.2), vy: rnd(1.5, 4.5), vz: (dz || 0) * (pow || 2) + rnd(-1.2, 1.2), g: 11, size: rnd(0.035, 0.08), color: pick(['#a50f0f', '#c01616', '#8a0a0a']), life: 1.4 });
  }
  function fountain(e, dur, power) {
    W.every(dur, 0.025, () => W.part({ kind: 'blood', x: e.x, y: neckY(e) * (e.rot ? 0.6 : 1), z: e.z, vx: rnd(-0.6, 0.6), vy: rnd(2, 4.2) * (power || 1), vz: rnd(-0.6, 0.6), g: 11, size: rnd(0.04, 0.08), color: '#b01212', life: 1.6 }));
  }
  function puff(x, y, z, n, color, big) {
    for (let i = 0; i < n; i++) W.part({ kind: 'smoke', x: x + rnd(-0.1, 0.1), y: y + rnd(0, 0.1), z: z + rnd(-0.1, 0.1), vx: rnd(-0.7, 0.7), vy: rnd(0.2, 1), vz: rnd(-0.5, 0.5), g: -0.2, drag: 1, size: rnd(0.12, 0.2) * (big || 1), color, life: rnd(0.9, 1.6) });
  }
  function sparks(x, y, z) {
    for (let i = 0; i < 8; i++) W.part({ kind: 'spark', x, y, z, vx: rnd(-2, 2), vy: rnd(0.5, 2.5), vz: rnd(-2, 2), g: 6, size: 0.05, color: pick(['#fff3a0', '#ffd04a']), life: 0.4 });
  }
  function toast(t, cls) { if (root.UI && UI.toast) UI.toast(t, cls); }

  /* ---------- mozgás ---------- */
  function hop(e, tx, tz, dur, height, hops) {
    const sx = e.x, sz = e.z; hops = hops || 1; let last = 0;
    W.faceTo(e, tx); e.mv = 1; e.busyAnim = true;
    return tw({ p: 0 }, { p: 1 }, dur, ease.lin, (o) => {
      e.x = sx + (tx - sx) * o.p; e.z = sz + (tz - sz) * o.p;
      e.y = Math.sin(((o.p * hops) % 1) * Math.PI) * height;
      const idx = Math.floor(o.p * hops); if (idx !== last) { last = idx; SFX.step(); }
    }).then(() => { e.x = tx; e.z = tz; e.y = 0; e.mv = 0; e.busyAnim = false; });
  }
  W.hop = hop;

  async function travel(att, to, m) {
    const dist = Math.hypot(to.x - att.x, to.z - att.z), isN = att.type === 'N';
    SFX.hop();
    const jobs = [hop(att, to.x, to.z, isN ? 0.7 : 0.35 + dist * 0.1, isN ? 1.1 : 0.3, isN ? 1 : Math.max(1, Math.round(dist / 1.2)))];
    if (m.castle) {
      const rf = m.castle === 'K' ? m.from + 3 : m.from - 4, rt = m.castle === 'K' ? m.from + 1 : m.from - 1, r = W.pieceAt(rf);
      if (r) { const p = W.sqPos(rt); r.sq = rt; jobs.push(hop(r, p.x, p.z, 0.6, 0.5, 2)); W.say(r, 'Sáncolunk!', 1.2); }
    }
    await Promise.all(jobs);
  }

  async function strike(x, y, ux, uz, o) {
    W.faceTo(x, y.x); x.atk = 0; x.busyAnim = true;
    await tw(x, { atk: 0.5 }, 0.26, ease.lin, (ob, p) => { x.ox = ux * 0.16 * p; x.oz = uz * 0.16 * p; });
    const hx = y.x, hz = y.z, hy = S.HEIGHT[y.type] * 0.55;
    if (o.blood) {
      SFX.stab(); y.hurt = 1; blood(hx, hy, hz, o.lethal ? 22 : 10, ux, uz, 1.5); W.decal(hx + rnd(-0.3, 0.3), hz + rnd(-0.3, 0.3), 0.15);
      W.say(y, pick(OW), 0.9); SFX.ow(); W.shake = Math.max(W.shake, o.lethal ? 0.6 : 0.25);
    } else { SFX.clang(); sparks(hx, hy, hz); y.hurt = 0.6; }
    y.ox = ux * 0.13; y.oz = uz * 0.13;
    await Promise.all([
      tw(x, { atk: 1 }, 0.2, ease.lin, (ob, p) => { x.ox = ux * 0.16 * (1 - p); x.oz = uz * 0.16 * (1 - p); }),
      tw(y, { hurt: 0, ox: 0, oz: 0 }, 0.3),
    ]);
    x.atk = 0; x.ox = 0; x.oz = 0; x.busyAnim = false;
  }

  /* ---------- halál ---------- */
  async function fall(v, dirSign) {
    v.state = 'dead'; v.busyAnim = true; v.cheering = false;
    await tw(v, { rot: 1.5 * dirSign, y: 0 }, 0.45, ease.ein);
    SFX.thud(); W.shake = Math.max(W.shake, 0.3);
    for (let i = 0; i < 3; i++) W.decal(v.x + rnd(-0.4, 0.4), v.z + rnd(-0.3, 0.3), rnd(0.15, 0.35));
    puff(v.x, 0.1, v.z, 4, '#b9a77a', 0.7);
    v.busyAnim = false;
  }
  async function die(v, kind, dirSign, ux, uz) {
    v.busyAnim = true; v.mv = 0;
    if (kind === 'decap' || kind === 'stab') {
      if (kind === 'decap') {
        v.headless = true; SFX.squish();
        W.part({ kind: 'head', x: v.x, y: neckY(v), z: v.z, vx: (ux || 0) * rnd(1, 2.5) + rnd(-1, 1), vy: rnd(3.5, 5.5), vz: (uz || 0) * rnd(1, 2.5) + rnd(-1, 1), vr: rnd(-12, 12), g: 12, life: 14, size: 0.2, skin: v.skin });
      } else { v.expr = 'pain'; SFX.squish(); }
      fountain(v, kind === 'decap' ? 1.3 : 0.9, kind === 'decap' ? 1 : 0.6);
      SFX.scream();
      await wait(kind === 'decap' ? 0.65 : 0.45);
      await fall(v, dirSign);
    } else if (kind === 'gibs') {
      SFX.squish(); setTimeout(() => SFX.squish(), 120);
      const cols = [v.theme.main, v.skin, v.theme.dark, '#c01616', '#8a5a2b'];
      for (let i = 0; i < 14; i++) W.part({ kind: 'gib', x: v.x, y: rnd(0.2, 1), z: v.z, vx: rnd(-3, 3), vy: rnd(2, 6), vz: rnd(-3, 3), vr: rnd(-10, 10), g: 11, size: rnd(0.05, 0.1), color: pick(cols), life: 7 });
      W.part({ kind: 'head', x: v.x, y: neckY(v), z: v.z, vx: rnd(-2, 2), vy: rnd(4, 6), vz: rnd(-2, 2), vr: rnd(-8, 8), g: 12, life: 14, size: 0.2, skin: v.skin });
      blood(v.x, 0.6, v.z, 50, 0, 0, 2.5); puff(v.x, 0.5, v.z, 8, '#c9b680', 1.3);
      for (let i = 0; i < 6; i++) W.decal(v.x + rnd(-0.6, 0.6), v.z + rnd(-0.6, 0.6), rnd(0.15, 0.4));
      v.alpha = 0; v.state = 'dead'; W.shake = 0.8; SFX.scream();
      await wait(0.5);
    } else if (kind === 'launch') {
      SFX.scream(); SFX.whoosh();
      const edge = edgeFor(v.x, v.z, ux, uz), sx = v.x, sz = v.z, spin = rnd(8, 14) * dirSign;
      await tw({ p: 0 }, { p: 1 }, 0.95, ease.lin, (o) => { v.x = sx + (edge.x - sx) * o.p; v.z = sz + (edge.z - sz) * o.p; v.y = Math.sin(o.p * Math.PI) * 4.2; v.rot = spin * o.p; });
      v.rot = 1.5 * dirSign; v.y = 0; v.state = 'dead'; SFX.thud(); puff(v.x, 0.1, v.z, 5, '#b9a77a', 0.8);
    } else { // topple
      v.expr = 'pain'; W.say(v, pick(OW), 1); SFX.scream(); blood(v.x, 0.6, v.z, 18, 0, 0, 1);
      await wait(0.4); await fall(v, dirSign);
    }
    v.busyAnim = false;
  }

  function edgeFor(x, z, ux, uz) {
    const dxm = 4.7 - Math.abs(x), dzm = 4.7 - Math.abs(z);
    if (dxm < dzm) return { x: Math.sign(x || ux || 1) * 5.1, z: z + rnd(-0.4, 0.4) };
    return { x: x + rnd(-0.4, 0.4), z: Math.sign(z || uz || 1) * 5.1 };
  }

  /* ---------- hullaelhurcolás ---------- */
  async function scavenge(b) {
    try {
      const kind = pick(['peasant', 'peasant', 'dog', 'pig']);
      const outX = Math.abs(b.x) >= 4.9 ? Math.sign(b.x) : 0, outZ = Math.abs(b.z) >= 4.9 ? Math.sign(b.z) : 0;
      let actor, crowdMember = null;
      if (kind === 'peasant') {
        let bd = 1e9; for (const c of W.crowd) { if (c.hidden) continue; const d = Math.hypot(c.x - b.x, c.z - b.z); if (d < bd) { bd = d; crowdMember = c; } }
        if (!crowdMember) return;
        crowdMember.hidden = true; const cm = Object.assign({}, crowdMember, { prop: null, cheer: 0 });
        actor = { kind, x: crowdMember.x, z: crowdMember.z, y: 0, face: 1, draw: (c, a, t) => S.crowd(c, cm, t) };
      } else {
        const sx = outZ ? (b.x > 0 ? -1 : 1) * 9.5 : b.x + outX * 0.9, sz = outZ ? b.z + outZ * 0.9 : (b.z > 0 ? -1 : 1) * 9.5;
        actor = { kind, x: sx, z: sz, y: 0, face: 1, mv: 1, seed: Math.random() * 9, draw: (c, a, t) => S.animal(c, a, t) };
      }
      W.actors.push(actor);
      const tx = b.x + outX * 0.85 + (outZ ? 0.0 : 0), tz = b.z + outZ * 0.85;
      const walkTo = async (x, z, dur) => {
        const sx = actor.x, sz = actor.z; actor.face = ((x - sx) * (W.flip ? -1 : 1)) >= 0 ? 1 : -1; actor.mv = 1;
        let n = 0;
        await tw({ p: 0 }, { p: 1 }, dur, ease.lin, (o) => { actor.x = sx + (x - sx) * o.p; actor.z = sz + (z - sz) * o.p; actor.y = Math.abs(Math.sin(o.p * dur * 7)) * 0.05; if (((o.p * dur * 3) | 0) !== n) { n = (o.p * dur * 3) | 0; if (kind === 'peasant') SFX.step(); } });
        actor.mv = 0; actor.y = 0;
      };
      await walkTo(tx, tz, kind === 'peasant' ? 1.6 : 1.2);
      if (kind === 'peasant') {
        actor.say = { text: pick(['Vacsora!', 'Ez még jó!', 'Mehet a levesbe!', 'Hehe, enyém!']), t: 1.5 };
        const bx0 = b.x, bz0 = b.z, ox = outX || 0, oz = outZ || (outX ? 0 : 1);
        const gx = actor.x + ox * 3.2, gz = actor.z + oz * 3.2;
        const sx = actor.x, sz = actor.z; actor.face = (ox * (W.flip ? -1 : 1) >= 0 && ox !== 0) ? 1 : (ox === 0 ? actor.face : -1);
        await tw({ p: 0 }, { p: 1 }, 2.2, ease.lin, (o) => {
          actor.x = sx + (gx - sx) * o.p; actor.z = sz + (gz - sz) * o.p; actor.y = Math.abs(Math.sin(o.p * 20)) * 0.05;
          b.x = actor.x - ox * 0.85; b.z = actor.z - oz * 0.85;
        });
        await Promise.all([tw(actor, { alpha: 0 }, 0.5), tw(b, { alpha: 0 }, 0.5)]);
        crowdMember.hidden = false;
      } else {
        actor.eat = true; actor.mv = 0; actor.face = ((b.x - actor.x) * (W.flip ? -1 : 1)) >= 0 ? 1 : -1;
        if (kind === 'pig') SFX.oink();
        for (let i = 0; i < 3; i++) { SFX.nom(); W.part({ kind: 'gib', x: b.x, y: 0.2, z: b.z, vx: rnd(-1, 1), vy: rnd(1, 2), vz: rnd(-1, 1), vr: 3, g: 9, size: 0.05, color: '#a50f0f', life: 1 }); await wait(0.5); }
        actor.say = { text: pick(['Nyam nyam!', 'Mmm... ropogós!', 'Rrrr!', 'Röf röf!']), t: 1.3 };
        await tw(b, { sy: 0.05, sx: 0.4 }, 1.2);
        actor.mv = 1; actor.eat = false;
      }
      const bi = W.bodies.indexOf(b); if (bi >= 0) W.bodies.splice(bi, 1);
      if (kind !== 'peasant') { const sx = actor.x, sz = actor.z, gx = outZ ? (sx > 0 ? 11 : -11) : sx + outX * 4, gz = outZ ? sz : (sz > 0 ? 11 : -11); actor.face = ((gx - sx) * (W.flip ? -1 : 1)) >= 0 ? 1 : -1; await tw({ p: 0 }, { p: 1 }, 2, ease.lin, (o) => { actor.x = sx + (gx - sx) * o.p; actor.z = sz + (gz - sz) * o.p; }); }
      const ai = W.actors.indexOf(actor); if (ai >= 0) W.actors.splice(ai, 1);
    } catch (e) { console.warn('scavenge', e); }
  }

  /* ---------- lépés lejátszása ---------- */
  async function fight(att, v, m) {
    const to = W.sqPos(m.to);
    const dx = v.x - att.x, dz = v.z - att.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist, isN = att.type === 'N';
    SFX.hop();
    await hop(att, v.x - ux * 0.9, v.z - uz * 0.9, isN ? 0.65 : 0.3 + dist * 0.09, isN ? 1 : 0.3, isN ? 1 : Math.max(1, Math.round(dist / 1.2)));
    W.faceTo(att, v.x); W.faceTo(v, att.x);
    W.say(att, pick(BATTLE), 1.1); W.setCheer(3.5); SFX.cheer();
    await wait(0.25);
    const rounds = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < rounds; i++) {
      await strike(att, v, ux, uz, { blood: true });
      if (Math.random() < 0.65) await strike(v, att, -ux, -uz, { blood: false });
    }
    await strike(att, v, ux, uz, { blood: true, lethal: true });
    const kind = pick(['decap', 'decap', 'stab', 'launch', 'gibs', 'topple']);
    const dirS = scrDir(att, v);
    await die(v, kind, dirS, ux, uz);
    // az áldozat kikerül a játékból, a támadó beáll a helyére
    W.pieces.splice(W.pieces.indexOf(v), 1);
    if (kind !== 'gibs') {
      W.bodies.push(v);
      const jobs = [hop(att, to.x, to.z, 0.35, 0.3, 1)];
      if (kind !== 'launch') {
        const edge = edgeFor(v.x, v.z, ux, uz), sx = v.x, sz = v.z; SFX.whoosh();
        jobs.push(tw({ p: 0 }, { p: 1 }, 0.75, ease.eout, (o) => { v.x = sx + (edge.x - sx) * o.p; v.z = sz + (edge.z - sz) * o.p; v.y = Math.sin(o.p * Math.PI) * 0.7; }).then(() => { v.y = 0; }));
      }
      await Promise.all(jobs);
      scavenge(v);
    } else {
      await hop(att, to.x, to.z, 0.35, 0.3, 1);
      const pile = { kind: 'pile', x: v.x, z: v.z, y: 0, face: 1, alpha: 1, sh: 0.4, draw: (c, a, t) => { S.ell(c, 0, -0.04, 0.35, 0.1, '#8a0a0a', 0, 0.02); S.ell(c, -0.1, -0.1, 0.12, 0.08, v.theme.main, 0.3, 0.03); S.ell(c, 0.12, -0.08, 0.08, 0.06, v.skin, 0, 0.03); c.fillStyle = '#efe9d8'; c.fillRect(0.0, -0.16, 0.2, 0.05); } };
      W.actors.push(pile);
      setTimeout(() => scavengePile(pile), 600);
    }
    W.setCheer(2.5); SFX.cheer();
  }
  async function scavengePile(pile) {
    // egy kutya vagy malac eszi meg a maradékot
    try {
      const kind = pick(['dog', 'pig']), sx = pile.x > 0 ? -9.5 : 9.5;
      const a = { kind, x: sx, z: pile.z + 0.9, y: 0, face: 1, mv: 1, seed: Math.random() * 9, draw: (c, ac, t) => S.animal(c, ac, t) }; W.actors.push(a);
      const x0 = a.x; a.face = ((pile.x - 0.9 - x0) * (W.flip ? -1 : 1)) >= 0 ? 1 : -1;
      await tw(a, { x: pile.x + (sx > 0 ? 0.8 : -0.8), z: pile.z + 0.4 }, 1.6, ease.lin); a.mv = 0; a.eat = true;
      for (let i = 0; i < 3; i++) { SFX.nom(); await wait(0.5); }
      await tw(pile, { alpha: 0 }, 0.8); a.eat = false; a.mv = 1; a.say = { text: pick(['Nyam!', 'Röf!']), t: 1 };
      const i1 = W.actors.indexOf(pile); if (i1 >= 0) W.actors.splice(i1, 1);
      a.face = -a.face; await tw(a, { x: a.x + (sx > 0 ? -11 : 11) }, 2, ease.lin);
      const i2 = W.actors.indexOf(a); if (i2 >= 0) W.actors.splice(i2, 1);
    } catch (e) { console.warn(e); }
  }

  W.playMove = async function (m) {
    while (W.idleBusy > 0) await wait(0.05);
    W.busy = true; W.hl.sel = -1; W.hl.targets = []; W.hl.check = -1;
    try {
      const att = W.pieceAt(m.from); if (!att) return;
      att.busyAnim = false;
      const to = W.sqPos(m.to);
      const victim = m.cap ? W.pieceAt(m.capSq) : null;
      if (victim) await fight(att, victim, m); else await travel(att, to, m);
      att.sq = m.to; att.x = to.x; att.z = to.z; att.y = 0;
      if (m.promo) {
        att.type = m.promo.toUpperCase(); SFX.ding(); puff(att.x, 0.6, att.z, 14, '#fff3c0', 1.6); W.say(att, 'Előléptettek!', 1.6);
        await tw(att, { sy: 1.25 }, 0.12); await tw(att, { sy: 1 }, 0.2);
      }
      W.hl.last = [m.from, m.to];
      if (m.check) {
        const k = W.king(m.color === 'w' ? 'b' : 'w'); SFX.check();
        if (k) { W.hl.check = k.sq; W.say(k, pick(['Segítség!', 'Jaj nekem!', 'Őrség!']), 1.8); k.hurt = 0.6; setTimeout(() => { k.hurt = 0; }, 900); }
        toast(m.status === 'checkmate' ? 'SAKK-MATT!' : 'SAKK!', 'bad');
      }
    } finally { W.busy = false; }
  };

  /* ---------- idle piszkálódás ---------- */
  function adjacentEnemies() {
    const ps = W.pieces.filter(e => e.state !== 'dead' && !e.busyAnim), out = [];
    for (const a of ps) for (const b of ps) if (a.color !== b.color && Math.abs(a.x - b.x) <= 1.1 && Math.abs(a.z - b.z) <= 1.1) out.push([a, b]);
    return out;
  }
  async function poke(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    a.busyAnim = b.busyAnim = true; W.faceTo(a, b.x); W.faceTo(b, a.x);
    a.atk = 0; await tw(a, { atk: 0.5 }, 0.24, ease.lin, (o, p) => { a.ox = ux * 0.13 * p; a.oz = uz * 0.13 * p; });
    if (Math.random() < 0.7) { SFX.stab(); b.hurt = 1; blood(b.x, 0.6, b.z, 4, ux, uz, 1); W.say(b, pick(OW), 0.9); if (Math.random() < 0.4) SFX.ow(); }
    else { SFX.clang(); sparks(b.x - ux * 0.3, 0.6, b.z - uz * 0.3); W.say(b, pick(['Ha!', 'Nem találtál!', 'Hmpf!']), 0.9); }
    await Promise.all([tw(a, { atk: 1 }, 0.2, ease.lin, (o, p) => { a.ox = ux * 0.13 * (1 - p); a.oz = uz * 0.13 * (1 - p); }), tw(b, { hurt: 0 }, 0.4)]);
    a.atk = 0; a.ox = a.oz = 0;
    if (Math.random() < 0.5) { await wait(0.1); b.atk = 0; await tw(b, { atk: 0.55 }, 0.28, ease.lin); SFX.clang(); await tw(b, { atk: 1 }, 0.2, ease.lin); b.atk = 0; a.hurt = 0.5; await tw(a, { hurt: 0 }, 0.3); }
    a.busyAnim = b.busyAnim = false;
  }
  async function pfff(e) {
    e.busyAnim = true; SFX.fart(Math.random() < 0.2); W.say(e, pick(['Pfrrrt!', 'Prüüt!', 'Ppppt!', 'Hoppá!']), 1.1);
    const back = -e.face * (W.flip ? -1 : 1) * 0.3;
    puff(e.x + back, 0.3, e.z, 9, pick(['#b9c24a', '#a8b83c', '#c9c870']), 1);
    for (const o of W.pieces) if (o !== e && o.state !== 'dead' && Math.hypot(o.x - e.x, o.z - e.z) < 1.7) { o.hurt = 0.7; W.say(o, pick(['Fúúúj!', 'Te állat!', 'Pfúj!']), 1.2); }
    await wait(0.9);
    for (const o of W.pieces) if (!o.busyAnim) o.hurt = 0;
    e.busyAnim = false;
  }
  async function honk(e) { e.busyAnim = true; SFX.honk(); W.say(e, 'HÖÖÖNK!', 1.2); for (let i = 0; i < 6; i++) W.part({ kind: 'dot', x: e.x + e.face * 0.2, y: 0.8, z: e.z, vx: rnd(0.2, 1) * e.face, vy: rnd(0.5, 1.5), vz: rnd(-0.3, 0.3), g: 8, size: 0.03, color: '#c8d890', life: 0.7 }); await wait(0.9); e.busyAnim = false; }
  async function laugh(e) { e.busyAnim = true; e.expr = 'laugh'; SFX.laugh(); W.say(e, pick(['Hehehe!', 'Muhaha!', 'Ejnye!']), 1.2); await tw(e, { y: 0.15 }, 0.15); await tw(e, { y: 0 }, 0.15); await wait(0.9); e.expr = 'idle'; e.busyAnim = false; }
  async function burp(e) { e.busyAnim = true; SFX.burp(); W.say(e, 'BÖÖÖFF!', 1.2); puff(e.x + e.face * 0.3, 0.8, e.z, 4, '#c9d89a', 0.7); await wait(0.9); e.busyAnim = false; }
  W.emote = function (color, kind) {
    const k = W.king(color); if (!k || k.busyAnim) { if (kind === 'fart') SFX.fart(); return; }
    ({ fart: pfff, nose: honk, laugh, burp }[kind] || pfff)(k);
  };
  W.onTick = function (dt) {
    if (W.godHand > 0 && !W.godOn) W.godHand = Math.max(0, W.godHand - dt * 2);
    if (W.godOn) W.godHand = Math.min(1, W.godHand + dt * 2);
    if (W.busy || W.ending || !W.idleOn) return;
    W.idleT -= dt; if (W.idleT > 0) return;
    W.idleT = rnd(1.6, 3.6);
    const ps = W.pieces.filter(e => e.state !== 'dead' && !e.busyAnim); if (ps.length < 3) return;
    W.idleBusy++;
    const done = () => { W.idleBusy--; };
    const r = Math.random(); let p;
    const pairs = r < 0.5 ? adjacentEnemies().filter(([a, b]) => !a.busyAnim && !b.busyAnim) : [];
    if (pairs.length) { const [a, b] = pick(pairs); p = poke(a, b); }
    else { const e = pick(ps); p = (r < 0.72 ? pfff : r < 0.82 ? honk : r < 0.92 ? laugh : burp)(e); }
    p.then(done, done);
  };

  /* ---------- végjátékok ---------- */
  async function celebrate(color) {
    const k = W.king(color); SFX.fanfare(); setTimeout(() => SFX.cheer(), 600); W.setCheer(60);
    for (const e of W.pieces) if (e.color === color && e.state !== 'dead') { e.cheering = true; e.expr = 'cheer'; }
    W.every(6, 0.03, () => W.part({ kind: 'conf', x: rnd(-5, 5), y: rnd(5, 7), z: rnd(-4.5, 4.5), vx: rnd(-0.5, 0.5), vy: rnd(-1, 0), vz: 0, g: 1.2, vr: rnd(-6, 6), size: 0.06, color: pick(['#e2ae2c', '#b3261e', '#f2e8c8', '#3a8a3a', '#2a5aa8']), life: 5 }));
    if (k) {
      W.crownFx = { x: k.x, y: 6.5, z: k.z };
      await tw(W.crownFx, { y: S.HEIGHT.K + 0.5 }, 1.4, ease.eout);
      k.crown = true; W.crownFx = null; SFX.ding(); W.say(k, 'Én vagyok a király!', 2);
      puff(k.x, 1.8, k.z, 10, '#fff3c0', 1.4);
    }
  }
  async function burnDie(e) {
    e.busyAnim = true; e.burn = 1; SFX.scream();
    for (let i = 0; i < 4; i++) { W.say(e, pick(['AAAA!', 'Ég a fenekem!', 'Segítség!']), 0.6); await hop(e, clamp(e.x + rnd(-1.2, 1.2), -3.5, 3.5), clamp(e.z + rnd(-1.2, 1.2), -3.5, 3.5), 0.35, 0.35, 1); }
    e.state = 'dead'; e.cheering = false; await tw(e, { rot: pick([-1.5, 1.5]) }, 0.4, ease.ein); SFX.thud();
    W.every(3, 0.08, () => W.part({ kind: 'smoke', x: e.x + rnd(-0.3, 0.3), y: 0.2, z: e.z, vx: rnd(-0.1, 0.1), vy: 0.6, vz: 0, g: 0, drag: 0.5, size: 0.12, color: '#3a3532', life: 1.3 }));
    e.busyAnim = false;
  }
  async function dragonFate(loser) {
    const dir = W.flip ? -1 : 1, ps = W.pieces.filter(e => e.color === loser);
    const zr = ps.reduce((s, e) => s + e.z, 0) / (ps.length || 1);
    const d = W.dragonFx = { x: -13 * dir, y: 3.6, z: zr, face: 1, breath: false };
    SFX.roar(); toast('Sárkány érkezik!', 'bad');
    await tw(d, { x: -5 * dir, y: 3 }, 1.6, ease.lin);
    d.breath = true; SFX.fire(); SFX.roar();
    const done = [];
    W.every(3.6, 0.02, () => {
      const mx = d.x + dir * 1.7;
      W.part({ kind: 'fire', x: mx, y: d.y + 0.2, z: d.z + rnd(-0.4, 0.4), vx: dir * rnd(1.5, 3.5), vy: rnd(-3.5, -1.5), vz: rnd(-0.6, 0.6), g: 0, size: rnd(0.2, 0.4), color: pick(['#ff5a1f', '#ffb52e', '#ffe34a']), life: 0.7 });
      for (const e of ps) if (!done.includes(e) && Math.abs(mx + dir * 0.7 - e.x) < 1.1) { done.push(e); burnDie(e); }
    });
    await tw(d, { x: 6 * dir }, 3.6, ease.lin);
    d.breath = false;
    await tw(d, { x: 16 * dir, y: 5 }, 1.6, ease.lin);
    W.dragonFx = null;
    for (const e of ps) if (!done.includes(e)) await burnDie(e);
    while (ps.some(e => e.busyAnim)) await wait(0.2);
  }
  async function axeFate(loser) {
    const dir = W.flip ? -1 : 1, k = W.king(loser);
    const ex = { kind: 'axe', x: -9 * dir, z: k.z, y: 0, face: 1, raise: 0, swing: 0, scale: 1.3, draw: (c, a, t) => S.executioner(c, a, t), sh: 0.5 };
    W.actors.push(ex); toast('Jön a hóhér!', 'bad'); SFX.bell();
    const walk = async (x, z, dur) => { let n = 0; await tw(ex, { x, z }, dur, ease.lin, (o, p) => { ex.y = Math.abs(Math.sin(p * dur * 6)) * 0.06; if (((p * dur * 3) | 0) !== n) { n = (p * dur * 3) | 0; SFX.step(); } }); ex.y = 0; };
    await walk(k.x - 1.0 * dir, k.z, 2.6);
    const chop = async (e, fast) => {
      ex.raise = 1; ex.swing = 0; await tw(ex, { swing: -0.25 }, fast ? 0.12 : 0.35, ease.eio);
      await tw(ex, { swing: 0.85 }, fast ? 0.1 : 0.16, ease.lin); SFX.chop();
      die(e, 'decap', dir, dir, 0); await tw(ex, { swing: 0.4 }, fast ? 0.1 : 0.25); ex.raise = 0;
    };
    W.say(k, 'Kegyelem!', 1.4); await wait(1.0);
    await chop(k, false); W.setCheer(5); SFX.cheer(); await wait(1.0);
    const rest = W.pieces.filter(e => e.color === loser && e !== k).sort((a, b) => dir * (a.x - b.x) || a.z - b.z);
    for (const e of rest) { e.busyAnim = true; await walk(e.x - 1.0 * dir, e.z, 0.22); await chop(e, true); }
    await wait(1.2);
    await walk(12 * dir, ex.z, 2.5);
    const i = W.actors.indexOf(ex); if (i >= 0) W.actors.splice(i, 1);
    while (W.pieces.some(e => e.busyAnim)) await wait(0.2);
  }
  async function stabFate(loser) {
    const ps = W.pieces.filter(e => e.color === loser).sort(() => Math.random() - 0.5); toast('A parasztok egymásnak esnek!', 'bad');
    const pair = async (a, b) => {
      a.busyAnim = b.busyAnim = true;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
      await Promise.all([hop(a, mx - ux * 0.45, mz - uz * 0.45, 0.45, 0.3, 1), hop(b, mx + ux * 0.45, mz + uz * 0.45, 0.45, 0.3, 1)]);
      a.busyAnim = b.busyAnim = true;
      W.faceTo(a, b.x); W.faceTo(b, a.x); W.say(a, pick(['Te áruló!', 'Ez a tiéd!', 'Régi tartozás!']), 0.9);
      await Promise.all([tw(a, { atk: 0.5 }, 0.3, ease.lin), tw(b, { atk: 0.5 }, 0.3, ease.lin)]);
      SFX.stab(); blood(b.x, 0.75, b.z, 14, ux, uz, 1.2); blood(a.x, 0.75, a.z, 14, -ux, -uz, 1.2);
      await Promise.all([tw(a, { atk: 1 }, 0.2, ease.lin), tw(b, { atk: 1 }, 0.2, ease.lin)]); a.atk = b.atk = 0;
      a.expr = b.expr = 'pain'; a.cheering = b.cheering = false;
      await Promise.all([die(a, 'stab', scrDir(b, a), -ux, -uz), die(b, 'stab', scrDir(a, b), ux, uz)]);
    };
    const jobs = [];
    while (ps.length >= 2) { const a = ps.pop(), b = ps.pop(); jobs.push(pair(a, b)); await wait(0.5); }
    if (ps.length) { const a = ps[0]; a.busyAnim = true; W.say(a, 'Egyedül maradtam... jaj!', 1.4); await wait(1.2); W.faceTo(a, a.x + 1); a.atk = 0; await tw(a, { atk: 0.5 }, 0.3, ease.lin); SFX.stab(); await tw(a, { atk: 1 }, 0.2, ease.lin); a.atk = 0; await die(a, 'stab', 1, 1, 0); }
    await Promise.all(jobs);
  }
  async function plagueFate() {
    toast('A Fekete Halál mindenkit elvitt...', 'bad'); SFX.funeral(); SFX.bell();
    W.fog = 0; tw(W, { fog: 1 }, 2.5);
    const sk = { kind: 'skel', x: 0, z: -9, y: 0, face: 1, mv: 1, seed: 3, scythe: true, scale: 1.3, draw: (c, a, t) => S.skeleton(c, a, t), sh: 0.5 };
    W.actors.push(sk); await tw(sk, { z: -0.5 }, 3, ease.lin);
    const all = W.pieces.slice().sort(() => Math.random() - 0.5);
    for (const e of all) {
      e.busyAnim = true; e.expr = 'pain'; e.cheering = false; e.hurt = 0.8;
      for (let i = 0; i < 7; i++) W.part({ kind: 'dot', x: e.x, y: 0.8, z: e.z, vx: rnd(-0.5, 0.5) + e.face, vy: rnd(0.5, 1.5), vz: rnd(-0.3, 0.3), g: 8, size: 0.05, color: '#9bbf3a', life: 0.8 });
      W.say(e, pick(['Bleeee!', 'Pestis...', 'Rosszul vagyok']), 0.8); SFX.burp();
      die(e, 'topple', pick([-1, 1])); await wait(0.22);
    }
    await wait(1.5); sk.face = -1; await wait(1.5);
  }
  W.playEnding = async function (res) {
    while (W.idleBusy > 0 || W.busy) await wait(0.1);
    W.ending = true; W.busy = true; W.hl.sel = -1; W.hl.targets = [];
    try {
      if (res.winner) {
        const loser = res.winner === 'w' ? 'b' : 'w';
        await celebrate(res.winner); await wait(2.2);
        const fate = W.debugFate || pick(['dragon', 'axe', 'stab']);
        await ({ dragon: dragonFate, axe: axeFate, stab: stabFate }[fate])(loser);
        SFX.cheer();
      } else await plagueFate();
      await wait(1.2);
    } catch (e) { console.error(e); }
    W.busy = false;
  };

  W.idleOn = true;
})(window);
