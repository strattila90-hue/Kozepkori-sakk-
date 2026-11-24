// Böngészős füsttesztek (Playwright): betöltés, kijelölés minden bábun, online nézet-tájolás, visszalépés, bot oldalválasztás.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright'); const startServer = require('./server');
let pass = 0, fail = 0; const ok = (n, c, info) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + n + (c || info === undefined ? '' : ' -> ' + JSON.stringify(info))); };
(async () => {
  const srv = await startServer(); const URL = srv.url;
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
  console.log('Online: hibatűrés (szimulált Firestore)');
  {
    const c3 = await b.newContext({ viewport: { width: 430, height: 900 } }); const A = await mk(c3), B = await mk(c3);
    for (const pg of [A, B]) { await pg.addScriptTag({ content: mockSrc }); await pg.evaluate(() => window.__installMock()); }
    await A.evaluate(() => { Net.id = 'idA'; }); await B.evaluate(() => { Net.id = 'idB'; });
    await A.click('#sideSeg button[data-v=w]'); await A.click('#btnCreate'); await A.waitForSelector('#lobby:not(.hidden)'); const code = await A.textContent('#lobbyCode');
    // 1) hamisított szoba, MÉG a csatlakozás előtt: hamis téma és oldal, 500 karakteres név, szabálytalan lépések, lépésnek álcázott objektum
    await A.evaluate(c => { const k = 'mock_room_' + c, d = JSON.parse(localStorage.getItem(k)); d.moves = []; d.hostTheme = '<img onerror=x>'; d.hostSide = 'q'; d.hostName = 'N'.repeat(500); localStorage.setItem(k, JSON.stringify(d)); }, code);
    await B.fill('#code', code); await B.click('#btnJoin'); await B.waitForSelector('#hud:not(.hidden)', { timeout: 8000 }).catch(() => {}); await B.waitForTimeout(800);
    const started = await B.evaluate(() => !!window.__G.mode && !document.getElementById('hud').classList.contains('hidden'));
    ok('hamis téma/oldal mellett is elindul a játék (nincs összeomlás)', started);
    await B.evaluate(() => { W.idleOn = false; W.speed = 6; });
    await A.evaluate(c => { const k = 'mock_room_' + c, d = JSON.parse(localStorage.getItem(k)); d.moves = ['e2e4', 'e7e9', { result: 1 }, 'a1a1']; localStorage.setItem(k, JSON.stringify(d)); }, code);
    await B.waitForTimeout(1500); await idle(B);
    const fo = await B.evaluate(() => ({ n: __G.chess.moveList.join(','), over: __G.over, name: document.getElementById('oppName').textContent.length }));
    ok('hamis szoba: csak az érvényes lépés (e2e4) kerül át, nincs összeomlás', fo.n === 'e2e4' && !fo.over, fo);
    ok('hamis szoba: a név hossza korlátos', fo.name <= 14, fo);
    ok('hamis szoba: figyelmeztetés látszik', /Szabálytalan/.test(await B.textContent('#toast')) || (await B.evaluate(() => document.getElementById('toast').className.includes('show'))));
    await c3.close();
  }
  const connect = async () => {   // friss szoba két játékossal (világos gazda), gyorsított animációval
    const c = await b.newContext({ viewport: { width: 430, height: 900 } }); const A = await mk(c), B = await mk(c);
    for (const pg of [A, B]) { await pg.addScriptTag({ content: mockSrc }); await pg.evaluate(() => window.__installMock()); }
    await A.evaluate(() => { Net.id = 'idA'; }); await B.evaluate(() => { Net.id = 'idB'; });
    await A.click('#sideSeg button[data-v=w]'); await A.click('#btnCreate'); await A.waitForSelector('#lobby:not(.hidden)'); const code = await A.textContent('#lobbyCode');
    await B.fill('#code', code); await B.click('#btnJoin'); await A.waitForSelector('#hud:not(.hidden)'); await B.waitForSelector('#hud:not(.hidden)'); await A.waitForTimeout(600);
    for (const pg of [A, B]) await pg.evaluate(() => { W.idleOn = false; W.speed = 6; });
    return { c, A, B, code };
  };
  {   // 2) a szerver elutasítja a lépést -> a helyi állás a szerverét követi
    const { c, A } = await connect();
    await A.evaluate(() => { Net.sendMove = async () => false; });
    await tapSq(A, 52, 0.7); await A.waitForTimeout(100); await tapSq(A, 36, 0); await A.waitForTimeout(400); await idle(A); await A.waitForTimeout(800);
    const rj = await A.evaluate(() => ({ n: __G.chess.moveList.length, turn: __G.chess.turn, pcs: W.pieces.length }));
    ok('elutasított lépés után a helyi állás a szerverét követi (0 lépés, világos jön)', rj.n === 0 && rj.turn === 'w' && rj.pcs === 32, rj);
    await c.close();
  }
  {   // 3) egy animáció zárolt táblával elbukik -> a tábla felszabadul, a következő lépés működik
    const { c, A } = await connect();
    await A.evaluate(() => { window.__origPlay = W.playMove; W.playMove = async () => { W.busy = true; throw new Error('szándékos teszt-hiba'); }; });
    await tapSq(A, 52, 0.7); await A.waitForTimeout(100); await tapSq(A, 36, 0); await A.waitForTimeout(600);
    const af = await A.evaluate(() => ({ n: __G.chess.moveList.length, busy: W.busy, pumping: __G.pumping, pcs: W.pieces.length }));
    ok('animációs hiba után a tábla nincs zárolva, az állás előrelépett', af.n === 1 && !af.busy && !af.pumping && af.pcs === 32, af);
    await A.evaluate(() => { W.playMove = window.__origPlay; });
    await tapSq(A, 11, 0.7).catch(() => {});   // fekete (a másik játékos) lép: a gazda nézetében is érvényes marad a sor
    await c.close();
  }
  console.log('Buborékok, zene (v0.9.7)');
  {
    const c4 = await b.newContext({ viewport: { width: 430, height: 900 } }); const P = await mk(c4);
    await P.click('#btnLocal'); await P.waitForTimeout(800);
    const bb = await P.evaluate(() => {
      W.idleOn = false; const e = W.pieces[0], r = {};
      W.setTalk('off'); W.say(e, 'teszt', 2); r.off = e.say === null;
      W.setTalk('few'); W.sayIdle(e, 'fecsegés', 2); r.fewIdle = e.say === null; W.say(e, 'harc', 2); r.fewFight = !!e.say;
      W.setTalk('many'); W.pieces.slice(0, 12).forEach((p, i) => W.sayIdle(p, 'Ez egy jó hosszú beszólás, hogy két sorba törjön meg ' + i, 3));
      W.time += 0.5;   // a beúszás (fade-in) után
      // a buborékok a legfelső rétegben: a rajzolás után a sor üres, és legfeljebb 3 jelent meg
      let drawn = 0; const ft = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { if (/beszólás|…/.test(t)) drawn++; return ft.apply(this, arguments); };
      W._renderOnce(); CanvasRenderingContext2D.prototype.fillText = ft; r.drawnLines = drawn; return r;
    });
    ok('„Csend" mellett nincs buborék', bb.off, bb);
    ok('„Kevés" mellett nincs háttér-fecsegés, de a harci beszólás látszik', bb.fewIdle && bb.fewFight, bb);
    ok('egyszerre legfeljebb 3 buborék (legfeljebb 2 sor mindegyikben)', bb.drawnLines > 0 && bb.drawnLines <= 6, bb);
    await P.click('#bMore'); await P.click('#bTalk'); ok('a Szó gomb lépteti a beállítást', /Szó: /.test(await P.textContent('#bTalk small')));
    await P.click('#bMusic'); const mus = await P.evaluate(() => SFX.musicOn()); await P.click('#bMusic');
    ok('a Lant gomb ki-be kapcsolja a zenét', mus === false && (await P.evaluate(() => SFX.musicOn())) === true);
    await c4.close();
  }
  console.log('Automatikus frissítés');
  {
    let srvVer = '9.9.9';
    const c5 = await b.newContext({ viewport: { width: 430, height: 900 } });
    await c5.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: srvVer, name: 'teszt' }) }));
    await c5.addInitScript(() => { window.__applied = 0; window.__applyUpdateHook = () => { window.__applied++; }; });
    const M = await mk(c5); await M.waitForTimeout(2500);
    ok('menüben az új kiadás magától betöltődik', (await M.evaluate(() => window.__applied)) === 1);
    await M.close();
    const c6 = await b.newContext({ viewport: { width: 430, height: 900 } }); const cur = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8')).version; srvVer = cur;
    await c6.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: srvVer, name: 'teszt' }) }));
    await c6.addInitScript(() => { window.__applied = 0; window.__applyUpdateHook = () => { window.__applied++; }; });
    const B2 = await mk(c6); B2.on('dialog', d => d.accept()); await B2.waitForTimeout(800);
    ok('azonos verziónál nincs frissítés', (await B2.evaluate(() => window.__applied)) === 0);
    await B2.click('#btnLocal'); await B2.waitForTimeout(600); srvVer = '9.9.9';
    await B2.evaluate(() => window.__checkUpdate(false)); await B2.waitForTimeout(2200);
    ok('csata közben nem frissít, csak jelzi', (await B2.evaluate(() => window.__applied)) === 0 && !!(await B2.$('#updBanner')));
    await B2.click('#bMore'); await B2.click('#bMenu'); await B2.waitForTimeout(2200);
    ok('a csata után (menübe lépve) magától betölti', (await B2.evaluate(() => window.__applied)) === 1);
    await B2.evaluate(() => window.__checkUpdate(false)); await B2.waitForTimeout(2200);
    ok('hurokvédelem: ugyanarra a verzióra nem tölt újra azonnal', (await B2.evaluate(() => window.__applied)) === 1);
    await c5.close(); await c6.close();
  }
  console.log('Élő kő, vezényszó, tanács, krónika');
  {
    const c7 = await b.newContext({ viewport: { width: 430, height: 900 } }); const P = await mk(c7);
    await P.click('#setCard summary'); await P.click('#deathSeg button[data-v=stone]'); await P.click('#btnLocal'); await P.waitForTimeout(800);
    await P.evaluate(() => { W.idleOn = false; W.speed = 6; }); await P.click('#bLog');
    for (const x of ['e2 e4', 'd7 d5', 'e4 d5']) { await P.evaluate(x => window.__voiceMove(x), x); await P.waitForTimeout(150); await idle(P); }
    const r = await P.evaluate(() => ({ n: __G.chess.moveList.join(','), log: document.getElementById('logList').textContent, cmd: document.getElementById('cmd').textContent, bodies: W.bodies.length, pcs: W.pieces.length }));
    ok('hangparancs lépései végrehajtva', r.n === 'e2e4,d7d5,e4d5', r);
    ok('élő kő: a leütött bábu kőtörmelékké omlik (nincs hulla)', r.pcs === 31 && r.bodies === 0, r);
    ok('krónika: magyar jelölés', /e4/.test(r.log) && /exd5/.test(r.log), r);
    ok('vezényszó-szalag kiírja a parancsot', /üsd le a gyalogot/.test(r.cmd), r);
    await P.click('#bHint'); await P.waitForTimeout(600);
    const h = await P.evaluate(() => ({ hint: W.hl.hint, sel: __G.sel }));
    ok('tanács: nyíl és kijelölt bábu', !!h.hint && h.sel === h.hint.from, h);
    await P.click('#bMore'); ok('„Több” fiók kinyílik', await P.evaluate(() => document.getElementById('hud').classList.contains('moreOpen') && getComputedStyle(document.getElementById('moreBtns')).display !== 'none'));
    await c7.close();
  }
  console.log('Napszakok, tükröződés (v1.2)');
  {
    const c8 = await b.newContext({ viewport: { width: 430, height: 900 } }); const P = await mk(c8);
    await P.click('#btnLocal'); await P.waitForTimeout(600);
    const lum = async t => P.evaluate(t => { W.idleOn = false; W.autoQ = false; W.setQ(2); W.setTod(t); W._renderOnce(); const c = W.getCanvas(), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400); }, t);
    const day = await lum('day'), dusk = await lum('dusk'), night = await lum('night');
    ok('napszakok: éjjel sötétebb, mint alkonyatkor, alkonyatkor sötétebb, mint nappal', night < dusk && dusk < day, { day, dusk, night });
    await P.evaluate(() => W.setTod('auto'));
    await c8.close();
  }
  ok('nincs oldal-hiba a teszt során', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(`\nFüsttesztek: ${pass} sikeres, ${fail} hibás`); process.exit(fail ? 1 : 0);
})();
