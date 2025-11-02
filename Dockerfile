FROM node:18

# Install Stremio Server (headless)
RUN npm install -g stremio-server

# Clone and build Stremio Web
RUN git clone https://github.com/Stremio/stremio-web.git /web
WORKDIR /web
RUN npm install && npm run build

# Install nginx to serve web + proxy to server
RUN apt-get update && apt-get install -y nginx

# Configure nginx
RUN echo 'server { \n\
    listen 8080; \n\
    location / { \n\
        root /web/build; \n\
        try_files $uri /index.html; \n\
    } \n\
    location /api { \n\
        proxy_pass http://localhost:11470; \n\
    } \n\
}' > /etc/nginx/sites-available/default

EXPOSE 8080

CMD service nginx start && stremio-server