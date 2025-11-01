FROM node:18-alpine

WORKDIR /app

# Create package.json inline
RUN echo '{"name":"stremio-addon","version":"1.0.0","dependencies":{"express":"^4.18.0","cors":"^2.8.5"}}' > package.json

# Install dependencies
RUN npm install

# Create complete server inline
RUN cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/manifest.json', (req, res) => {
    res.json({
        id: 'com.stremio.imvdb',
        version: '1.0.0',
        name: 'IMVDb Music Videos',
        description: 'Stream music videos from IMVDb',
        types: ['movie'],
        catalogs: [{
            type: 'movie',
            id: 'imvdb-videos',
            name: 'Music Videos'
        }],
        resources: ['stream'],
        idPrefixes: ['imvdb:']
    });
});

app.get('/stream/:type/:id.json', (req, res) => {
    res.json({ streams: [] });
});

app.get('/', (req, res) => {
    res.send('Addon is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
EOF

EXPOSE 3000
CMD ["node", "server.js"]