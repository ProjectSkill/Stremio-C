// OFFICIAL LIGHT Stremio server + burger magic
const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');
const app = express();
const fs = require('fs');
const path = require('path');

// 1. Serve burger script
app.get('/inject.js', (req, res) => {
  res.type('js').send(fs.readFileSync(path.join(__dirname, 'inject.js')));
});

// 2. All free streams endpoint
app.get('/allstreams/:id', async (req, res) => {
  try {
    const data = await (await fetch(`https://torrentio.strem.io/stream/movie/${req.params.id}.json`)).json();
    const free = data.streams
      .filter(s => !s.url.includes('debrid'))
      .slice(0, 15)
      .map((s, i) => ({
        title: s.title.split('⚡')[0].trim(),
        quality: s.title.match(/\d{3,4}p/)?.[0] || 'SD',
        url: `https://${req.headers.host}${s.url}`
      }));
    res.json(free);
  } catch { res.json([]); }
});

// 3. Inject burger on every page
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.send(`
<!DOCTYPE html><html><head>
<script>location.href='https://web.stremio.com' + location.search</script>
<script src="/inject.js"></script>
</head><body></body></html>`);
  } else next();
});

// 4. Stremio core (keeps 11470)
require('stremio-addon-sdk').serveHTTP(app, { port: 11470 });
app.listen(11470, () => console.log('Stremio 11470 + Burger READY'));