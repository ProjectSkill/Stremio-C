FROM node:18-alpine

RUN apk add --no-cache nginx

WORKDIR /app

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY nginx.conf /etc/nginx/nginx.conf
COPY players.html /usr/share/nginx/html/

# Install dependencies
RUN npm install

# Create nginx directories
RUN mkdir -p /run/nginx

EXPOSE 80 443 11470

CMD sh -c "nginx && node server.js"