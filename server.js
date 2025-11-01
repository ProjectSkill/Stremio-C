// COMPLETE STREMIO CUSTOM SERVER
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for Stremio
app.use(cors());

// STREMIO WEB PLAYER WITH EXTERNAL PLAYER BUTTON
const STREMIO_WEB_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Custom Stremio</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; background: #0c0e15; color: white; font-family: Arial; }
        .container { padding: 20px; }
        .player-btn { 
            background: #7B5BF2; 
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 5px; 
            font-size: 18px; 
            cursor: pointer; 
            margin: 10px;
        }
        .player-btn:hover { background: #6B4BE2; }
        iframe { width: 100%; height: 600px; border: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Custom Stremio Player</h1>

        <!-- Show your server URL -->
        <p>Add‑on URL: <code>https://stremio-c.onrender.com</code></p>
        
        <!-- STREMIO WEB EMBED -->
        <iframe id="stremio-frame" src="https://web.stremio.com"></iframe>
        
        <!-- EXTERNAL PLAYER BUTTONS -->
        <div style="margin-top: 20px;">
            <button class="player-btn" onclick="openInVLC()">📺 Open in VLC</button>
            <button class="player-btn" onclick="openInMPV()">🎮 Open in MPV</button>
            <button class="player-btn" onclick="copyStreamLink()">📋 Copy Stream Link</button>
        </div>
        
        <!-- PASTE YOUR STREAM URL HERE -->
        <input type="text" id="stream-url" placeholder="Paste stream URL here" 
               style="width: 80%; padding: 10px; margin: 10px 0; background: #1a1d29; color: white; border: 1px solid #7B5BF2;">
    </div>

    <script>
        function openInVLC() {
            const url = document.getElementById('stream-url').value || prompt('Enter stream URL:');
            if(url) window.open('vlc://' + url);
        }
        
        function openInMPV() {
            const url = document.getElementById('stream-url').value || prompt('Enter stream URL:');
            if(url) window.open('mpv://' + url);
        }
        
        function copyStreamLink() {
            const url = document.getElementById('stream-url').value || prompt('Enter stream URL to copy:');
            if(url) {
                navigator.clipboard.writeText(url);
                alert('Stream link copied!');
            }
        }
        
        window.addEventListener('message', function(e) {
            if(e.data && e.data.includes('http')) {
                document.getElementById('stream-url').value = e.data;
            }
        });
    </script>
</body>
</html>
`;

// MAIN ROUTE - SERVES THE CUSTOM STREMIO
app.get('/', (req, res) => {
    res.send(STREMIO_WEB_HTML);
});

// ADDON MANIFEST (for custom addons)
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    id: 'custom.stremio',
    version: '1.0.0',
    name: 'Custom Stremio with External Players',
    description: 'A custom Stremio server with external player support',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: []
  });
});

// HEALTHCHECK (optional, for Render sanity)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
    🎉 STREMIO CUSTOM IS RUNNING!
    📍 Local: http://localhost:${PORT}
    🔒 HTTPS is automatic on Render
    📺 External players ready!
  `);
});