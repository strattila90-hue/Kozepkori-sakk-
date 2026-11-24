const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html', SP = process.argv[2];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = [];
  for (const [n, pg] of [['A', A], ['B', B]]) pg.on('pageerror', e => errs.push(n + ': ' + e.message));
  // különböző kliens-azonosító oldalanként
  await A.addInitScript(() => { localStorage.setItem('ps_id', 'idA'); }); await B.addInitScript(() => { sessionStorage.x = 1; });
  await A.goto(URL); await B.goto(URL);
  await B.evaluate(() => { try { localStorage.setItem('ps_id', 'idB'); } catch (e) {} Net.id = 'idB'; });
  for (const pg of [A, B]) { await pg.addScriptTag({ path: __dirname + '/online-mock.js' }); await pg.evaluate(() => window.__installMock()); }
  await A.evaluate(() => { Net.id = 'idA'; });
  await A.fill('#name', 'Anna'); await B.fill('#name', 'Béla');
  await A.click('#btnCreate'); await A.waitForSelector('#lobby:not(.hidden)');
  const code = await A.textContent('#lobbyCode'); console.log('kód:', code);
  await B.fill('#code', code); await B.click('#btnJoin');
  await A.waitForSelector('#hud:not(.hidden)'); await B.waitForSelector('#hud:not(.hidden)');
  const info = async pg => pg.evaluate(() => ({ side: __G.mySide, turn: __G.chess.turn, n: __G.chess.moveList.length, flip: W.flip, me: document.getElementById('meName').textContent, opp: document.getElementById('oppName').textContent, badge: document.getElementById('turnBadge').textContent }));
  console.log('A', JSON.stringify(await info(A))); console.log('B', JSON.stringify(await info(B)));
  const click = async (pg, sq) => { const [x, y] = await pg.evaluate(sq => { const q = W.sqPos(sq); const a = W.P(q.x, 0.4, q.z); return [a.x, a.y]; }, sq); await pg.mouse.click(x, y); };
  const idle = async pg => { for (let i = 0; i < 300; i++) { if (!(await pg.evaluate(() => W.busy || __G.pumping))) return; await pg.waitForTimeout(50); } };
  for (const pg of [A, B]) await pg.evaluate(() => { W.idleOn = false; W.speed = 4; });
  const sideOf = async pg => (await info(pg)).side;
  const white = (await sideOf(A)) === 'w' ? A : B, black = white === A ? B : A;
  const play = async (pg, f, t) => { await idle(pg); await click(pg, f); await pg.waitForTimeout(80); await click(pg, t); await pg.waitForTimeout(200); await idle(A); await idle(B); };
  await play(white, 53, 45); await play(black, 12, 28); await play(white, 54, 38);
  console.log('mid: A', JSON.stringify(await info(A)), 'B', JSON.stringify(await info(B)));
  await play(black, 3, 39);
  for (let i = 0; i < 200; i++) { const ov = await Promise.all([A, B].map(pg => pg.evaluate(() => !document.getElementById('result').classList.contains('hidden')))); if (ov[0] && ov[1]) break; await A.waitForTimeout(150); }
  console.log('eredmény A:', await A.textContent('#resTitle'), '| B:', await B.textContent('#resTitle'));
  await A.screenshot({ path: SP + '/onA.png' }); await B.screenshot({ path: SP + '/onB.png' });
  // feladás: új szoba
  console.log('HIBÁK:', JSON.stringify(errs));
  await b.close();
})();
