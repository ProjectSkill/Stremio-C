const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*' }));
app.use(express.static('public'));

// Proxy Stremio with modifications
const stremioProxy = createProxyMiddleware({
    target: 'https://web.stremio.com',
    changeOrigin: true,
    ws: true,
    onProxyRes: function(proxyRes, req, res) {
        // Remove security headers that block modifications
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        
        // For HTML responses, inject our minimal UI
        if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
            let body = [];
            const originalWrite = res.write;
            const originalEnd = res.end;
            
            res.write = function(chunk) {
                body.push(chunk);
            };
            
            res.end = function() {
                const bodyString = Buffer.concat(body).toString();
                const modifiedHtml = bodyString.replace(
                    '</body>',
                    getInjectionScript() + '</body>'
                );
                
                res.setHeader('content-length', Buffer.byteLength(modifiedHtml));
                originalWrite.call(res, modifiedHtml);
                originalEnd.call(res);
            };
        }
    }
});

// Injection script - minimal, headless
const getInjectionScript = () => `
<style>
    /* Minimal glass button - top left */
    .stremio-tools {
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 999999;
    }
    
    .tools-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    
    .tools-btn:hover {
        background: rgba(139, 92, 246, 0.3);
    }
    
    .tools-menu {
        display: none;
        position: absolute;
        top: 50px;
        left: 0;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        padding: 8px;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .tools-menu.show {
        display: block;
    }
    
    .menu-section {
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 4px;
    }
    
    .menu-section:last-child {
        border: none;
        margin: 0;
    }
    
    .menu-title {
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
        text-transform: uppercase;
        padding: 4px 8px;
        font-weight: 600;
    }
    
    .menu-item {
        color: white;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        border-radius: 4px;
        transition: background 0.2s;
        display: block;
        text-decoration: none;
    }
    
    .menu-item:hover {
        background: rgba(139, 92, 246, 0.2);
    }
    
    .stream-input {
        display: none;
        padding: 8px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 8px;
        position: absolute;
        top: 50px;
        left: 0;
        width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .stream-input input {
        width: 100%;
        padding: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .stream-input button {
        margin-top: 8px;
        padding: 6px 12px;
        background: rgba(139, 92, 246, 0.5);
        border: none;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    @media (max-width: 768px) {
        .tools-btn {
            width: 36px;
            height: 36px;
            font-size: 18px;
        }
        
        .tools-menu {
            min-width: 180px;
        }
        
        .stream-input {
            width: 250px;
        }
    }
</style>

<div class="stremio-tools">
    <button class="tools-btn" onclick="toggleToolsMenu()">⚡</button>
    
    <div class="tools-menu" id="toolsMenu">
        <div class="menu-section">
            <div class="menu-title">Quick Addons</div>
            <a href="https://torrentio.strem.fun" target="_blank" class="menu-item">Torrentio</a>
            <a href="https://stremio-jackett.gg.ax" target="_blank" class="menu-item">Jackett</a>
            <a href="https://cyberflix.elfhosted.com" target="_blank" class="menu-item">Cyberflix</a>
        </div>
        
        <div class="menu-section">
            <div class="menu-title">Players</div>
            <div class="menu-item" onclick="setPlayer('vlc')">🟠 VLC</div>
            <div class="menu-item" onclick="setPlayer('outplayer')">📱 Outplayer</div>
            <div class="menu-item" onclick="setPlayer('infuse')">🔥 Infuse</div>
            <div class="menu-item" onclick="setPlayer('web')">🌐 Web (Default)</div>
        </div>
        
        <div class="menu-section">
            <div class="menu-item" onclick="toggleStreamInput()">🔗 Open Stream URL</div>
        </div>
    </div>
    
    <div class="stream-input" id="streamInput">
        <input type="text" id="streamUrl" placeholder="Paste stream URL here...">
        <button onclick="playStream()">Play in Selected Player</button>
    </div>
</div>

<script>
    // Simple, efficient script
    let selectedPlayer = localStorage.getItem('selectedPlayer') || 'web';
    let lastStreamUrl = '';
    
    function toggleToolsMenu() {
        const menu = document.getElementById('toolsMenu');
        const input = document.getElementById('streamInput');
        menu.classList.toggle('show');
        input.style.display = 'none';
    }
    
    function toggleStreamInput() {
        const input = document.getElementById('streamInput');
        const menu = document.getElementById('toolsMenu');
        input.style.display = input.style.display === 'block' ? 'none' : 'block';
        menu.classList.remove('show');
    }
    
    function setPlayer(player) {
        selectedPlayer = player;
        localStorage.setItem('selectedPlayer', player);
        alert('Default player set to: ' + player.toUpperCase());
        document.getElementById('toolsMenu').classList.remove('show');
    }
    
    function playStream() {
        const url = document.getElementById('streamUrl').value;
        if (!url) {
            alert('Please enter a stream URL');
            return;
        }
        openInPlayer(url);
    }
    
    function openInPlayer(url) {
        const players = {
            'vlc': 'vlc-x-callback://x-callback-url/stream?url=' + encodeURIComponent(url),
            'outplayer': 'outplayer://play?url=' + encodeURIComponent(url),
            'infuse': 'infuse://x-callback-url/play?url=' + encodeURIComponent(url),
            'web': url
        };
        
        const playerUrl = players[selectedPlayer];
        
        if (selectedPlayer === 'web') {
            window.open(playerUrl, '_blank');
        } else {
            // For iOS apps
            window.location.href = playerUrl;
            
            // Fallback if app not installed
            setTimeout(function() {
                if (confirm('App might not be installed. Open in web player instead?')) {
                    window.open(url, '_blank');
                }
            }, 2500);
        }
        
        document.getElementById('streamInput').style.display = 'none';
    }
    
    // Intercept video playback (lightweight approach)
    let checkCount = 0;
    const videoChecker = setInterval(function() {
        checkCount++;
        if (checkCount > 100) clearInterval(videoChecker); // Stop after 100 checks
        
        const videos = document.querySelectorAll('video');
        videos.forEach(function(video) {
            if (video.src && video.src !== lastStreamUrl) {
                lastStreamUrl = video.src;
                
                // Only prompt if not web player
                if (selectedPlayer !== 'web' && video.src.includes('http')) {
                    if (confirm('Open in ' + selectedPlayer.toUpperCase() + '?')) {
                        openInPlayer(video.src);
                        video.pause();
                    }
                }
            }
        });
    }, 1000);
    
    // Close menu on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.stremio-tools')) {
            document.getElementById('toolsMenu').classList.remove('show');
            document.getElementById('streamInput').style.display = 'none';
        }
    });
    
    // Hide button on login page
    setInterval(function() {
        const isLoginPage = window.location.href.includes('login') || 
                          document.querySelector('[class*="login"]') ||
                          document.querySelector('[class*="Login"]');
        
        document.querySelector('.stremio-tools').style.display = isLoginPage ? 'none' : 'block';
    }, 2000);
</script>
`;

// Use proxy for all routes
app.use('/', stremioProxy);

app.listen(PORT, () => {
    console.log(`Headless Stremio running on port ${PORT}`);
});