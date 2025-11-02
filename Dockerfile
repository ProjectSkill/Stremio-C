FROM node:20-alpine

# install runtime packages first so /etc/nginx exists and envsubst/curl are available
RUN apk add --no-cache nginx tini gettext curl \
  && mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx

WORKDIR /app
COPY --from=builder /app /app

# write nginx.conf (defines http context)
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

# write server template (uses PORT, RENDER_EXTERNAL_HOSTNAME, STREMIO_PORT)
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
    proxy_pass http://127.0.0.1:${STREMIO_PORT}/healthz;
  }
}
EOF

EXPOSE 10000

# healthcheck must come after curl is installed
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${STREMIO_PORT}/ || exit 1

# copy start script (optional) or use inline CMD. If you prefer inline CMD, ensure it's after installs.
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# run tini then start script which will envsubst template, start node, wait, then start nginx
CMD ["/sbin/tini", "--", "/usr/local/bin/start.sh"]