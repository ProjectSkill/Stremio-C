// server.js — Stremio addon + helper endpoints
const express = require('express');
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

const app = express();

// Prefer STREMIO_PORT, then NODE_PORT, then default 11470
const PORT = Number(process.env.STREMIO_PORT || process.env.NODE_PORT || 11470);
const HOST = process.env.HOST || '127.0.0.1';

// safe read helper
function safeRead(filePath) {
  try { return fs.readFileSync(path.join(__dirname, filePath), 'utf8'); }
  catch (e) { console.error('safeRead error', filePath, e); return ''; }
}

// Serve inject.js
app.get('/inject.js', (req, res) => {
  const js = safeRead('inject.js');
  res.type('application/javascript; charset=utf-8').send(js);
});

// Simple health endpoint used by nginx health proxy
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// All free streams endpoint
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

// Minimal redirect HTML for movie pages (injects /inject.js)
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

// Manifest: streams-only (no catalogs) — avoids manifest.catalogs error
const manifest = {
  id: 'org.example.light',
  version: '1.0.0',
  name: 'Light add-on',
  description: 'Minimal Stremio addon (streams only)',
  resources: ['stream'],
  types: ['movie'],
  behaviorHints: { configurable: false }
};

// Create builder BEFORE serveHTTP
const builder = new addonBuilder(manifest);

// Example stream handler (empty placeholder)
builder.defineStreamHandler(async (args) => {
  return { streams: [] };
});

// Attach the addon to express and start listening
serveHTTP(app, builder, { port: PORT, host: HOST });

console.log(`Stremio addon + server starting on ${HOST}:${PORT}`);