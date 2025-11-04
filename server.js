const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const app = express();

// Lightweight addon builder
const builder = new addonBuilder({
    id: 'org.lightweight.stremio',
    version: '1.0.0',
    name: 'Lightweight Stremio',
    description: 'Lightweight Stremio backend with custom players',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: []
});

// Stream handler - returns playable links
builder.defineStreamHandler((args) => {
    return new Promise((resolve) => {
        const streams = [];
        
        if (args.type === 'movie' || args.type === 'series') {
            // Return direct playable URLs
            streams.push({
                title: 'Direct Play',
                url: `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}/play?url=${encodeURIComponent(args.id)}`
            });
        }
        
        resolve({ streams });
    });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

// Player redirect endpoint
app.get('/play', (req, res) => {
    const videoUrl = req.query.url;
    const player = req.query.player || 'browser';
    
    if (!videoUrl) {
        return res.status(400).send('No URL provided');
    }
    
    // Decode the URL
    const decodedUrl = decodeURIComponent(videoUrl);
    
    // Player URL schemes
    const playerSchemes = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(decodedUrl)}`,
        nplayer: `nplayer://${decodedUrl}`,
        outplayer: `outplayer://play?url=${encodeURIComponent(decodedUrl)}`,
        vlc: `vlc://${decodedUrl}`,
        browser: decodedUrl
    };
    
    if (playerSchemes[player]) {
        res.redirect(playerSchemes[player]);
    } else {
        res.redirect(decodedUrl);
    }
});

// Players selection page (burger menu)
app.get('/players', (req, res) => {
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).send('No video URL provided');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Choose Player</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
                .player-btn { 
                    display: block; 
                    width: 100%; 
                    padding: 15px; 
                    margin: 10px 0; 
                    background: #2a2a2a; 
                    border: none; 
                    color: white; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    cursor: pointer;
                    text-decoration: none;
                    text-align: center;
                }
                .player-btn:hover { background: #3a3a3a; }
                .container { max-width: 400px; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Choose Player</h2>
                <a href="/play?url=${encodeURIComponent(videoUrl)}&player=infuse" class="player-btn">Infuse</a>
                <a href="/play?url=${encodeURIComponent(videoUrl)}&player=nplayer" class="player-btn">nPlayer</a>
                <a href="/play?url=${encodeURIComponent(videoUrl)}&player=outplayer" class="player-btn">OutPlayer</a>
                <a href="/play?url=${encodeURIComponent(videoUrl)}&player=vlc" class="player-btn">VLC</a>
                <a href="/play?url=${encodeURIComponent(videoUrl)}&player=browser" class="player-btn">Browser</a>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 11470;
app.listen(PORT, () => {
    console.log(`Lightweight Stremio backend running on port ${PORT}`);
});