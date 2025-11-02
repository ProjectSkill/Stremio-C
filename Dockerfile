FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Create Stremio wrapper with player injection
RUN cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <title>Stremio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; }
    #stremio-frame { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe id="stremio-frame" src="https://web.stremio.com" allow="autoplay; fullscreen"></iframe>
  <script src="/player.js"></script>
</body>
</html>
EOF

# Create mobile-optimized player selector
RUN cat > player.js << 'EOF'
(function() {
  'use strict';
  
  const PLAYERS = {
    vlc: { name: '📺 VLC', scheme: 'vlc-x-callback://x-callback-url/stream?url=' },
    infuse: { name: '🎬 Infuse', scheme: 'infuse://x-callback-url/play?url=' },
    nplayer: { name: '▶️ nPlayer', scheme: 'nplayer-' },
    outplayer: { name: '🎥 OutPlayer', scheme: 'outplayer://' },
    playerxtreme: { name: '⚡ PlayerXtreme', scheme: 'playerxtreme://' },
    oplayer: { name: '🎞️ OPlayer', scheme: 'oplayer://' },
    browser: { name: '🌐 Browser', scheme: null }
  };

  let streamUrl = null;
  let selectorVisible = false;

  // Create player selector UI (mobile optimized)
  function createSelector() {
    const overlay = document.createElement('div');
    overlay.id = 'player-overlay';
    overlay.innerHTML = `
      <style>
        #player-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.97);
          z-index: 999999;
          display: none;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        #player-overlay.show { display: block; }
        .player-container {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
          padding-top: 60px;
        }
        .player-title {
          color: #fff;
          font-size: 28px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .player-btn {
          width: 100%;
          padding: 20px;
          margin: 12px 0;
          font-size: 20px;
          font-weight: 600;
          background: linear-gradient(135deg, #7B00E0, #9D00FF);
          color: white;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 6px 12px rgba(123,0,224,0.4);
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .player-btn:active {
          transform: scale(0.98);
          box-shadow: 0 3px 6px rgba(123,0,224,0.4);
        }
        .cancel-btn {
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          margin-top: 20px;
        }
        .stream-info {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          text-align: center;
          margin-bottom: 20px;
          word-break: break-all;
          font-family: monospace;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
        }
      </style>
      <div class="player-container">
        <div class="player-title">Select Player</div>
        <div class="stream-info" id="stream-url"></div>
        <div id="player-buttons"></div>
        <button class="player-btn cancel-btn" onclick="window.closePlayerSelector()">✕ Cancel</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const btnContainer = overlay.querySelector('#player-buttons');
    Object.entries(PLAYERS).forEach(([key, player]) => {
      const btn = document.createElement('button');
      btn.className = 'player-btn';
      btn.textContent = player.name;
      btn.onclick = () => openPlayer(key);
      btnContainer.appendChild(btn);
    });
    
    return overlay;
  }

  function openPlayer(key) {
    if (!streamUrl) return;
    
    const player = PLAYERS[key];
    if (key === 'browser') {
      window.open(streamUrl, '_blank');
    } else {
      window.location.href = player.scheme + encodeURIComponent(streamUrl);
    }
    
    closeSelector();
  }

  function showSelector(url) {
    streamUrl = url;
    let overlay = document.getElementById('player-overlay');
    
    if (!overlay) {
      overlay = createSelector();
    }
    
    const urlDisplay = overlay.querySelector('#stream-url');
    if (urlDisplay) {
      urlDisplay.textContent = url.length > 60 ? url.substring(0, 60) + '...' : url;
    }
    
    overlay.classList.add('show');
    selectorVisible = true;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  function closeSelector() {
    const overlay = document.getElementById('player-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
    selectorVisible = false;
    document.body.style.overflow = '';
  }

  window.closePlayerSelector = closeSelector;

  // Monitor iframe for stream URLs
  let lastChecked = '';
  
  setInterval(() => {
    try {
      const frame = document.getElementById('stremio-frame');
      if (!frame || !frame.contentWindow) return;
      
      // Try to access iframe URL (same-origin only)
      const frameUrl = frame.contentWindow.location.href;
      
      // Check if URL contains stream indicators
      if (frameUrl !== lastChecked) {
        lastChecked = frameUrl;
        
        // Look for player route
        if (frameUrl.includes('/player/') || frameUrl.includes('stream')) {
          console.log('Stream detected:', frameUrl);
        }
      }
    } catch (e) {
      // Cross-origin, expected
    }
  }, 1000);

  // Listen for messages from Stremio iframe
  window.addEventListener('message', (event) => {
    if (event.data && event.data.streamUrl) {
      console.log('Stream URL received:', event.data.streamUrl);
      showSelector(event.data.streamUrl);
    }
  });

  // Intercept link clicks for .m3u8, .mp4, etc.
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.href) {
      const url = target.href;
      if (url.match(/\.(m3u8|mp4|mkv|avi|webm)(\?|$)/i)) {
        e.preventDefault();
        showSelector(url);
      }
    }
  }, true);

  // Create floating intercept button for manual triggering
  const floatingBtn = document.createElement('button');
  floatingBtn.innerHTML = '🎬';
  floatingBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7B00E0, #9D00FF);
    border: none;
    font-size: 28px;
    cursor: pointer;
    z-index: 999998;
    box-shadow: 0 4px 12px rgba(123,0,224,0.5);
    display: none;
  `;
  floatingBtn.onclick = () => {
    const testUrl = prompt('Paste stream URL:');
    if (testUrl) showSelector(testUrl);
  };
  document.body.appendChild(floatingBtn);

  // Show floating button after 3 seconds
  setTimeout(() => {
    floatingBtn.style.display = 'block';
  }, 3000);

  console.log('Player selector initialized - Ready for streams!');
})();
EOF

# Configure nginx
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    
    location / {
        try_files $uri /index.html;
    }
    
    location /player.js {
        add_header Content-Type "application/javascript";
        add_header Cache-Control "no-cache";
    }
}
EOF

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]