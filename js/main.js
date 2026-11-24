/* Vezérlés: menü, játékmódok (bot / helyi / online), bemenet, lépések sorba állítása. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), W = window.W, S = Sprites;
  const THEME_IDS = ['white', 'black', 'red', 'gold'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = { mode: null, chess: null, mySide: null, level: 2, code: null, role: null, unsub: null, over: false, queue: [], pumping: false, sel: -1, room: null, lastEmote: 0, themeIds: { w: 'white', b: 'black' }, names: { w: 'Világos', b: 'Sötét' }, gen: 0 };
  let myTheme = 'white', hostSide = 'w', botSide = 'w', toastTimer = null;
  const store = Util.store;

  window.UI = {
    toast(t, cls) { const el = $('toast'); el.textContent = t; el.className = 'show ' + (cls || ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = ''; }, 1900); },
  };
  const show = id => { for (const s of ['menu', 'lobby', 'promo', 'result']) $(s).classList.toggle('hidden', s !== id); W.menuMode = id === 'menu' || id === 'lobby'; };
  const hideAll = () => show(null);

  /* ---------- QR, verzió, telepítés ---------- */
  const roomUrl = code => location.origin + location.pathname.replace(/index\.html$/, '') + '?room=' + code;
  const baseUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  /** Megosztás: a készülék saját megosztó lapja (ha van), különben a link vágólapra másolása. */
  async function shareGame(text) {
    const url = baseUrl();
    try {
      if (navigator.share) { await navigator.share({ title: 'Parasztsakk', text, url }); return; }
      await navigator.clipboard.writeText(text + ' ' + url); UI.toast('Hírnök-levél a vágólapon!');
    } catch (e) { if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(url); UI.toast('A link a vágólapon!'); } catch (_e) { UI.toast(url); } }
  }
  function drawQR(code) {
    try {
      const qr = qrcode(0, 'M'); qr.addData(roomUrl(code)); qr.make(); const n = qr.getModuleCount(), cv = $('qrCanvas'), q = 4, px = Math.floor(cv.width / (n + 2 * q)), off = Math.floor((cv.width - px * n) / 2), g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#1c1310';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(off + c * px, off + r * px, px, px);
    } catch (e) { console.warn('QR', e); }
  }
  const APP_V = '0.9.9'; let deferredInstall = null, swReg = null, newWorker = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  function showUpdateBanner(txt) {
    if ($('updBanner')) return; const d = document.createElement('div'); d.id = 'updBanner'; d.innerHTML = '<span></span><button>Betöltöm!</button>'; d.firstChild.textContent = txt; d.lastChild.onclick = applyUpdate; document.body.appendChild(d);
  }
  async function applyUpdate() {
    try { if (swReg && swReg.waiting) swReg.waiting.postMessage('skip'); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); if (swReg) await swReg.unregister(); } catch (e) { /* nincs SW */ }
    location.reload();
  }
  async function checkUpdate(manual) {
    const btn = $('btnUpdate'), line = $('verLine'); if (manual) { btn.disabled = true; btn.textContent = 'A hírnök lován vágtat…'; }
    try {
      const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' }); const j = await r.json();
      if (swReg) { try { await swReg.update(); } catch (e) { /* hálózat */ } }
      if (j.version && j.version !== APP_V) { line.textContent = 'Új kiadás érkezett: v' + j.version + ' ' + (j.name || '') + ' (nálad: v' + APP_V + ')'; showUpdateBanner('Új kiadás érkezett, jó uram: v' + j.version + '!'); if (manual) { btn.textContent = 'Töltsd be az újat!'; btn.disabled = false; btn.onclick = applyUpdate; } }
      else { line.textContent = 'Naprakész vagy: v' + APP_V + ' „' + (j.name || '') + '"'; if (manual) { btn.textContent = 'A hírnök azt üzeni: nincs újság, uram.'; setTimeout(() => { btn.textContent = 'Hírnököt küldök: van-e új kiadás?'; btn.disabled = false; }, 2600); } }
    } catch (e) {
      line.textContent = 'Verzió: v' + APP_V + ' (a hírnök nem ért haza, nincs hálózat)'; if (manual) { btn.textContent = 'A hírnököt elfogták a rablók. Próbáld újra!'; setTimeout(() => { btn.textContent = 'Hírnököt küldök: van-e új kiadás?'; btn.disabled = false; }, 2800); }
    }
  }
  function initPwa() {
    $('verLine').textContent = 'Verzió: v' + APP_V; $('btnUpdate').onclick = () => checkUpdate(true);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').then(reg => { swReg = reg; reg.addEventListener('updatefound', () => { newWorker = reg.installing; if (newWorker) newWorker.addEventListener('statechange', () => { if (newWorker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner('Új kiadás készen áll, jó uram!'); }); }); }).catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (!isStandalone()) $('btnInstall').classList.remove('hidden'); });
    $('btnInstall').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* mégse */ } deferredInstall = null; $('btnInstall').classList.add('hidden'); };
    window.addEventListener('appinstalled', () => { $('btnInstall').classList.add('hidden'); UI.toast('A vár a tiéd, uram!'); });
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone()) $('iosNote').classList.remove('hidden');
    checkUpdate(false);
  }

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
    $('botSideSeg').querySelectorAll('button').forEach(b => { b.onclick = () => { botSide = b.dataset.v; $('botSideSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; });
    $('sideSeg').querySelectorAll('button').forEach(b => { b.onclick = () => { hostSide = b.dataset.v; $('sideSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; });
    const q = new URLSearchParams(location.search).get('room'); if (q) $('code').value = q.toUpperCase().slice(0, 5);
    if (!Net.available()) { const n = $('onlineNote'); n.classList.remove('hidden'); n.textContent = 'A hírnökök még nem kaptak útlevelet (hiányzik az apiKey a firebase-config.js-ből), az online viadal addig nem él. A bolond és a közös asztal működik.'; }
    const ses = store.get('ps_session');
    if (ses && Net.available()) { try { const s = JSON.parse(ses); $('btnResume').textContent = 'Visszatérés a várba (' + s.code + ')'; $('btnResume').classList.remove('hidden'); $('btnResume').onclick = () => joinOnline(s.code); } catch (e) { /* hibás */ } }
    $('btnCreate').onclick = createOnline; $('btnJoin').onclick = () => joinOnline($('code').value);
    $('btnBot').onclick = () => startBot(+$('botLevel').value); $('btnLocal').onclick = startLocal;
    $('perfSeg').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.v === W.perfMode); b.onclick = () => { W.setPerf(b.dataset.v); $('perfSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; });
    $('optFast').onchange = e => { W.speed = e.target.checked ? 1.7 : 1; };
    $('optMusic').checked = SFX.musicOn(); $('optMusic').onchange = e => { SFX.init(); SFX.setMusic(e.target.checked); paintMusic(); };
    $('talkSeg').querySelectorAll('button').forEach(b => { b.onclick = () => { W.setTalk(b.dataset.v); paintTalk(); }; });
    paintTalk(); paintMusic();
    $('btnCopy').onclick = async () => { try { await navigator.clipboard.writeText(G.code); UI.toast('Jel lemásolva!'); } catch (e) { UI.toast(G.code); } };
    $('btnShare').onclick = async () => {
      const url = roomUrl(G.code);
      try { if (navigator.share) await navigator.share({ title: 'Parasztsakk', text: 'Gyere sakkozni, paraszt! Kód: ' + G.code, url }); else { await navigator.clipboard.writeText(url); UI.toast('Hírnök-levél másolva!'); } } catch (e) { /* mégse */ }
    };
    $('btnShareGame').onclick = () => shareGame('Parasztsakk – véres, büdös, szabályos sakk. Gyere játszani, paraszt!');
    $('btnShareRes').onclick = () => shareGame(G.mySide && G.over ? 'Parasztsakk: ' + $('resTitle').textContent + ' Gyere, mérkőzz meg velem!' : 'Parasztsakk – gyere, mérkőzz meg velem!');
    $('btnLobbyCancel').onclick = toMenu; $('btnToMenu').onclick = toMenu; $('bMenu').onclick = () => { if (G.over || confirm('Elhagyod a csatamezőt?')) toMenu(); };
    $('btnAgain').onclick = () => { if (G.mode === 'bot') startBot(G.level); else if (G.mode === 'local') startLocal(); else toMenu(); };
  }
  const TALK_NAME = { many: 'sok', few: 'kevés', off: 'csend' };
  function paintTalk() { $('talkSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === W.talk)); $('bTalk').querySelector('small').textContent = 'Szó: ' + TALK_NAME[W.talk]; $('bTalk').classList.toggle('off', W.talk === 'off'); }
  function paintMusic() { $('bMusic').classList.toggle('off', !SFX.musicOn()); $('optMusic').checked = SFX.musicOn(); }
  /* szobakód: betűnként külön, jól olvasható kockában (a gót betű olvashatatlan volt) */
  function showCode(code) { const el = $('lobbyCode'); el.textContent = ''; for (const ch of String(code)) { const s = document.createElement('span'); s.textContent = ch; el.appendChild(s); } el.setAttribute('aria-label', 'Szobakód: ' + String(code).split('').join(' ')); }
  function paintSw() { $('swatches').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === myTheme)); }
  const FUNNY = ['Pocak Pista', 'Büdös Bence', 'Sáros Sanyi', 'Kövér Kata', 'Orrfúró Ödön', 'Mókus Jóska', 'Pukizó Pál', 'Rühes Rozi', 'Csorba Gyuri', 'Kecskepásztor Kelemen'];
  const myName = () => { let n = Proto.cleanName($('name').value, ''); if (!n) { n = FUNNY[Math.floor(Math.random() * FUNNY.length)]; $('name').value = n; } store.set('ps_name', n); return n; };
  const otherTheme = t => { const o = THEME_IDS.filter(x => x !== t); return o[Math.floor(Math.random() * o.length)]; };

  function toMenu() {
    cleanup(); G.mode = null; $('hud').classList.add('hidden'); show('menu'); W.idleOn = true; SFX.mood('menu');
    if (!W.pieces.length) { G.chess = new Chess(); W.setup(G.chess); }
  }
  function cleanup(keepSub) { G.gen++; if (G.unsub && !keepSub) { try { G.unsub(); } catch (e) { /* */ } G.unsub = null; } G.queue = []; G.over = false; G.sel = -1; G.room = null; }

  /* ---------- Játék indítása ---------- */
  function begin(opts) {
    cleanup(opts.keepSub); G.mode = opts.mode; G.mySide = opts.mySide; G.names = opts.names; G.themeIds = opts.themeIds;
    G.chess = new Chess(); G.over = false; G.warnedBad = false;
    W.setFlip(opts.mySide === 'b');
    W.setThemes({ w: S.THEMES[opts.themeIds.w], b: S.THEMES[opts.themeIds.b] });
    W.setup(G.chess); W.idleOn = true; W.idleT = 2;
    const bottom = opts.mySide || 'w', top = bottom === 'w' ? 'b' : 'w';
    $('meName').textContent = opts.names[bottom]; $('oppName').textContent = opts.names[top];
    $('meSw').style.background = S.THEMES[opts.themeIds[bottom]].hex; $('oppSw').style.background = S.THEMES[opts.themeIds[top]].hex;
    $('bDraw').classList.toggle('hidden', opts.mode !== 'online'); $('bUndo').classList.toggle('hidden', opts.mode === 'online');
    $('bFlip').classList.toggle('hidden', opts.mode !== 'local');
    hideAll(); $('hud').classList.remove('hidden'); updateHud();
    SFX.init(); SFX.bell(); SFX.mood('game');
    if (opts.mode === 'bot' && G.mySide === 'b') setTimeout(botMove, 800);
  }
  function startLocal() {
    SFX.init(); const t = myTheme; begin({ mode: 'local', mySide: null, names: { w: myName(), b: 'Ellenfél' }, themeIds: { w: t, b: otherTheme(t) } });
    $('meName').textContent = G.names.w; $('oppName').textContent = G.names.b;
  }
  function startBot(level) {
    SFX.init(); G.level = level; const t = myTheme, lv = ['', 'Részeg jobbágy', 'Falusi bíró', 'Hadúr'][level];
    const me = botSide === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : botSide, other = me === 'w' ? 'b' : 'w';
    const names = {}, themeIds = {}; names[me] = myName(); names[other] = lv; themeIds[me] = t; themeIds[other] = otherTheme(t);
    begin({ mode: 'bot', mySide: me, names, themeIds });
  }

  /* ---------- Online ---------- */
  async function createOnline() {
    SFX.init();
    try {
      const side = hostSide === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : hostSide;
      UI.toast('Vár nyitása…');
      const code = await Net.createRoom({ name: myName(), theme: myTheme, side });
      G.code = code; G.role = 'host'; store.set('ps_session', JSON.stringify({ code }));
      showCode(code); drawQR(code); show('lobby'); $('toast').className = ''; watchRoom(code);
    } catch (e) { UI.toast(e.message || 'Hiba', 'bad'); console.error(e); }
  }
  async function joinOnline(code) {
    SFX.init(); code = (code || '').trim().toUpperCase();
    if (code.length !== 5) { UI.toast('Írd be az 5 jegyű jelet!', 'bad'); return; }
    try {
      const r = await Net.joinRoom(code, { name: myName(), theme: myTheme });
      G.code = code; G.role = r.role; store.set('ps_session', JSON.stringify({ code }));
      if (r.role === 'host' && !r.data.guestId) { showCode(code); drawQR(code); show('lobby'); $('toast').className = ''; }
      watchRoom(code);
    } catch (e) { UI.toast(e.message || 'Hiba', 'bad'); console.error(e); }
  }
  function watchRoom(code) {
    if (G.unsub) G.unsub();
    G.unsub = Net.subscribe(code, onRoom, e => { console.error(e); UI.toast('A hírnök elvesztette a lovát', 'bad'); });
  }
  function onRoom(raw) {
    const d = Proto.parseRoom(raw);                    // a szoba bárki által írható: csak ellenőrzött adatot használunk
    if (d.badMoves && !G.warnedBad) { G.warnedBad = true; UI.toast('Szabálytalan lépés érkezett – a játék csak az érvényes lépéseket veszi át', 'bad'); }
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
        for (const u of d.moves) G.chess.move(Proto.parseMove(u));
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
        try {
          if (typeof q === 'string') { const p = Proto.parseMove(q); if (p) await applyMove(p, false); }
          else if (q && q.result) await finish(q.result.type === 'resign' ? { type: 'resign', winner: q.result.loser === 'w' ? 'b' : 'w' } : { type: 'draw-agreed', winner: null });
        } catch (e) { console.error('lépés feldolgozási hiba', e); W.busy = false; W.setup(G.chess); }   // egy hibás elem nem állíthatja meg a sort
      }
    } finally {
      G.pumping = false;
      if (G.queue.length && gen !== G.gen) pump();     // közben új játék indult: annak sora ne maradjon állva
    }
  }
  async function applyMove(o, local) {
    if (G.over) return;
    const m = G.chess.move(o);
    if (!m) { console.warn('érvénytelen lépés', o); if (G.mode === 'online' && G.room) resync(); return; }
    G.sel = -1; W.hl.sel = -1; W.hl.targets = [];
    if (local && G.mode === 'online') {
      const idx = G.chess.moveList.length - 1;
      Net.sendMove(G.code, idx, G.chess.moveList[idx])
        .then(ok => { if (!ok) recoverFromServer('Az ellenfél közben lépett, az állás összeigazítva'); })      // a szerver elutasította: ne maradjon eltérő állás
        .catch(e => { console.error(e); recoverFromServer('A lépést nem sikerült elküldeni, az állás összeigazítva'); });
    }
    updateHud(); $('hint').textContent = 'Koppints a képre: gyorsabb a mészárlás!';
    try { await W.playMove(m); } catch (e) { console.error('animáció hiba', e); W.busy = false; W.setup(G.chess); }   // az állás akkor is előrelép, ha egy animáció elbukik
    W.skip = false;
    updateHud();
    if (m.status !== 'playing') await finish({ type: m.status, winner: m.status === 'checkmate' ? m.color : null });
    else if (G.mode === 'bot' && G.chess.turn !== G.mySide) setTimeout(botMove, 450);
  }
  function resync() { /* szinkronsérülés: az állás újraépítése a szoba érvényes lépéseiből */
    G.chess = Proto.replay(G.room.moves).chess; W.setup(G.chess);
    const lm = G.chess.stack[G.chess.stack.length - 1]; if (lm) W.hl.last = [lm.m.from, lm.m.to];
    updateHud();
  }
  async function recoverFromServer(msg) {
    if (G.mode !== 'online' || !G.code) return; const gen = G.gen;
    try {
      const raw = await Net.get(G.code); if (!raw || gen !== G.gen) return;
      while (W.busy && gen === G.gen) await sleep(60); if (gen !== G.gen) return;
      G.room = Proto.parseRoom(raw); G.queue = []; resync(); UI.toast(msg, 'bad');
    } catch (e) { console.error(e); }
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
    W.godOn = false; SFX.mood(null); await W.playEnding(res); SFX.mood('menu');
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
    SFX.hop(); updateHud();
  }
  function deselect() { G.sel = -1; W.hl.sel = -1; W.hl.targets = []; updateHud(); }
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
      for (const [t, name] of [['q', 'Királynő'], ['r', 'Bástya'], ['b', 'Futó'], ['n', 'Huszár']]) {
        const b = document.createElement('button'); b.className = 'big'; b.textContent = name; b.onclick = () => { hideAll(); res(t); }; box.appendChild(b);
      }
      show('promo');
    });
  }
  function updateHud() {
    const t = $('turnBadge'), mine = G.mode === 'local' || G.chess.turn === G.mySide;
    if (!G.mode) return;
    if (G.over) { t.textContent = ''; }
    else if (G.mode === 'local') t.textContent = (G.chess.turn === 'w' ? 'Világos' : 'Sötét') + ' lép, uram';
    else if (G.mode === 'online' && !(G.room && G.room.guestId)) t.textContent = 'Az ellenfél még úton van…';
    else t.textContent = mine ? 'A te lépésed, uram!' : 'Ellenfeled töpreng…';
    W.godOn = !G.over && mine && G.mode !== 'local';
    W.turn = G.over ? null : G.chess.turn;
    const bottom = G.mySide || 'w'; $('mePlate').classList.toggle('active', !G.over && G.chess.turn === bottom); $('oppPlate').classList.toggle('active', !G.over && G.chess.turn !== bottom);
    if (!G.over) { const th = S.THEMES[G.themeIds[G.chess.turn]], txt = t.textContent; t.textContent = ''; const dot = document.createElement('span'); dot.className = 'sw'; dot.style.cssText = 'background:' + th.hex + ';margin-right:8px'; t.append(dot, txt); t.style.borderColor = th.hex; }
    { const start = { P: 8, N: 2, B: 2, R: 2, Q: 1 }, nm = { P: 'gyalog', N: 'huszár', B: 'futó', R: 'bástya', Q: 'királynő' }, cnt = { w: {}, b: {} };
      for (const ch of G.chess.board) if (ch && ch.toUpperCase() !== 'K') { const c = Chess.colorOf(ch), t = ch.toUpperCase(); cnt[c][t] = (cnt[c][t] || 0) + 1; }
      const lost = c => Object.keys(start).map(t => { const n = start[t] - (cnt[c][t] || 0); return n > 0 ? n + ' ' + nm[t] : ''; }).filter(Boolean).join(', ');
      const bottom = G.mySide || 'w', top = bottom === 'w' ? 'b' : 'w'; $('meStat').textContent = lost(bottom) ? 'elesett: ' + lost(bottom) : ''; $('oppStat').textContent = lost(top) ? 'elesett: ' + lost(top) : ''; }
    W.hl.check = G.chess.inCheck() ? G.chess.kingSq(G.chess.turn) : -1;
    let hint = ''; const hel = $('hint');
    if (G.over) hint = ''; else if (G.mode === 'online' && !(G.room && G.room.guestId)) hint = 'Várunk az ellenfélre…';
    else if (!(G.mode === 'local' || mine)) hint = 'Az ellenfél lép – nézd a nyilat!';
    else if (G.sel >= 0) hint = 'Koppints a zöld pontra (lépés) vagy a piros célkeresztre (ütés). Máshová koppintva visszavonod.';
    else hint = 'Koppints egy saját bábura (arany fény jelöli).';
    hel.textContent = hint;
  }
  W.selectable = sq => { try { if (!canAct()) return false; const pc = G.chess.board[sq]; if (!pc || Chess.colorOf(pc) !== G.chess.turn) return false; if (G.mySide && Chess.colorOf(pc) !== G.mySide) return false; return G.chess.moves().some(m => m.from === sq); } catch (e) { return false; } };
  function initInput() {
    const c = W.getCanvas();
    // érintés / egér: koppintás = kijelölés, két ujj = nagyítás, nagyítva egy ujj = mozgatás
    const ptrs = new Map(); let pinch = null, moved = 0, tapOk = true;
    const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('pointerdown', e => {
      SFX.init(); if (W.busy && !W.skip) { W.skip = true; UI.toast('Gyorsabb mészárlás!'); } c.setPointerCapture && c.setPointerCapture(e.pointerId); const p = pos(e); ptrs.set(e.pointerId, p);
      if (ptrs.size === 1) { moved = 0; tapOk = true; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; tapOk = false; }
    });
    c.addEventListener('pointermove', e => {
      const p = pos(e), prev = ptrs.get(e.pointerId);
      if (!prev) { if (e.pointerType === 'mouse') W.hover = W.hitTest(p.x, p.y); return; }
      if (ptrs.size === 2 && pinch) {
        ptrs.set(e.pointerId, p); const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        W.zoomAt(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch.d = d; return;
      }
      const dx = p.x - prev.x, dy = p.y - prev.y; moved += Math.abs(dx) + Math.abs(dy); ptrs.set(e.pointerId, p);
      if (moved > 14) { tapOk = false; if (W.cam.tz > 1.02) W.panBy(dx, dy); }
    });
    const up = e => {
      const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (!p || !tapOk || e.type === 'pointercancel') return;
      const sq = W.hitTest(p.x, p.y); W.hover = sq; if (sq >= 0) onSquare(sq); else if (G.mode) deselect();
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); W.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
    $('bZoom').onclick = () => W.cycleZoom();
    $('bFart').onclick = () => emote('fart'); $('bNose').onclick = () => emote('nose');
    $('bUndo').onclick = takeback; $('bFlip').onclick = () => { W.setFlip(!W.flip); };
    $('bMute').onclick = () => { SFX.setMuted(!SFX.isMuted()); $('bMute').classList.toggle('off', SFX.isMuted()); };
    $('bMusic').onclick = () => { SFX.init(); SFX.setMusic(!SFX.musicOn()); paintMusic(); UI.toast(SFX.musicOn() ? 'Szól a lant!' : 'A lantos pihen.'); };
    $('bTalk').onclick = () => { const order = ['few', 'many', 'off'], n = order[(order.indexOf(W.talk) + 1) % 3]; W.setTalk(n); paintTalk(); UI.toast({ many: 'Fecsegő udvar', few: 'Csak a csatában szólnak', off: 'Néma udvar' }[n]); };
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
  function takeback() {
    if (!G.mode || G.mode === 'online' || W.busy || G.pumping || G.over) { UI.toast(G.mode === 'online' ? 'Online nincs visszalépés, uram.' : 'Várj, amíg véget ér a mészárlás!'); return; }
    const list = G.chess.moveList.slice(); if (!list.length) return;
    const drop = (G.mode === 'bot' && G.chess.turn === G.mySide) ? 2 : 1, keep = list.slice(0, Math.max(0, list.length - drop));
    G.gen++; G.queue = []; const g = new Chess(); for (const u of keep) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || null });
    G.chess = g; G.sel = -1; W.hl.arrow = null; W.hl.last = [-1, -1]; W.setup(g); updateHud(); UI.toast('Az idő kereke visszaforog…'); SFX.bell();
    if (G.mode === 'bot' && g.turn !== G.mySide) setTimeout(botMove, 600);
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
    W.menuMode = true; W.start($('c')); Figures.loadExtras(); initMenu(); initInput(); initPwa(); SFX.mood('menu');
    document.addEventListener('pointerdown', () => SFX.init(), { once: true });   // a böngésző csak érintés után enged hangot: a menüzene az első koppintásra indul
    G.chess = new Chess(); W.setup(G.chess); W.idleOn = true;
    window.__G = G; // hibakereséshez
    document.addEventListener('visibilitychange', () => { if (!document.hidden) SFX.init(); });
  });
})();
