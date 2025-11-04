const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// Simple addon setup
const builder = new addonBuilder({
    id: 'org.lightweight.stremio',
    version: '1.0.0',
    name: 'Lightweight Stremio',
    description: 'Lightweight Stremio backend',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: []
});

builder.defineStreamHandler((args) => {
    return Promise.resolve({
        streams: [{
            title: 'Play with Player Selector',
            url: `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000'}/players?url=${encodeURIComponent(args.id || 'default')}`
        }]
    });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

// Essential endpoints
app.get('/', (req, res) => {
    res.send(`
        <h1>✅ Stremio Backend Running</h1>
        <p>Add this to Stremio: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000'}</p>
        <a href="/manifest.json">Manifest</a>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Player routes (same as before)
app.get('/play', (req, res) => {
    const videoUrl = req.query.url;
    const player = req.query.player || 'browser';
    if (!videoUrl) return res.status(400).send('No URL');
    
    const schemes = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`,
        nplayer: `nplayer-${videoUrl}`,
        outplayer: `outplayer://${videoUrl}`,
        vlc: `vlc://${videoUrl}`,
        browser: videoUrl
    };
    
    res.redirect(schemes[player] || videoUrl);
});

app.get('/players', (req, res) => {
    const videoUrl = req.query.url || 'sample';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000';
    
    res.send(`
        <h2>Choose Player</h2>
        <a href="${baseUrl}/play?url=${videoUrl}&player=infuse">Infuse</a><br>
        <a href="${baseUrl}/play?url=${videoUrl}&player=nplayer">nPlayer</a><br>
        <a href="${baseUrl}/play?url=${videoUrl}&player=outplayer">OutPlayer</a><br>
        <a href="${baseUrl}/play?url=${videoUrl}&player=vlc">VLC</a><br>
        <a href="${baseUrl}/play?url=${videoUrl}&player=browser">Browser</a>
    `);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});