const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static('public'));

const STREMIO_WEB_URL = 'https://web.stremio.com';
const COMMUNITY_ADDONS = [
  'https://torrentio.strem.fun/manifest.json',
  'https://stremio-jackett.gg.ax/manifest.json',
  'https://cyberflix.elfhosted.com/manifest.json',
  'https://annatar.elfhosted.com/manifest.json',
  'https://comet.elfhosted.com/manifest.json'
];

const getCustomHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Stremio Glass</title>
    <link rel="stylesheet" href="/glass-theme.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #stremio-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        .floating-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            gap: 10px;
        }
        
        .glass-btn {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .glass-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .panel {
            display: none;
            position: fixed;
            top: 80px;
            right: 20px;
            width: 90vw;
            max-width: 400px;
            max-height: 70vh;
            background: rgba(16, 18, 27, 0.8);
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 20px;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .panel-title {
            color: white;
            font-size: 18px;
            font-weight: 600;
        }
        
        .close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .addon-item, .player-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .addon-item:hover, .player-item:hover {
            background: rgba(139, 92, 246, 0.2);
            border-color: rgba(139, 92, 246, 0.4);
            transform: translateX(5px);
        }
        
        .addon-name, .player-name {
            color: white;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .addon-desc, .player-desc {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
        }
        
        .player-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .player-item {
            text-align: center;
            padding: 20px 10px;
        }
        
        .player-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }
        
        @media (max-width: 768px) {
            .floating-controls {
                top: 10px;
                right: 10px;
            }
            
            .glass-btn {
                padding: 10px 16px;
                font-size: 13px;
            }
            
            .panel {
                top: 60px;
                right: 10px;
                left: 10px;
                width: auto;
                max-width: none;
            }
        }
        
        .loading {
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
            padding: 20px;
        }
        
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top: 3px solid #8b5cf6;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="stremio-container">
        <iframe id="stremio-frame" src="${STREMIO_WEB_URL}" allow="fullscreen"></iframe>
    </div>
    
    <div class="floating-controls">
        <button class="glass-btn" onclick="toggleAddons()">
            <span>✨ Addons</span>
        </button>
        <button class="glass-btn" onclick="togglePlayers()">
            <span>📱 Players</span>
        </button>
    </div>
    
    <div id="addons-panel" class="panel">
        <div class="panel-header">
            <span class="panel-title">Community Addons</span>
            <button class="close-btn" onclick="closePanel('addons-panel')">&times;</button>
        </div>
        <div id="addons-content">
            <div class="loading">
                <div class="spinner"></div>
                Loading addons...
            </div>
        </div>
    </div>
    
    <div id="players-panel" class="panel">
        <div class="panel-header">
            <span class="panel-title">Select Player</span>
            <button class="close-btn" onclick="closePanel('players-panel')">&times;</button>
        </div>
        <div class="player-grid" id="players-content"></div>
    </div>

    <script>
        const communityAddons = ${JSON.stringify(COMMUNITY_ADDONS)};
        
        const PLAYERS = {
            ios: [
                { name: 'VLC', scheme: 'vlc://', icon: '🟠', desc: 'VLC Media Player' },
                { name: 'Outplayer', scheme: 'outplayer://', icon: '📱', desc: 'Premium player' },
                { name: 'Infuse', scheme: 'infuse://x-callback-url/play?url=', icon: '🔥', desc: 'Best quality' },
                { name: 'nPlayer', scheme: 'nplayer-', icon: '🎯', desc: 'Powerful player' },
                { name: 'Web Player', scheme: 'web', icon: '🌐', desc: 'Built-in player' }
            ]
        };
        
        let currentStreamUrl = null;
        
        function detectDevice() {
            return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web';
        }
        
        function toggleAddons() {
            const panel = document.getElementById('addons-panel');
            if (panel.style.display === 'block') {
                closePanel('addons-panel');
            } else {
                panel.style.display = 'block';
                loadAddons();
            }
        }
        
        function togglePlayers() {
            const panel = document.getElementById('players-panel');
            if (panel.style.display === 'block') {
                closePanel('players-panel');
            } else {
                panel.style.display = 'block';
                loadPlayers();
            }
        }
        
        function closePanel(panelId) {
            document.getElementById(panelId).style.display = 'none';
        }
        
        async function loadAddons() {
            const content = document.getElementById('addons-content');
            let html = '';
            
            for (const addon of communityAddons) {
                const name = addon.split('/')[2] || 'Unknown';
                const cleanName = name.replace('.strem.fun', '').replace('.elfhosted.com', '');
                html += '<div class="addon-item" onclick="installAddon(\\'' + addon.replace(/'/g, "\\'") + '\\')">';
                html += '<div class="addon-name">' + cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + '</div>';
                html += '<div class="addon-desc">Click to install this addon</div>';
                html += '</div>';
            }
            
            content.innerHTML = html;
        }
        
        function loadPlayers() {
            const content = document.getElementById('players-content');
            const device = detectDevice();
            const players = PLAYERS[device] || PLAYERS.ios;
            
            let html = '';
            for (const player of players) {
                html += '<div class="player-item" onclick="openInPlayer(\\'' + player.scheme + '\\', \\'' + player.name + '\\')">';
                html += '<div class="player-icon">' + player.icon + '</div>';
                html += '<div class="player-name">' + player.name + '</div>';
                html += '<div class="player-desc">' + player.desc + '</div>';
                html += '</div>';
            }
            
            content.innerHTML = html;
        }
        
        function installAddon(addonUrl) {
            window.open(addonUrl, '_blank');
            closePanel('addons-panel');
        }
        
        function openInPlayer(scheme, playerName) {
            // Get current video URL from Stremio (you may need to adjust this)
            const testUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            
            if (scheme === 'web') {
                window.open(testUrl, '_blank');
            } else if (scheme === 'nplayer-') {
                window.location.href = scheme + testUrl;
            } else {
                window.location.href = scheme + encodeURIComponent(testUrl);
            }
            
            closePanel('players-panel');
        }
        
        // Close panels on outside click
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.panel') && !e.target.closest('.glass-btn')) {
                document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
            }
        });
        
        // Listen for stream URLs from Stremio
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'STREAM_URL') {
                currentStreamUrl = e.data.url;
            }
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(getCustomHTML());
});

app.get('/api/addon-info', async (req, res) => {
    try {
        const { url } = req.query;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch addon info' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});