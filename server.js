const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const httpProxy = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

// Start Stremio Server in background
const STREMIO_PORT = 11470;
const startStremioServer = () => {
    // Download and run Stremio server
    exec(`npx -y stremio-server-node --port=${STREMIO_PORT}`, (error, stdout, stderr) => {
        if (error) console.log('Stremio server error:', error);
        console.log('Stremio server output:', stdout);
    });
};

// Start server on app launch
startStremioServer();

// Wait for server to be ready
setTimeout(() => {
    console.log('Stremio server should be running on', STREMIO_PORT);
}, 5000);

// Proxy all Stremio traffic
app.use('/stremio', httpProxy.createProxyMiddleware({
    target: `http://localhost:${STREMIO_PORT}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/stremio': '' }
}));

// Main UI with working controls
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stremio</title>
    <style>
        * { margin: 0; padding: 0; }
        body { background: #0f0f14; font-family: system-ui; }
        
        iframe {
            width: 100vw;
            height: 100vh;
            border: none;
        }
        
        #toggle {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
            background: rgba(0,0,0,0.8);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 8px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
        }
        
        #controls {
            position: fixed;
            top: 50px;
            left: 10px;
            z-index: 9998;
            background: rgba(0,0,0,0.95);
            border-radius: 8px;
            padding: 10px;
            display: none;
        }
        
        #controls.show { display: block; }
        
        .btn {
            display: block;
            background: none;
            border: none;
            color: white;
            padding: 8px;
            text-align: left;
            cursor: pointer;
            width: 100%;
        }
        
        .btn:hover { background: rgba(139,92,246,0.3); }
    </style>
</head>
<body>
    <iframe src="/stremio/"></iframe>
    
    <button id="toggle" onclick="toggleControls()">OFF</button>
    
    <div id="controls">
        <button class="btn" onclick="window.open('https://torrentio.strem.fun','_blank')">+ Torrentio</button>
        <button class="btn" onclick="window.open('https://cyberflix.elfhosted.com','_blank')">+ Cyberflix</button>
        <hr style="border:none;border-top:1px solid #333;margin:5px 0">
        <button class="btn" onclick="openPlayer('vlc')">VLC</button>
        <button class="btn" onclick="openPlayer('infuse')">Infuse</button>
    </div>
    
    <script>
        let controlsVisible = false;
        
        function toggleControls() {
            controlsVisible = !controlsVisible;
            document.getElementById('controls').className = controlsVisible ? 'show' : '';
            document.getElementById('toggle').innerText = controlsVisible ? 'ON' : 'OFF';
        }
        
        function openPlayer(type) {
            // Get current stream from Stremio
            fetch('/stremio/api/current-stream')
                .then(r => r.json())
                .then(data => {
                    if (data.url) {
                        const urls = {
                            vlc: 'vlc://x-callback-url/stream?url=' + encodeURIComponent(data.url),
                            infuse: 'infuse://x-callback-url/play?url=' + encodeURIComponent(data.url)
                        };
                        window.location = urls[type];
                    } else {
                        alert('No stream playing');
                    }
                });
        }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server on port', PORT);
});