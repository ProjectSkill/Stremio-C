const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();
app.use(express.json());

// Get the correct base URL for Render
const getBaseUrl = (req) => {
    return process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
};

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

// Stream handler
builder.defineStreamHandler((args) => {
    return Promise.resolve({
        streams: [
            {
                title: 'Play with Player Selector',
                url: `${getBaseUrl({ protocol: 'https', get: () => process.env.RENDER_EXTERNAL_HOSTNAME })}/players?url=${encodeURIComponent(args.id || 'default')}`
            }
        ]
    });
});

const addonInterface = builder.getInterface();

// Use Stremio addon routes
app.use('/', getRouter(addonInterface));

// Root endpoint - essential for Render
app.get('/', (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lightweight Stremio Backend</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 600px; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Lightweight Stremio Backend Running</h1>
                <p>Your Stremio backend is successfully deployed on Render!</p>
                <p><strong>Add this URL to Stremio:</strong> ${baseUrl}</p>
                <p><a href="/manifest.json">View Manifest</a></p>
                <p><a href="/health">Health Check</a></p>
            </div>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Lightweight Stremio Backend',
        timestamp: new Date().toISOString()
    });
});

// Player redirect endpoint
app.get('/play', (req, res) => {
    const videoUrl = req.query.url;
    const player = req.query.player || 'browser';
    
    if (!videoUrl) {
        return res.status(400).send('No URL provided');
    }
    
    const decodedUrl = decodeURIComponent(videoUrl);
    
    const playerSchemes = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(decodedUrl)}`,
        nplayer: `nplayer-${decodedUrl}`,
        outplayer: `outplayer://${decodedUrl}`,
        vlc: `vlc://${decodedUrl}`,
        browser: decodedUrl
    };
    
    const redirectUrl = playerSchemes[player];
    
    if (redirectUrl) {
        console.log(`Redirecting to ${player}: ${decodedUrl}`);
        res.redirect(redirectUrl);
    } else {
        res.redirect(decodedUrl);
    }
});

// Players selection page
app.get('/players', (req, res) => {
    const videoUrl = req.query.url || 'sample-video';
    const baseUrl = getBaseUrl(req);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Choose Player</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
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
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=infuse" class="player-btn">Infuse</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=nplayer" class="player-btn">nPlayer</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=outplayer" class="player-btn">OutPlayer</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=vlc" class="player-btn">VLC</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=browser" class="player-btn">Browser</a>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Use Render's PORT environment variable
const PORT = process.env.PORT || 11470;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lightweight Stremio backend running on port ${PORT}`);
    console.log(`📍 Add this URL to Stremio: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
});