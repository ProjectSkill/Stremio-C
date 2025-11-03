const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

// --- 1. The Backend: Stremio Addon Logic ---

const manifest = {
    id: 'com.stremio.pocket-launcher',
    version: '1.0.0',
    name: 'Pocket Launcher',
    description: 'A custom addon with a web UI to launch streams on mobile.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [] // The required property that was missing
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(function(args) {
    console.log("Stream requested for:", args.id);

    const streams = [
        {
            name: "Big Buck Bunny",
            title: "720p - Public Domain",
            url: "http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_30fps_normal.mp4"
        },
        {
            name: "Another Source",
            title: "480p - Placeholder",
            url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
        }
    ];

    return Promise.resolve({ streams: streams });
});


// --- 2. The Frontend: Express Web Server ---
const app = express();
app.use(express.static('public'));
app.use(getRouter(builder.getInterface()));


// --- 3. Start the Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log(`Server is running on http://localhost:${PORT}`);
});