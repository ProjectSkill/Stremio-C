const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const app = express();

// Get base URL for the service
const getBaseUrl = (req) => {
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}`;
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

// Enhanced stream handler for different content types
builder.defineStreamHandler((args) => {
    return new Promise((resolve) => {
        const streams = [];
        
        if (args.type === 'movie' || args.type === 'series') {
            // For direct HTTP links
            if (args.id.startsWith('http')) {
                streams.push({
                    title: 'Direct Stream',
                    url: args.id
                });
            } else {
                // For torrents and other content - use player selector
                streams.push({
                    title: 'Play with Player Selector',
                    url: `{baseUrl}/players?url=${encodeURIComponent(args.id)}`
                });
            }
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
    
    // Enhanced player URL schemes for iOS compatibility
    const playerSchemes = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(decodedUrl)}`,
        nplayer: `nplayer-${decodedUrl}`,
        outplayer: `outplayer://${decodedUrl}`,
        vlc: `vlc://${decodedUrl}`,
        browser: decodedUrl
    };
    
    const redirectUrl = playerSchemes[player];
    
    if (redirectUrl) {
        console.log(`Redirecting to ${player} with URL: ${decodedUrl}`);
        res.redirect(redirectUrl);
    } else {
        res.redirect(decodedUrl);
    }
});

// Players selection page (burger menu)
app.get('/players', (req, res) => {
    const videoUrl = req.query.url;
    const baseUrl = getBaseUrl(req);
    
    if (!videoUrl) {
        return res.status(400).send('No video URL provided');
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Choose Player</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #0f0f0f; 
            color: white; 
            min-height: 100vh;
        }
        .container { 
            max-width: 400px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #333;
        }
        .header h2 {
            font-size: 24px;
            font-weight: 600;
            color: #fff;
        }
        .player-btn { 
            display: block; 
            width: 100%; 
            padding: 18px 20px; 
            margin: 12px 0; 
            background: linear-gradient(135deg, #2a2a2a, #1a1a1a); 
            border: 1px solid #333; 
            color: white; 
            border-radius: 12px; 
            font-size: 17px; 
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .player-btn:hover { 
            background: linear-gradient(135deg, #3a3a3a, #2a2a2a);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        .player-btn:active {
            transform: translateY(0);
        }
        .info {
            text-align: center;
            margin-top: 30px;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 8px;
            font-size: 14px;
            color: #888;
        }
        @media (max-width: 480px) {
            .container {
                padding: 15px;
            }
            .player-btn {
                padding: 16px 20px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Choose Player</h2>
        </div>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=infuse" class="player-btn">🎬 Infuse</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=nplayer" class="player-btn">📱 nPlayer</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=outplayer" class="player-btn">🔴 OutPlayer</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=vlc" class="player-btn">▶️ VLC</a>
        <a href="${baseUrl}/play?url=${encodeURIComponent(videoUrl)}&player=browser" class="player-btn">🌐 Browser</a>
        
        <div class="info">
            One click will open your selected player automatically
        </div>
    </div>

    <script>
        // Add click handlers for better UX
        document.addEventListener('DOMContentLoaded', function() {
            const buttons = document.querySelectorAll('.player-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    const playerName = this.textContent.trim();
                    this.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                    this.innerHTML = '⏳ Opening ' + playerName + '...';
                });
            });
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
    res.json(builder.getManifest());
});

const PORT = process.env.PORT || 11470;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lightweight Stremio backend running on port ${PORT}`);
    console.log(`Base URL: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}`);
});