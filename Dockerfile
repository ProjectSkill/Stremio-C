# ===================================================================
# MULTI-STAGE DOCKERFILE - OPTIMIZED FOR SIZE & PERFORMANCE
# ===================================================================

# STAGE 1: BUILDER
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --production --silent

# Copy app source for any build steps (if needed)
COPY . .

# STAGE 2: PRODUCTION RUNTIME
FROM node:18-alpine

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user and group (single RUN to keep layers small)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy node_modules from builder and set ownership
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code and set ownership
COPY --chown=nodejs:nodejs server.js ./

# Switch to non-root user
USER nodejs

# Documentation port (actual port may come from env)
EXPOSE 3000

# Health check (uses localhost:3000/health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD sh -c 'node -e "require(\"http\").get(\"http://localhost:3000/health\", (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"'

# Use dumb-init to run node for proper signal handling
CMD ["dumb-init", "node", "server.js"]