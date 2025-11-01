const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Health check for Render
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Main page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stremio Enhanced</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        iframe { width: 100vw; height: 100vh; border: none; }
        
        .tools {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
        }
        
        .tools-btn {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 20px;
            cursor: pointer;
        }
        
        .menu {
            display: none;
            position: absolute;
            top: 50px;
            left: 0;
            background: rgba(0, 0, 0, 0.95);
            border-radius: 8px;
            padding: 8px;
            min-width: 180px;
        }
        
        .menu.show { display: block; }
        
        .menu a, .menu button {
            display: block;
            color: white;
            padding: 10px;
            text-decoration: none;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .menu a:hover, .menu button:hover {
            background: rgba(139, 92, 246, 0.3);
        }
        
        .divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <iframe id="stremio" src="https://web.stremio.com"></iframe>
    
    <div class="tools">
        <button class="tools-btn" onclick="toggleMenu()">⚡</button>
        <div class="menu" id="menu">
            <a href="https://torrentio.strem.fun" target="_blank">Add Torrentio</a>
            <a href="https://cyberflix.elfhosted.com" target="_blank">Add Cyberflix</a>
            <div class="divider"></div>
            <button onclick="setPlayer('vlc')">🟠 VLC Player</button>
            <button onclick="setPlayer('infuse')">🔥 Infuse Player</button>
            <button onclick="setPlayer('web')">🌐 Web Player</button>
        </div>
    </div>
    
    <script>
        function toggleMenu() {
            document.getElementById('menu').classList.toggle('show');
        }
        
        function setPlayer(p) {
            localStorage.setItem('player', p);
            alert('Default player: ' + p.toUpperCase());
            toggleMenu();
        }
        
        // Close menu on outside click
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.tools')) {
                document.getElementById('menu').classList.remove('show');
            }
        });
        
        // Check for videos
        setInterval(function() {
            try {
                const frame = document.getElementById('stremio').contentWindow;
                const videos = frame.document.querySelectorAll('video');
                videos.forEach(function(v) {
                    if (v.src && !v.dataset.checked) {
                        v.dataset.checked = 'true';
                        const player = localStorage.getItem('player');
                        if (player === 'vlc' && confirm('Open in VLC?')) {
                            window.location = 'vlc-x-callback://x-callback-url/stream?url=' + encodeURIComponent(v.src);
                        }
                    }
                });
            } catch(e) {
                // Cross-origin, ignore
            }
        }, 3000);
    </script>
</body>
</html>
    `);
});

// Explicit server start
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server is running on port ' + PORT);
});