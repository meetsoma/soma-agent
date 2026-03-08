const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DIR = __dirname;
const VOTE_FILE = path.join(DIR, 'user-vote.txt');

const MIME = {
  '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // POST /vote — user voted
  if (req.method === 'POST' && req.url === '/vote') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      fs.writeFileSync(VOTE_FILE, body.trim());
      console.log(`\n🗳️  USER VOTED: ${body.trim()}\n`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    return;
  }

  // GET /user-vote — Soma checks if user voted
  if (req.url === '/user-vote') {
    try {
      const vote = fs.readFileSync(VOTE_FILE, 'utf8').trim();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(vote);
    } catch {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');
    }
    return;
  }

  // Static file serving
  let filePath = path.join(DIR, req.url === '/' ? 'preview.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🌍 Soma Logo Battle: http://localhost:${PORT}\n`);
  console.log('Waiting for votes...\n');
});
