const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// Real movie catalog
const builder = new addonBuilder({
    id: 'org.smart.stremio',
    version: '2.0.0',
    name: 'Smart Stremio',
    description: 'Instant player activation - No more "unsupported video"',
    resources: ['catalog', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'instant-movies',
            name: 'Instant Play Movies',
            extra: []
        }
    ]
});

// Working movie catalog
builder.defineCatalogHandler((args) => {
    const movies = [
        {
            id: 'bigbuckbunny',
            type: 'movie',
            name: 'Big Buck Bunny (Instant Play)',
            poster: 'https://image.tmdb.org/t/p/w500/aVzn48E1S5x1ppNIrJT0kCuc9h3.jpg',
            description: 'Click to instantly open in your preferred player'
        },
        {
            id: 'elephantsdream',
            type: 'movie',
            name: 'Elephants Dream (Instant Play)',
            poster: 'https://image.tmdb.org/t/p/w500/5Jpa1u4Q5G1dKSOaZf0Vt6D8uQf.jpg',
            description: 'One click opens directly in player'
        },
        {
            id: 'sintel',
            type: 'movie',
            name: 'Sintel (Instant Play)',
            poster: 'https://image.tmdb.org/t/p/w500/rrmQRY7qcJ8Yy2eQgSFXf2bJ3vS.jpg',
            description: 'Instant player activation'
        }
    ];
    
    return Promise.resolve({ metas: movies });
});

