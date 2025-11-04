FROM node:18-alpine

# Install nginx and create necessary directories
RUN apk add --no-cache nginx && \
    mkdir -p /run/nginx /var/log/nginx

WORKDIR /app

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY nginx.conf /etc/nginx/nginx.conf

# Install dependencies
RUN npm install

# Expose both ports (nginx on 80, node on 11470)
EXPOSE 80

# Start both services
CMD sh -c "nginx && node server.js"