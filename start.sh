##!/bin/sh
set -eu

# runtime ports (use PORT injected by platform if present)
NGINX_PORT=${PORT:-10000}
NODE_PORT=${NODE_PORT:-11470}

# generate nginx config with runtime ports and escaped nginx variables
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

# ensure app dir is present
cd /app

# start node app in background; server.js must honor NODE_PORT or --port
# send stdout/stderr to container logs via /proc/1/fd/1 and /proc/1/fd/2
nohup sh -c "NODE_PORT=${NODE_PORT} node server.js --port=${NODE_PORT}" > /proc/1/fd/1 2>/proc/1/fd/2 &

# validate nginx config before starting
nginx -t

# start nginx in foreground (tini is PID 1 and will forward signals)
nginx -g 'daemon off;'