const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

// --- 1. The Backend: Stremio Addon Logic ---
// Reasoning: This section defines the "contract" for our addon. Stremio will ask it for a manifest (its capabilities) and streams.

const manifest = {
    id: 'com.stremio.pocket-launcher',
    version: '1.0.0',
    name: 'Pocket Launcher',
    description: 'A custom addon with a web UI to launch streams on mobile.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const builder = new addonBuilder(manifest);

// The stream provider is the core logic. It's called when a user clicks on a movie in Stremio.
// For our web UI, we'll call this endpoint directly.
builder.defineStreamHandler(function(args) {
    console.log("Stream requested for:", args.id);

    // This is where you would normally scrape or find real stream links.
    // For this demonstration, we'll return a high-quality, public-domain video.
    // This proves the entire mechanism works from end-to-end.
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
// Reasoning: This section sets up a web server to serve our HTML, CSS, and JS files.
// It makes our backend accessible not just to Stremio, but to any web browser.

const app = express();

// This line is crucial. It tells Express to serve all files from the 'public' folder.
// This is how index.html, style.css, and script.js get to the user's browser.
app.use(express.static('public'));

// This mounts the Stremio addon routes (like /manifest.json) to our Express app.
app.use(getRouter(builder.getInterface()));

// --- 3. Start the Server ---
// Reasoning: This starts the server. It uses process.env.PORT for compatibility with hosting
// providers like Render, and defaults to 10000 for local/Docker testing.

const PORT = process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log(`Server is running on http://localhost:${PORT}`);
});