FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package and install first for cache friendliness
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy app
COPY . .

# Ensure environment PORT is used in app (server.js reads process.env.PORT)
ENV NODE_ENV=production

# Optional: tell the container which port we expect (informational)
EXPOSE 8080

# Start the app - the app must read process.env.PORT
CMD ["node", "server.js"]