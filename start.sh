#!/bin/sh
set -e
: "${PORT:=10000}"
: "${STREMIO_PORT:=11470}"
: "${RENDER_EXTERNAL_HOSTNAME:=localhost}"

# render nginx config
envsubst '\$PORT \$RENDER_EXTERNAL_HOSTNAME' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting Node..."
# start node in background and log its PID
node server.js --transport="https://${RENDER_EXTERNAL_HOSTNAME}/manifest.json" &
NODE_PID=$!
echo "node_pid=${NODE_PID}"

# wait for node to accept connections on 127.0.0.1:11470
echo "Waiting for Stremio to become healthy on 127.0.0.1:${STREMIO_PORT}..."
# install curl in image or ensure it's available; this loop uses curl
until curl -sS --fail "http://127.0.0.1:${STREMIO_PORT}/manifest.json" > /dev/null 2>&1; do
  sleep 0.5
  # if node died, show logs and exit
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Node process died; aborting"
    ps aux
    sleep 1
    exit 1
  fi
done
echo "Stremio ready, starting nginx"

# start nginx in foreground
nginx -g 'daemon off;'