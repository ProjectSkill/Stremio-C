app.get('/manifest.json', (req, res) => {
    // Bypass Express completely and use raw Node.js response
    const manifest = {
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
    };
    
    const json = JSON.stringify(manifest);
    const buffer = Buffer.from(json, 'utf8');
    
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': buffer.length,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
    });
    
    res.end(buffer);
});