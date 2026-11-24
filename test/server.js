// Kis statikus szerver a teszteknek: szabad porton indul, külső szerver nem kell.
const http = require('http'), fs = require('fs'), path = require('path'); const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
module.exports = async function start() {
  const srv = http.createServer((q, r) => {
    let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }   // útvonal-bejárás ellen
    if (f.endsWith(path.sep) || q.url === '/') f = path.join(ROOT, 'index.html');
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
  });
  await new Promise(r => srv.listen(0, r)); return { url: 'http://localhost:' + srv.address().port + '/index.html', close: () => srv.close() };
};
