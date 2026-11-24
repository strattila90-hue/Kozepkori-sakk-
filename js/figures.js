/* Festett figurák (assets/figs): nézetválasztás (elöl/hátul/oldal), animáció, seregszín, fejlevágás. */
(function (root) {
  'use strict';
  const S = Sprites, TAU = Math.PI * 2;
  /* Arányos magasságok (fejtető-talp, világegységben; 1 egység = 1 mező): gyalog < bástya < futó < királynő < király, a lovas lovastul a legmagasabb. */
  const HEIGHT = { P: 1.25, R: 1.4, B: 1.55, N: 1.8, Q: 1.75, K: 1.85 };
  const SIDE_LEFT = { K: true, Q: true, N: true, B: true, R: false, P: false };      // az oldalnézeti kép merre néz
  const HEAD = { // fej-téglalap a kép arányában [x0,y0,x1,y1]
    front: { K: [.18, 0, .82, .28], Q: [.2, 0, .8, .2], P: [.1, 0, .9, .37], B: [.3, 0, .8, .2], N: [.36, 0, .62, .2], R: [.12, 0, .88, .33] },
    back:  { K: [.2, 0, .8, .25], Q: [.25, 0, .75, .22], P: [.2, 0, .9, .33], B: [.3, 0, .7, .17], N: [.5, 0, .74, .13], R: [.1, 0, .9, .33] },
    side:  { K: [.15, 0, .7, .27], Q: [.25, 0, .85, .22], P: [.1, 0, .8, .38], B: [.3, 0, .8, .2], N: [.32, 0, .64, .26], R: [.1, 0, .9, .35] },
  };
  const LEG = { P: 0.2, R: 0.18, N: 0.36 };   // a lábrész aránya a kép aljából (lépés-animáció); palástosoknál (K, Q, B) nincs láb-vágás, csak ringatózás      // a lábrész aránya a kép aljából (a lépés-animációhoz)
  const SHOULDER = { P: 0.47, R: 0.56, B: 0.62, N: 0.72, Q: 0.66, K: 0.64 };
  const WEAPON = { P: [0.2, 'dagger'], R: [0.42, 'spear'], B: [0.24, 'dagger'], N: [0.36, 'sword'], Q: [0.28, 'sword'], K: [0.32, 'sword'] };
  const ARMY_COLOR = { white: '#e6f3ff', black: '#7a3af0', red: '#ff3a2a', gold: '#ffc200' };
  const imgs = {}, sil = {}, loading = {}; let meta = {};
  const F = { ready: false, HEIGHT, ARMY_COLOR };
  Object.assign(S.HEIGHT, HEIGHT);

  function key(t, v, a) { return t + '_' + v + '_' + a; }
  /* A talapzat levágása után a fej-téglalap arányai változnak: x' = (x - xo) * xr, y' = y * ratio (meta.json, tools/make_sprites.py) */
  function hrect(v, t) {
    const r = HEAD[v][t], m = meta[t + '_' + v]; if (!m) return r.slice();
    const cl = q => Math.max(0, Math.min(1, q));
    return [cl((r[0] - m.xo) * m.xr), cl(r[1] * m.ratio), cl((r[2] - m.xo) * m.xr), cl(r[3] * m.ratio)];
  }
  F.load = function (armies) {
    const jobs = [];
    if (!F._metaP) F._metaP = fetch('assets/figs/meta.json').then(r => r.json()).then(j => { meta = j; }).catch(() => {});
    jobs.push(F._metaP);
    for (const a of armies) {
      if (loading[a]) { jobs.push(loading[a]); continue; }
      const list = [];
      for (const t of 'KQPBNR') for (const v of ['front', 'back', 'side']) {
        list.push(new Promise(res => { const im = new Image(); im.onload = () => { imgs[key(t, v, a)] = im; res(); }; im.onerror = () => res(); im.src = 'assets/figs/' + key(t, v, a) + '.webp'; }));
      }
      loading[a] = Promise.all(list); jobs.push(loading[a]);
    }
    return Promise.all(jobs).then(() => { F.ready = true; });
  };
  F.has = (a) => !!imgs[key('K', 'front', a)];

  function view(e) {
    const flip = root.W.flip, bottom = flip ? 'b' : 'w';
    if (e.dir && (e.dirT || 0) > 0) {
      const sx = e.dir.x * (flip ? -1 : 1), sz = e.dir.z * (flip ? -1 : 1);
      if (Math.abs(sx) >= 0.6 * Math.abs(sz) && Math.abs(sx) > 0.01) return { v: 'side', mirror: (sx < 0) !== SIDE_LEFT[e.type] };
      if (sz < 0) return { v: 'back', mirror: false };
      if (sz > 0) return { v: 'front', mirror: false };
    }
    return { v: e.color === bottom ? 'back' : 'front', mirror: false };
  }
  function silhouette(im, k, col) {
    col = col || '#ff2a1a'; const kk = k + col; if (sil[kk]) return sil[kk];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return (sil[kk] = c);
  }
  F.headInfo = function (e) {
    const vw = view(e), k = key(e.type, vw.v, e.theme.id), im = imgs[k]; if (!im) return null;
    const r = hrect(vw.v, e.type); let [x0, y0, x1, y1] = r; if (vw.mirror) { const t = 1 - x1; x1 = 1 - x0; x0 = t; }
    const hu = HEIGHT[e.type] / im.height;
    return { img: im, sx: x0 * im.width, sy: y0 * im.height, sw: (x1 - x0) * im.width, sh: (y1 - y0) * im.height, w: (x1 - x0) * im.width * hu, h: (y1 - y0) * im.height * hu, mirror: vw.mirror };
  };

  /** Rajzolás: az origó a figura talpa (a talapzat közepe), 1 egység = 1 mező. Visszatér: igaz, ha figurát rajzolt. */
  F.draw = function (ctx, e) {
    const vw = view(e), armyId = e.theme.id, k = key(e.type, vw.v, armyId), im = imgs[k]; if (!im) return false;
    const hu = HEIGHT[e.type] / im.height, w = im.width * hu, h = HEIGHT[e.type], t = e.T || 0, sw = Math.sin(t * 2.2 + e.ph), burn = e.burn || 0;
    let tilt = 0, lunge = 0;
    if (e.atk > 0.001) { const a = e.atk, dir = (e.dir ? (e.dir.x * (root.W.flip ? -1 : 1) >= 0 ? 1 : -1) : 1); const m = a < 0.4 ? -0.28 * (a / 0.4) : a < 0.55 ? -0.28 + 0.78 * ((a - 0.4) / 0.15) : 0.5 * (1 - (a - 0.55) / 0.45); tilt = m * dir; lunge = a < 0.4 ? 0 : a < 0.55 ? (a - 0.4) / 0.15 : 1 - (a - 0.55) / 0.45; }
    const wob = (e.mv > 0 ? Math.sin(e.wp || 0) * (LEG[e.type] ? 0.035 : 0.08) : 0) + (burn > 0 && burn < 1 ? Math.sin(t * 38 + e.ph) * 0.05 : 0);
    ctx.save();
    ctx.rotate((e.rot || 0) + tilt + wob);
    const stretch = 1 + lunge * 0.1, squash = 1 - lunge * 0.06;
    ctx.scale(e.sx * (1 - sw * 0.008) * squash, e.sy * (1 + sw * 0.012) * stretch);
    if (e.hurt > 0.05) ctx.translate((Math.random() - 0.5) * 0.07 * e.hurt, 0);
    ctx.scale(vw.mirror ? -1 : 1, 1);
    const hd = hrect(vw.v, e.type), x0 = hd[0], y0 = hd[1], x1 = hd[2], y1 = hd[3];
    const hx = -w / 2 + x0 * w, hy = -h + y0 * h, hw = (x1 - x0) * w, hh = (y1 - y0) * h;
    // test: a nyak körüli lyuk kimarad a testből, a fej külön forog. Járás közben a lábrész két félre vágva, felváltva lép.
    const walking = e.mv > 0 && e.state !== 'dead' && burn < 0.04 && !(e.hurt > 0.05) && !!LEG[e.type], lf = LEG[e.type] || 0.2;
    ctx.save(); ctx.beginPath(); ctx.rect(-w, -h * 1.4, w * 2, walking ? h * (1.4 - lf) + 0.01 : h * 1.8); ctx.rect(hx, hy, hw, hh); ctx.clip('evenodd'); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
    if (walking) {
      const sy0 = im.height * (1 - lf), ov = 0.012;
      for (let i = 0; i < 2; i++) {
        const sp = Math.sin((e.wp || 0) + i * Math.PI), lift = Math.max(0, sp) * h * 0.035, sw = sp * w * 0.04, rot = sp * 0.05 * (i ? 1 : -1);
        ctx.save(); ctx.translate(-w / 2 + (i + 0.5) * w / 2 + sw, -h * lf - lift); ctx.rotate(rot);
        ctx.drawImage(im, i * im.width / 2, sy0 - ov * im.height / h, im.width / 2, im.height * lf + ov * im.height / h, -w / 4, -ov, w / 2, h * lf + ov); ctx.restore();
      }
    }
    if (!e.headless) {
      let rot = Math.sin(t * 1.7 + e.ph * 2) * 0.035, dx = 0, dy = 0;
      if (e.atk > 0.001) { rot += lunge * 0.22 - (e.atk < 0.4 ? 0.12 * e.atk / 0.4 : 0); dx += lunge * 0.05; dy += lunge * 0.03; }
      if (e.hurt > 0.05) { rot += -0.32 * e.hurt + Math.sin(t * 40) * 0.05 * e.hurt; dx -= 0.06 * e.hurt; dy -= 0.03 * e.hurt; }
      if (e.expr === 'cheer' || e.cheering) rot += Math.sin(t * 9 + e.ph) * 0.09;
      if (burn > 0 && burn < 1) { rot += Math.sin(t * 30 + e.ph) * 0.12; dy -= Math.abs(Math.sin(t * 14)) * 0.03; }
      if (e.state === 'dead') rot += 0.18;
      ctx.save(); ctx.translate(hx + hw / 2 + dx, hy + hh + dy); ctx.rotate(rot); ctx.translate(-(hx + hw / 2), -(hy + hh));
      ctx.drawImage(im, x0 * im.width, y0 * im.height, (x1 - x0) * im.width, (y1 - y0) * im.height, hx, hy, hw, hh);
      if (burn > 0.04) { ctx.globalAlpha = Math.min(0.95, burn * 1.1); ctx.drawImage(silhouette(im, k, '#14100d'), x0 * im.width, y0 * im.height, (x1 - x0) * im.width, (y1 - y0) * im.height, hx, hy, hw, hh); ctx.globalAlpha = 1; }
      ctx.restore();
    } else {
      // nyakcsonk: vörös seb + nyakcsőből kilátszó csont
      ctx.beginPath(); ctx.ellipse(hx + hw / 2, hy + hh * 0.98, hw * 0.28, hh * 0.1, 0, 0, TAU); ctx.fillStyle = '#a30f0f'; ctx.fill(); ctx.lineWidth = 0.02; ctx.strokeStyle = '#2b0505'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx + hw / 2, hy + hh * 0.97, hw * 0.1, hh * 0.04, 0, 0, TAU); ctx.fillStyle = '#f0dfc0'; ctx.fill();
    }
    if (e.atk > 0.001 && e.state !== 'dead') stabArm(ctx, e, w, h, vw);
    if (burn > 0.04) {
      const dk = silhouette(im, k, '#14100d'); ctx.save(); ctx.beginPath(); ctx.rect(-w, -h * 1.4, w * 2, h * 1.8); ctx.rect(hx, hy, hw, hh); ctx.clip('evenodd');
      ctx.globalAlpha = Math.min(0.95, burn * 1.1); ctx.drawImage(dk, -w / 2, -h, w, h); ctx.restore(); ctx.globalAlpha = 1;
      if (burn < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * (1 - burn) * (0.7 + 0.3 * Math.sin(t * 25 + e.ph)); ctx.drawImage(silhouette(im, k, '#ff6a10'), -w / 2, -h, w, h); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    }
    if (e.hurt > 0.05) { ctx.globalAlpha = Math.min(0.6, e.hurt * 0.55); ctx.drawImage(silhouette(im, k, '#ff2a1a'), -w / 2, -h, w, h); ctx.globalAlpha = 1; }
    ctx.restore();
    return true;
  };
  /* Szúró kar: támadáskor a bábu váll-magasságából kinyúló kar fegyverrel. Hátralendül (felhúzza), előrecsap, visszahúzza. */
  function stabArm(ctx, e, w, h, vw) {
    const a = e.atk, flip = root.W.flip, dirS = e.dir ? (e.dir.x * (flip ? -1 : 1) >= 0 ? 1 : -1) : (e.face || 1);
    const fwd = vw.v === 'side' ? (SIDE_LEFT[e.type] ? -1 : 1) : dirS * (vw.mirror ? -1 : 1);
    const lerp = (x, y, t) => x + (y - x) * Math.max(0, Math.min(1, t));
    const ang = a < 0.4 ? lerp(0.55, -1.25, a / 0.4) : a < 0.55 ? lerp(-1.25, 0.08, (a - 0.4) / 0.15) : lerp(0.08, 0.6, (a - 0.55) / 0.45);
    const lunge = a < 0.4 ? 0 : a < 0.55 ? (a - 0.4) / 0.15 : 1 - (a - 0.55) / 0.45, alpha = Math.min(1, a * 8, (1 - a) * 8);
    const isN = e.type === 'N', shx = fwd * (isN ? 0.04 : w * 0.14), shy = -h * (SHOULDER[e.type] || 0.6), L = 0.15 + 0.13 * lunge;
    const vx = fwd * Math.cos(ang), vy = Math.sin(ang), hxp = shx + vx * L, hyp = shy + vy * L, [bl, kind] = WEAPON[e.type] || [0.24, 'dagger'];
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
    const stroke = (x1, y1, x2, y2, wd, col) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = S.OL; ctx.lineWidth = wd + 0.018; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.stroke(); };
    stroke(shx, shy, hxp, hyp, 0.048, S.mixc(e.theme.main, -0.12));
    const tx = hxp + vx * bl, ty = hyp + vy * bl, px = -vy * fwd, py = vx * fwd;
    const tri = (pts, col) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = S.OL; ctx.lineWidth = 0.009; ctx.stroke(); };
    if (kind === 'spear') { stroke(hxp - vx * 0.15, hyp - vy * 0.15, tx, ty, 0.016, '#7a5030'); tri([[tx + px * 0.025, ty + py * 0.025], [tx + vx * 0.1, ty + vy * 0.1], [tx - px * 0.025, ty - py * 0.025]], '#d6dbe2'); }
    else {
      const bw = kind === 'sword' ? 0.02 : 0.017;
      tri([[hxp + px * bw, hyp + py * bw], [tx, ty], [hxp - px * bw, hyp - py * bw]], '#e3e8ee');
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.005; ctx.beginPath(); ctx.moveTo(hxp, hyp); ctx.lineTo(tx - vx * 0.02, ty - vy * 0.02); ctx.stroke();
      stroke(hxp + px * 0.04, hyp + py * 0.04, hxp - px * 0.04, hyp - py * 0.04, 0.014, '#d9a935');
      if (e.bloodBlade) { ctx.strokeStyle = 'rgba(160,10,10,.9)'; ctx.lineWidth = 0.014; ctx.beginPath(); ctx.moveTo(tx - vx * bl * 0.5, ty - vy * bl * 0.5); ctx.lineTo(tx - vx * 0.015, ty - vy * 0.015); ctx.stroke(); }
    }
    ctx.beginPath(); ctx.arc(hxp, hyp, 0.03, 0, Math.PI * 2); ctx.fillStyle = '#efc9a0'; ctx.fill(); ctx.strokeStyle = S.OL; ctx.lineWidth = 0.01; ctx.stroke();
    if (lunge > 0.85) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,.5)'; ctx.beginPath(); ctx.arc(tx, ty, 0.045, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  /* képpontos találat: a bábu festett alakjának átlátszatlan pontjára esik-e a (dx,dy) pont (egység a talpponthoz képest, y felfelé negatív) */
  const masks = {};
  function mask(k, im) {
    if (masks[k]) return masks[k]; const W_ = 56, H_ = Math.max(8, Math.round(W_ * im.height / im.width));
    const c = document.createElement('canvas'); c.width = W_; c.height = H_; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W_, H_);
    try { return (masks[k] = { w: W_, h: H_, d: g.getImageData(0, 0, W_, H_).data }); } catch (e) { return (masks[k] = null); }
  }
  F.hit = function (e, dx, dy) {
    const vw = view(e), k = key(e.type, vw.v, e.theme.id), im = imgs[k]; if (!im) return null;
    const h = HEIGHT[e.type], w = im.width * h / im.height; let u = (dx + w / 2) / w; const v = (dy + h) / h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false; if (vw.mirror) u = 1 - u;
    const m = mask(k, im); if (!m) return null; const px = Math.min(m.w - 1, (u * m.w) | 0), py = Math.min(m.h - 1, (v * m.h) | 0);
    return m.d[(py * m.w + px) * 4 + 3] > 40;
  };
  root.Figures = F;
})(window);

(function (root) {
  'use strict';
  const F = root.Figures;
  const NAMES = ['dog', 'cat', 'devil', 'donkey', 'horse', 'angel', 'dragon_back', 'dragon_front', 'dragon_fire', 'crowd1', 'crowd2', 'crowd4', 'pigfarm', 'tavern', 'castle'];
  const EH = { dog: 0.95, cat: 1.05, devil: 1.9, donkey: 1.5, horse: 1.75, angel: 2.1 }, LEFT = { donkey: 1, horse: 1 };
  const ex = {}; F.EH = EH; F.extrasReady = false;
  F.loadExtras = () => Promise.all(NAMES.map(n => new Promise(res => { const im = new Image(); im.onload = () => { ex[n] = im; res(); }; im.onerror = res; im.src = 'assets/figs/x_' + n + '.webp'; })))
    .then(() => { F.extrasReady = true; if (root.W) root.W.useStrips = true; });
  F.extra = n => ex[n];
  F.sprite = function (ctx, n, h, bob) {
    const im = ex[n]; if (!im) return false; const hh = h || EH[n] || 1, w = im.width * hh / im.height;
    ctx.save(); if (LEFT[n]) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -hh - (bob || 0), w, hh); ctx.restore(); return true;
  };
})(window);
