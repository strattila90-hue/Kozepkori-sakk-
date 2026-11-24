/* Vezényszavak (élő sakk): a hadvezér hangosan parancsol, a bábu engedelmeskedik.
   - note(m): magyar lépésjelölés (H f3, Bxe5, 0-0, e8=V+)
   - command(m): kimondott parancs („Huszár, f3-ra!”, „Futó, e5-re, üsd le a gyalogot!”)
   - speak(text): felolvasás magyar hanggal (ha a készüléken van ilyen)
   - parseVoice(szöveg, játék): kimondott lépés értelmezése („e2 e4”, „huszár f3”, „é kettő é négy”, „rövid sánc”)
   - listen(cb): hangfelismerés (hu-HU), ha a böngésző tudja */
(function (root) {
  'use strict';
  const NAME = { P: 'gyalog', N: 'huszár', B: 'futó', R: 'bástya', Q: 'vezér', K: 'király' };
  const ACC = { P: 'gyalogot', N: 'huszárt', B: 'futót', R: 'bástyát', Q: 'vezért', K: 'királyt' };
  const LET = { P: '', N: 'H', B: 'F', R: 'B', Q: 'V', K: 'K' };
  const SUFFIX = { 1: 're', 2: 're', 3: 'ra', 4: 're', 5: 're', 6: 'ra', 7: 're', 8: 'ra' };   // „egyre, kettőre, háromra…” (hangrend)
  const FILES = 'abcdefgh';
  const sq = i => FILES[i & 7] + (8 - (i >> 3));
  const up = s => s[0].toUpperCase() + s.slice(1);

  function note(m) {
    if (!m) return '';
    let s;
    if (m.castle) s = m.castle === 'K' ? '0-0' : '0-0-0';
    else {
      const t = m.piece.toUpperCase();
      s = (t === 'P' ? (m.cap ? FILES[m.from & 7] : '') : LET[t]) + (m.cap ? 'x' : '') + sq(m.to) + (m.promo ? '=' + LET[m.promo.toUpperCase()] : '');
    }
    if (m.status === 'checkmate') s += '#'; else if (m.check) s += '+';
    return s;
  }
  function command(m) {
    if (!m) return '';
    if (m.castle) return m.castle === 'K' ? 'Király, rövid sánc!' : 'Király, hosszú sánc!';
    const t = m.piece.toUpperCase(), to = sq(m.to);
    let s = up(NAME[t]) + ', ' + to + '-' + SUFFIX[to[1]];
    if (m.cap) s += ', üsd le a ' + ACC[m.cap.toUpperCase()];
    if (m.promo) s += ', légy ' + NAME[m.promo.toUpperCase()];
    s += '!';
    if (m.status === 'checkmate') s += ' Matt!'; else if (m.check) s += ' Sakk!';
    return s;
  }

  /* ---------- felolvasás ---------- */
  let huVoice = null, voiceChecked = false;
  function findVoice() {
    if (!root.speechSynthesis) return null;
    const v = root.speechSynthesis.getVoices(); if (v.length) voiceChecked = true;
    huVoice = v.find(x => /^hu/i.test(x.lang)) || null; return huVoice;
  }
  if (root.speechSynthesis && root.speechSynthesis.addEventListener) root.speechSynthesis.addEventListener('voiceschanged', findVoice);
  function speak(text) {
    try {
      if (!root.speechSynthesis) return false; if (!voiceChecked || !huVoice) findVoice(); if (!huVoice) return false;
      const u = new root.SpeechSynthesisUtterance(text.replace(/-r([ae])/g, 'r$1'));   // „f3-ra” -> „f3ra”: a gép egybe mondja
      u.voice = huVoice; u.lang = huVoice.lang; u.rate = 1.05; u.pitch = 0.8; u.volume = 0.9;
      root.speechSynthesis.cancel(); root.speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  }
  const canSpeak = () => !!(root.speechSynthesis && (findVoice() || !voiceChecked));

  /* ---------- kimondott lépés értelmezése ---------- */
  const NUM = { egy: 1, egyes: 1, kettő: 2, kettes: 2, két: 2, ketto: 2, három: 3, harom: 3, hármas: 3, négy: 4, negy: 4, négyes: 4, öt: 5, ot: 5, ötös: 5, hat: 6, hatos: 6, hét: 7, het: 7, hetes: 7, nyolc: 8, nyolcas: 8 };
  const LETW = { a: 'a', á: 'a', bé: 'b', be: 'b', b: 'b', cé: 'c', ce: 'c', c: 'c', dé: 'd', de: 'd', d: 'd', e: 'e', é: 'e', ef: 'f', f: 'f', gé: 'g', ge: 'g', g: 'g', há: 'h', ha: 'h', h: 'h' };
  const PIECEW = [[/^(gyalog|paraszt)/, 'P'], [/^(huszár|huszar|ló|lo|lovag|lovas)/, 'N'], [/^(futó|futo|pap)/, 'B'], [/^(bástya|bastya|torony)/, 'R'], [/^(vezér|vezer|királynő|kiralyno|királyné|dáma|dama)/, 'Q'], [/^(király|kiraly)/, 'K']];
  function squaresIn(text) {
    const toks = text.toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/([a-h])\s*-\s*([1-8])/g, '$1$2').split(/\s+/).filter(Boolean), out = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i].replace(/-(r[ae]|ra|re|ba|be|ról|ről|ra)$/, '');
      let m = /^([a-h])([1-8])/.exec(t); if (m) { out.push(m[1] + m[2]); continue; }
      const L = LETW[t], n = toks[i + 1] ? (NUM[toks[i + 1].replace(/(r[ae]|ra|re|ba|be|ról|ről|on|en|ön|n)$/, '')] || NUM[toks[i + 1]] || (/^[1-8]/.test(toks[i + 1]) ? +toks[i + 1][0] : 0)) : 0;
      if (L && n) { out.push(L + n); i++; }
    }
    return out;
  }
  function pieceIn(text) { for (const w of text.toLowerCase().split(/[\s,.!?]+/)) for (const [re, t] of PIECEW) if (re.test(w)) return t; return null; }
  /** Visszaad: { move: {from,to,promo} } vagy { error: 'szöveg' } */
  function parseVoice(text, game) {
    if (!text || !game) return { error: 'Nem hallottam semmit, uram.' };
    const low = text.toLowerCase(), legal = game.moves();
    if (/sánc|sanc/.test(low)) {
      const want = /hosszú|hosszu|nagy|vezér/.test(low) ? 'Q' : 'K', m = legal.find(x => x.castle === want) || (!/rövid|rovid|hosszú|hosszu/.test(low) && legal.find(x => x.castle));
      return m ? { move: { from: m.from, to: m.to } } : { error: 'Most nem sáncolhatsz, uram.' };
    }
    const sqs = squaresIn(text), piece = pieceIn(text), idx = s => (8 - +s[1]) * 8 + FILES.indexOf(s[0]);
    let promo = null; const pw = /(légy|legyen|változz|valtozz).*?(vezér|vezer|királynő|bástya|bastya|futó|futo|huszár|huszar|ló)/.exec(low);
    if (pw) promo = { vezér: 'q', vezer: 'q', királynő: 'q', bástya: 'r', bastya: 'r', futó: 'b', futo: 'b', huszár: 'n', huszar: 'n', ló: 'n' }[pw[2]];
    let cand = [];
    if (sqs.length >= 2) cand = legal.filter(m => m.from === idx(sqs[0]) && m.to === idx(sqs[1]));
    if (!cand.length && sqs.length >= 1) {
      const to = idx(sqs[sqs.length - 1]);
      cand = legal.filter(m => m.to === to && (!piece || m.piece.toUpperCase() === piece));
      if (cand.length > 1 && !piece) { const pawn = cand.filter(m => m.piece.toUpperCase() === 'P'); if (pawn.length) cand = pawn; }   // „e4” = gyaloglépés, mint a jelölésben
    }
    if (!sqs.length) return { error: piece ? 'Hová menjen a ' + NAME[piece] + ', uram?' : 'Nem értem a parancsot, uram. Mondd például: „huszár f3” vagy „e2 e4”.' };
    const uniq = []; for (const m of cand) if (!uniq.some(u => u.from === m.from && u.to === m.to)) uniq.push(m);
    if (!uniq.length) return { error: 'Erre nincs szabályos lépés: ' + sqs.join(' ') + '.' };
    if (uniq.length > 1) return { error: 'Több bábu is mehet oda – mondd a kiinduló mezőt is (pl. „' + sq(uniq[0].from) + ' ' + sq(uniq[0].to) + '”).' };
    const m = uniq[0]; return { move: { from: m.from, to: m.to, promo: m.promo ? (promo || 'q') : null } };
  }

  /* ---------- hangfelismerés ---------- */
  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  function listen(cb) {
    if (!SR) { cb({ error: 'Ez a böngésző nem érti a hangparancsot.' }); return null; }
    const r = new SR(); r.lang = 'hu-HU'; r.interimResults = false; r.maxAlternatives = 4;
    let done = false;
    r.onresult = e => { done = true; const alts = [...e.results[0]].map(a => a.transcript); cb({ alts }); };
    r.onerror = e => { if (done) return; done = true; cb({ error: e.error === 'not-allowed' ? 'A mikrofont nem engedted, uram.' : e.error === 'no-speech' ? 'Nem hallottam semmit, uram.' : 'A hírnök nem értette: ' + e.error }); };
    r.onend = () => { if (!done) { done = true; cb({ error: 'Nem hallottam semmit, uram.' }); } };
    try { r.start(); } catch (e) { cb({ error: 'A mikrofon most foglalt.' }); return null; }
    return r;
  }

  const Cmd = { note, command, speak, canSpeak, parseVoice, listen, canListen: !!SR, squaresIn, NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = Cmd; else root.Cmd = Cmd;
})(typeof window !== 'undefined' ? window : globalThis);
