# ===================================================================

# MULTI-STAGE DOCKERFILE - OPTIMIZED FOR SIZE & PERFORMANCE

# ===================================================================

# Stage 1: Dependencies installation

# Stage 2: Production runtime with minimal footprint

# ===================================================================

# ===================================================================

# STAGE 1: BUILDER

# ===================================================================

# Purpose: Install dependencies in a temporary layer

# Why separate stage?: Keeps final image small by excluding build tools

FROM node:18-alpine AS builder

# Set working directory

WORKDIR /app

# Copy package files first (Docker layer caching optimization)

# If package.json doesn’t change, this layer is cached

COPY package*.json ./

# Install dependencies

# –production flag excludes devDependencies for smaller size

RUN npm ci –production –silent

# ===================================================================

# STAGE 2: PRODUCTION RUNTIME

# ===================================================================

# Purpose: Minimal final image with only runtime dependencies

# Alpine base: ~5MB vs standard Node image ~900MB

FROM node:18-alpine

# Install dumb-init to handle signals properly in Docker

# dumb-init ensures graceful shutdowns when Render stops the container

RUN apk add –no-cache dumb-init

# Create non-root user for security best practices

# Running as root in containers is a security risk

RUN addgroup -g 1001 -S nodejs &&   
adduser -S nodejs -u 1001

# Set working directory

WORKDIR /app

# Copy dependencies from builder stage

COPY –from=builder –chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code

COPY –chown=nodejs:nodejs server.js ./

# Switch to non-root user

USER nodejs

# Expose port (Render will assign this dynamically)

# This is documentation only; actual port comes from process.env.PORT

EXPOSE 3000

# Health check for Docker (Render uses its own health checks)

# This helps Docker know if container is healthy

HEALTHCHECK –interval=30s –timeout=3s –start-period=5s –retries=3   
CMD node -e “require(‘http’).get(‘http://localhost:3000/health’, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})”

# Use dumb-init to run node

# dumb-init properly handles SIGTERM for graceful shutdowns

CMD [“dumb-init”, “node”, “server.js”]