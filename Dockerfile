# Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --production --silent

# Stage 2: Runtime
FROM node:18-alpine

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs server.js ./

USER nodejs

EXPOSE 3000

# Healthcheck (Render also does its own)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "server.js"]