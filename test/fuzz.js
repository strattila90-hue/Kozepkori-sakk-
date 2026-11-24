// Automata hibakereső: véletlen játszmák + minden végjáték. Használat: node test/fuzz.js [játszmák]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const fate of ['dragon-burn', 'dragon-eat', 'axe', 'stab', 'plague']) {
    const p = await b.newPage({ viewport: { width: 430, height: 900 } });
    p.on('pageerror', e => errs.push(fate + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts|net::/.test(m.text())) errs.push(fate + ' console: ' + m.text().slice(0, 140)); });
    await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500); await p.click('#btnLocal'); await p.waitForTimeout(500);
    await p.evaluate(f => { W.speed = 6; W.idleOn = true; if (f.startsWith('dragon')) { W.debugFate = 'dragon'; W.debugDragon = f.split('-')[1]; } else if (f !== 'plague') W.debugFate = f; }, fate);
    const click = async (sq, h) => { const [x, y] = await p.evaluate(([sq, h]) => { const q = W.sqPos(sq); const f = W.P(q.x, 0, q.z); return [f.x, f.y - h * f.k]; }, [sq, h === undefined ? 0.9 : h]); await p.mouse.click(x, y); };
    const idle = async () => { for (let k = 0; k < 600; k++) { if (!(await p.evaluate(() => W.busy || __G.pumping))) return; await p.waitForTimeout(40); } };
    if (fate === 'plague') { await p.evaluate(() => { const G = __G; G.chess.load('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'); W.setup(G.chess); }); await idle(); await click(22); await p.waitForTimeout(100); await click(30, 0); }
    else { const seq = [[53, 45], [12, 28], [54, 38], [3, 39]]; for (const [a, c] of seq) { await idle(); await click(a); await p.waitForTimeout(80); await click(c, 0); await p.waitForTimeout(250); } }
    let ok = false; for (let k = 0; k < 900; k++) { if (await p.evaluate(() => !document.getElementById('result').classList.contains('hidden'))) { ok = true; break; } await p.waitForTimeout(100); }
    console.log(fate, ok ? 'vége-képernyő OK' : 'NEM ért véget', await p.evaluate(() => document.getElementById('resTitle').textContent));
    await p.close();
  }
  // véletlen játszma
  const p = await b.newPage({ viewport: { width: 430, height: 900 } }); p.on('pageerror', e => errs.push('rand: ' + e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500); await p.click('#btnLocal'); await p.evaluate(() => { W.speed = 8; W.idleOn = true; });
  let n = 0; for (; n < 90; n++) {
    const mv = await p.evaluate(() => { const G = __G; if (G.over) return null; const ms = G.chess.moves(); const m = ms[Math.floor(Math.random() * ms.length)]; return { f: m.from, t: m.to, pr: !!m.promo }; }); if (!mv) break;
    for (let k = 0; k < 600; k++) { if (!(await p.evaluate(() => W.busy || __G.pumping))) break; await p.waitForTimeout(40); }
    await p.evaluate(m => { __G.sel = -1; }, mv);
    const click = async (sq, h) => { const [x, y] = await p.evaluate(([sq, h]) => { const q = W.sqPos(sq); const f = W.P(q.x, 0, q.z); return [f.x, f.y - h * f.k]; }, [sq, h || 0]); await p.mouse.click(x, y); };
    await click(mv.f, 0.6); await p.waitForTimeout(40); await click(mv.t, 0); await p.waitForTimeout(60);
    if (mv.pr) { await p.waitForTimeout(150); if (await p.evaluate(() => !document.getElementById('promo').classList.contains('hidden'))) await p.click('#promoBtns button'); }
  }
  console.log('véletlen játszma lépések:', n, await p.evaluate(() => __G.chess.moveList.length));
  console.log('HIBÁK:', JSON.stringify([...new Set(errs)].slice(0, 10)));
  await b.close();
})();
