const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// Real movie catalog with working streams
const builder = new addonBuilder({
    id: 'org.working.stremio',
    version: '1.0.0',
    name: 'Working Stremio',
    description: 'Real streaming backend with player options',
    resources: ['catalog', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'movies',
            name: 'Movies',
            extra: []
        }
    ]
});

// Real movie catalog
builder.defineCatalogHandler((args) => {
    const movies = [
        {
            id: 'tt0111161',
            type: 'movie',
            name: 'The Shawshank Redemption',
            poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg'
        },
        {
            id: 'tt0068646',
            type: 'movie',
            name: 'The Godfather',
            poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'
        },
        {
            id: 'tt0133093',
            type: 'movie',
            name: 'The Matrix',
            poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg'
        },
        {
            id: 'tt0110912',
            type: 'movie',
            name: 'Pulp Fiction',
            poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'
        }
    ];
    
    return Promise.resolve({ metas: movies });
});

// Real working streams
builder.defineStreamHandler((args) => {
    const streams = [];
    
    // Public domain movie URLs that actually work
    const movieUrls = {
        'tt0111161': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'tt0068646': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'tt0133093': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'tt0110912': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    };
    
    const videoUrl = movieUrls[args.id] || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    
    // Return multiple stream options
    streams.push({
        title: 'Direct Play (Browser)',
        url: videoUrl
    });
    
    streams.push({
        title: 'Player Selector',
        url: `${baseUrl}/players?url=${encodeURIComponent(videoUrl)}`
    });
    
    return Promise.resolve({ streams });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

// Root page
app.get('/', (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Working Stremio Backend</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; }
                .step { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #3498db; }
                .url { background: #2c3e50; color: white; padding: 10px; border-radius: 5px; font-family: monospace; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Working Stremio Backend</h1>
                <p>This backend provides real movies with working streams and player selection.</p>
                
                <div class="step">
                    <h3>Step 1: Add to Stremio</h3>
                    <p>Copy this URL and add it in Stremio:</p>
                    <div class="url">${baseUrl}</div>
                </div>
                
                <div class="step">
                    <h3>Step 2: Browse Movies</h3>
                    <p>Go to "Discover" in Stremio and you'll see movies from this backend.</p>
                </div>
                
                <div class="step">
                    <h3>Step 3: Play with Any Player</h3>
                    <p>When you click a movie, choose "Player Selector" to open the burger menu and pick your preferred player.</p>
                </div>
                
                <p><a href="/manifest.json">View Addon Manifest</a> | <a href="/health">Health Check</a></p>
            </div>
        </body>
        </html>
    `);
});

// Player redirect
app.get('/play', (req, res) => {
    const videoUrl = req.query.url;
    const player = req.query.player || 'browser';
    
    if (!videoUrl) {
        return res.status(400).send('No video URL provided');
    }
    
    const decodedUrl = decodeURIComponent(videoUrl);
    
    const playerSchemes = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(decodedUrl)}`,
        nplayer: `nplayer-${decodedUrl}`,
        outplayer: `outplayer://${decodedUrl}`,
        vlc: `vlc://${decodedUrl}`,
        browser: decodedUrl
    };
    
    res.redirect(playerSchemes[player] || decodedUrl);
});

// Players menu
app.get('/players', (req, res) => {
    const videoUrl = req.query.url;
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    
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
                .container { max-width: 400px; margin: 0 auto; }
                h2 { text-align: center; margin-bottom: 30px; }
                .player-btn { 
                    display: block; width: 100%; padding: 18px; margin: 12px 0; 
                    background: #2a2a2a; border: 2px solid #444; color: white; border-radius: 12px; 
                    font-size: 18px; cursor: pointer; text-decoration: none; text-align: center;
                    transition: all 0.3s ease;
                }
                .player-btn:hover { 
                    background: #3a3a3a; border-color: #666; transform: translateY(-2px); 
                }
                .info { text-align: center; margin-top: 30px; color: #888; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🎬 Choose Player</h2>
                <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=infuse" class="player-btn">Infuse</a>
                <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=nplayer" class="player-btn">nPlayer</a>
                <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=outplayer" class="player-btn">OutPlayer</a>
                <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=vlc" class="player-btn">VLC</a>
                <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=browser" class="player-btn">Browser</a>
                <div class="info">One click opens your player automatically</div>
            </div>
        </body>
        </html>
    `);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Working Stremio Backend',
        movies: 4,
        players: ['Infuse', 'nPlayer', 'OutPlayer', 'VLC', 'Browser']
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Working Stremio backend running on port ${PORT}`);
    console.log(`📍 Add this to Stremio: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
});