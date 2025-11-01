FROM node:18-alpine
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install only production dependencies
RUN apk add --no-cache python3 make g++ \
 && npm ci --only=production --no-audit --no-fund

# Copy the rest of your app
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Healthcheck using dynamic port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get(`http://localhost:${process.env.PORT || 8080}/health`, r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Set environment and expose port
ENV NODE_ENV=production
EXPOSE 8080

# Start your server directly
CMD ["node", "/app/server.js"]
