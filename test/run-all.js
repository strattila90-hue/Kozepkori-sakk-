// Mindent lefuttat: statikus elemzés (ha van eslint), egységtesztek, böngészős füsttesztek.
const { spawnSync } = require('child_process'); const path = require('path'), fs = require('fs'); const ROOT = path.join(__dirname, '..');
let failed = 0; const run = (name, cmd, args, opt) => { console.log('\n=== ' + name + ' ==='); const r = spawnSync(cmd, args, Object.assign({ stdio: 'inherit', cwd: ROOT }, opt)); if (r.status !== 0) { failed++; console.log('>>> HIBA: ' + name); } };
for (const f of fs.readdirSync(path.join(ROOT, 'js'))) if (f.endsWith('.js')) { const r = spawnSync('node', ['--check', path.join(ROOT, 'js', f)]); if (r.status !== 0) { failed++; console.log('Szintaktikai hiba: js/' + f + '\n' + r.stderr); } }
const eslint = path.join(ROOT, 'node_modules/.bin/eslint'); if (fs.existsSync(eslint)) run('Statikus elemzés (eslint, csak hibák)', eslint, ['js', 'sw.js', '--quiet']); else console.log('\n(eslint nincs telepítve: npm install – a statikus elemzés kimarad)');
run('Egységtesztek', 'node', ['test/unit.js']); run('Böngészős füsttesztek', 'node', ['test/smoke.js']);
console.log(failed ? `\n${failed} részfeladat HIBÁS` : '\nMinden teszt sikeres'); process.exit(failed ? 1 : 0);
