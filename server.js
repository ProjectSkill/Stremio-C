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

// Custom HTML with injected const getCustomHTML = () => `
const getCustomHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Stremio Web - Community Edition</title>
    <link rel="stylesheet" href="/glass-theme.css">
    <style>
        * {
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .addon-btn {
            background: rgba(123, 63, 242, 0.8);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        
        .addon-list {
            display: none;
            position: fixed;
            top: 60px;
            right: 10px;
            width: 90vw;
            max-width: 350px;
            max-height: 70vh;
            background: rgba(20, 20, 30, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px;
            border-radius: 12px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        .addon-item {
            padding: 12px;
            margin: 8px 0;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            cursor: pointer;
            color: white;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .addon-item:hover, .addon-item:active {
            background: rgba(123, 63, 242, 0.3);
            transform: scale(0.98);
        }
        
        .addon-item strong {
            display: block;
            margin-bottom: 4px;
            font-size: 15px;
        }
        
        .addon-item small {
            opacity: 0.8;
            font-size: 12px;
            line-height: 1.3;
        }
        
        @media (max-width: 768px) {
            .addon-manager {
                top: 5px;
                right: 5px;
                padding: 6px;
            }
            
            .addon-btn {
                padding: 10px 14px;
                font-size: 13px;
            }
            
            .addon-list {
                top: 50px;
                right: 5px;
                left: 5px;
                width: auto;
                max-width: none;
                max-height: 60vh;
                padding: 10px;
            }
            
            .addon-item {
                padding: 10px;
                margin: 6px 0;
                font-size: 13px;
            }
            
            .addon-item strong {
                font-size: 14px;
            }
            
            .addon-item small {
                font-size: 11px;
            }
        }
        
        .addon-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .addon-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }
        
        .addon-list::-webkit-scrollbar-thumb {
            background: rgba(123, 63, 242, 0.5);
            border-radius: 3px;
        }
        
        .close-addons {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div id="stremio-container">
        <iframe id="stremio-frame" src="${STREMIO_WEB_URL}" allow="fullscreen"></iframe>
    </div>
    
    <div class="addon-manager">
        <button class="addon-btn" onclick="toggleAddons()">+ Addons</button>
        <div id="addon-list" class="addon-list">
            <button class="close-addons" onclick="closeAddons()">×</button>
            <div id="addon-content"></div>
        </div>
    </div>

    <script>
        const communityAddons = ${JSON.stringify(COMMUNITY_ADDONS)};
        
        function toggleAddons() {
            const list = document.getElementById('addon-list');
            if (list.style.display === 'block') {
                closeAddons();
            } else {
                list.style.display = 'block';
                loadAddons();
            }
        }
        
        function closeAddons() {
            document.getElementById('addon-list').style.display = 'none';
        }
        
        document.addEventListener('click', function(event) {
            const addonManager = document.querySelector('.addon-manager');
            if (!addonManager.contains(event.target)) {
                closeAddons();
            }
        });
        
        async function loadAddons() {
            const content = document.getElementById('addon-content');
            content.innerHTML = '<div style="color: white; text-align: center;">Loading addons...</div>';
            
            let html = '';
            for (const addon of communityAddons) {
                try {
                    const response = await fetch('/api/addon-info?url=' + encodeURIComponent(addon));
                    const data = await response.json();
                    const name = data.name || 'Unknown Addon';
                    const desc = data.description || addon.split('/')[2] || 'Click to install';
                    html += '<div class="addon-item" onclick="installAddon(\\'' + addon + '\\')">' +
                           '<strong>' + name + '</strong>' +
                           '<small>' + desc + '</small>' +
                           '</div>';
                } catch (e) {
                    const fallbackName = addon.split('/')[2] || 'Addon';
                    html += '<div class="addon-item" onclick="installAddon(\\'' + addon + '\\')">' +
                           '<strong>' + fallbackName + '</strong>' +
                           '<small>Click to install</small>' +
                           '</div>';
                }
            }
            content.innerHTML = html;
        }
        
        function installAddon(addonUrl) {
            const name = addonUrl.split('/')[2] || 'addon';
            alert('Opening addon: ' + name);
            window.open(addonUrl, '_blank');
            closeAddons();
        }
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
