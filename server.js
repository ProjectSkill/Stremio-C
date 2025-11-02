// server.js — Stremio addon + runtime launcher (starts Node, renders nginx template, then spawns nginx)
const express = require('express');
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');
const { spawn } = require('child_process');
const http = require('http');

const PORT = Number(process.env.STREMIO_PORT || process.env.NODE_PORT || 11470);
const HOST = process.env.HOST || '127.0.0.1';
const TEMPLATE_PATH = '/etc/nginx/conf.d/default.conf.template';
const OUTPUT_CONF = '/etc/nginx/conf.d/default.conf';

// ---- helper: render nginx template from env into real conf
function renderNginxTemplate() {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.warn('nginx template not found:', TEMPLATE_PATH);
      return;
    }
    const tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const replaced = tpl.replace(/\$\{PORT:-10000\}/g, process.env.PORT || '10000')
      .replace(/\$\{RENDER_EXTERNAL_HOSTNAME:-_\}/g, process.env.RENDER_EXTERNAL_HOSTNAME || '_')
      .replace(/\$\{STREMIO_PORT\}/g, String(process.env.STREMIO_PORT || process.env.NODE_PORT || '11470'));
    fs.writeFileSync(OUTPUT_CONF, replaced, 'utf8');
    console.log('Rendered nginx config to', OUTPUT_CONF);
  } catch (err) {
    console.error('renderNginxTemplate error', err);
  }
}

// ---- helper: wait for URL to respond (manifest)
function waitForUrl(url, timeoutMs = 15000, intervalMs = 300) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', (err) => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for ' + url));
        setTimeout(attempt, intervalMs);
      });
    };
    attempt();
  });
}

// ---- create express app with endpoints and addon
function createAndAttachAddon() {
  const app = express();

  function safeRead(filePath) {
    try { return fs.readFileSync(path.join(__dirname, filePath), 'utf8'); }
    catch (e) { console.error('safeRead error', filePath, e); return ''; }
  }

  app.get('/inject.js', (req, res) => {
    const js = safeRead('inject.js');
    res.type('application/javascript; charset=utf-8').send(js);
  });

  app.get('/healthz', (req, res) => res.status(200).send('ok'));
  app.get('/manifest.json', (req, res) => {
    // serve the manifest for external health checks (SDK also exposes its own /manifest but this is safe)
    res.json({
      id: 'org.example.light',
      version: '1.0.0',
      name: 'Light add-on',
      resources: ['stream'],
      types: ['movie'],
      behaviorHints: { configurable: false }
    });
  });

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

  // manifest used by addon builder (streams-only to avoid catalogs errors)
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
  builder.defineStreamHandler(async (args) => ({ streams: [] }));

  // attach SDK to this express app and let it create its own routes
  serveHTTP(app, builder, { port: PORT, host: HOST });

  return app;
}

// ---- main launcher
(async () => {
  try {
    // render nginx template into real conf (do this before starting nginx)
    renderNginxTemplate();

    // start server (the serveHTTP above will bind the app)
    createAndAttachAddon();
    // Wait for manifest endpoint to be reachable before launching nginx
    const manifestUrl = `http://127.0.0.1:${PORT}/manifest.json`;
    console.log('Waiting for Stremio manifest at', manifestUrl);
    await waitForUrl(manifestUrl, 20000, 300);

    console.log('Stremio ready — starting nginx in foreground');
    const nginx = spawn('nginx', ['-g', 'daemon off;'], { stdio: 'inherit' });

    // forward signals cleanly
    const forward = (sig) => {
      try { nginx.kill(sig); } catch (e) {}
    };
    process.on('SIGINT', () => forward('SIGINT'));
    process.on('SIGTERM', () => forward('SIGTERM'));

    nginx.on('exit', (code, signal) => {
      console.log('nginx exited', { code, signal });
      process.exit(code === null ? 0 : code);
    });
  } catch (err) {
    console.error('launcher error', err);
    process.exit(1);
  }
})();