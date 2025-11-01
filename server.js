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
        * {
            -webkit-tap-highlight-color: transparent;
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><filter id="blur"><feGaussianBlur stdDeviation="50"/></filter></defs><g filter="url(%23blur)"><circle cx="15%" cy="15%" r="20%" fill="%238b5cf6" opacity="0.3"/><circle cx="85%" cy="85%" r="25%" fill="%23ec4899" opacity="0.3"/><circle cx="60%" cy="40%" r="30%" fill="%236366f1" opacity="0.3"/></g></svg>');
            background-size: cover;
            filter: blur(100px);
            z-index: -1;
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
            background: transparent;
        }
        
        .control-wrapper {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .control-wrapper.show {
            display: block;
            opacity: 1;
        }
        
        .floating-controls {
            display: flex;
            gap: 8px;
        }
        
        .glass-btn {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 24px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .glass-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }
        
        .glass-btn:active {
            transform: translateY(0);
        }
        
        .panel {
            display: none;
            position: fixed;
            top: 50px;
            left: 10px;
            width: 320px;
            max-height: 70vh;
            background: rgba(16, 18, 27, 0.85);
            backdrop-filter: blur(40px) saturate(150%);
            -webkit-backdrop-filter: blur(40px) saturate(150%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .panel-header {
            background: rgba(255, 255, 255, 0.05);
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .panel-title {
            color: white;
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: rgba(255, 100, 100, 0.2);
            transform: rotate(90deg);
        }
        
        .panel-content {
            padding: 12px;
            overflow-y: auto;
            max-height: calc(70vh - 60px);
        }
        
        .panel-content::-webkit-scrollbar {
            width: 6px;
        }
        
        .panel-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
        }
        
        .panel-content::-webkit-scrollbar-thumb {
            background: rgba(139, 92, 246, 0.3);
            border-radius: 3px;
        }
        
        .addon-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
        }
        
        .addon-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
            transition: left 0.5s;
        }
        
        .addon-item:hover {
            background: rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.3);
            transform: translateX(4px);
        }
        
        .addon-item:hover::before {
            left: 100%;
        }
        
        .addon-name {
            color: white;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .addon-desc {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            line-height: 1.4;
        }
        
        .player-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .player-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .player-item:hover {
            background: rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.3);
            transform: scale(1.05);
        }
        
        .player-icon {
            font-size: 28px;
            margin-bottom: 8px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }
        
        .player-name {
            color: white;
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 2px;
        }
        
        .player-desc {
            color: rgba(255, 255, 255, 0.5);
            font-size: 10px;
        }
        
        .loading {
            text-align: center;
            padding: 30px;
            color: rgba(255, 255, 255, 0.6);
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #8b5cf6;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            z-index: 10000;
        }
        
        .toast.show {
            opacity: 1;
        }
        
        @media (max-width: 768px) {
            .control-wrapper {
                top: 5px;
                left: 5px;
            }
            
            .glass-btn {
                padding: 8px 14px;
                font-size: 12px;
            }
            
            .panel {
                top: 45px;
                left: 5px;
                right: 5px;
                width: auto;
                max-width: calc(100vw - 10px);
            }
            
            .player-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            
            .player-item {
                padding: 12px 8px;
            }
            
            .player-icon {
                font-size: 24px;
            }
        }
        
        @media (max-width: 480px) {
            .player-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div id="stremio-container">
        <iframe id="stremio-frame" src="${STREMIO_WEB_URL}" allow="fullscreen autoplay"></iframe>
    </div>
    
    <div class="control-wrapper" id="control-wrapper">
        <div class="floating-controls">
            <button class="glass-btn" onclick="toggleAddons()">
                <span>✨</span>
                <span>Addons</span>
            </button>
            <button class="glass-btn" onclick="togglePlayers()">
                <span>📱</span>
                <span>Players</span>
            </button>
        </div>
        
        <div id="addons-panel" class="panel">
            <div class="panel-header">
                <h3 class="panel-title">Community Addons</h3>
                <button class="close-btn" onclick="closePanel('addons-panel')">&times;</button>
            </div>
            <div class="panel-content" id="addons-content">
                <div class="loading">
                    <div class="spinner"></div>
                    <div>Loading addons...</div>
                </div>
            </div>
        </div>
        
        <div id="players-panel" class="panel">
            <div class="panel-header">
                <h3 class="panel-title">Select Player</h3>
                <button class="close-btn" onclick="closePanel('players-panel')">&times;</button>
            </div>
            <div class="panel-content">
                <div class="player-grid" id="players-content"></div>
            </div>
        </div>
    </div>
    
    <div id="toast" class="toast"></div>

    <script>
        const communityAddons = ${JSON.stringify(COMMUNITY_ADDONS)};
        
        const PLAYERS = {
            ios: [
                { name: 'VLC', scheme: 'vlc://', icon: '🟠', desc: 'VLC Media Player' },
                { name: 'Outplayer', scheme: 'outplayer://', icon: '📱', desc: 'Premium player' },
                { name: 'Infuse', scheme: 'infuse://x-callback-url/play?url=', icon: '🔥', desc: 'Best quality' },
                { name: 'nPlayer', scheme: 'nplayer-', icon: '🎯', desc: 'Advanced player' },
                { name: 'Documents', scheme: 'readdle-Documents://open?url=', icon: '📄', desc: 'By Readdle' },
                { name: 'Web Player', scheme: 'web', icon: '🌐', desc: 'Built-in' }
            ],
            android: [
                { name: 'VLC', package: 'org.videolan.vlc', icon: '🟠', desc: 'VLC Player' },
                { name: 'MX Player', package: 'com.mxtech.videoplayer', icon: '🔵', desc: 'Popular player' },
                { name: 'MPV', package: 'is.xyz.mpv', icon: '🎪', desc: 'Open source' },
                { name: 'Web Player', scheme: 'web', icon: '🌐', desc: 'Built-in' }
            ],
            web: [
                { name: 'Web Player', scheme: 'web', icon: '🌐', desc: 'Built-in player' }
            ]
        };
        
        let currentStreamUrl = null;
        let checkInterval = null;
        let isLoggedIn = false;
        
        function detectDevice() {
            const ua = navigator.userAgent;
            if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
            if (/Android/.test(ua)) return 'android';
            return 'web';
        }
        
        function checkLoginState() {
            const frame = document.getElementById('stremio-frame');
            
            // Check multiple indicators for login state
            try {
                // Method 1: Check iframe URL
                const frameUrl = frame.contentWindow.location.href;
                if (frameUrl.includes('/board') || frameUrl.includes('/discover') || frameUrl.includes('/detail')) {
                    showControls();
                    return;
                }
            } catch(e) {
                // Cross-origin will block this, use fallback
            }
            
            // Method 2: Wait a few seconds after load then show
            setTimeout(function() {
                // Assume logged in after initial load time
                const currentUrl = window.location.href;
                if (!currentUrl.includes('login') && !currentUrl.includes('auth')) {
                    showControls();
                }
            }, 3000);
        }
        
        function showControls() {
            if (!isLoggedIn) {
                isLoggedIn = true;
                document.getElementById('control-wrapper').classList.add('show');
                setupStreamInterceptor();
            }
        }
        
        function hideControls() {
            isLoggedIn = false;
            document.getElementById('control-wrapper').classList.remove('show');
        }
        
        function toggleAddons() {
            const panel = document.getElementById('addons-panel');
            const otherPanel = document.getElementById('players-panel');
            otherPanel.style.display = 'none';
            
            if (panel.style.display === 'block') {
                closePanel('addons-panel');
            } else {
                panel.style.display = 'block';
                loadAddons();
            }
        }
        
        function togglePlayers() {
            const panel = document.getElementById('players-panel');
            const otherPanel = document.getElementById('addons-panel');
            otherPanel.style.display = 'none';
            
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
                try {
                    const parts = addon.split('/');
                    const domain = parts[2] || 'Unknown';
                    const name = domain.split('.')[0];
                    const cleanName = name.charAt(0).toUpperCase() + name.slice(1);
                    
                    html += '<div class="addon-item" onclick="installAddon(\\'' + addon.replace(/'/g, "\\'") + '\\')">';
                    html += '<div class="addon-name">' + cleanName + '</div>';
                    html += '<div class="addon-desc">' + domain + '</div>';
                    html += '</div>';
                } catch(e) {
                    console.error('Error loading addon:', e);
                }
            }
            
            content.innerHTML = html;
        }
        
        function loadPlayers() {
            const content = document.getElementById('players-content');
            const device = detectDevice();
            const players = PLAYERS[device] || PLAYERS.web;
            
            let html = '';
            for (const player of players) {
                html += '<div class="player-item" onclick="selectPlayer(\\'' + player.scheme.replace(/'/g, "\\'") + '\\', \\'' + player.name.replace(/'/g, "\\'") + '\\')">';
                html += '<div class="player-icon">' + player.icon + '</div>';
                html += '<div class="player-name">' + player.name + '</div>';
                html += '<div class="player-desc">' + player.desc + '</div>';
                html += '</div>';
            }
            
            content.innerHTML = html;
        }
        
        function installAddon(addonUrl) {
            showToast('Installing ' + addonUrl.split('/')[2] + '...');
            window.open(addonUrl, '_blank');
            closePanel('addons-panel');
        }
        
        function selectPlayer(scheme, playerName) {
            localStorage.setItem('preferredPlayer', JSON.stringify({scheme: scheme, name: playerName}));
            showToast(playerName + ' set as default player');
            closePanel('players-panel');
            
            // If we have a current stream, offer to open it
            if (currentStreamUrl) {
                setTimeout(function() {
                    if (confirm('Open current stream in ' + playerName + '?')) {
                        openInPlayer(currentStreamUrl, scheme);
                    }
                }, 500);
            }
        }
        
        function openInPlayer(streamUrl, scheme) {
            if (!streamUrl) return;
            
            if (scheme === 'web') {
                // Keep in web player
                return;
            } else if (scheme === 'nplayer-') {
                window.location.href = scheme + streamUrl;
            } else if (scheme.includes('://')) {
                window.location.href = scheme + encodeURIComponent(streamUrl);
            }
        }
        
        function setupStreamInterceptor() {
            // Intercept all XHR requests
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function() {
                const url = arguments[1];
                if (url && typeof url === 'string') {
                    if (url.includes('.mp4') || url.includes('.mkv') || url.includes('stream') || url.includes('.m3u8')) {
                        console.log('Stream detected:', url);
                        currentStreamUrl = url;
                        checkAutoPlay(url);
                    }
                }
                return originalOpen.apply(this, arguments);
            };
            
            // Monitor video elements
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeName === 'VIDEO') {
                            handleVideoElement(node);
                        } else if (node.querySelectorAll) {
                            const videos = node.querySelectorAll('video');
                            videos.forEach(handleVideoElement);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        function handleVideoElement(video) {
            if (video.src) {
                currentStreamUrl = video.src;
                checkAutoPlay(video.src);
            }
            
            video.addEventListener('loadstart', function() {
                if (this.src) {
                    currentStreamUrl = this.src;
                    checkAutoPlay(this.src);
                }
            });
        }
        
        function checkAutoPlay(streamUrl) {
            const savedPlayer = localStorage.getItem('preferredPlayer');
            if (savedPlayer) {
                const player = JSON.parse(savedPlayer);
                if (player.scheme !== 'web') {
                    setTimeout(function() {
                        if (confirm('Open in ' + player.name + '?')) {
                            openInPlayer(streamUrl, player.scheme);
                        }
                    }, 1000);
                }
            }
        }
        
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }
        
        // Close panels on outside click
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.panel') && !e.target.closest('.glass-btn')) {
                document.querySelectorAll('.panel').forEach(function(p) {
                    p.style.display = 'none';
                });
            }
        });
        
        // Initialize on load
        window.addEventListener('load', function() {
            checkLoginState();
            
            // Try to inject CSS into iframe
            const frame = document.getElementById('stremio-frame');
            frame.addEventListener('load', function() {
                try {
                    const link = document.createElement('link');
                    link.href = '/glass-theme.css';
                    link.rel = 'stylesheet';
                    frame.contentDocument.head.appendChild(link);
                } catch(e) {
                    console.log('CSS injection blocked by cross-origin policy');
                }
            });
        });
        
        // Periodic check for login state
        checkInterval = setInterval(function() {
            if (!isLoggedIn) {
                checkLoginState();
            }
        }, 2000);
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
        const response = await axios.get(url, { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch addon info' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});