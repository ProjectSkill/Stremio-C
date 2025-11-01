FROM node:18-alpine
WORKDIR /app

# Copy package.json (and package-lock.json if you ever add it)
COPY package*.json ./

# Install only production deps (works if you don't have a lockfile)
RUN apk add --no-cache python3 make g++ \
 && npm install --production --no-audit --no-fund

# Copy app files
COPY . .

# Ensure public exists
RUN mkdir -p public

# Dynamic healthcheck against the PORT the app uses
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://localhost:${process.env.PORT || 8080}/health`, r => process.exit(r.statusCode===200?0:1))"

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "/app/server.js"]