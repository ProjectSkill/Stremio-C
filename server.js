const express = require('express');
const app = express();

app.disable('x-powered-by');

const PORT = process.env.PORT || 8080;

// Manifest — build, buffer, set headers, single end
app.get('/manifest.json', (req, res) => {
  const manifest = {
    id: 'com.stremio.imvdb',
    version: '1.0.0',
    name: 'IMVDb Music Videos',
    description: 'Stream music videos from IMVDb',
    types: ['movie'],
    catalogs: [{ type: 'movie', id: 'imvdb-videos', name: 'Music Videos' }],
    resources: ['stream'],
    idPrefixes: ['imvdb:']
  };

  const json = JSON.stringify(manifest);
  const buf = Buffer.from(json, 'utf8');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Length', String(buf.length));

  return res.status(200).end(buf);
});

// Small health endpoint for platform probes
app.get('/health', (req, res) => {
  const ok = Buffer.from(JSON.stringify({ status: 'ok' }), 'utf8');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', String(ok.length));
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).end(ok);
});

// Useful debug endpoint to check first bytes and length
app.get('/debug/manifest', (req, res) => {
  const manifest = { id: 'com.stremio.imvdb', version: '1.0.0' };
  const json = JSON.stringify(manifest);
  const bytes = Buffer.from(json, 'utf8');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(
    `First 10 bytes (hex): ${bytes.slice(0, 10).toString('hex')}\n` +
    `First 10 chars: "${json.substring(0, 10)}"\n` +
    `Full length: ${bytes.length} bytes\n`
  );
});

// Fallback returns JSON only (no HTML)
app.use((req, res) => {
  const body = Buffer.from(JSON.stringify({ error: 'not found' }), 'utf8');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', String(body.length));
  return res.status(404).end(body);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Running on ${PORT}`);
});