const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
  const A = await ctx.newPage(), B = await ctx.newPage();
  await A.goto('http://localhost:8765/index.html'); await B.goto('http://localhost:8765/index.html');
  for (const pg of [A, B]) { await pg.addScriptTag({ path: __dirname + '/online-mock.js' }); await pg.evaluate(() => window.__installMock()); }
  await B.evaluate(() => { Net.id = 'idB'; }); await A.evaluate(() => { Net.id = 'idA'; });
  await A.click('#btnCreate'); await A.waitForSelector('#lobby:not(.hidden)'); const code = await A.textContent('#lobbyCode');
  await B.fill('#code', code); await B.click('#btnJoin'); await A.waitForSelector('#hud:not(.hidden)'); await B.waitForSelector('#hud:not(.hidden)');
  for (const pg of [A, B]) await pg.evaluate(() => { W.idleOn = false; W.speed = 4; });
  const click = async (pg, sq) => { const [x, y] = await pg.evaluate(sq => { const q = W.sqPos(sq); const a = W.P(q.x, 0.4, q.z); return [a.x, a.y]; }, sq); await pg.mouse.click(x, y); };
  const st = pg => pg.evaluate(() => ({ n: __G.chess.moveList.length, turn: __G.chess.turn, busy: W.busy, pump: __G.pumping, q: __G.queue.length, idleBusy: W.idleBusy, sel: __G.sel }));
  const wait = async (pg) => { for (let i = 0; i < 400; i++) { const s = await st(pg); if (!s.busy && !s.pump) return; await pg.waitForTimeout(50); } console.log('TIMEOUT waiting', JSON.stringify(await st(pg))); };
  const play = async (pg, f, t) => { await wait(pg); await click(pg, f); await pg.waitForTimeout(100); await click(pg, t); await pg.waitForTimeout(300); await wait(A); await wait(B); console.log('after', f, t, 'A', JSON.stringify(await st(A)), 'B', JSON.stringify(await st(B))); };
  const sideW = (await A.evaluate(() => __G.mySide)) === 'w' ? A : B, sideB = sideW === A ? B : A;
  await play(sideW, 53, 45); await play(sideB, 12, 28); await play(sideW, 54, 38); await play(sideB, 3, 39);
  for (let i = 0; i < 400; i++) { const ov = await Promise.all([A, B].map(pg => pg.evaluate(() => !document.getElementById('result').classList.contains('hidden')))); if (ov[0] && ov[1]) break; await A.waitForTimeout(150); }
  const ra = await A.textContent('#resTitle'), rb = await B.textContent('#resTitle'); console.log('eredmény A:', ra, '| B:', rb);
  console.log(ra !== rb && ra && rb ? 'OK' : 'FAIL'); await b.close();
})();
