FROM node:20-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y git wget curl python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# --- Option 1: Clone and build stremio-web (latest main branch) ---
RUN git clone --depth 1 https://github.com/Stremio/stremio-web.git /app/stremio-web \
 && cd /app/stremio-web \
 && npm install --legacy-peer-deps \
 && npm run build

# --- Option 2: Pin to a specific release tag for stability ---
# RUN git clone --branch v4.4.168 https://github.com/Stremio/stremio-web.git /app/stremio-web \
#  && cd /app/stremio-web \
#  && npm install --legacy-peer-deps \
#  && npm run build

# Clone and build your fork of the community addon
RUN git clone --depth 1 https://github.com/ProjectSkill/stremio-community-v5 /app/addon \
 && cd /app/addon \
 && npm install \
 && npm run build

# Add Glass theme CSS
RUN wget -O /app/stremio-web/build/glass-theme.css https://raw.githubusercontent.com/Fxy6969/Stremio-Glass-Theme/cover/StremioGlass.css \
 && sed -i 's|</head>|<link rel="stylesheet" href="/glass-theme.css"><style>body{background:#0a0a0a;}</style></head>|g' /app/stremio-web/build/index.html

# Generate proxy server.js
RUN cat > /app/server.js << 'EOF'
const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { spawn } = require("child_process");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 10000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

console.log("Starting Community Addon backend...");

const addon = spawn("node", ["server.js", "--port=7000", "--host=127.0.0.1"], {
  cwd: "/app/addon",
  stdio: "inherit"
});

addon.on("error", (err) => console.error("Addon error:", err));

if (RENDER_URL) {
  setInterval(() => {
    https.get(RENDER_URL, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on("error", (e) => {
      console.error(`Keep-alive error: ${e.message}`);
    });
  }, 14 * 60 * 1000);
}

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

app.use("/addon", createProxyMiddleware({
  target: "http://127.0.0.1:7000",
  changeOrigin: true,
  pathRewrite: { "^/addon": "" },
  logLevel: "silent"
}));

app.use(express.static(path.join(__dirname, "stremio-web/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "stremio-web/build", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Glass Theme running on port ${PORT}`);
  if (RENDER_URL) console.log(`URL: ${RENDER_URL}`);
});

process.on("SIGTERM", () => {
  addon.kill();
  process.exit(0);
});
EOF

# Install proxy dependencies
RUN npm init -y && npm install express http-proxy-middleware

ENV NODE_ENV=production
EXPOSE 10000

CMD ["node", "/app/server.js"]