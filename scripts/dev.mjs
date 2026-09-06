import http from 'node:http';
import { readFile } from 'node:fs/promises';
http.createServer(async (request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') { response.writeHead(404); response.end(); return; }
  try {
    const html = await readFile(new URL('../index.html', import.meta.url));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(html);
  } catch { response.writeHead(500); response.end('Unable to load game'); }
}).listen(5173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:5173'));
