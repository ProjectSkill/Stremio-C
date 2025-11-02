# builder stage: install deps and build app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm i --package-lock-only && npm ci --omit=dev
COPY . .
RUN npm run build || true

# final/runtime stage
FROM node:20-alpine
RUN apk add --no-cache nginx tini gettext curl \
  && mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx

WORKDIR /app
COPY --from=builder /app /app

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

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:11470/ || exit 1

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

CMD ["/sbin/tini", "--", "/usr/local/bin/start.sh"]