// SMART STREAM HANDLER - Instant player activation
builder.defineStreamHandler((args) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    
    // Real working video URLs
    const movieUrls = {
        'bigbuckbunny': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'elephantsdream': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'sintel': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    };
    
    const videoUrl = movieUrls[args.id] || movieUrls.bigbuckbunny;
    
    // RETURN INSTANT PLAYER REDIRECTS - No more "unsupported video"
    const streams = [
        // INFUSE - Instant activation
        {
            title: '🎬 Infuse (Instant)',
            url: `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`
        },
        // NPLAYER - Instant activation  
        {
            title: '📱 nPlayer (Instant)',
            url: `nplayer-${videoUrl}`
        },
        // OUTPLAYER - Instant activation
        {
            title: '🔴 OutPlayer (Instant)',
            url: `outplayer://${videoUrl}`
        },
        // VLC - Instant activation
        {
            title: '▶️ VLC (Instant)',
            url: `vlc://${videoUrl}`
        },
        // BROWSER - Direct play
        {
            title: '🌐 Browser (Direct)',
            url: videoUrl
        },
        // SMART PLAYER SELECTOR - Opens overlay
        {
            title: '⚡ Smart Player Menu',
            url: `${baseUrl}/smart-menu?url=${encodeURIComponent(videoUrl)}`
        }
    ];
    
    return Promise.resolve({ streams });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

// SMART MENU - Auto-redirects based on user agent
app.get('/smart-menu', (req, res) => {
    const videoUrl = req.query.url;
    const userAgent = req.headers['user-agent'] || '';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    
    if (!videoUrl) {
        return res.status(400).send('No video URL provided');
    }
    
    // Auto-detect device and suggest best player
    let suggestedPlayer = 'browser';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        suggestedPlayer = 'infuse';
    } else if (userAgent.includes('Android')) {
        suggestedPlayer = 'vlc';
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Smart Player Menu</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
                .container { max-width: 500px; margin: 0 auto; }
                .player-btn { 
                    display: block; width: 100%; padding: 20px; margin: 15px 0; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    border: none; color: white; border-radius: 15px; 
                    font-size: 20px; font-weight: bold; cursor: pointer; 
                    text-decoration: none; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                }
                .player-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.4); }
                .suggested { background: linear-gradient(135deg, #4CAF50, #45a049); }
                .auto-section { background: #2a2a2a; padding: 20px; border-radius: 10px; margin: 20px 0; }
                .auto-btn { background: linear-gradient(135deg, #FF9800, #F57C00); }
                .url-box { background: #333; padding: 15px; border-radius: 8px; margin: 15px 0; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center;">🎬 Smart Player Menu</h1>
                
                <div class="auto-section">
                    <h3>🚀 Auto-Open Players (Click Any)</h3>
                    <a href="infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}" class="player-btn ${suggestedPlayer === 'infuse' ? 'suggested' : ''}">Infuse</a>
                    <a href="nplayer-${videoUrl}" class="player-btn ${suggestedPlayer === 'nplayer' ? 'suggested' : ''}">nPlayer</a>
                    <a href="outplayer://${videoUrl}" class="player-btn">OutPlayer</a>
                    <a href="vlc://${videoUrl}" class="player-btn ${suggestedPlayer === 'vlc' ? 'suggested' : ''}">VLC</a>
                    <a href="${videoUrl}" class="player-btn">Browser</a>
                </div>
                
                <div class="auto-section">
                    <h3>⚡ Auto-Copy URL</h3>
                    <div class="url-box" id="urlBox">${videoUrl}</div>
                    <button class="player-btn auto-btn" onclick="copyUrl()">📋 Copy URL & Open All Players</button>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #888;">
                    <p>💡 <strong>Pro Tip:</strong> Click any player button above to instantly open</p>
                    <p>✅ No more "unsupported video" errors</p>
                </div>
            </div>

            <script>
                function copyUrl() {
                    const url = '${videoUrl}';
                    navigator.clipboard.writeText(url).then(() => {
                        alert('✅ URL copied! Now opening all players...');
                        // Try to open multiple players (iOS may block this)
                        setTimeout(() => window.location.href = 'infuse://x-callback-url/play?url=' + encodeURIComponent(url), 100);
                        setTimeout(() => window.location.href = 'nplayer-' + url, 300);
                        setTimeout(() => window.location.href = 'outplayer://' + url, 500);
                    });
                }
                
                // Auto-highlight URL for easy copying
                document.addEventListener('DOMContentLoaded', function() {
                    const urlBox = document.getElementById('urlBox');
                    urlBox.addEventListener('click', function() {
                        const range = document.createRange();
                        range.selectNode(urlBox);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                    });
                });
            </script>
        </body>
        </html>
    `);
});

// INSTANT REDIRECT ENDPOINT - For quick player access
app.get('/instant/:player', (req, res) => {
    const player = req.params.player;
    const videoUrl = req.query.url;
    
    if (!videoUrl) {
        return res.status(400).send('No video URL provided');
    }
    
    const playerUrls = {
        infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`,
        nplayer: `nplayer-${videoUrl}`,
        outplayer: `outplayer://${videoUrl}`,
        vlc: `vlc://${videoUrl}`,
        browser: videoUrl
    };
    
    if (playerUrls[player]) {
        console.log(`🚀 INSTANT REDIRECT to ${player}: ${videoUrl}`);
        res.redirect(playerUrls[player]);
    } else {
        res.redirect(videoUrl);
    }
});

// Root page
app.get('/', (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Smart Stremio - Instant Player Activation</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; }
                .feature { background: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #3498db; }
                .instant { background: #e8f6f3; border-left: 4px solid #2ecc71; }
                .url { background: #2c3e50; color: white; padding: 10px; border-radius: 5px; font-family: monospace; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Smart Stremio - Instant Player Activation</h1>
                <p>No more "unsupported video" errors! Instant player redirects.</p>
                
                <div class="feature instant">
                    <h3>⚡ INSTANT PLAYER ACTIVATION</h3>
                    <p>When you click a movie in Stremio, you'll see:</p>
                    <ul>
                        <li><strong>Infuse (Instant)</strong> - One click opens Infuse immediately</li>
                        <li><strong>nPlayer (Instant)</strong> - One click opens nPlayer immediately</li>
                        <li><strong>OutPlayer (Instant)</strong> - One click opens OutPlayer immediately</li>
                        <li><strong>VLC (Instant)</strong> - One click opens VLC immediately</li>
                        <li><strong>Smart Player Menu</strong> - Advanced menu with auto-copy & multiple player options</li>
                    </ul>
                </div>
                
                <div class="feature">
                    <h3>🎯 How to Use:</h3>
                    <ol>
                        <li>Add this URL to Stremio: <div class="url">${baseUrl}</div></li>
                        <li>Browse to "Instant Play Movies" in Stremio</li>
                        <li>Click any movie → Choose your preferred "Instant" player</li>
                        <li>ONE CLICK opens your player instantly - No errors!</li>
                    </ol>
                </div>
                
                <p><a href="/manifest.json">View Manifest</a> | <a href="/health">Health Check</a></p>
            </div>
        </body>
        </html>
    `);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Smart Stremio - Instant Player Activation',
        features: ['Instant player redirects', 'No unsupported video errors', 'Auto-copy URLs', 'Smart device detection']
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SMART Stremio backend running on port ${PORT}`);
    console.log(`📍 Add to Stremio: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
    console.log(`🎯 Features: Instant player activation, no more "unsupported video" errors!`);
});