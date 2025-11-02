#!/bin/sh
set -eu

# runtime ports (use PORT injected by platform if present)
NGINX_PORT=${PORT:-10000}
NODE_PORT=${NODE_PORT:-11470}

# 1) Ensure nginx main config is minimal and includes conf.d inside http
#    This prevents surprises where includes are nested or missing.
cat > /etc/nginx/nginx.conf <<'NGINX_MAIN'
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    sendfile        on;
    keepalive_timeout  65;

    # include site configs
    include /etc/nginx/conf.d/*.conf;
}
NGINX_MAIN

# 2) Write the site config using runtime port and escaping nginx $-vars
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
  listen ${NGINX_PORT} default_server;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:${NODE_PORT};
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }
}
EOF

# 3) Ensure permissions (nginx in alpine ships with nginx user)
chown root:root /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf || true
chmod 644 /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf || true

# 4) Start the Node app in background (must listen on NODE_PORT and 0.0.0.0)
cd /app
nohup sh -c "NODE_PORT=${NODE_PORT} node server.js --port=${NODE_PORT}" > /proc/1/fd/1 2>/proc/1/fd/2 &

# 5) Validate generated nginx config and show failures (helps debug)
echo "Running nginx -t ..."
nginx -t || {
  echo "nginx -t failed; showing /etc/nginx/nginx.conf and /etc/nginx/conf.d/default.conf"
  sed -n '1,240p' /etc/nginx/nginx.conf || true
  echo "----"
  sed -n '1,240p' /etc/nginx/conf.d/default.conf || true
  exit 1
}

# 6) Start nginx in foreground (tini is PID 1 and will forward signals)
nginx -g 'daemon off;'