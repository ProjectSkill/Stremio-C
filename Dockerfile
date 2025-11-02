FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache git

# Clone Stremio Web
RUN git clone https://github.com/Stremio/stremio-web.git /app

WORKDIR /app

# Install packages
RUN npm install

# Build production version
RUN npm run build

# Install serve to host it
RUN npm install -g serve

EXPOSE 8080

# Serve the built app
CMD ["serve", "-s", "build", "-l", "8080"]