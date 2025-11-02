#!/bin/sh
set -eu

# runtime ports
NGINX_PORT=${PORT:-10000}
NODE_PORT=${NODE_PORT:-11470}

# write nginx config at container start so it uses runtime PORT
cat > /etc/nginx/conf.d/default.conf << EOF
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

# ensure app dir is present and writable
cd /app

# start node app in background, stdout/stderr to container logs
# server.js must respect NODE_PORT or CLI --port
nohup sh -c "NODE_PORT=${NODE_PORT} node server.js --port=${NODE_PORT}" > /proc/1/fd/1 2>/proc/1/fd/2 &

# start nginx in foreground (tini is PID 1 and will forward signals)
nginx -g 'daemon off;'