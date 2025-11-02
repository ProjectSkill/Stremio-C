// server.js — Stremio addon + helper endpoints (exports startServer)
const express = require('express');
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

function safeRead(filePath) {
  try { return fs.readFileSync(path.join(__dirname, filePath), 'utf8'); }
  catch (e) { console.error('safeRead error', filePath, e); return ''; }
}

function createApp() {
  const app = express();

  // Serve inject.js
  app.get('/inject.js', (req, res) => {
    const js = safeRead('inject.js');
    res.type('application/javascript; charset=utf-8').send(js);
  });

  // Simple health endpoint
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

  // Minimal redirect HTML (injects /inject.js)
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

  // Manifest: streams-only
  const manifest = {
    id: 'org.example.light',
    version: '1.0.0',
    name: 'Light add-on',
    description: 'Minimal Stremio addon (streams only)',
    resources: ['stream'],
    types: ['movie'],
    behaviorHints: { configurable: false }
  };

  const builder = new addonBuilder(manifest);

  // Example stream handler (placeholder)
  builder.defineStreamHandler(async (args) => {
    return { streams: [] };
  });

  // Attach addon handlers to express app
  serveHTTP(app, builder, { port: Number(process.env.STREMIO_PORT || process.env.NODE_PORT || 11470), host: process.env.HOST || '127.0.0.1' });

  return app;
}

// startServer returns a promise that resolves once server is listening (bind complete)
function startServer() {
  return new Promise((resolve, reject) => {
    try {
      const PORT = Number(process.env.STREMIO_PORT || process.env.NODE_PORT || 11470);
      const HOST = process.env.HOST || '127.0.0.1';
      const app = createApp();

      // create a temporary listener to detect readiness
      const server = app.listen(PORT, HOST, () => {
        console.log(`Stremio addon + server listening on ${HOST}:${PORT}`);
        resolve({ host: HOST, port: PORT, server });
      });

      server.on('error', (err) => {
        console.error('server listen error', err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { startServer };