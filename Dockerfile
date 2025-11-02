FFROM nginx:alpine

WORKDIR /app

# Install curl
RUN apk add --no-cache curl unzip

# Download latest Stremio Web release
RUN curl -L https://github.com/Stremio/stremio-web/archive/refs/heads/development.zip -o stremio.zip && \
    unzip stremio.zip && \
    mv stremio-web-development /stremio-web && \
    rm stremio.zip

# Install Node to build it
RUN apk add --no-cache nodejs npm

WORKDIR /stremio-web

# Build Stremio Web
RUN npm install && \
    HTTPS=false CI=true npm run build

# Move build to nginx
RUN mv build /usr/share/nginx/html/stremio

# Create player selector injection script
RUN cat > /usr/share/nginx/html/stremio/player-inject.js << 'EOF'
(function() {
  const PLAYERS = {
    vlc: { name: '📺 VLC', url: 'vlc-x-callback://x-callback-url/stream?url=' },
    infuse: { name: '🎬 Infuse', url: 'infuse://x-callback-url/play?url=' },
    nplayer: { name: '▶️ nPlayer', url: 'nplayer-' },
    outplayer: { name: '🎥 OutPlayer', url: 'outplayer://' },
    playerxtreme: { name: '⚡ PlayerXtreme', url: 'playerxtreme://' },
    oplayer: { name: '🎞️ OPlayer', url: 'oplayer://' },
    browser: { name: '🌐 Browser', url: null }
  };

  let currentStreamUrl = null;

  // Create player selector UI
  function createPlayerSelector() {
    const overlay = document.createElement('div');
    overlay.id = 'player-selector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 999999;
      display: none;
      padding: 20px;
      overflow-y: auto;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      max-width: 500px;
      margin: 50px auto;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Select Player';
    title.style.cssText = `
      color: white;
      text-align: center;
      font-size: 24px;
      margin-bottom: 20px;
    `;
    container.appendChild(title);

    Object.entries(PLAYERS).forEach(([key, player]) => {
      const btn = document.createElement('button');
      btn.textContent = player.name;
      btn.style.cssText = `
        width: 100%;
        padding: 18px;
        margin: 10px 0;
        font-size: 18px;
        background: linear-gradient(135deg, #7B00E0, #9D00FF);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(123,0,224,0.3);
      `;
      
      btn.onclick = () => {
        openInPlayer(key);
        overlay.style.display = 'none';
      };
      
      container.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕ Cancel';
    cancelBtn.style.cssText = `
      width: 100%;
      padding: 15px;
      margin-top: 20px;
      font-size: 16px;
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 12px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => overlay.style.display = 'none';
    container.appendChild(cancelBtn);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openInPlayer(playerKey) {
    if (!currentStreamUrl) return;
    
    const player = PLAYERS[playerKey];
    if (playerKey === 'browser') {
      window.open(currentStreamUrl, '_blank');
    } else {
      window.location.href = player.url + encodeURIComponent(currentStreamUrl);
    }
  }

  // Intercept video element creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'video') {
      const originalPlay = element.play;
      element.play = function() {
        const src = element.src || (element.querySelector('source') || {}).src;
        
        if (src && (src.startsWith('http') || src.startsWith('blob'))) {
          currentStreamUrl = src;
          
          // Show player selector
          let selector = document.getElementById('player-selector-overlay');
          if (!selector) {
            selector = createPlayerSelector();
          }
          selector.style.display = 'block';
          
          return Promise.resolve();
        }
        
        return originalPlay.apply(this, arguments);
      };
    }
    
    return element;
  };

  // Also intercept fetch/XMLHttpRequest for stream URLs
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && 
        (url.includes('.m3u8') || url.includes('.mp4') || url.includes('stream'))) {
      currentStreamUrl = url;
    }
    return originalFetch.apply(this, args);
  };

  console.log('Player selector injected successfully');
})();
EOF

# Inject the script into index.html
RUN sed -i 's|</body>|<script src="/player-inject.js"></script></body>|g' /usr/share/nginx/html/stremio/index.html

# Create nginx config
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 8080;
    server_name _;
    
    root /usr/share/nginx/html/stremio;
    index index.html;

    # Disable caching for development
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    # CORS headers for streaming
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "*";

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Serve the injection script
    location /player-inject.js {
        add_header Content-Type "application/javascript";
    }
}
EOF

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]