/* Vezérlés: menü, játékmódok (bot / helyi / online), bemenet, lépések sorba állítása. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), W = window.W, S = Sprites;
  const THEME_IDS = ['white', 'black', 'red', 'gold'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = { mode: null, chess: null, mySide: null, level: 2, code: null, role: null, unsub: null, over: false, queue: [], pumping: false, sel: -1, room: null, lastEmote: 0, themeIds: { w: 'white', b: 'black' }, names: { w: 'Világos', b: 'Sötét' }, gen: 0 };
  let myTheme = 'white', hostSide = 'w', toastTimer = null;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nincs tár */ } } };

  window.UI = {
    toast(t, cls) { const el = $('toast'); el.textContent = t; el.className = 'show ' + (cls || ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, 1900); },
  };
  const show = id => { for (const s of ['menu', 'lobby', 'promo', 'result']) $(s).classList.toggle('hidden', s !== id); };
  const hideAll = () => show(null);

  /* ---------- Menü ---------- */
  function initMenu() {
    $('name').value = store.get('ps_name') || '';
    myTheme = store.get('ps_theme') || 'white';
    const box = $('swatches');
    for (const id of THEME_IDS) {
      const b = document.createElement('button'); b.style.background = S.THEMES[id].hex; b.title = S.THEMES[id].name; b.dataset.id = id;
      b.onclick = () => { myTheme = id; store.set('ps_theme', id); paintSw(); };
      box.appendChild(b);
    }
    paintSw();
    $('sideSeg').querySelectorAll('button').forEach(b => { b.onclick = () => { hostSide = b.dataset.v; $('sideSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; });
    const q = new URLSearchParams(location.search).get('room'); if (q) $('code').value = q.toUpperCase().slice(0, 5);
    if (!Net.available()) { const n = $('onlineNote'); n.classList.remove('hidden'); n.textContent = 'A hírnökök még nem kaptak útlevelet (hiányzik az apiKey a firebase-config.js-ből), az online viadal addig nem él. A bolond és a közös asztal működik.'; }
    const ses = store.get('ps_session');
    if (ses && Net.available()) { try { const s = JSON.parse(ses); $('btnResume').textContent = 'Visszatérés a várba (' + s.code + ')'; $('btnResume').classList.remove('hidden'); $('btnResume').onclick = () => joinOnline(s.code); } catch (e) { /* hibás */ } }
    $('btnCreate').onclick = createOnline; $('btnJoin').onclick = () => joinOnline($('code').value);
    $('btnBot').onclick = () => startBot(+$('botLevel').value); $('btnLocal').onclick = startLocal;
    $('optFast').onchange = e => { W.speed = e.target.checked ? 1.7 : 1; };
    $('btnCopy').onclick = async () => { try { await navigator.clipboard.writeText(G.code); UI.toast('Jel lemásolva!'); } catch (e) { UI.toast(G.code); } };
    $('btnShare').onclick = async () => {
      const url = location.origin + location.pathname + '?room=' + G.code;
      try { if (navigator.share) await navigator.share({ title: 'Parasztsakk', text: 'Gyere sakkozni, paraszt! Kód: ' + G.code, url }); else { await navigator.clipboard.writeText(url); UI.toast('Hírnök-levél másolva!'); } } catch (e) { /* mégse */ }
    };
    $('btnLobbyCancel').onclick = toMenu; $('btnToMenu').onclick = toMenu; $('bMenu').onclick = () => { if (G.over || confirm('Elhagyod a csatamezőt?')) toMenu(); };
    $('btnAgain').onclick = () => { if (G.mode === 'bot') startBot(G.level); else if (G.mode === 'local') startLocal(); else toMenu(); };
  }
  function paintSw() { $('swatches').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === myTheme)); }
  const FUNNY = ['Pocak Pista', 'Büdös Bence', 'Sáros Sanyi', 'Kövér Kata', 'Orrfúró Ödön', 'Mókus Jóska', 'Pukizó Pál', 'Rühes Rozi', 'Csorba Gyuri', 'Kecskepásztor Kelemen'];
  const myName = () => { let n = $('name').value.trim(); if (!n) { n = FUNNY[Math.floor(Math.random() * FUNNY.length)]; $('name').value = n; } store.set('ps_name', n); return n; };
  const otherTheme = t => { const o = THEME_IDS.filter(x => x !== t); return o[Math.floor(Math.random() * o.length)]; };

  function toMenu() {
    cleanup(); G.mode = null; $('hud').classList.add('hidden'); show('menu'); W.idleOn = true;
    if (!W.pieces.length) { G.chess = new Chess(); W.setup(G.chess); }
  }
  function cleanup(keepSub) { G.gen++; if (G.unsub && !keepSub) { try { G.unsub(); } catch (e) { /* */ } G.unsub = null; } G.queue = []; G.over = false; G.sel = -1; G.room = null; }

  /* ---------- Játék indítása ---------- */
  function begin(opts) {
    cleanup(opts.keepSub); G.mode = opts.mode; G.mySide = opts.mySide; G.names = opts.names; G.themeIds = opts.themeIds;
    G.chess = new Chess(); G.over = false;
    W.setFlip(opts.mySide === 'b');
    W.setThemes({ w: S.THEMES[opts.themeIds.w], b: S.THEMES[opts.themeIds.b] });
    W.setup(G.chess); W.idleOn = true; W.idleT = 2;
    const bottom = opts.mySide || 'w', top = bottom === 'w' ? 'b' : 'w';
    $('meName').textContent = opts.names[bottom]; $('oppName').textContent = opts.names[top];
    $('meSw').style.background = S.THEMES[opts.themeIds[bottom]].hex; $('oppSw').style.background = S.THEMES[opts.themeIds[top]].hex;
    $('bDraw').classList.toggle('hidden', opts.mode !== 'online');
    $('bFlip').classList.toggle('hidden', opts.mode !== 'local');
    hideAll(); $('hud').classList.remove('hidden'); updateHud();
    SFX.init(); SFX.bell();
    if (opts.mode === 'bot' && G.mySide === 'b') setTimeout(botMove, 800);
  }
  function startLocal() {
    SFX.init(); const t = myTheme; begin({ mode: 'local', mySide: null, names: { w: myName(), b: 'Ellenfél' }, themeIds: { w: t, b: otherTheme(t) } });
    $('meName').textContent = G.names.w; $('oppName').textContent = G.names.b;
  }
  function startBot(level) {
    SFX.init(); G.level = level; const t = myTheme, lv = ['', 'Részeg jobbágy', 'Falusi bíró', 'Hadúr'][level];
    begin({ mode: 'bot', mySide: 'w', names: { w: myName(), b: lv }, themeIds: { w: t, b: otherTheme(t) } });
  }

  /* ---------- Online ---------- */
  async function createOnline() {
    SFX.init();
    try {
      const side = hostSide === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : hostSide;
      UI.toast('Vár nyitása…');
      const code = await Net.createRoom({ name: myName(), theme: myTheme, side });
      G.code = code; G.role = 'host'; store.set('ps_session', JSON.stringify({ code }));
      $('lobbyCode').textContent = code; show('lobby'); watchRoom(code);
    } catch (e) { UI.toast(e.message || 'Hiba', 'bad'); console.error(e); }
  }
  async function joinOnline(code) {
    SFX.init(); code = (code || '').trim().toUpperCase();
    if (code.length !== 5) { UI.toast('Írd be az 5 jegyű jelet!', 'bad'); return; }
    try {
      const r = await Net.joinRoom(code, { name: myName(), theme: myTheme });
      G.code = code; G.role = r.role; store.set('ps_session', JSON.stringify({ code }));
      if (r.role === 'host' && !r.data.guestId) { $('lobbyCode').textContent = code; show('lobby'); }
      watchRoom(code);
    } catch (e) { UI.toast(e.message || 'Hiba', 'bad'); console.error(e); }
  }
  function watchRoom(code) {
    if (G.unsub) G.unsub();
    G.unsub = Net.subscribe(code, onRoom, e => { console.error(e); UI.toast('A hírnök elvesztette a lovát', 'bad'); });
  }
  function onRoom(d) {
    G.room = d;
    const iAmHost = G.role === 'host';
    if (!G.mode && d.guestId) { // játék indul
      const hs = d.hostSide, mySide = iAmHost ? hs : (hs === 'w' ? 'b' : 'w');
      const hostTheme = d.hostTheme, guestTheme = d.guestTheme;
      const names = {}; names[hs] = d.hostName; names[hs === 'w' ? 'b' : 'w'] = d.guestName || 'Ismeretlen lovag';
      const themeIds = {}; themeIds[hs] = hostTheme; themeIds[hs === 'w' ? 'b' : 'w'] = guestTheme;
      const code = G.code, role = G.role;
      begin({ mode: 'online', mySide, names, themeIds, keepSub: true });
      G.code = code; G.role = role; G.room = d;
      G.lastEmote = d.emote ? d.emote.n : 0; // a régi emote-okat ne játsszuk le
      if (d.moves.length) { // újracsatlakozás: a korábbi lépések animáció nélkül
        for (const u of d.moves) G.chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || null });
        W.setup(G.chess); const lm = G.chess.stack[G.chess.stack.length - 1]; if (lm) W.hl.last = [lm.m.from, lm.m.to];
      }
    }
    if (!G.mode) return;
    // lépések
    const have = G.chess.moveList.length + G.queue.length;
    for (let i = have; i < d.moves.length; i++) G.queue.push(d.moves[i]);
    pump();
    // eredmény (feladás / döntetlen)
    if (d.result && !G.over) {
      const r = d.result; G.queue.push({ result: r }); pump();
    }
    if (d.emote && d.emote.n > G.lastEmote) { G.lastEmote = d.emote.n; if (d.emote.by !== G.mySide) W.emote(d.emote.by, d.emote.kind); }
    if (d.draw && d.draw !== G.mySide && !G.over) UI.toast('Az ellenfél békét ajánl', '');
    updateHud();
  }

  /* ---------- Lépések sorba állítva ---------- */
  async function pump() {
    if (G.pumping) return; G.pumping = true; const gen = G.gen;
    try {
      while (G.queue.length && gen === G.gen) {
        while (W.busy && gen === G.gen) await sleep(60);
        if (gen !== G.gen) break;
        const q = G.queue.shift();
        if (typeof q === 'string') await applyMove({ from: q.slice(0, 2), to: q.slice(2, 4), promo: q[4] || null }, false);
        else if (q.result) await finish(q.result.type === 'resign' ? { type: 'resign', winner: q.result.loser === 'w' ? 'b' : 'w' } : { type: 'draw-agreed', winner: null });
      }
    } finally { G.pumping = false; }
  }
  async function applyMove(o, local) {
    if (G.over) return;
    const m = G.chess.move(o);
    if (!m) { console.warn('érvénytelen lépés', o); if (G.mode === 'online' && G.room) resync(); return; }
    G.sel = -1; W.hl.sel = -1; W.hl.targets = [];
    if (local && G.mode === 'online') Net.sendMove(G.code, G.chess.moveList.length - 1, G.chess.moveList[G.chess.moveList.length - 1]).catch(e => { console.error(e); UI.toast('A lépést nem sikerült elküldeni', 'bad'); });
    updateHud();
    await W.playMove(m);
    updateHud();
    if (m.status !== 'playing') await finish({ type: m.status, winner: m.status === 'checkmate' ? m.color : null });
    else if (G.mode === 'bot' && G.chess.turn !== G.mySide) setTimeout(botMove, 450);
  }
  function resync() { /* szinkronsérülés: újraépítés a szoba lépéseiből */
    const d = G.room; const g = new Chess(); for (const u of d.moves) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || null });
    G.chess = g; W.setup(g); updateHud();
  }
  async function botMove() {
    if (G.over || G.mode !== 'bot' || G.chess.turn === G.mySide) return;
    const gen = G.gen; while (W.busy) await sleep(80);
    if (gen !== G.gen || G.over) return;
    await sleep(60);
    const m = Chess.bestMove(G.chess, G.level);
    if (m && gen === G.gen) applyMove({ from: m.from, to: m.to, promo: m.promo ? m.promo.toLowerCase() : null }, false);
  }
  async function finish(res) {
    if (G.over) return; G.over = true; updateHud();
    W.godOn = false; await W.playEnding(res);
    if (G.mode === 'online') store.set('ps_session', '');
    let title, sub;
    const reasons = { checkmate: 'A király elesett.', resign: 'A másik megadta magát.', stalemate: 'Patt: a Fekete Halál döntött.', 'draw-insufficient': 'Kevés a bábu a mattolásra.', 'draw-50': 'Ötven lépés, és semmi vér.', 'draw-repetition': 'Háromszor ugyanaz a táncrend.', 'draw-agreed': 'Békét kötöttek.' };
    if (!res.winner) { title = 'Béke'; }
    else if (G.mySide) title = res.winner === G.mySide ? 'Dicsőség!' : 'Gyász!';
    else title = (res.winner === 'w' ? 'Világos' : 'Sötét') + ' győzött!';
    sub = reasons[res.type] || '';
    $('resTitle').innerHTML = '<span class="word">' + title + '</span>'; $('resSub').textContent = sub;
    $('btnAgain').textContent = G.mode === 'online' ? 'Új csata (a várba)' : 'Még egy csata!';
    show('result');
  }

  /* ---------- Bemenet ---------- */
  const canAct = () => !G.over && !W.busy && !G.pumping && G.mode && (G.mode === 'local' || (G.mode === 'bot' && G.chess.turn === G.mySide) || (G.mode === 'online' && G.chess.turn === G.mySide && G.room && G.room.guestId));
  function select(sq) {
    G.sel = sq; W.hl.sel = sq;
    W.hl.targets = G.chess.moves().filter(m => m.from === sq).map(m => ({ sq: m.to, cap: !!m.cap })).filter((t, i, a) => a.findIndex(x => x.sq === t.sq) === i);
    SFX.hop();
  }
  function deselect() { G.sel = -1; W.hl.sel = -1; W.hl.targets = []; }
  function onSquare(sq) {
    if (!canAct()) return;
    const piece = G.chess.board[sq];
    if (G.sel >= 0) {
      const mv = G.chess.moves().filter(m => m.from === G.sel && m.to === sq);
      if (mv.length) {
        if (mv[0].promo) { askPromo(mv[0].promo === mv[0].promo.toUpperCase()).then(p => { applyMove({ from: G.sel, to: sq, promo: p }, true); }); return; }
        applyMove({ from: G.sel, to: sq }, true); return;
      }
    }
    if (piece && Chess.colorOf(piece) === G.chess.turn && (!G.mySide || Chess.colorOf(piece) === G.mySide)) select(sq); else deselect();
  }
  function askPromo(white) {
    return new Promise(res => {
      const box = $('promoBtns'); box.innerHTML = '';
      for (const [t, ch] of [['q', white ? '♕' : '♛'], ['r', white ? '♖' : '♜'], ['b', white ? '♗' : '♝'], ['n', white ? '♘' : '♞']]) {
        const b = document.createElement('button'); b.className = 'big'; b.textContent = ch; b.onclick = () => { hideAll(); res(t); }; box.appendChild(b);
      }
      show('promo');
    });
  }
  function updateHud() {
    const t = $('turnBadge'), mine = G.mode === 'local' || G.chess.turn === G.mySide;
    if (!G.mode) return;
    if (G.over) t.textContent = '';
    else if (G.mode === 'local') t.textContent = (G.chess.turn === 'w' ? 'Világos' : 'Sötét') + ' lép, uram';
    else if (G.mode === 'online' && !(G.room && G.room.guestId)) t.textContent = 'Az ellenfél még úton van…';
    else t.textContent = mine ? 'A te lépésed, uram!' : 'Ellenfeled töpreng…';
    W.godOn = !G.over && mine && G.mode !== 'local';
    $('oppStat').textContent = ''; $('meStat').textContent = '';
    W.hl.check = G.chess.inCheck() ? G.chess.kingSq(G.chess.turn) : -1;
  }
  function initInput() {
    const c = W.getCanvas();
    c.addEventListener('pointerdown', e => { SFX.init(); const r = c.getBoundingClientRect(); const sq = W.hitTest(e.clientX - r.left, e.clientY - r.top); if (sq >= 0) onSquare(sq); else if (G.mode) deselect(); });
    $('bFart').onclick = () => emote('fart'); $('bNose').onclick = () => emote('nose');
    $('bFlip').onclick = () => { W.setFlip(!W.flip); };
    $('bMute').onclick = () => { SFX.setMuted(!SFX.isMuted()); $('bMute').classList.toggle('off', SFX.isMuted()); };
    $('bResign').onclick = async () => {
      if (G.over || !G.mode || !confirm('Biztosan megadod magad?')) return;
      const loser = G.mode === 'local' ? G.chess.turn : G.mySide;
      if (G.mode === 'online') { try { await Net.setResult(G.code, { type: 'resign', loser }); } catch (e) { UI.toast('Hiba a feladáskor', 'bad'); } }
      else finish({ type: 'resign', winner: loser === 'w' ? 'b' : 'w' });
    };
    $('bDraw').onclick = async () => {
      if (G.over || G.mode !== 'online' || !G.room) return;
      try {
        if (G.room.draw && G.room.draw !== G.mySide) await Net.setResult(G.code, { type: 'draw' });
        else { await Net.offerDraw(G.code, G.mySide); UI.toast('Békeajánlat elküldve'); }
      } catch (e) { UI.toast('Hiba', 'bad'); }
    };
  }
  let lastEm = 0;
  function emote(kind) {
    const now = Date.now(); if (now - lastEm < 900) return; lastEm = now; SFX.init();
    const side = G.mySide || G.chess.turn;
    W.emote(side, kind);
    if (G.mode === 'online' && G.room) { G.lastEmote = now; Net.emote(G.code, G.mySide, kind).catch(() => {}); }
  }

  /* ---------- Indulás ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    W.start($('c')); initMenu(); initInput();
    G.chess = new Chess(); W.setup(G.chess); W.idleOn = true;
    window.__G = G; // hibakereséshez
    document.addEventListener('visibilitychange', () => { if (!document.hidden) SFX.init(); });
  });
})();
