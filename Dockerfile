# builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --package-lock-only && npm ci --omit=dev
COPY . .
RUN npm run build || true

# final/runtime
FROM node:20-alpine
# install runtime packages first
RUN apk add --no-cache nginx tini gettext curl \
  && mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx

WORKDIR /app
COPY --from=builder /app /app

# main nginx conf
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

# server template (rendered by Docker environment using envsubst at build time)
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

# Render config template into real config at container start using envsubst inside Dockerfile CMD via node app
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:11470/ || exit 1

COPY . .
# make sure node files are executable where needed
USER root

# Use tini as PID1 and run node launcher (app.js) — no shell script required
CMD ["/sbin/tini", "--", "node", "app.js"]