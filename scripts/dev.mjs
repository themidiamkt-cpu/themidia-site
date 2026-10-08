import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
await import('./build.mjs');
const root = path.resolve('dist');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (pathname === '/api/clinica-estetica') {
    try { const { default: handler } = await import('../api/clinica-estetica.js'); await handler(req, res); }
    catch (err) { console.error('Falha na API local:', err.name); if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Integração indisponível. Tente novamente.' })); }
    return;
  }
  try {
    let file = path.resolve(root, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Caminho inválido');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404, { 'Content-Type':'text/plain' }); res.end('Página não encontrada'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Prévia: http://localhost:4173/clinica-estetica/'));
