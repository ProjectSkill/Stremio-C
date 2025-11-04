const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Stremio addon sources for aggregating streams
const STREAM_SOURCES = [
  'https://torrentio.strem.fun/sort=qualitysize|qualityfilter=480p,scr,cam/manifest.json',
  'https://torrentio.strem.fun/manifest.json'
];

// Core Stremio manifest
app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.json({
    id: 'org.stremio.lightweight',
    version: '1.0.0',
    name: 'Lightweight Stremio',
    description: 'Optimized Stremio backend for iPhone',
    logo: 'https://www.stremio.com/website/stremio-logo-small.png',
    resources: ['catalog', 'stream', 'meta'],
    types: ['movie', 'series'],
    catalogs: [
      {
        type: 'movie',
        id: 'lightweight_movies',
        name: 'Movies',
        extra: [{ name: 'skip', isRequired: false }]
      },
      {
        type: 'series', 
        id: 'lightweight_series',
        name: 'Series',
        extra: [{ name: 'skip', isRequired: false }]
      }
    ],
    idPrefixes: ['tt'],
    behaviorHints: {
      adult: false,
      p2p: false
    }
  });
});

// Catalog endpoint
app.get('/catalog/:type/:id/:extra?.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { type } = req.params;
  
  // Basic catalog response - can be expanded with real content
  res.json({
    metas: [
      {
        id: 'tt0816692',
        type: 'movie',
        name: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
      },
      {
        id: 'tt0468569',
        type: 'movie', 
        name: 'The Dark Knight',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
      }
    ]
  });
});

// Meta endpoint
app.get('/meta/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { type, id } = req.params;
  
  res.json({
    meta: {
      id: id,
      type: type,
      name: 'Movie',
      poster: 'https://image.tmdb.org/t/p/w500/placeholder.jpg'
    }
  });
});

// Stream aggregation endpoint
app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { type, id } = req.params;
  
  try {
    // Fetch from Torrentio
    const torrentioUrl = 'https://torrentio.strem.fun/stream/' + type + '/' + id + '.json';
    const response = await fetch(torrentioUrl);
    
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      res.json({ streams: [] });
    }
  } catch (error) {
    console.error('Stream fetch error:', error);
    res.json({ streams: [] });
  }
});

// Custom API endpoint for fetching all streams with details
app.get('/api/streams/:type/:id', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { type, id } = req.params;
  
  try {
    const torrentioUrl = 'https://torrentio.strem.fun/stream/' + type + '/' + id + '.json';
    const response = await fetch(torrentioUrl);
    
    if (response.ok) {
      const data = await response.json();
      const streams = data.streams || [];
      
      // Format streams for UI
      const formattedStreams = streams.map(stream => ({
        title: stream.title || stream.name || 'Unknown',
        url: stream.url || (stream.infoHash ? 'magnet:?xt=urn:btih:' + stream.infoHash : ''),
        quality: extractQuality(stream.title || stream.name || ''),
        size: extractSize(stream.title || stream.name || ''),
        seeders: stream.seeders || 0,
        type: stream.url ? 'direct' : 'torrent'
      })).filter(s => s.url);
      
      res.json({ streams: formattedStreams });
    } else {
      res.json({ streams: [] });
    }
  } catch (error) {
    console.error('API stream fetch error:', error);
    res.json({ streams: [] });
  }
});

function extractQuality(title) {
  const match = title.match(/(\d{3,4}p)/i);
  return match ? match[1] : 'SD';
}

function extractSize(title) {
  const match = title.match(/(\d+\.?\d*\s?[GM]B)/i);
  return match ? match[1] : '';
}

