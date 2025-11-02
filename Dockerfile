# builder: install deps and build app
FROM node:20-alpine AS builder
WORKDIR /app
# copy package files first for cached installs
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
# copy the rest of the project (server.js, inject.js, etc.)
COPY . .
# optional build step if your project has one
RUN npm run build --if-present

# runtime image
FROM node:20-alpine
# install runtime packages (nginx, tini, envsubst provider, curl)
RUN apk add --no-cache nginx tini gettext curl \
  && mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx

WORKDIR /app
# copy app from builder
COPY --from=builder /app /app

# main nginx.conf
RUN cat > /etc/nginx/nginx.conf <<'EOF'
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;
events { worker_connections 1024; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  sendfile on;
  keepalive_timeout 65;
  access_log /var/log/nginx/access.log;
  include /etc/nginx/conf.d/*.conf;
}
EOF

# nginx server template (rendered at container start by server.js)
RUN cat > /etc/nginx/conf.d/default.conf.template <<'EOF'
server {
  listen ${PORT:-10000};
  server_name ${RENDER_EXTERNAL_HOSTNAME:-_};
  client_max_body_size 10M;

  location / {
    proxy_pass http://127.0.0.1:11470;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /healthz {
    proxy_pass http://127.0.0.1:11470/healthz;
  }
}
EOF

EXPOSE 10000

# healthcheck uses curl against the internal stremio port
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:11470/ || exit 1

# run node under tini (server.js contains launcher logic that renders nginx template and spawns nginx)
CMD ["/sbin/tini", "--", "node", "server.js"]