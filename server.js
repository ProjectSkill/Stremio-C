const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// Community addons configuration
const COMMUNITY_ADDONS = [
  'https://torrentio.strem.fun/manifest.json',
  'https://stremio-jackett.gg.ax/manifest.json',
  'https://cyberflix.elfhosted.com/manifest.json',
  'https://annatar.elfhosted.com/manifest.json',
  'https://comet.elfhosted.com/manifest.json'
];

// Stremio Web configuration
const STREMIO_WEB_URL = 'https://web.stremio.com';
const STREMIO_API_URL = 'https://api.strem.io';

// Custom HTML with injected theme
const getCustomHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stremio Web - Community Edition</title>
    <link rel="stylesheet" href="/glass-theme.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
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
        .addon-manager {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
        }
        .addon-btn {
            background: #7B3FF2;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .addon-list {
            display: none;
            background: rgba(0, 0, 0, 0.9);
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            max-height: 400px;
            overflow-y: auto;
        }
        .addon-item {
            padding: 8px;
            margin: 5px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            cursor: pointer;
            color: white;
        }
        .addon-item:hover {
            background: rgba(123, 63, 242, 0.3);
        }
    </style>
</head>
<body>
    <div id="stremio-container">
        <iframe id="stremio-frame" src="${STREMIO_WEB_URL}" allow="fullscreen"></iframe>
    </div>
    
    <div class="addon-manager">
        <button class="addon-btn" onclick="toggleAddons()">Community Addons</button>
        <div id="addon-list" class="addon-list"></div>
    </div>

    <script>
        const communityAddons = ${JSON.stringify(COMMUNITY_ADDONS)};
        
        function toggleAddons() {
            const list = document.getElementById('addon-list');
            if (list.style.display === 'block') {
                list.style.display = 'none';
            } else {
                list.style.display = 'block';
                loadAddons();
            }
        }
        
        async function loadAddons() {
            const list = document.getElementById('addon-list');
            list.innerHTML = '<div style="color: white;">Loading addons...</div>';
            
            let html = '';
            for (const addon of communityAddons) {
                try {
                    const response = await fetch('/api/addon-info?url=' + encodeURIComponent(addon));
                    const data = await response.json();
                    html += \`
                        <div class="addon-item" onclick="installAddon('\${addon}')">
                            <strong>\${data.name || 'Unknown Addon'}</strong><br>
                            <small>\${data.description || addon}</small>
                        </div>
                    \`;
                } catch (e) {
                    html += \`<div class="addon-item" onclick="installAddon('\${addon}')">\${addon}</div>\`;
                }
            }
            list.innerHTML = html;
        }
        
        function installAddon(addonUrl) {
            // Send message to iframe to install addon
            const frame = document.getElementById('stremio-frame');
            frame.contentWindow.postMessage({
                type: 'INSTALL_ADDON',
                url: addonUrl
            }, '*');
            
            // Alternative: Direct API call
            fetch('/api/install-addon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addonUrl })
            }).then(response => response.json())
              .then(data => {
                  alert(data.message || 'Addon installed!');
              });
        }
        
        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            console.log('Message from Stremio:', event.data);
        });
        
        // Apply theme on load
        window.addEventListener('load', () => {
            setTimeout(() => {
                const frame = document.getElementById('stremio-frame');
                try {
                    const frameDoc = frame.contentDocument || frame.contentWindow.document;
                    const link = frameDoc.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/glass-theme.css';
                    frameDoc.head.appendChild(link);
                } catch(e) {
                    console.log('Could not inject theme directly due to CORS');
                }
            }, 2000);
        });
    </script>
</body>
</html>
`;

// Main route
app.get('/', (req, res) => {
    res.send(getCustomHTML());
});

// Proxy for Stremio Web
app.use('/stremio', createProxyMiddleware({
    target: STREMIO_WEB_URL,
    changeOrigin: true,
    pathRewrite: { '^/stremio': '' },
    onProxyRes: (proxyRes, req, res) => {
        // Inject custom headers
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    }
}));

// API endpoint for addon info
app.get('/api/addon-info', async (req, res) => {
    try {
        const { url } = req.query;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch addon info' });
    }
});

// API endpoint to install addon
app.post('/api/install-addon', async (req, res) => {
    try {
        const { addonUrl } = req.body;
        // Here you would integrate with Stremio's addon installation API
        // For now, we'll store it locally
        res.json({ 
            success: true, 
            message: `Addon ${addonUrl} queued for installation`,
            addonUrl 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to install addon' });
    }
});

// Proxy for community addons
app.use('/addon/:addonId', (req, res, next) => {
    const addonMap = {
        'torrentio': 'https://torrentio.strem.fun',
        'jackett': 'https://stremio-jackett.gg.ax',
        'cyberflix': 'https://cyberflix.elfhosted.com',
        'annatar': 'https://annatar.elfhosted.com',
        'comet': 'https://comet.elfhosted.com'
    };
    
    const target = addonMap[req.params.addonId];
    if (!target) {
        return res.status(404).json({ error: 'Addon not found' });
    }
    
    createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => path.replace(`/addon/${req.params.addonId}`, '')
    })(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});