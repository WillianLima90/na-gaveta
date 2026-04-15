const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DIST_DIR = path.join(__dirname, 'frontend/dist');
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3001;
const PORT = 4175;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  
  // Proxy para o backend
  if (parsedUrl.pathname.startsWith('/api/')) {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
    };
    const proxy = http.request(options, (backendRes) => {
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res);
    });
    proxy.on('error', (err) => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    req.pipe(proxy);
    return;
  }

  // Para assets estáticos, servir normalmente
  let filePath = path.join(DIST_DIR, parsedUrl.pathname);
  
  // SPA fallback: servir index_allinline.html para qualquer rota não-asset
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index_allinline.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback final para index_allinline.html
      fs.readFile(path.join(DIST_DIR, 'index_allinline.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (inline mode)`);
});
