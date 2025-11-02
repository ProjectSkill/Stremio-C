// OFFICIAL LIGHT Stremio server + burger magic (updated)
const express = require('express');
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

const app = express();

// Prefer STREMIO_PORT, then NODE_PORT, then default 11470
const PORT = Number(process.env.STREMIO_PORT || process.env.NODE_PORT || 11470);
const HOST = process.env.HOST || '0.0.0.0';

// 0. helper: safe read
function safeRead(filePath) {
  try { return fs.readFileSync(path.join(__dirname, filePath), 'utf8'); }
  catch (e) { console.error('safeRead error', filePath, e); return ''; }
}

// 1. Serve burger script
app.get('/inject.js', (req, res) => {
  const js = safeRead('inject.js');
  res.type('application/javascript; charset=utf-8').send(js);
});

// 2. All free streams endpoint
app.get('/allstreams/:id', async (req, res) => {
  try {
    const upstream = `https://torrentio.strem.io/stream/movie/${encodeURIComponent(req.params.id)}.json`;
    const r = await fetch(upstream);
    if (!r.ok) {
      console.error('upstream error', r.status, upstream);
      return res.json([]);
    }
    const data = await r.json();
    const free = (data.streams || [])
      .filter(s => s && s.url && !s.url.includes('debrid'))
      .slice(0, 15)
      .map((s) => {
        const url = /^https?:\/\//i.test(s.url) ? s.url : `https://${req.headers.host}${s.url}`;
        return {
          title: (s.title || '').split('⚡')[0].trim(),
          quality: (s.title && (s.title.match(/\d{3,4}p/) || [])[0]) || 'SD',
          url
        };
      });
    res.type('application/json; charset=utf-8').json(free);
  } catch (err) {
    console.error('allstreams error', err);
    res.json([]);
  }
});

// 3. Inject burger on certain HTML requests (keep minimal and safe)
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <script>location.href='https://web.stremio.com' + location.search</script>
  <script src="/inject.js"></script>
</head>
<body></body>
</html>`;
    return res.type('text/html; charset=utf-8').send(html);
  }
  return next();
});

// 4. Stremio addon: example minimal builder (adjust manifest as needed)
const manifest = {
  id: 'org.example.light',
  version: '1.0.0',
  name: 'Light add-on',
  description: 'Minimal Stremio addon',
  resources: ['catalog', 'stream'],
  types: ['movie'],
  behaviorHints: { configurable: false }
};

const builder = new addonBuilder(manifest);

// example stream handler (adjust to your real implementation)
builder.defineStreamHandler(async (args) => {
  return { streams: [] };
});

// 5. Serve the addon using stremio-addon-sdk on the same express app
// serveHTTP will attach handlers to the provided express app and start listening on PORT
serveHTTP(app, builder, { port: Number(PORT), host: HOST });

console.log('Stremio addon + server starting on', HOST + ':' + PORT);