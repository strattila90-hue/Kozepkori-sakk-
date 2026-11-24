/* Festett figurák (assets/figs): nézetválasztás (elöl/hátul/oldal), animáció, seregszín, fejlevágás. */
(function (root) {
  'use strict';
  const S = Sprites, TAU = Math.PI * 2;
  const HEIGHT = { P: 1.45, R: 1.6, B: 1.8, N: 1.55, Q: 1.95, K: 2.05 };
  const SIDE_LEFT = { K: true, Q: true, N: true, B: true, R: false, P: false };      // az oldalnézeti kép merre néz
  const HEAD = { // fej-téglalap a kép arányában [x0,y0,x1,y1]
    front: { K: [.18, 0, .82, .28], Q: [.2, 0, .8, .2], P: [.1, 0, .9, .37], B: [.3, 0, .8, .2], N: [.36, 0, .62, .2], R: [.12, 0, .88, .33] },
    back:  { K: [.2, 0, .8, .25], Q: [.25, 0, .75, .22], P: [.2, 0, .9, .33], B: [.3, 0, .7, .17], N: [.5, 0, .74, .13], R: [.1, 0, .9, .33] },
    side:  { K: [.15, 0, .7, .27], Q: [.25, 0, .85, .22], P: [.1, 0, .8, .38], B: [.3, 0, .8, .2], N: [.32, 0, .64, .26], R: [.1, 0, .9, .35] },
  };
  const ARMY_COLOR = { white: '#e6f3ff', black: '#7a3af0', red: '#ff3a2a', gold: '#ffc200' };
  const imgs = {}, sil = {}, loading = {}; let meta = null;
  const F = { ready: false, HEIGHT, ARMY_COLOR };
  Object.assign(S.HEIGHT, HEIGHT);

  function key(t, v, a) { return t + '_' + v + '_' + a; }
  F.load = function (armies) {
    const jobs = [];
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
  function silhouette(im, k) {
    if (sil[k]) return sil[k];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ff2a1a'; g.fillRect(0, 0, c.width, c.height); return (sil[k] = c);
  }
  F.headInfo = function (e) {
    const army = e.army || e.color === 'w' ? e.theme.id : e.theme.id; const vw = view(e), k = key(e.type, vw.v, e.theme.id), im = imgs[k]; if (!im) return null;
    const r = HEAD[vw.v][e.type]; let [x0, y0, x1, y1] = r; if (vw.mirror) { const t = 1 - x1; x1 = 1 - x0; x0 = t; }
    const hu = HEIGHT[e.type] / im.height;
    return { img: im, sx: x0 * im.width, sy: y0 * im.height, sw: (x1 - x0) * im.width, sh: (y1 - y0) * im.height, w: (x1 - x0) * im.width * hu, h: (y1 - y0) * im.height * hu, mirror: vw.mirror };
  };

  /** Rajzolás: az origó a figura talpa (a talapzat közepe), 1 egység = 1 mező. Visszatér: igaz, ha figurát rajzolt. */
  F.draw = function (ctx, e) {
    const army = e.burn > 0.55 ? 'black' : e.theme.id, vw = view(e), im = imgs[key(e.type, vw.v, army)];
    if (!im) return false;
    const hu = HEIGHT[e.type] / im.height, w = im.width * hu, h = HEIGHT[e.type];
    const t = e.T || 0, sw = Math.sin(t * 2.2 + e.ph);
    let tilt = 0;
    if (e.atk > 0.001) { const a = e.atk, dir = (e.dir ? (e.dir.x * (root.W.flip ? -1 : 1) >= 0 ? 1 : -1) : 1); tilt = (a < 0.4 ? -0.22 * (a / 0.4) : a < 0.55 ? -0.22 + 0.62 * ((a - 0.4) / 0.15) : 0.4 * (1 - (a - 0.55) / 0.45)) * dir; }
    const wob = (e.mv > 0 ? Math.sin((e.wp || 0)) * 0.07 : 0);
    ctx.save();
    ctx.rotate((e.rot || 0) + tilt + wob);
    ctx.scale(e.sx * (1 - sw * 0.008), e.sy * (1 + sw * 0.012));
    if (e.hurt > 0.05) ctx.translate((Math.random() - 0.5) * 0.06 * e.hurt, 0);
    const vx = vw.mirror ? -1 : 1;
    ctx.scale(vx, 1);
    const draw = (hh) => {
      if (e.headless) {
        const r = HEAD[vw.v][e.type]; const [x0, y0, x1, y1] = r;
        ctx.save(); ctx.beginPath(); ctx.rect(-w, -h * 1.2, w * 2, h * 1.4); ctx.rect(-w / 2 + x0 * w, -h + y0 * h, (x1 - x0) * w, (y1 - y0) * h); ctx.clip('evenodd');
        ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      } else ctx.drawImage(im, -w / 2, -h, w, h);
    };
    draw();
    if (e.hurt > 0.05) {
      const sc = silhouette(im, key(e.type, vw.v, army)); ctx.globalAlpha = Math.min(0.65, e.hurt * 0.6); ctx.drawImage(sc, -w / 2, -h, w, h); ctx.globalAlpha = 1;
    }
    ctx.restore();
    return true;
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
