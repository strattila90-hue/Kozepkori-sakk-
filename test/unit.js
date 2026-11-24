// Egységtesztek (böngésző nélkül): sakkszabályok, szövegek, kiadási konzisztencia, eszközök megléte.
const fs = require('fs'), path = require('path'); const ROOT = path.join(__dirname, '..');
const Chess = require(path.join(ROOT, 'js/chess.js'));
let pass = 0, fail = 0; const t = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' -> ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error((m || '') + ' várt: ' + b + ', kapott: ' + a); };
const play = (g, list) => { for (const u of list) { if (!g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promo: u[4] || null })) throw new Error('érvénytelen lépés ' + u); } };

console.log('Sakkmotor');
[['start', Chess.START, 4, 197281], ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862], ['pos3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238], ['pos4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467], ['pos5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379]]
  .forEach(([n, fen, d, exp]) => t('perft ' + n, () => eq(new Chess(fen).perft(d), exp)));
t('bolondmatt', () => { const g = new Chess(); play(g, ['f2f3', 'e7e5', 'g2g4', 'd8h4']); eq(g.status(), 'checkmate'); });
t('patt', () => eq(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').status(), 'stalemate'));
t('anyaghiány', () => eq(new Chess('8/8/8/4k3/8/8/8/4K2B w - - 0 1').status(), 'draw-insufficient'));
t('háromszori ismétlés', () => { const g = new Chess(); play(g, ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']); eq(g.status(), 'draw-repetition'); });
t('50 lépés', () => eq(new Chess('8/8/8/4k3/8/8/8/R3K3 w - - 100 80').status(), 'draw-50'));
t('en passant', () => { const g = new Chess('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1'); play(g, ['e5d6']); eq(g.board[27], null); eq(g.board[19], 'P'); });
t('sáncolás kiskirály', () => { const g = new Chess('4k3/8/8/8/8/8/8/4K2R w K - 0 1'); play(g, ['e1g1']); eq(g.board[62], 'K'); eq(g.board[61], 'R'); });
t('átváltozás vezérre', () => { const g = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1'); play(g, ['a7a8q']); eq(g.board[0], 'Q'); });
t('sakkban nem sáncolhat', () => { const g = new Chess('4k3/8/8/8/8/8/4r3/4K2R w K - 0 1'); eq(g.moves().some(m => m.castle), false); });
t('bot szabályos lépést ad (3 szint)', () => { for (const lv of [1, 2, 3]) { const g = new Chess(); const m = Chess.bestMove(g, lv); if (!g.moves().some(x => x.from === m.from && x.to === m.to)) throw new Error('szint ' + lv); } });
t('bot matt-egyest talál', () => { const g = new Chess('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'); const m = Chess.bestMove(g, 3); eq(Chess.sqName(m.from) + Chess.sqName(m.to), 'a1a8'); });
t('FEN körbejárás', () => { const g = new Chess(); play(g, ['e2e4', 'c7c5', 'g1f3']); eq(new Chess(g.fen()).fen(), g.fen()); });

console.log('Szövegek');
global.window = global; require(path.join(ROOT, 'js/lines.js'));
t('minden kategória nem üres, nincs egymás utáni ismétlés', () => { for (const c of ['engage', 'reply', 'taunt', 'idle', 'hurt', 'dying', 'crowd', 'check', 'promo', 'win', 'beg', 'burn', 'betray', 'scav', 'execution', 'plague', 'castle', 'insult', 'butcher', 'pig', 'prisoner', 'torturer']) { let prev = null; for (let i = 0; i < 40; i++) { const s = L.pick(c); if (!s || s === '...') throw new Error(c + ' üres'); if (s === prev) throw new Error(c + ' ismétlődik'); prev = s; } } });
t('nincs etnikai/faji gúny a szövegekben', () => { const s = fs.readFileSync(path.join(ROOT, 'js/lines.js'), 'utf8').toLowerCase(); for (const w of ['cigány', 'zsidó', 'néger', 'buzi']) if (s.includes(w)) throw new Error('tiltott szó: ' + w); });
t('buborék-hossz korlátos', () => eq(L.dur('x'.repeat(200)) <= 4.2, true));

console.log('Online adat-ellenőrzés (js/protocol.js)');
global.Chess = Chess; const Proto = require(path.join(ROOT, 'js/protocol.js'));
t('név: tisztítás, hossz, tartalék', () => { eq(Proto.cleanName('  <b>Géza</b>  '), 'bGéza/b'); eq(/[<>]/.test(Proto.cleanName('<<>>a')), false); eq(Proto.cleanName('x'.repeat(99)).length, Proto.NAME_MAX); eq(Proto.cleanName('\u0001\u0002', 'Paraszt'), 'Paraszt'); eq(Proto.cleanName(null, 'T'), 'T'); eq(Proto.cleanName({}, 'T') !== '', true); });
t('hamis téma/oldal tartalékra esik (összeomlás ellen)', () => { eq(Proto.cleanTheme('<script>', 'white'), 'white'); eq(Proto.cleanTheme('gold', 'white'), 'gold'); eq(Proto.cleanSide('q', 'w'), 'w'); });
t('lépés-elemzés: csak érvényes alak', () => { eq(Proto.parseMove('e2e4').to, 'e4'); eq(Proto.parseMove('a7a8q').promo, 'q'); for (const bad of ['e2e9', 'E2E4', '', 'e2e4qq', null, 42, {}, ['e2e4']]) eq(Proto.parseMove(bad), null, JSON.stringify(bad)); });
t('újrajátszás: az első szabálytalan lépésnél megáll', () => { const r = Proto.replay(['e2e4', 'e7e5', 'e2e4', 'g1f3']); eq(r.n, 2); eq(r.bad, true); eq(Proto.replay(['e2e4', 'e7e5']).bad, false); });
t('újrajátszás: nem-lista és hosszú lista nem dob hibát', () => { eq(Proto.replay(undefined).n, 0); eq(Proto.replay('e2e4').n, 0); eq(Proto.replay(new Array(5000).fill('e2e4')).n, 1); });
t('eredmény/emote: hamis érték elutasítva', () => { eq(Proto.cleanResult({ type: 'resign', loser: 'x' }), null); eq(Proto.cleanResult({ type: 'boom' }), null); eq(Proto.cleanResult({ type: 'resign', loser: 'w' }).loser, 'w'); eq(Proto.cleanEmote({ by: 'w', kind: '<img>', n: 1 }), null); eq(Proto.cleanEmote({ by: 'w', kind: 'fart', n: 5 }).n, 5); });
t('parseRoom: hamis dokumentum ártalmatlan nézetté alakul', () => { const r = Proto.parseRoom({ moves: ['e2e4', { result: 1 }, 'e7e5'], hostTheme: 'x', guestId: 'g', guestName: '<i>' + 'y'.repeat(50), hostSide: 'z', result: { type: 'resign', loser: 7 }, draw: 'q', emote: { kind: 'x' } }); eq(r.moves.length, 1); eq(r.badMoves, true); eq(r.hostTheme, 'white'); eq(r.hostSide, 'w'); eq(r.result, null); eq(r.draw, null); eq(r.emote, null); eq(r.guestName.length <= Proto.NAME_MAX, true); eq(Proto.parseRoom(null).moves.length, 0); eq(Proto.parseRoom('x').hostName, 'Gazda'); });

console.log('Kiadás és eszközök');
const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version;
t('verzió: version.json = sw.js = main.js = package.json', () => {
  eq(/VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1], j, 'sw.js');
  eq(/APP_V = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8'))[1], j, 'main.js');
  eq(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version, j, 'package.json');
});
t('az SW előtöltési listájának minden fájlja létezik', () => { const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'); const list = eval(/const CORE = (\[[\s\S]*?\]);/.exec(src)[1]); for (const f of list) if (f !== './' && !fs.existsSync(path.join(ROOT, f))) throw new Error('hiányzik: ' + f); });
t('az index.html minden szkriptje és ikonja létezik', () => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); for (const m of h.matchAll(/(?:src|href)="((?:js|icons|assets)\/[^"]+|style\.css|manifest\.webmanifest|firebase-config\.js)"/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) throw new Error('hiányzik: ' + m[1]); });
t('a sw.js előtöltése lefedi az index.html szkriptjeit', () => { const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); for (const m of h.matchAll(/src="(js\/[^"]+)"/g)) if (!src.includes("'" + m[1] + "'")) throw new Error('nincs előtöltve: ' + m[1]); });
t('minden bábu-sprite megvan (6 bábu x 3 nézet x 4 sereg)', () => { for (const ty of 'KQPBNR') for (const v of ['front', 'back', 'side']) for (const a of ['white', 'black', 'red', 'gold']) if (!fs.existsSync(path.join(ROOT, `assets/figs/${ty}_${v}_${a}.webp`))) throw new Error(`${ty}_${v}_${a}`); });
t('meta.json minden bábunézethez tartalmazza a fej-átszámítást', () => { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/figs/meta.json'), 'utf8')); for (const ty of 'KQPBNR') for (const v of ['front', 'back', 'side']) { const e = m[ty + '_' + v]; if (!e || !(e.ratio >= 1) || e.xr === undefined) throw new Error(ty + '_' + v); } });
t('manifest érvényes és az ikonok léteznek', () => { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')); for (const i of m.icons) if (!fs.existsSync(path.join(ROOT, i.src))) throw new Error(i.src); });
t('Firestore-szabály tiltja a törlést', () => eq(/allow delete: if false/.test(fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')), true));
t('képernyőolvasó-jelzések megvannak (vászon, értesítések)', () => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); for (const re of [/<canvas id="c" role="img" aria-label=/, /id="toast" role="status"/, /id="turnBadge" role="status"/, /id="hint" role="status"/, /<html lang="hu"/]) if (!re.test(h)) throw new Error(String(re)); });
t('nincs emoji a felületen (index.html, js)', () => { const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u; for (const f of ['index.html', 'js/main.js', 'js/world.js', 'js/fx.js', 'js/protocol.js']) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = re.exec(s); if (m) throw new Error(f + ': ' + m[0]); } });
console.log(`\nEgységtesztek: ${pass} sikeres, ${fail} hibás`); process.exit(fail ? 1 : 0);
