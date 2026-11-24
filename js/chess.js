/* Teljes értékű, hivatalos szabályú sakkmotor (sáncolás, en passant, átváltozás,
   matt, patt, 50 lépés, háromszori ismétlés, anyaghiány) + egyszerű bot. */
(function (root) {
  'use strict';
  const FILES = 'abcdefgh';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BD = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const RD = [[-1,0],[1,0],[0,-1],[0,1]];
  const sqName = i => FILES[i & 7] + (8 - (i >> 3));
  const sqIdx = n => (8 - parseInt(n[1], 10)) * 8 + FILES.indexOf(n[0]);
  const colorOf = p => (p === p.toUpperCase() ? 'w' : 'b');

  class Chess {
    constructor(fen) { this.load(fen || START); }

    load(fen) {
      const p = fen.split(' ');
      this.board = new Array(64).fill(null);
      let i = 0;
      for (const ch of p[0]) {
        if (ch === '/') continue;
        if (/\d/.test(ch)) i += +ch; else this.board[i++] = ch;
      }
      this.turn = p[1] || 'w';
      const c = p[2] || '-';
      this.castle = { K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') };
      this.ep = p[3] && p[3] !== '-' ? sqIdx(p[3]) : -1;
      this.half = +(p[4] || 0);
      this.full = +(p[5] || 1);
      this.stack = [];
      this.keys = [this.key()];
      this.moveList = [];
    }

    fen() {
      let s = '';
      for (let r = 0; r < 8; r++) {
        let e = 0;
        for (let f = 0; f < 8; f++) {
          const p = this.board[r * 8 + f];
          if (!p) e++; else { if (e) { s += e; e = 0; } s += p; }
        }
        if (e) s += e;
        if (r < 7) s += '/';
      }
      const c = (this.castle.K ? 'K' : '') + (this.castle.Q ? 'Q' : '') + (this.castle.k ? 'k' : '') + (this.castle.q ? 'q' : '');
      return `${s} ${this.turn} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
    }

    key() { return this.fen().split(' ').slice(0, 4).join(' '); }

    clone() {
      const c = new Chess(START);
      c.board = this.board.slice();
      c.turn = this.turn; c.castle = Object.assign({}, this.castle);
      c.ep = this.ep; c.half = this.half; c.full = this.full;
      c.stack = []; c.keys = this.keys.slice(); c.moveList = this.moveList.slice();
      return c;
    }

    kingSq(color) {
      const k = color === 'w' ? 'K' : 'k';
      return this.board.indexOf(k);
    }

    attacked(sq, by) {
      const b = this.board, r = sq >> 3, f = sq & 7;
      const pawn = by === 'w' ? 'P' : 'p';
      const pr = by === 'w' ? r + 1 : r - 1;
      if (pr >= 0 && pr < 8) {
        if (f > 0 && b[pr * 8 + f - 1] === pawn) return true;
        if (f < 7 && b[pr * 8 + f + 1] === pawn) return true;
      }
      const kn = by === 'w' ? 'N' : 'n', kg = by === 'w' ? 'K' : 'k';
      for (const [dr, df] of KN) {
        const rr = r + dr, ff = f + df;
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === kn) return true;
      }
      for (const [dr, df] of KG) {
        const rr = r + dr, ff = f + df;
        if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === kg) return true;
      }
      const bq = by === 'w' ? 'BQ' : 'bq', rq = by === 'w' ? 'RQ' : 'rq';
      for (const [dr, df] of BD) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const p = b[rr * 8 + ff];
          if (p) { if (bq.includes(p)) return true; break; }
          rr += dr; ff += df;
        }
      }
      for (const [dr, df] of RD) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const p = b[rr * 8 + ff];
          if (p) { if (rq.includes(p)) return true; break; }
          rr += dr; ff += df;
        }
      }
      return false;
    }

    inCheck(color) {
      color = color || this.turn;
      const k = this.kingSq(color);
      return k >= 0 && this.attacked(k, color === 'w' ? 'b' : 'w');
    }

    pseudo() {
      const out = [], b = this.board, us = this.turn, them = us === 'w' ? 'b' : 'w';
      const add = (from, to, piece, extra) => out.push(Object.assign({ from, to, piece, cap: b[to] || null, capSq: to, promo: null, castle: null, ep: false }, extra));
      for (let s = 0; s < 64; s++) {
        const p = b[s];
        if (!p || colorOf(p) !== us) continue;
        const t = p.toUpperCase(), r = s >> 3, f = s & 7;
        if (t === 'P') {
          const dir = us === 'w' ? -1 : 1, startR = us === 'w' ? 6 : 1, lastR = us === 'w' ? 0 : 7;
          const r1 = r + dir;
          if (r1 < 0 || r1 > 7) continue;
          const push = (to, extra) => {
            if (to >> 3 === lastR) for (const pr of 'QRBN') add(s, to, p, Object.assign({}, extra, { promo: us === 'w' ? pr : pr.toLowerCase() }));
            else add(s, to, p, extra);
          };
          if (!b[r1 * 8 + f]) {
            push(r1 * 8 + f);
            if (r === startR && !b[(r + 2 * dir) * 8 + f]) add(s, (r + 2 * dir) * 8 + f, p, { double: true });
          }
          for (const df of [-1, 1]) {
            const ff = f + df; if (ff < 0 || ff > 7) continue;
            const to = r1 * 8 + ff, tp = b[to];
            if (tp && colorOf(tp) === them) push(to);
            else if (to === this.ep) add(s, to, p, { cap: us === 'w' ? 'p' : 'P', capSq: r * 8 + ff, ep: true });
          }
        } else if (t === 'N' || t === 'K') {
          for (const [dr, df] of (t === 'N' ? KN : KG)) {
            const rr = r + dr, ff = f + df;
            if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
            const to = rr * 8 + ff, tp = b[to];
            if (!tp || colorOf(tp) === them) add(s, to, p);
          }
          if (t === 'K') {
            const home = us === 'w' ? 60 : 4;
            if (s === home && !this.attacked(s, them)) {
              const ks = us === 'w' ? this.castle.K : this.castle.k;
              const qs = us === 'w' ? this.castle.Q : this.castle.q;
              const rook = us === 'w' ? 'R' : 'r';
              if (ks && b[home + 3] === rook && !b[home + 1] && !b[home + 2] &&
                  !this.attacked(home + 1, them) && !this.attacked(home + 2, them))
                add(s, home + 2, p, { castle: 'K' });
              if (qs && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
                  !this.attacked(home - 1, them) && !this.attacked(home - 2, them))
                add(s, home - 2, p, { castle: 'Q' });
            }
          }
        } else {
          const dirs = t === 'B' ? BD : t === 'R' ? RD : BD.concat(RD);
          for (const [dr, df] of dirs) {
            let rr = r + dr, ff = f + df;
            while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
              const to = rr * 8 + ff, tp = b[to];
              if (!tp) add(s, to, p);
              else { if (colorOf(tp) === them) add(s, to, p); break; }
              rr += dr; ff += df;
            }
          }
        }
      }
      return out;
    }

    make(m) {
      const b = this.board;
      const u = { m, castle: Object.assign({}, this.castle), ep: this.ep, half: this.half, full: this.full, turn: this.turn };
      this.stack.push(u);
      b[m.to] = m.promo || m.piece;
      b[m.from] = null;
      if (m.ep) b[m.capSq] = null;
      if (m.castle) {
        const home = m.from;
        if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = null; }
        else { b[home - 1] = b[home - 4]; b[home - 4] = null; }
      }
      const c = this.castle;
      if (m.piece === 'K') { c.K = false; c.Q = false; }
      if (m.piece === 'k') { c.k = false; c.q = false; }
      for (const s of [m.from, m.to]) {
        if (s === 63) c.K = false; if (s === 56) c.Q = false;
        if (s === 7) c.k = false; if (s === 0) c.q = false;
      }
      this.ep = m.double ? (m.from + m.to) >> 1 : -1;
      this.half = (m.piece.toUpperCase() === 'P' || m.cap) ? 0 : this.half + 1;
      if (this.turn === 'b') this.full++;
      this.turn = this.turn === 'w' ? 'b' : 'w';
    }

    unmake() {
      const u = this.stack.pop(), m = u.m, b = this.board;
      b[m.from] = m.piece;
      b[m.to] = null;
      if (m.ep) b[m.capSq] = m.cap; else if (m.cap) b[m.to] = m.cap;
      if (m.castle) {
        const home = m.from;
        if (m.castle === 'K') { b[home + 3] = b[home + 1]; b[home + 1] = null; }
        else { b[home - 4] = b[home - 1]; b[home - 1] = null; }
      }
      this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.full = u.full; this.turn = u.turn;
    }

    moves() {
      const us = this.turn, them = us === 'w' ? 'b' : 'w', out = [];
      for (const m of this.pseudo()) {
        this.make(m);
        const k = this.kingSq(us);
        if (!this.attacked(k, them)) out.push(m);
        this.unmake();
      }
      return out;
    }

    movesFrom(sq) { return this.moves().filter(m => m.from === sq); }

    /** Lépés végrehajtása. in: {from,to,promo} (index vagy "e2"), visszaad: lépés-objektum vagy null */
    move(o) {
      const from = typeof o.from === 'string' ? sqIdx(o.from) : o.from;
      const to = typeof o.to === 'string' ? sqIdx(o.to) : o.to;
      const promo = o.promo ? (this.turn === 'w' ? o.promo.toUpperCase() : o.promo.toLowerCase()) : null;
      const m = this.moves().find(x => x.from === from && x.to === to && (x.promo || null) === (promo || (x.promo ? (this.turn === 'w' ? 'Q' : 'q') : null)));
      if (!m) return null;
      const mover = this.turn;
      this.make(m);
      m.color = mover;
      m.check = this.inCheck();
      this.keys.push(this.key());
      this.moveList.push(sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : ''));
      m.status = this.status();
      return m;
    }

    uci(m) { return sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : ''); }

    insufficient() {
      const pcs = this.board.filter(Boolean).filter(p => p.toUpperCase() !== 'K');
      if (!pcs.length) return true;
      if (pcs.length === 1 && 'NnBb'.includes(pcs[0])) return true;
      if (pcs.every(p => 'Bb'.includes(p))) {
        const sq = this.board.map((p, i) => (p && 'Bb'.includes(p) ? ((i >> 3) + (i & 7)) & 1 : -1)).filter(x => x >= 0);
        if (sq.every(x => x === sq[0])) return true;
      }
      return false;
    }

    status() {
      const mv = this.moves();
      if (!mv.length) return this.inCheck() ? 'checkmate' : 'stalemate';
      if (this.insufficient()) return 'draw-insufficient';
      if (this.half >= 100) return 'draw-50';
      const k = this.keys[this.keys.length - 1];
      if (this.keys.filter(x => x === k).length >= 3) return 'draw-repetition';
      return 'playing';
    }

    perft(d) {
      if (d === 0) return 1;
      let n = 0;
      for (const m of this.moves()) { this.make(m); n += this.perft(d - 1); this.unmake(); }
      return n;
    }
  }

  /* ---------------- Bot ---------------- */
  const VAL = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 0 };
  const PST_P = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  const PST_N = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
  function evalPos(g) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = g.board[i]; if (!p) continue;
      const t = p.toUpperCase(), w = p === t;
      let v = VAL[t];
      const idx = w ? i : (7 - (i >> 3)) * 8 + (i & 7);
      if (t === 'P') v += PST_P[idx]; else if (t === 'N') v += PST_N[idx];
      else if (t === 'B' || t === 'Q') v += (3 - Math.max(Math.abs((i >> 3) - 3.5), Math.abs((i & 7) - 3.5)) | 0) * 4;
      s += w ? v : -v;
    }
    return g.turn === 'w' ? s : -s;
  }
  function order(ms) {
    return ms.sort((a, b) => ((b.cap ? VAL[b.cap.toUpperCase()] * 10 - VAL[b.piece.toUpperCase()] : 0) + (b.promo ? 800 : 0)) -
                             ((a.cap ? VAL[a.cap.toUpperCase()] * 10 - VAL[a.piece.toUpperCase()] : 0) + (a.promo ? 800 : 0)));
  }
  function quiesce(g, alpha, beta, d) {
    const stand = evalPos(g);
    if (d <= 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    const caps = order(g.moves().filter(m => m.cap || m.promo));
    for (const m of caps) {
      g.make(m);
      const sc = -quiesce(g, -beta, -alpha, d - 1);
      g.unmake();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function search(g, d, alpha, beta) {
    if (d === 0) return quiesce(g, alpha, beta, 3);
    const ms = order(g.moves());
    if (!ms.length) return g.inCheck() ? -100000 - d : 0;
    for (const m of ms) {
      g.make(m);
      const sc = -search(g, d - 1, -beta, -alpha);
      g.unmake();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  /** level: 1 = részeg paraszt, 2 = falusi bíró, 3 = hadvezér */
  Chess.bestMove = function (game, level) {
    const g = game.clone();
    const ms = g.moves();
    if (!ms.length) return null;
    if (level <= 1 && Math.random() < 0.45) return ms[Math.floor(Math.random() * ms.length)];
    const depth = level >= 3 ? 3 : level === 2 ? 2 : 1;
    let best = [], bs = -Infinity;
    for (const m of order(ms)) {
      g.make(m);
      let sc = -search(g, depth - 1, -Infinity, Infinity);
      g.unmake();
      sc += Math.random() * (level >= 3 ? 3 : 25);
      if (sc > bs) { bs = sc; best = [m]; }
    }
    return best[0];
  };

  Chess.START = START; Chess.sqName = sqName; Chess.sqIdx = sqIdx; Chess.colorOf = colorOf;
  if (typeof module !== 'undefined' && module.exports) module.exports = Chess; else root.Chess = Chess;
})(typeof window !== 'undefined' ? window : globalThis);
