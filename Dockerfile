# ===================================================================
# MULTI-STAGE DOCKERFILE - OPTIMIZED FOR SIZE & PERFORMANCE
# ===================================================================

# ===================================================================
# STAGE 1: BUILDER
# ===================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (Docker layer caching optimization)
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --production --silent

# ===================================================================
# STAGE 2: PRODUCTION RUNTIME
# ===================================================================
FROM node:18-alpine

# Install dumb-init to handle signals properly in Docker
RUN apk add --no-cache dumb-init

# Create non-root user for security best practices
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 -G nodejs nodejs

# Set working directory
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs server.js ./

# Switch to non-root user
USER nodejs

# Expose port (Render will assign this dynamically)
EXPOSE 3000

# Health check for Docker (Render uses its own health checks)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to run node
CMD ["dumb-init", "node", "server.js"]