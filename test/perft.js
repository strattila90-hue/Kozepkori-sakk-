const Chess = require('../js/chess.js');
const cases = [
  ['start', Chess.START, 4, 197281],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['pos3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
  ['pos4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
  ['pos5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
];
let ok = true;
for (const [n, fen, d, exp] of cases) {
  const got = new Chess(fen).perft(d);
  console.log(n, got === exp ? 'OK' : 'FAIL', got, exp);
  if (got !== exp) ok = false;
}
// játékszabályok
let g = new Chess(); for (const m of ['f2f3','e7e5','g2g4','d8h4']) g.move({from:m.slice(0,2),to:m.slice(2,4)});
console.log('bolondmatt', g.status() === 'checkmate' ? 'OK' : 'FAIL'); if (g.status()!=='checkmate') ok=false;
g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'); console.log('patt', g.status()==='stalemate'?'OK':'FAIL'); if (g.status()!=='stalemate') ok=false;
g = new Chess('8/8/8/4k3/8/8/8/4K2B w - - 0 1'); console.log('anyaghiany', g.status()==='draw-insufficient'?'OK':'FAIL');
g = new Chess(); for (const m of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8']) g.move({from:m.slice(0,2),to:m.slice(2,4)});
console.log('ismetles', g.status()==='draw-repetition'?'OK':'FAIL'); if (g.status()!=='draw-repetition') ok=false;
const t=Date.now(); const bm = Chess.bestMove(new Chess(),3); console.log('bot d3', Chess.sqName(bm.from)+Chess.sqName(bm.to), Date.now()-t,'ms');
process.exit(ok?0:1);
