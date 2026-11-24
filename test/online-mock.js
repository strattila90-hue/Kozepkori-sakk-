// Firestore-szimuláció localStorage-szal (csak teszthez): két lap ugyanazon a böngészőn osztozik rajta.
window.__installMock = function () {
  const K = c => 'mock_room_' + c, subs = {};
  const rd = c => { const s = localStorage.getItem(K(c)); return s ? JSON.parse(s) : null; };
  const wr = (c, d) => { localStorage.setItem(K(c), JSON.stringify(d)); (subs[c] || []).forEach(cb => cb(JSON.parse(JSON.stringify(d)))); };
  window.addEventListener('storage', e => { if (e.key && e.key.startsWith('mock_room_')) { const c = e.key.slice(10); (subs[c] || []).forEach(cb => cb(JSON.parse(e.newValue))); } });
  Object.assign(Net, {
    available: () => true, init: async () => {},
    async createRoom({ name, theme, side }) { const code = Net.genCode(); wr(code, { code, status: 'waiting', hostId: Net.id, hostName: name, hostTheme: theme, hostSide: side, guestId: null, guestName: null, guestTheme: null, moves: [], result: null, draw: null, emote: null }); return code; },
    async joinRoom(code, { name, theme }) { code = code.toUpperCase(); const d = rd(code); if (!d) throw new Error('Nincs ilyen szoba: ' + code); if (d.hostId === Net.id) return { role: 'host', data: d, code }; if (d.guestId && d.guestId !== Net.id) throw new Error('tele'); const th = theme === d.hostTheme ? 'black' : theme; Object.assign(d, { guestId: Net.id, guestName: name, guestTheme: th, status: 'playing' }); wr(code, d); return { role: 'guest', data: d, code }; },
    subscribe(code, cb) { (subs[code] = subs[code] || []).push(cb); setTimeout(() => { const d = rd(code); if (d) cb(d); }, 0); return () => { subs[code] = subs[code].filter(x => x !== cb); }; },
    async sendMove(code, len, uci) { const d = rd(code); if (d.moves.length !== len || d.result) return false; d.moves.push(uci); d.draw = null; wr(code, d); return true; },
    async setResult(code, r) { const d = rd(code); if (d.result) return false; d.result = r; d.status = 'finished'; wr(code, d); return true; },
    async emote(code, by, kind) { const d = rd(code); d.emote = { by, kind, n: Date.now() }; wr(code, d); },
    async offerDraw(code, side) { const d = rd(code); d.draw = side; wr(code, d); },
  });
};
