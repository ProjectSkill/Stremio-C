const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

const builder = new addonBuilder({
    id: 'org.burgermenu.ultimate',
    version: '1.0.0',
    name: 'Burger Menu Ultimate',
    description: 'Lightweight backend with burger menu player selection',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: []
});

builder.defineStreamHandler((args) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000';
    
    const streams = [
        {
            title: '🍔 Burger Menu - Player Selector',
            description: 'Open player selection menu',
            url: baseUrl + '/burger-menu?type=' + args.type + '&id=' + encodeURIComponent(args.id || 'default') + '&title=' + encodeURIComponent(args.title || 'Content')
        }
    ];

    return Promise.resolve({ streams });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

app.get('/burger-menu', (req, res) => {
    const videoTitle = req.query.title || 'Video';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000';
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Burger Menu</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f0f0f;
            color: white;
            margin: 0;
            padding: 20px;
        }
        .burger-container {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
        }
        .burger-icon {
            width: 40px;
            height: 40px;
            background: #667eea;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 20px;
        }
        .menu-overlay {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 10px;
            margin-top: 60px;
        }
        .player-btn {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            background: #2a2a2a;
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            cursor: pointer;
        }
        .fetch-btn {
            background: #4CAF50;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 10px;
        }
        .url-list {
            background: #333;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            display: none;
        }
        .url-item {
            padding: 8px;
            margin: 5px 0;
            background: #444;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="burger-container">
        <div class="burger-icon">🍔</div>
    </div>

    <div class="menu-overlay">
        <h2>Player Menu</h2>
        <p>${videoTitle}</p>
        
        <button class="fetch-btn" onclick="fetchStreamUrls()">Fetch Stream URLs</button>
        <div class="url-list" id="urlList"></div>

        <button class="player-btn" onclick="openPlayer('infuse')">Infuse</button>
        <button class="player-btn" onclick="openPlayer('nplayer')">nPlayer</button>
        <button class="player-btn" onclick="openPlayer('outplayer')">OutPlayer</button>
        <button class="player-btn" onclick="openPlayer('vlc')">VLC</button>
        <button class="player-btn" onclick="openPlayer('browser')">Browser</button>
    </div>

    <script>
        let currentStreamUrl = '';
        const sampleStreams = [
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8'
        ];

        function fetchStreamUrls() {
            const urlList = document.getElementById('urlList');
            urlList.innerHTML = '';
            
            sampleStreams.forEach((url, index) => {
                const urlItem = document.createElement('div');
                urlItem.className = 'url-item';
                urlItem.textContent = 'Stream ' + (index + 1) + ': ' + url;
                urlItem.onclick = function() {
                    currentStreamUrl = url;
                    copyToClipboard(url);
                    alert('URL copied: ' + url);
                };
                urlList.appendChild(urlItem);
            });
            
            urlList.style.display = 'block';
            currentStreamUrl = sampleStreams[0];
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('URL copied');
            }).catch(err => {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            });
        }

        function openPlayer(player) {
            if (!currentStreamUrl) {
                alert('Please fetch streams first');
                return;
            }

            const playerUrls = {
                infuse: 'infuse://x-callback-url/play?url=' + encodeURIComponent(currentStreamUrl),
                nplayer: 'nplayer-' + currentStreamUrl,
                outplayer: 'outplayer://' + currentStreamUrl,
                vlc: 'vlc://' + currentStreamUrl,
                browser: currentStreamUrl
            };

            const redirectUrl = playerUrls[player] || currentStreamUrl;
            copyToClipboard(currentStreamUrl);
            window.location.href = redirectUrl;
        }

        // Auto-fetch on page load
        fetchStreamUrls();
    </script>
</body>
</html>`;
    
    res.send(html);
});

app.get('/', (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000';
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Burger Menu Ultimate</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Burger Menu Ultimate - WORKING</h1>
                <p>Add this URL to Stremio: ${baseUrl}</p>
                <p><a href="/manifest.json">View Manifest</a></p>
            </div>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Burger Menu' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port ' + PORT);
});