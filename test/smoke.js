// Böngészős füsttesztek (Playwright): betöltés, kijelölés minden bábun, online nézet-tájolás, visszalépés, bot oldalválasztás.
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright'); const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
let pass = 0, fail = 0; const ok = (n, c, info) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || info === undefined ? '' : ' -> ' + JSON.stringify(info))); };
(async () => {
  const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith(path.sep) || q.url === '/') f = path.join(ROOT, 'index.html'); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
  await new Promise(r => srv.listen(0, r)); const URL = 'http://localhost:' + srv.address().port + '/index.html';
  const b = await chromium.launch(); const errs = [];
  const mk = async (ctx) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(1200); return p; };
  const idle = async p => { for (let k = 0; k < 500; k++) { if (!(await p.evaluate(() => W.busy || __G.pumping))) return; await p.waitForTimeout(40); } };
  // h: a bábu-sprite magassága a talptól (a bábuk teljes léptékben, "plakátként" rajzolódnak, nem a kamera dőlése szerint vetítve)
  const tapSq = async (p, sq, h) => { const [x, y] = await p.evaluate(([sq, h]) => { const q = W.sqPos(sq); const f = W.P(q.x, 0, q.z); return [f.x, f.y - h * f.k]; }, [sq, h]); await p.mouse.click(x, y); };

  console.log('Betöltés');
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 } }); let p = await mk(ctx);
  ok('nincs oldal-hiba betöltéskor', errs.length === 0, errs);
  ok('verzió látszik a menüben', /v\d+\.\d+\.\d+/.test(await p.textContent('#verLine')));
  ok('manifest és service worker regisztrálva', await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; }));

  console.log('Kijelölés (helyi játék, minden mozgatható világos bábu)');
  await p.click('#btnLocal'); await p.waitForTimeout(1500); await p.evaluate(() => { W.idleOn = false; W.speed = 4; });
  const movable = await p.evaluate(() => __G.chess.moves().map(m => m.from).filter((v, i, a) => a.indexOf(v) === i));
  // minden bábunak kell legyen koppintható pontja (a fedő, elöl álló alak törzse a sajátja, de a fej/láb szabad)
  let bad = []; for (const sq of movable) { let good = false; for (const h of [1.1, 0.9, 0.7, 0.5, 0.3]) { await tapSq(p, sq, h); await p.waitForTimeout(50); const st = await p.evaluate(() => ({ s: __G.sel, t: W.hl.targets.length })); if (st.s === sq && st.t >= 1) { good = true; break; } } if (!good) bad.push(sq); }
  ok(`mind a ${movable.length} mozgatható bábu kijelölhető (van koppintható pontja)`, bad.length === 0, bad);
  await p.evaluate(() => { __G.sel = -1; W.hl.sel = -1; W.hl.targets = []; });
  await tapSq(p, 52, 0.7); await p.waitForTimeout(100); await tapSq(p, 36, 0); await idle(p);
  ok('lépés a célmezőre koppintva (e2-e4)', (await p.evaluate(() => __G.chess.moveList.join(','))) === 'e2e4');
  await p.click('#bUndo'); await p.waitForTimeout(500);
  ok('visszalépés visszaállítja az állást', (await p.evaluate(() => __G.chess.moveList.length)) === 0 && (await p.evaluate(() => W.pieces.length)) === 32);
  await p.close();

  console.log('Bot: oldalválasztás');
  p = await mk(ctx); await p.click('#botSideSeg button[data-v=b]'); await p.click('#btnBot'); await p.waitForTimeout(5000); await idle(p);
  const bs = await p.evaluate(() => ({ my: __G.mySide, flip: W.flip, n: __G.chess.moveList.length }));
  ok('sötétnél a tábla megfordul, és a bot lép először', bs.my === 'b' && bs.flip === true && bs.n >= 1, bs); await p.close();

  console.log('Online (szimulált Firestore): mindkét játékos a saját seregét látja közelről');
  const mockSrc = fs.readFileSync(path.join(__dirname, 'online-mock.js'), 'utf8');
  for (const hostSide of ['w', 'b']) {
    const c2 = await b.newContext({ viewport: { width: 430, height: 900 } }); const A = await mk(c2), B = await mk(c2);
    for (const pg of [A, B]) { await pg.addScriptTag({ content: mockSrc }); await pg.evaluate(() => window.__installMock()); }
    await A.evaluate(() => { Net.id = 'idA'; }); await B.evaluate(() => { Net.id = 'idB'; });
    await A.click(`#sideSeg button[data-v=${hostSide}]`); await A.click('#btnCreate'); await A.waitForSelector('#lobby:not(.hidden)'); const code = await A.textContent('#lobbyCode');
    ok(`[${hostSide}] a szobakód 5 jegyű`, /^[A-Z2-9]{5}$/.test(code), code);
    await B.fill('#code', code); await B.click('#btnJoin'); await A.waitForSelector('#hud:not(.hidden)'); await B.waitForSelector('#hud:not(.hidden)'); await A.waitForTimeout(800);
    for (const [n, pg] of [['gazda', A], ['vendég', B]]) {
      const r = await pg.evaluate(() => { const my = __G.mySide, opp = my === 'w' ? 'b' : 'w', k = c => W.pieces.find(e => e.type === 'K' && e.color === c), ky = c => W.P(k(c).x, 0, k(c).z).y; return { my, flip: W.flip, ownNear: ky(my) > ky(opp), wantFlip: my === 'b' }; });
      ok(`[${hostSide}] ${n}: saját király alul, ellenfél felül (${r.my}, flip=${r.flip})`, r.ownNear && r.flip === r.wantFlip, r);
    }
    const sides = [await A.evaluate(() => __G.mySide), await B.evaluate(() => __G.mySide)]; ok(`[${hostSide}] a két játékos más oldalon ül`, sides[0] !== sides[1], sides);
    await c2.close();
  }
  ok('nincs oldal-hiba a teszt során', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(`\nFüsttesztek: ${pass} sikeres, ${fail} hibás`); process.exit(fail ? 1 : 0);
})();
