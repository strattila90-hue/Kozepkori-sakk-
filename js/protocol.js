/* Az online szoba adatainak ellenőrzése és tisztítása. A szoba egy megosztott dokumentum, amit bárki átírhat,
   ezért minden, ami onnan jön, megbízhatatlan: itt ellenőrizzük, mielőtt a játék használná.
   Tiszta logika (nincs DOM), ezért böngésző nélkül is tesztelhető (test/unit.js). */
(function (root) {
  'use strict';
  const MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
  const THEMES = ['white', 'black', 'red', 'gold'], SIDES = ['w', 'b'], EMOTES = ['fart', 'nose', 'laugh', 'burp'], RESULTS = ['resign', 'draw'];
  const NAME_MAX = 14, MAX_MOVES = 600;

  /** Név: vezérlőkarakterek és <> nélkül, egybefüggő szóközökkel, legfeljebb NAME_MAX karakter; üres esetén tartalék. */
  function cleanName(s, fallback) {
    const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    return t || fallback || '';
  }
  const cleanTheme = (t, fb) => (THEMES.includes(t) ? t : fb);
  const cleanSide = (s, fb) => (SIDES.includes(s) ? s : fb);

  /** "e2e4" / "a7a8q" -> {from,to,promo}; bármi más: null. */
  function parseMove(u) {
    if (typeof u !== 'string' || !MOVE_RE.test(u)) return null;
    return { from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || null };
  }

  /** A lépéslista újrajátszása a sakkmotorral. n: az érvényes lépések száma (az első szabálytalannál megáll); bad: volt-e szabálytalan. */
  function replay(moves, startFen) {
    const Ch = root.Chess, g = new Ch(startFen), list = Array.isArray(moves) ? moves.slice(0, MAX_MOVES) : [];
    let n = 0;
    for (const u of list) { const p = parseMove(u); if (!p || !g.move(p)) break; n++; }
    return { chess: g, n, bad: n < (Array.isArray(moves) ? Math.min(moves.length, MAX_MOVES) : 0) };
  }

  function cleanResult(r) {
    if (!r || typeof r !== 'object' || !RESULTS.includes(r.type)) return null;
    return r.type === 'resign' ? (SIDES.includes(r.loser) ? { type: 'resign', loser: r.loser } : null) : { type: 'draw' };
  }
  function cleanEmote(e) {
    if (!e || typeof e !== 'object' || !EMOTES.includes(e.kind) || !SIDES.includes(e.by) || typeof e.n !== 'number') return null;
    return { by: e.by, kind: e.kind, n: e.n };
  }

  /** A nyers szobadokumentumból megbízható nézet: ismert mezők, érvényes lépés-előtag, tiszta nevek és színek. */
  function parseRoom(d) {
    d = d && typeof d === 'object' ? d : {};
    const rep = replay(d.moves);
    return {
      hostId: typeof d.hostId === 'string' ? d.hostId : null, guestId: typeof d.guestId === 'string' ? d.guestId : null,
      hostName: cleanName(d.hostName, 'Gazda'), guestName: d.guestId ? cleanName(d.guestName, 'Ismeretlen lovag') : null,
      hostTheme: cleanTheme(d.hostTheme, 'white'), guestTheme: cleanTheme(d.guestTheme, 'black'), hostSide: cleanSide(d.hostSide, 'w'),
      moves: (Array.isArray(d.moves) ? d.moves : []).slice(0, rep.n), badMoves: rep.bad,
      result: cleanResult(d.result), draw: cleanSide(d.draw, null), emote: cleanEmote(d.emote), status: typeof d.status === 'string' ? d.status : '',
    };
  }

  root.Proto = { NAME_MAX, MAX_MOVES, THEMES, cleanName, cleanTheme, cleanSide, parseMove, replay, cleanResult, cleanEmote, parseRoom };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Proto;
})(typeof window !== 'undefined' ? window : globalThis);
