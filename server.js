// ===================================================================
// STREMIO LIGHTWEIGHT BACKEND - OPTIMIZED FOR iPHONE + RENDER
// ===================================================================
// Purpose: Minimal Stremio addon that fetches streams and provides
// a mobile-first UI for easy stream copying and player launching.
// Architecture: Single-file Express server with inline HTML/CSS/JS
// ===================================================================

// REVIEWER NOTE: Fixed smart quotes on 'express' and 'node-fetch'.
// 'node-fetch' is required for making HTTP requests from the backend.
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// ===================================================================
// CONFIGURATION
// ===================================================================
// These are popular Stremio community addons that provide streams.
// You can modify this list based on your preferred sources.
const STREAM_SOURCES = [
    'https://torrentio.strem.fun',
    'https://v3-cinemeta.strem.io', // REVIEWER NOTE: Cinemeta provides metadata, not typically streams. Keeping it as per original code.
];

// ===================================================================
// STREMIO ADDON MANIFEST
// ===================================================================
// This manifest makes the backend compatible with Stremio clients.
// The “stream” resource tells Stremio this addon provides streams.
app.get('/manifest.json', (req, res) => {
    res.json({
        id: 'com.lightweight.stremio',
        version: '1.0.0',
        name: 'Lightweight Stremio',
        description: 'Minimal iPhone-optimized Stremio addon',
        resources: ['stream'],
        types: ['movie', 'series'],
        idPrefixes: ['tt'],
        catalogs: [],
    });
});