// Main UI with burger menu and player integration
app.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>Stremio Lightweight</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #fff;
      overflow-x: hidden;
      position: relative;
      min-height: 100vh;
    }
    
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
      padding: 15px 20px;
      display: flex;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      box-shadow: 0 2px 20px rgba(0,0,0,0.3);
    }
    
    .burger-menu {
      width: 35px;
      height: 35px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      margin-right: 15px;
      position: relative;
      z-index: 1002;
    }
    
    .burger-menu span {
      width: 25px;
      height: 3px;
      background: white;
      margin: 3px 0;
      transition: 0.3s;
      border-radius: 2px;
    }
    
    .burger-menu.active span:nth-child(1) {
      transform: rotate(45deg) translate(6px, 6px);
    }
    
    .burger-menu.active span:nth-child(2) {
      opacity: 0;
    }
    
    .burger-menu.active span:nth-child(3) {
      transform: rotate(-45deg) translate(6px, -6px);
    }
    
    .sidebar {
      position: fixed;
      top: 0;
      left: -300px;
      width: 280px;
      height: 100vh;
      background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
      transition: left 0.3s ease;
      z-index: 1001;
      padding: 80px 20px 20px;
      overflow-y: auto;
      box-shadow: 2px 0 20px rgba(0,0,0,0.5);
    }
    
    .sidebar.active {
      left: 0;
    }
    
    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
      z-index: 999;
    }
    
    .sidebar-overlay.active {
      opacity: 1;
      pointer-events: all;
    }
    
    .player-section {
      margin-bottom: 30px;
    }
    
    .player-section h3 {
      font-size: 14px;
      color: #999;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .player-option {
      display: flex;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    
    .player-option:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .player-option.active {
      background: rgba(124,58,237,0.2);
      border-color: #7c3aed;
    }
    
    .player-option .icon {
      width: 30px;
      height: 30px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .player-option .name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
    }
    
    .player-option .check {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #555;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    
    .player-option.active .check {
      background: #7c3aed;
      border-color: #7c3aed;
      color: white;
    }
    
    .main-content {
      padding: 80px 20px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .search-box {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
    }
    
    .search-input {
      width: 100%;
      padding: 15px;
      background: rgba(0,0,0,0.3);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: white;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #7c3aed;
    }
    
    .search-input::placeholder {
      color: rgba(255,255,255,0.4);
    }
    
    .search-btn {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
      transition: transform 0.2s;
    }
    
    .search-btn:hover {
      transform: translateY(-2px);
    }
    
    .search-btn:active {
      transform: translateY(0);
    }
    
    .loading {
      display: none;
      text-align: center;
      padding: 40px;
    }
    
    .loading.active {
      display: block;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .streams-container {
      display: grid;
      gap: 15px;
    }
    
    .stream-item {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      position: relative;
      overflow: hidden;
    }
    
    .stream-item:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-2px);
    }
    
    .stream-item.copied {
      border-color: #10b981;
      background: rgba(16,185,129,0.1);
    }
    
    .stream-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #fff;
    }
    
    .stream-info {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .stream-badge {
      display: inline-block;
      padding: 4px 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      font-size: 11px;
      color: rgba(255,255,255,0.8);
    }
    
    .stream-badge.quality {
      background: rgba(124,58,237,0.2);
      color: #a78bfa;
    }
    
    .stream-badge.size {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
    }
    
    .stream-badge.seeders {
      background: rgba(34,197,94,0.2);
      color: #4ade80;
    }
    
    .copy-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      opacity: 0;
      transition: all 0.3s;
      z-index: 2000;
    }
    
    .copy-toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255,255,255,0.4);
    }
    
    .empty-state h3 {
      font-size: 20px;
      margin-bottom: 10px;
    }
    
    @media (max-width: 768px) {
      .stream-item {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="burger-menu" id="burgerMenu">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h1 style="font-size: 20px; font-weight: 600;">Stremio Lightweight</h1>
  </div>
  
  <div class="sidebar-overlay" id="sidebarOverlay"></div>
  <div class="sidebar" id="sidebar">
    <div class="player-section">
      <h3>Default Player</h3>
      <div class="player-option active" data-player="infuse">
        <div class="icon">📱</div>
        <div class="name">Infuse</div>
        <div class="check">✓</div>
      </div>
      <div class="player-option" data-player="nplayer">
        <div class="icon">🎬</div>
        <div class="name">nPlayer</div>
        <div class="check"></div>
      </div>
      <div class="player-option" data-player="outplayer">
        <div class="icon">▶️</div>
        <div class="name">OutPlayer</div>
        <div class="check"></div>
      </div>
      <div class="player-option" data-player="vlc">
        <div class="icon">🎵</div>
        <div class="name">VLC</div>
        <div class="check"></div>
      </div>
      <div class="player-option" data-player="browser">
        <div class="icon">🌐</div>
        <div class="name">Browser</div>
        <div class="check"></div>
      </div>
    </div>
    <div class="player-section">
      <h3>Settings</h3>
      <div style="color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.6;">
        Select your preferred player. Streams will automatically copy and open in the selected player.
      </div>
    </div>
  </div>
  
  <div class="main-content">
    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="Enter IMDb ID (e.g., tt0816692)" value="">
      <button class="search-btn" id="searchBtn">Fetch Streams</button>
    </div>
    
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p style="margin-top: 20px; color: rgba(255,255,255,0.6);">Fetching streams...</p>
    </div>
    
    <div class="streams-container" id="streamsContainer"></div>
    
    <div class="empty-state" id="emptyState" style="display: none;">
      <h3>No streams found</h3>
      <p>Try a different IMDb ID</p>
    </div>
  </div>
  
  <div class="copy-toast" id="copyToast">Copied! Opening player...</div>
  
  <script>
    // State management
    let currentPlayer = localStorage.getItem('preferredPlayer') || 'infuse';
    let fetchedStreams = [];
    
    // DOM elements
    const burgerMenu = document.getElementById('burgerMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const streamsContainer = document.getElementById('streamsContainer');
    const emptyState = document.getElementById('emptyState');
    const copyToast = document.getElementById('copyToast');
    
    // Burger menu functionality
    burgerMenu.addEventListener('click', () => {
      burgerMenu.classList.toggle('active');
      sidebar.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
    });
    
    sidebarOverlay.addEventListener('click', () => {
      burgerMenu.classList.remove('active');
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
    
    // Player selection
    document.querySelectorAll('.player-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.player-option').forEach(opt => {
          opt.classList.remove('active');
          opt.querySelector('.check').textContent = '';
        });
        
        this.classList.add('active');
        this.querySelector('.check').textContent = '✓';
        currentPlayer = this.dataset.player;
        localStorage.setItem('preferredPlayer', currentPlayer);
        
        // Close sidebar after selection
        setTimeout(() => {
          burgerMenu.classList.remove('active');
          sidebar.classList.remove('active');
          sidebarOverlay.classList.remove('active');
        }, 300);
      });
    });
    
    // Initialize player selection
    document.querySelectorAll('.player-option').forEach(option => {
      if (option.dataset.player === currentPlayer) {
        option.classList.add('active');
        option.querySelector('.check').textContent = '✓';
      } else {
        option.classList.remove('active');
        option.querySelector('.check').textContent = '';
      }
    });
    
    // Fetch streams
    async function fetchStreams() {
      const imdbId = searchInput.value.trim();
      
      if (!imdbId || !imdbId.startsWith('tt')) {
        alert('Please enter a valid IMDb ID (starts with tt)');
        return;
      }
      
      loading.classList.add('active');
      streamsContainer.innerHTML = '';
      emptyState.style.display = 'none';
      
      try {
        const response = await fetch('/api/streams/movie/' + imdbId);
        const data = await response.json();
        
        loading.classList.remove('active');
        
        if (data.streams && data.streams.length > 0) {
          fetchedStreams = data.streams;
          displayStreams(data.streams);
        } else {
          emptyState.style.display = 'block';
        }
      } catch (error) {
        console.error('Error fetching streams:', error);
        loading.classList.remove('active');
        emptyState.style.display = 'block';
      }
    }
    
    // Display streams
    function displayStreams(streams) {
      streamsContainer.innerHTML = streams.map((stream, index) => {
        const badges = [];
        if (stream.quality) badges.push('<span class="stream-badge quality">' + stream.quality + '</span>');
        if (stream.size) badges.push('<span class="stream-badge size">' + stream.size + '</span>');
        if (stream.seeders > 0) badges.push('<span class="stream-badge seeders">👥 ' + stream.seeders + '</span>');
        
        return '<div class="stream-item" data-index="' + index + '">' +
          '<div class="stream-title">' + stream.title + '</div>' +
          '<div class="stream-info">' + badges.join('') + '</div>' +
        '</div>';
      }).join('');
      
      // Add click handlers
      document.querySelectorAll('.stream-item').forEach(item => {
        item.addEventListener('click', handleStreamClick);
      });
    }
    
    // Handle stream click - auto copy and open
    async function handleStreamClick(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      const stream = fetchedStreams[index];
      
      if (!stream || !stream.url) return;
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(stream.url);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = stream.url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      // Visual feedback
      e.currentTarget.classList.add('copied');
      copyToast.classList.add('show');
      
      setTimeout(() => {
        e.currentTarget.classList.remove('copied');
        copyToast.classList.remove('show');
      }, 2000);
      
      // Open in player after short delay
      setTimeout(() => {
        openInPlayer(stream.url, stream.type);
      }, 500);
    }
    
    // Open in selected player
    function openInPlayer(url, streamType) {
      let playerUrl;
      
      switch(currentPlayer) {
        case 'infuse':
          if (streamType === 'torrent') {
            playerUrl = 'infuse://x-callback-url/play?url=' + encodeURIComponent(url);
          } else {
            playerUrl = 'infuse://x-callback-url/play?url=' + encodeURIComponent(url);
          }
          break;
        
        case 'nplayer':
          playerUrl = 'nplayer-' + url;
          break;
        
        case 'outplayer':
          playerUrl = 'outplayer://' + encodeURIComponent(url);
          break;
        
        case 'vlc':
          playerUrl = 'vlc-x-callback://x-callback-url/stream?url=' + encodeURIComponent(url);
          break;
        
        case 'browser':
          window.open(url, '_blank');
          return;
        
        default:
          window.open(url, '_blank');
          return;
      }
      
      // Try to open in app
      window.location.href = playerUrl;
      
      // Fallback if app not installed
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          if (confirm('Player app may not be installed. Open in browser instead?')) {
            window.open(url, '_blank');
          }
        }
      }, 2500);
    }
    
    // Search button click
    searchBtn.addEventListener('click', fetchStreams);
    
    // Enter key in search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        fetchStreams();
      }
    });
    
    // Check URL params on load
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const imdbId = params.get('id');
      
      if (imdbId) {
        searchInput.value = imdbId;
        fetchStreams();
      }
    });
  </script>
</body>
</html>`;
  
  res.send(html);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Stremio Lightweight Backend running on port ' + PORT);
  console.log('Access at: http://localhost:' + PORT);
  console.log('Stremio addon manifest: http://localhost:' + PORT + '/manifest.json');
});