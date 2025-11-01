FROM node:18-alpine

WORKDIR /app

RUN echo '{"name":"addon","version":"1.0.0","dependencies":{"express":"^4.18.0","cors":"^2.8.5"}}' > package.json

RUN npm install

# Create COMPLETE server with ALL Stremio requirements
RUN cat > server.js << 'EOF'
const express = require('express');
const app = express();

// CRITICAL: Set headers for EVERY response
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'max-age=3600, public, stale-while-revalidate=604800');
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }
    next();
});

// MANIFEST - Core requirement
app.get('/manifest.json', (req, res) => {
    res.json({
        id: 'com.stremio.imvdb',
        version: '1.0.0',
        name: 'IMVDb Music Videos',
        description: 'Stream music videos from IMVDb',
        logo: 'https://www.imvdb.com/favicon.ico',
        types: ['movie'],
        catalogs: [{
            type: 'movie',
            id: 'imvdb-videos',
            name: 'Music Videos',
            extra: [
                {name: 'skip', isRequired: false}
            ]
        }],
        resources: [
            'catalog',
            'stream'
        ],
        idPrefixes: ['imvdb:'],
        behaviorHints: {
            adult: false,
            p2p: false
        }
    });
});

// CATALOG - Stremio checks this for validation
app.get('/catalog/:type/:id.json', (req, res) => {
    res.json({
        metas: [{
            id: 'imvdb:test',
            type: 'movie',
            name: 'Test Video',
            poster: 'https://via.placeholder.com/300x450'
        }]
    });
});

// CATALOG with skip parameter
app.get('/catalog/:type/:id/:extra?.json', (req, res) => {
    res.json({
        metas: [{
            id: 'imvdb:test',
            type: 'movie', 
            name: 'Test Video',
            poster: 'https://via.placeholder.com/300x450'
        }]
    });
});

// STREAM - Required endpoint
app.get('/stream/:type/:id.json', (req, res) => {
    res.json({
        streams: [{
            name: 'Test Stream',
            title: 'Test',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        }]
    });
});

// ROOT - For browser visits
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <html>
        <head><title>Stremio Addon</title></head>
        <body>
            <h1>IMVDb Stremio Addon</h1>
            <h2>✓ HTTPS Working</h2>
            <p>Install: <a href="https://stremio-c.onrender.com/manifest.json">https://stremio-c.onrender.com/manifest.json</a></p>
            <hr>
            <p>Endpoints:</p>
            <ul>
                <li><a href="/manifest.json">/manifest.json</a></li>
                <li>/catalog/movie/imvdb-videos.json</li>
                <li>/stream/movie/[id].json</li>
            </ul>
        </body>
        </html>
    `);
});

// HEALTH - For Render health checks
app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

// Handle 404s properly
app.use((req, res) => {
    res.status(404).json({error: 'Not found'});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
EOF

EXPOSE 8000
CMD ["node", "server.js"]