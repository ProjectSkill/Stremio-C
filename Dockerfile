FROM node:20-alpine

WORKDIR /app

RUN apk add –no-cache git wget curl unzip

# Download PRE-BUILT Stremio Web (no npm build needed!)

RUN wget https://dl.strem.io/four/v4.4.168/stremio-web.zip &&   
unzip stremio-web.zip -d /app &&   
rm stremio-web.zip &&   
mv /app/build /app/stremio-web || mv /app/stremio-web-* /app/stremio-web || true

# If that doesn’t work, try alternative method

RUN if [ ! -d “/app/stremio-web” ]; then   
wget -O web.tar.gz https://github.com/Stremio/stremio-web/releases/download/v4.4.168/stremio-web-v4.4.168.tar.gz &&   
tar -xzf web.tar.gz &&   
mv build /app/stremio-web &&   
rm web.tar.gz;   
fi

# Build YOUR addon fork (lightweight)

RUN git clone –depth 1 https://github.com/ProjectSkill/stremio-community-v5 /app/addon &&   
cd /app/addon &&   
npm install &&   
npm run build

# Download Glass Theme CSS

RUN wget -O /app/stremio-web/glass-theme.css   
https://raw.githubusercontent.com/Fxy6969/Stremio-Glass-Theme/cover/StremioGlass.css

# Inject Glass Theme into HTML

RUN sed -i ‘s|</head>|<link rel="stylesheet" href="/glass-theme.css"><style>body{background:#0a0a0a;}</style></head>|g’   
/app/stremio-web/index.html

# Create lightweight proxy server

RUN printf ’const express = require(“express”);\n  
const path = require(“path”);\n  
const { createProxyMiddleware } = require(“http-proxy-middleware”);\n  
const { spawn } = require(“child_process”);\n  
const app = express();\n  
const PORT = process.env.PORT || 8000;\n  
console.log(“Starting addon…”);\n  
const addon = spawn(“node”, [“server.js”, “–port=7000”, “–host=127.0.0.1”], {\n  
cwd: “/app/addon”,\n  
stdio: “inherit”\n  
});\n  
setTimeout(() => console.log(“Ready!”), 2000);\n  
app.use(”/addon”, createProxyMiddleware({\n  
target: “http://127.0.0.1:7000”,\n  
changeOrigin: true,\n  
pathRewrite: {”^/addon”: “”},\n  
logLevel: “silent”\n  
}));\n  
app.use(express.static(”/app/stremio-web”));\n  
app.get(”*”, (req, res) => {\n  
res.sendFile(path.join(”/app/stremio-web”, “index.html”));\n  
});\n  
app.listen(PORT, “0.0.0.0”, () => {\n  
console.log(`Glass Theme live on ${PORT}`);\n  
});\n  
process.on(“SIGTERM”, () => {addon.kill(); process.exit(0);});\n  
’ > /app/server.js

# Install minimal server deps

RUN cd /app && npm init -y && npm install express http-proxy-middleware

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

CMD [“node”, “/app/server.js”]