// ===================================================================
// STREAM FETCHING ENDPOINT
// ===================================================================
// Route: /stream/:type/:id
// Purpose: Fetches streams from configured sources and returns them.
// Example: /stream/movie/tt0111161 fetches Shawshank Redemption streams
app.get('/stream/:type/:id', async (req, res) => {
    const { type, id } = req.params;

    try {
        // Fetch from all configured stream sources in parallel
        const streamPromises = STREAM_SOURCES.map((source) =>
            fetch(`${source}/stream/${type}/${id}.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );

        const results = await Promise.all(streamPromises);

        // Combine all streams from all sources
        const allStreams = results
            .filter((r) => r && r.streams)
            .flatMap((r) => r.streams)
            .filter((s) => s.url || s.infoHash); // Only valid streams

        res.json({ streams: allStreams });
    } catch (error) {
        console.error('Stream fetch error:', error);
        res.status(500).json({ streams: [] });
    }
});

// ===================================================================
// SIMPLIFIED STREAM ENDPOINT FOR FRONTEND
// ===================================================================
// Route: /allstreams/:id
// Purpose: Frontend-friendly endpoint that assumes “movie” type.
app.get('/allstreams/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const streamPromises = STREAM_SOURCES.map((source) =>
            fetch(`${source}/stream/movie/${id}.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );

        // REVIEWER NOTE: Removed '```' artifacts from the code block.
        const results = await Promise.all(streamPromises);

        // Transform streams into simpler format for frontend
        const allStreams = results
            .filter((r) => r && r.streams)
            .flatMap((r) => r.streams)
            .filter((s) => s.url)
            .map((s) => ({
                title: s.title || s.name || 'Unknown Stream',
                url: s.url,
                quality: extractQuality(s.title || s.name || ''),
            }))
            .slice(0, 50); // Limit to 50 streams for performance

        res.json(allStreams);
    } catch (error) {
        console.error('All streams fetch error:', error);
        res.status(500).json([]);
    }
});

// ===================================================================
// QUALITY EXTRACTION HELPER
// ===================================================================
// Purpose: Parse stream title to extract quality (480p, 720p, 1080p, etc)
function extractQuality(title) {
    const qualityMatch = title.match(/(\d{3,4}p)/i);
    return qualityMatch ? qualityMatch[1] : 'SD';
}

// ===================================================================
// MAIN WEB UI
// ===================================================================
// Route: /
// Purpose: Serves the complete iPhone-optimized web interface
app.get('/', (req, res) => {
    // REVIEWER NOTE: This is a huge template literal. I've corrected syntax inside it.
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Stremio Lite</title>
  <style>
    /* ============================================= */
    /* GLOBAL STYLES - iOS OPTIMIZED */
    /* ============================================= */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent; /* Remove tap highlight on iOS */
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: white;
      padding: 0;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%; /* Prevent iOS zoom on input focus */
    }
    /* ============================================= */
    /* HEADER - Contains hamburger menu and title */
    /* ============================================= */
    .header {
      display: flex;
      align-items: center;
      padding: 20px;
      background: rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .menu-btn {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      margin-right: 15px;
      transition: background 0.3s;
    }
    .menu-btn:active { background: rgba(255,255,255,0.2); }
    .menu-btn span {
      width: 20px;
      height: 2px;
      background: white;
      border-radius: 2px;
      transition: transform 0.3s;
    }
    .menu-btn.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .menu-btn.active span:nth-child(2) { opacity: 0; }
    .menu-btn.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
    }
    /* ============================================= */
    /* SIDE MENU - Hamburger menu content */
    /* ============================================= */
    .side-menu {
      position: fixed;
      left: -280px;
      top: 0;
      width: 280px;
      height: 100vh;
      background: rgba(0,0,0,0.95);
      backdrop-filter: blur(20px);
      z-index: 200;
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      padding: 80px 20px 20px 20px;
    }
    .side-menu.open { left: 0; }
    .menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 150;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .menu-overlay.active {
      opacity: 1;
      pointer-events: all;
    }
    .menu-section { margin-bottom: 30px; }
    .menu-section h3 {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .player-option {
      background: rgba(255,255,255,0.1);
      border: 2px solid transparent;
      padding: 15px;
      border-radius: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .player-option:active { transform: scale(0.98); }
    .player-option.selected {
      border-color: #667eea;
      background: rgba(102,126,234,0.2);
    }
    .player-option .checkmark {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    .player-option.selected .checkmark {
      background: #667eea;
      border-color: #667eea;
    }
    /* ============================================= */
    /* MAIN CONTAINER - Content area */
    /* ============================================= */
    .container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .input-section {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 20px;
    }
    .input-group {
      display: flex;
      gap: 10px;
    }
    #movieId {
      flex: 1;
      padding: 15px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      background: rgba(0,0,0,0.3);
      color: white;
      font-size: 16px;
      outline: none;
      transition: border-color 0.3s;
    }
    #movieId:focus { border-color: rgba(255,255,255,0.5); }
    #movieId::placeholder { color: rgba(255,255,255,0.5); }
    .btn {
      padding: 15px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-size: 16px;
    }
    .btn:active { transform: scale(0.95); }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* ============================================= */
    /* LOADING INDICATOR - Small box during fetch */
    /* ============================================= */
    .loading {
      display: none;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(10px);
      padding: 20px 30px;
      border-radius: 16px;
      text-align: center;
      margin: 20px auto;
      width: fit-content;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    .loading.show {
      display: block;
      animation: fadeIn 0.3s;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      margin: 0 auto 15px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* ============================================= */
    /* STREAMS LIST - Clickable stream items */
    /* ============================================= */
    #streamsList {
      display: grid;
      gap: 12px;
    }
    .stream-item {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 18px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid transparent;
      position: relative;
      overflow: hidden;
    }
    .stream-item:active {
      transform: scale(0.98);
      background: rgba(255,255,255,0.15);
    }
    .stream-item.copied {
      border-color: #10b981;
      background: rgba(16,185,129,0.2);
    }
    .stream-item .copy-indicator {
      position: absolute;
      top: 50%;
      right: 15px;
      transform: translateY(-50%) scale(0);
      background: #10b981;
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      transition: transform 0.3s;
      pointer-events: none;
    }
    .stream-item.copied .copy-indicator { transform: translateY(-50%) scale(1); }
    .stream-title {
      font-weight: 600;
      margin-bottom: 5px;
      padding-right: 80px;
    }
    .stream-quality {
      display: inline-block;
      background: rgba(0,0,0,0.3);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: rgba(255,255,255,0.8);
    }
    /* ============================================= */
    /* PLAYER PICKER MODAL - Appears after copy */
    /* ============================================= */
    .player-picker {
      position: fixed;
      bottom: -100%;
      left: 0;
      width: 100%;
      background: rgba(0,0,0,0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px 20px 0 0;
      padding: 30px 20px;
      z-index: 300;
      transition: bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
    }
    .player-picker.show { bottom: 0; }
    .player-picker h3 {
      margin-bottom: 20px;
      font-size: 20px;
      text-align: center;
    }
    .player-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .player-btn {
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: white;
    }
    .player-btn:active {
      transform: scale(0.95);
      background: rgba(255,255,255,0.2);
    }
    .cancel-btn {
      width: 100%;
      padding: 15px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 16px;
      cursor: pointer;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255,255,255,0.6);
    }
    .empty-state h3 {
      font-size: 20px;
      margin-bottom: 10px;
    }
    /* ============================================= */
    /* RESPONSIVE DESIGN - Desktop adaptations */
    /* ============================================= */
    @media (min-width: 768px) {
      .player-grid { grid-template-columns: repeat(3, 1fr); }
      .stream-item:hover {
        background: rgba(255,255,255,0.15);
        transform: translateY(-2px);
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <button class="menu-btn" id="menuBtn">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <h1>🎬 Stremio Lite</h1>
  </div>

  <div class="menu-overlay" id="menuOverlay"></div>
  <div class="side-menu" id="sideMenu">
    <div class="menu-section">
      <h3>Default Player</h3>
      <div class="player-option selected" data-player="infuse">
        <span>📱 Infuse</span>
        <div class="checkmark">✓</div>
      </div>
      <div class="player-option" data-player="nplayer">
        <span>🎥 nPlayer</span>
        <div class="checkmark"></div>
      </div>
      <div class="player-option" data-player="outplayer">
        <span>▶️ OutPlayer</span>
        <div class="checkmark"></div>
      </div>
      <div class="player-option" data-player="vlc">
        <span>🎵 VLC</span>
        <div class="checkmark"></div>
      </div>
      <div class="player-option" data-player="browser">
        <span>🌐 Browser</span>
        <div class="checkmark"></div>
      </div>
    </div>
    <div class="menu-section">
      <h3>About</h3>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
        Lightweight Stremio backend optimized for iPhone. 
        Paste IMDb IDs in the URL bar or use the input field.
      </p>
    </div>
  </div>

  <div class="container">
    <div class="input-section">
      <div class="input-group">
        <input 
          type="text" 
          id="movieId" 
          placeholder="Enter IMDb ID (e.g., tt0111161)"
          autocomplete="off"
          autocapitalize="off"
        >
        <button class="btn" id="fetchBtn">Fetch</button>
      </div>
    </div>

    <div class="loading" id="loading">
      <div class="spinner"></div>
      <div>Fetching streams...</div>
    </div>

    <div id="streamsList"></div>
  </div>

  <div class="player-picker" id="playerPicker">
    <h3>Choose Player</h3>
    <div class="player-grid">
      <button class="player-btn" data-player="infuse">📱 Infuse</button>
      <button class="player-btn" data-player="nplayer">🎥 nPlayer</button>
      <button class="player-btn" data-player="outplayer">▶️ OutPlayer</button>
      <button class="player-btn" data-player="vlc">🎵 VLC</button>
      <button class="player-btn" data-player="browser">🌐 Browser</button>
    </div>
    <button class="cancel-btn" id="cancelPicker">Cancel</button>
  </div>

  <script>
    // =========================================================
    // STATE MANAGEMENT
    // =========================================================
    let state = {
      copiedUrl: null,
      defaultPlayer: 'infuse',
      currentStreams: []
    };

    // =========================================================
    // DOM ELEMENT REFERENCES
    // =========================================================
    const elements = {
      menuBtn: document.getElementById('menuBtn'),
      sideMenu: document.getElementById('sideMenu'),
      menuOverlay: document.getElementById('menuOverlay'),
      movieId: document.getElementById('movieId'),
      fetchBtn: document.getElementById('fetchBtn'),
      loading: document.getElementById('loading'),
      streamsList: document.getElementById('streamsList'),
      playerPicker: document.getElementById('playerPicker'),
      cancelPicker: document.getElementById('cancelPicker')
    };

    // =========================================================
    // HAMBURGER MENU FUNCTIONALITY
    // =========================================================
    elements.menuBtn.addEventListener('click', () => {
      elements.menuBtn.classList.toggle('active');
      elements.sideMenu.classList.toggle('open');
      elements.menuOverlay.classList.toggle('active');
    });

    elements.menuOverlay.addEventListener('click', closeMenu);

    function closeMenu() {
      elements.menuBtn.classList.remove('active');
      elements.sideMenu.classList.remove('open');
      elements.menuOverlay.classList.remove('active');
    }

    // =========================================================
    // PLAYER SELECTION IN MENU
    // =========================================================
    document.querySelectorAll('.player-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.player-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        state.defaultPlayer = this.dataset.player;
      });
    });

    // =========================================================
    // URL PARSING - HEADLESS NAVIGATION
    // =========================================================
    function getIdFromUrl() {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    }

    function updateUrl(id) {
      // REVIEWER NOTE: Fixed a critical bug here. You cannot use a template literal `${id}`
      // inside another template literal without escaping. Using simple string concatenation is safer and clearer.
      const newUrl = id ? ('?id=' + id) : window.location.pathname;
      window.history.pushState({}, '', newUrl);
    }

    // =========================================================
    // STREAM FETCHING
    // =========================================================
    async function fetchStreams(id) {
      if (!id || !id.startsWith('tt')) {
        alert('Please enter a valid IMDb ID (e.g., tt0111161)');
        return;
      }
      elements.loading.classList.add('show');
      elements.streamsList.innerHTML = '';
      elements.fetchBtn.disabled = true;

      try {
        const response = await fetch('/allstreams/' + id);
        const streams = await response.json();
        state.currentStreams = streams;
        elements.loading.classList.remove('show');
        elements.fetchBtn.disabled = false;
        updateUrl(id);
        if (streams.length > 0) {
          displayStreams(streams);
        } else {
          showEmptyState();
        }
      } catch (error) {
        console.error('Fetch error:', error);
        elements.loading.classList.remove('show');
        elements.fetchBtn.disabled = false;
        alert('Failed to fetch streams. Please try again.');
      }
    }

    // =========================================================
    // STREAM DISPLAY
    // =========================================================
    function displayStreams(streams) {
      // REVIEWER NOTE: Fixed a critical syntax error here. The `${...}` placeholders inside this template
      // literal must be "escaped" with a backslash `\\` so they are treated as plain text by the outer
      // template literal, and then interpreted by the client's browser.
      elements.streamsList.innerHTML = streams.map((stream, index) => \`
        <div class="stream-item" data-url="\${stream.url}" data-index="\${index}">
          <div class="stream-title">\${stream.title}</div>
          <span class="stream-quality">\${stream.quality}</span>
          <div class="copy-indicator">Copied!</div>
        </div>
      \`).join('');

      document.querySelectorAll('.stream-item').forEach(item => {
        item.addEventListener('click', handleStreamClick);
      });
    }

    function showEmptyState() {
      elements.streamsList.innerHTML = \`
        <div class="empty-state">
          <h3>No streams found</h3>
          <p>Try a different movie ID</p>
        </div>
      \`;
    }

    // =========================================================
    // STREAM CLICK HANDLER - COPY URL
    // =========================================================
    async function handleStreamClick(e) {
      const item = e.currentTarget;
      const url = item.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        state.copiedUrl = url;
        item.classList.add('copied');
        setTimeout(() => item.classList.remove('copied'), 2000);
        setTimeout(() => {
          elements.playerPicker.classList.add('show');
        }, 300);
      } catch (error) {
        console.error('Clipboard API failed, using fallback:', error);
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        state.copiedUrl = url;
        item.classList.add('copied');
        setTimeout(() => item.classList.remove('copied'), 2000);
        setTimeout(() => {
          elements.playerPicker.classList.add('show');
        }, 300);
      }
    }

    // =========================================================
    // PLAYER PICKER FUNCTIONALITY
    // =========================================================
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const player = this.dataset.player;
        openInPlayer(player, state.copiedUrl);
        closePlayerPicker();
      });
    });

    elements.cancelPicker.addEventListener('click', closePlayerPicker);

    function closePlayerPicker() {
      elements.playerPicker.classList.remove('show');
    }

    // =========================================================
    // PLAYER URL SCHEMES
    // =========================================================
    function openInPlayer(player, url) {
      if (!url) return;
      let playerUrl;
      switch(player) {
        case 'infuse':
          playerUrl = \`infuse://x-callback-url/play?url=\${encodeURIComponent(url)}\`;
          break;
        case 'nplayer':
          playerUrl = \`nplayer-\${url}\`;
          break;
        case 'outplayer':
          playerUrl = \`outplayer://\${encodeURIComponent(url)}\`;
          break;
        case 'vlc':
          playerUrl = \`vlc-x-callback://x-callback-url/stream?url=\${encodeURIComponent(url)}\`;
          break;
        case 'browser':
          window.open(url, '_blank');
          return;
        default:
          playerUrl = url;
      }
      window.location.href = playerUrl;
      setTimeout(() => {
        const appInstalled = document.visibilityState === 'hidden';
        if (!appInstalled && player !== 'browser') {
          if (confirm(\`\${player} doesn't seem to be installed. Open in browser instead?\`)) {
            window.open(url, '_blank');
          }
        }
      }, 2000);
    }

    // =========================================================
    // EVENT LISTENERS - FETCH BUTTON & ENTER KEY
    // =========================================================
    elements.fetchBtn.addEventListener('click', () => {
      const id = elements.movieId.value.trim();
      if (id) fetchStreams(id);
    });

    elements.movieId.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const id = elements.movieId.value.trim();
        if (id) fetchStreams(id);
      }
    });

    // =========================================================
    // AUTO-FETCH ON PAGE LOAD (HEADLESS MODE)
    // =========================================================
    window.addEventListener('DOMContentLoaded', () => {
      const urlId = getIdFromUrl();
      if (urlId) {
        elements.movieId.value = urlId;
        fetchStreams(urlId);
      }
    });

    // =========================================================
    // PWA-LIKE FEATURES (OPTIONAL ENHANCEMENTS)
    // =========================================================
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      const touchY = e.touches[0].clientY;
      const touchDiff = touchY - touchStartY;
      if (touchDiff > 0 && window.scrollY === 0) {
        e.preventDefault();
      }
    }, { passive: false });
  </script>
</body>
</html>
  `);
});

// ===================================================================
// HEALTH CHECK ENDPOINT
// ===================================================================
// Route: /health
// Purpose: Render uses this to check if service is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ===================================================================
// 404 HANDLER
// ===================================================================
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// ===================================================================
// SERVER STARTUP
// ===================================================================
app.listen(PORT, () => {
    console.log(`🚀 Stremio Lite running on port ${PORT}`);
    console.log(`📱 Access at: http://localhost:${PORT}`);
    console.log(`🎬 Example: http://localhost:${PORT}?id=tt0111161`);
});