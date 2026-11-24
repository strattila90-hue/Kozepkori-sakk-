/* Online mód: Firestore, szobák meghívó kóddal. Csak akkor tölti be a Firebase SDK-t, ha tényleg kell. */
(function (root) {
  'use strict';
  const V = '10.14.1', CFG = root.FIREBASE_CONFIG || {};
  let fs = null, db = null;
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = null;
  try { id = localStorage.getItem('ps_id'); if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ps_id', id); } } catch (e) { id = Math.random().toString(36).slice(2); }

  const Net = {
    id,
    available: () => !!(CFG.apiKey && !/^PASTE/.test(CFG.apiKey)),
    async init() {
      if (db) return;
      if (!Net.available()) throw new Error('Az online mód még nincs beállítva (hiányzik az apiKey a firebase-config.js-ben).');
      const [app, f] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)]);
      fs = f; const a = app.initializeApp(CFG);
      db = f.initializeFirestore(a, { experimentalAutoDetectLongPolling: true });
    },
    ref: code => fs.doc(db, 'rooms', code),
    genCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; },

    async createRoom({ name, theme, side }) {
      await Net.init();
      for (let tries = 0; tries < 8; tries++) {
        const code = Net.genCode(), r = Net.ref(code);
        const snap = await fs.getDoc(r);
        if (snap.exists()) continue;
        await fs.setDoc(r, { code, created: Date.now(), updated: Date.now(), status: 'waiting', hostId: id, hostName: name, hostTheme: theme, hostSide: side,
          guestId: null, guestName: null, guestTheme: null, moves: [], result: null, draw: null, emote: null });
        return code;
      }
      throw new Error('Nem sikerült szabad szobakódot találni.');
    },
    async joinRoom(code, { name, theme }) {
      await Net.init(); code = code.trim().toUpperCase();
      const r = Net.ref(code);
      return fs.runTransaction(db, async tx => {
        const s = await tx.get(r);
        if (!s.exists()) throw new Error('Nincs ilyen szoba: ' + code);
        const d = s.data();
        if (d.hostId === id) return { role: 'host', data: d, code };
        if (d.guestId === id) return { role: 'guest', data: d, code };
        if (d.guestId) throw new Error('Ez a szoba már tele van.');
        if (d.result) throw new Error('Ez a játszma már véget ért.');
        const th = theme === d.hostTheme ? ['white', 'black', 'red', 'gold'].find(t => t !== d.hostTheme) : theme;
        tx.update(r, { guestId: id, guestName: name, guestTheme: th, status: 'playing', updated: Date.now() });
        return { role: 'guest', data: Object.assign({}, d, { guestId: id, guestName: name, guestTheme: th, status: 'playing' }), code };
      });
    },
    subscribe(code, cb, err) { return fs.onSnapshot(Net.ref(code), s => { if (s.exists()) cb(s.data()); }, err); },
    async sendMove(code, expectedLen, uci) {
      const r = Net.ref(code);
      return fs.runTransaction(db, async tx => {
        const s = await tx.get(r), d = s.data();
        if (!d || d.moves.length !== expectedLen || d.result) return false;
        tx.update(r, { moves: d.moves.concat(uci), draw: null, updated: Date.now() });
        return true;
      });
    },
    async setResult(code, result) {
      const r = Net.ref(code);
      return fs.runTransaction(db, async tx => {
        const s = await tx.get(r); if (!s.exists() || s.data().result) return false;
        tx.update(r, { result, status: 'finished', updated: Date.now() }); return true;
      });
    },
    emote(code, by, kind) { return fs.updateDoc(Net.ref(code), { emote: { by, kind, n: Date.now() } }); },
    offerDraw(code, side) { return fs.updateDoc(Net.ref(code), { draw: side }); },
    async get(code) { await Net.init(); const s = await fs.getDoc(Net.ref(code)); return s.exists() ? s.data() : null; },
  };
  root.Net = Net;
})(window);
