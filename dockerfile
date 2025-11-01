FROM node:18-alpine
WORKDIR /app

# Copy package.json (and lockfile if present)
COPY package*.json ./

# Install production dependencies
RUN npm install --production --no-audit --no-fund

# Copy app files
COPY . .

# Expose the port Render expects
EXPOSE 8080

# Healthcheck hits /health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode===200?0:1))"

ENV NODE_ENV=production

CMD ["node", "server.js"]