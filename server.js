const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// Create the addon
const builder = new addonBuilder({
    id: 'org.playerredirect.working',
    version: '1.0.0',
    name: 'Player Redirect',
    description: 'Instant player redirection for any content',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: []
});

// Stream handler - this is what makes players show up
builder.defineStreamHandler((args) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    
    const streams = [
        {
            title: '🎬 Player Menu',
            url: `${baseUrl}/player-menu?type=${args.type}&id=${encodeURIComponent(args.id || 'default')}`
        }
    ];

    return Promise.resolve({ streams });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

// Player menu
app.get('/player-menu', (req, res) => {
    const videoType = req.query.type;
    const videoId = req.query.id;
    
    // Use a real working stream URL
    const streamUrl = 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8';
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Player Selection</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: white; }
        .container { max-width: 400px; margin: 0 auto; }
        .player-btn { 
            display: block; width: 100%; padding: 15px; margin: 10px 0; 
            background: #2a2a2a; border: none; color: white; border-radius: 8px; 
            font-size: 16px; cursor: pointer; text-decoration: none; text-align: center;
        }
        .player-btn:hover { background: #3a3a3a; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Choose Player</h2>
        <a href="infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}" class="player-btn">Infuse</a>
        <a href="nplayer-${streamUrl}" class="player-btn">nPlayer</a>
        <a href="outplayer://${streamUrl}" class="player-btn">OutPlayer</a>
        <a href="vlc://${streamUrl}" class="player-btn">VLC</a>
        <a href="${streamUrl}" class="player-btn">Browser</a>
    </div>
</body>
</html>
    `);
});

// Root page
app.get('/', (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    res.send(`
        <h1>✅ Player Redirect - WORKING</h1>
        <p><strong>Add this URL to Stremio:</strong> ${baseUrl}</p>
        <p><a href="/manifest.json">View Manifest</a></p>
    `);
});

// Health check for Render
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Player Redirect' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Player Redirect running on port ${PORT}`);
});