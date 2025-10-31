FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git wget
RUN git clone --depth 1 https://github.com/Stremio/stremio-web.git /app/stremio-web && cd /app/stremio-web && npm install --legacy-peer-deps && npm run build
RUN git clone --depth 1 https://github.com/Zaarrg/stremio-community-v5.git /app/addon && cd /app/addon && npm ci --only=production && npm run build
RUN wget -O /app/stremio-web/build/glass-theme.css https://raw.githubusercontent.com/Fxy6969/Stremio-Glass-Theme/cover/StremioGlass.css
RUN sed -i 's|</head>|<link rel="stylesheet" href="/glass-theme.css"><style>body{background:#0a0a0a;}</style></head>|g' /app/stremio-web/build/index.html
RUN printf 'const express = require("express");\nconst path = require("path");\nconst { createProxyMiddleware } = require("http-proxy-middleware");\nconst { spawn } = require("child_process");\nconst app = express();\nconst PORT = process.env.PORT || 8000;\nconsole.log("Starting addon...");\nconst addon = spawn("node", ["server.js", "--port=7000", "--host=127.0.0.1"], {cwd: "/app/addon", stdio: "inherit"});\nsetTimeout(() => console.log("Ready"), 3000);\napp.use("/addon", createProxyMiddleware({target: "http://127.0.0.1:7000", changeOrigin: true, pathRewrite: {"^/addon": ""}, logLevel: "silent"}));\napp.use(express.static(path.join(__dirname, "stremio-web/build"), {maxAge: "1d"}));\napp.get("*", (req, res) => res.sendFile(path.join(__dirname, "stremio-web/build/index.html")));\napp.listen(PORT, "0.0.0.0", () => console.log(`Running on ${PORT}`));\nprocess.on("SIGTERM", () => {addon.kill(); process.exit(0);});\n' > /app/server.js
RUN cd /app && npm init -y && npm install express http-proxy-middleware
ENV NODE_ENV=production
ENV PORT=8000
EXPOSE 8000
CMD ["node", "/app/server.js"]
