// Mini serveur statique pour prévisualiser le dossier test/
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || 'test'), port = Number(process.argv[3] || 8424);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(root, p);
  if (!f.startsWith(root)) return res.writeHead(403).end();
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  fs.readFile(f, (err, data) => {
    if (err) return res.writeHead(404).end('404');
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }).end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('ready on', port));
