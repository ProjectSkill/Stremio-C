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
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 10000);
    
    const streams = [
        {
            title: '🍔 Burger Menu - Player Selector',
            description: 'Open player selection menu',
            url: baseUrl + '/burger-menu?type=' + args.type + '&id=' + encodeURIComponent(args.id) + '&title=' + encodeURIComponent(args.title || 'Content')
        }
    ];

    return Promise.resolve({ streams });
});

const addonInterface = builder.getInterface();
app.use('/', getRouter(addonInterface));

app.get('/burger-menu', (req, res) => {
    const videoType = req.query.type;
    const videoId = req.query.id;
    const videoTitle = req.query.title || 'Video';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 10000);
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Burger Menu - ${videoTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f0f;
            color: white;
            min-height: 100vh;
            overflow-x: hidden;
        }
        .burger-container {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
        }
        .burger-icon {
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .burger-icon:hover {
            transform: scale(1.1);
        }
        .menu-overlay {
            position: fixed;
            top: 0;
            left: -300px;
            width: 280px;
            height: 100vh;
            background: #1a1a1a;
            box-shadow: 2px 0 15px rgba(0,0,0,0.5);
            transition: left 0.3s ease;
            z-index: 999;
            padding: 60px 20px 20px;
            overflow-y: auto;
        }
        .menu-overlay.active {
            left: 0;
        }
        .menu-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #333;
        }
        .url-fetcher {
            background: #2a2a2a;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .fetch-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            cursor: pointer;
            margin-bottom: 10px;
        }
        .url-list {
            max-height: 200px;
            overflow-y: auto;
            background: #333;
            border-radius: 5px;
            padding: 10px;
            display: none;
        }
        .url-item {
            padding: 8px;
            margin: 5px 0;
            background: #444;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            word-break: break-all;
        }
        .url-item:hover {
            background: #555;
        }
        .player-section {
            margin-top: 20px;
        }
        .player-btn {
            display: block;
            width: 100%;
            padding: 15px;
            margin: 8px 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 16px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        .player-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            z-index: 998;
        }
        .status {
            text-align: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            display: none;
        }
        .success {
            background: #4CAF50;
        }
        .info {
            background: #2196F3;
        }
    </style>
</head>
<body>
    <div class="burger-container">
        <div class="burger-icon" onclick="toggleMenu()">🍔</div>
    </div>

    <div class="backdrop" onclick="toggleMenu()"></div>

    <div class="menu-overlay" id="menuOverlay">
        <div class="menu-header">
            <h3>🎬 Player Menu</h3>
            <p>${videoTitle}</p>
        </div>

        <div class="url-fetcher">
            <button class="fetch-btn" onclick="fetchStreamUrls()">
                🔍 Fetch Stream URLs
            </button>
            <div class="status info" id="fetchStatus">
                Fetching available streams...
            </div>
            <div class="url-list" id="urlList"></div>
        </div>

        <div class="player-section">
            <button class="player-btn" onclick="openPlayer('infuse')">
                🎯 Infuse
            </button>
            <button class="player-btn" onclick="openPlayer('nplayer')">
                📱 nPlayer
            </button>
            <button class="player-btn" onclick="openPlayer('outplayer')">
                🔴 OutPlayer
            </button>
            <button class="player-btn" onclick="openPlayer('vlc')">
                ▶️ VLC
            </button>
            <button class="player-btn" onclick="openPlayer('browser')">
                🌐 Browser
            </button>
        </div>

        <div class="status success" id="copyStatus">
            ✅ URL copied to clipboard!
        </div>
    </div>

    <script>
        let currentStreamUrl = '';
        const sampleStreams = [
            'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8',
            'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'
        ];

        function toggleMenu() {
            const menu = document.getElementById('menuOverlay');
            const backdrop = document.querySelector('.backdrop');
            menu.classList.toggle('active');
            backdrop.style.display = menu.classList.contains('active') ? 'block' : 'none';
        }

        function fetchStreamUrls() {
            const status = document.getElementById('fetchStatus');
            const urlList = document.getElementById('urlList');
            
            status.style.display = 'block';
            status.textContent = '🔍 Fetching available streams...';
            
            setTimeout(() => {
                urlList.innerHTML = '';
                sampleStreams.forEach((url, index) => {
                    const urlItem = document.createElement('div');
                    urlItem.className = 'url-item';
                    urlItem.textContent = 'Stream ' + (index + 1) + ': ' + url;
                    urlItem.onclick = function() {
                        currentStreamUrl = url;
                        copyToClipboard(url);
                        showStatus('copyStatus', '✅ URL copied to clipboard!');
                    };
                    urlList.appendChild(urlItem);
                });
                
                urlList.style.display = 'block';
                status.textContent = '✅ Found ' + sampleStreams.length + ' streams';
                
                if (sampleStreams.length > 0) {
                    currentStreamUrl = sampleStreams[0];
                }
            }, 1500);
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('URL copied to clipboard:', text);
            }).catch(err => {
                console.error('Failed to copy:', err);
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
                showStatus('fetchStatus', '⚠️ Please fetch streams first');
                document.getElementById('fetchStatus').style.display = 'block';
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
            
            setTimeout(function() {
                if (document.hasFocus()) {
                    window.location.href = currentStreamUrl;
                }
            }, 1500);
        }

        function showStatus(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(function() {
                element.style.display = 'none';
            }, 3000);
        }

        document.getElementById('menuOverlay').addEventListener('transitionend', function() {
            if (this.classList.contains('active') && !currentStreamUrl) {
                fetchStreamUrls();
            }
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

app.get('/', (req, res) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 10000);