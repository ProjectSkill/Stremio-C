#!/bin/sh
set -e

: "${PORT:=10000}"
: "${STREMIO_PORT:=11470}"
: "${RENDER_EXTERNAL_HOSTNAME:=localhost}"

# Render nginx config from template
envsubst '$PORT $RENDER_EXTERNAL_HOSTNAME $STREMIO_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
echo '---- /etc/nginx/conf.d/default.conf ----'
sed -n '1,200p' /etc/nginx/conf.d/default.conf || true

echo "Starting Node..."
node server.js --transport="https://${RENDER_EXTERNAL_HOSTNAME}/manifest.json" &
NODE_PID=$!
echo "node_pid=${NODE_PID}"

# wait for node to accept connections
echo "Waiting for Stremio to become healthy on 127.0.0.1:${STREMIO_PORT}..."
until curl -sS --fail "http://127.0.0.1:${STREMIO_PORT}/manifest.json" > /dev/null 2>&1; do
  sleep 0.5
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Node process died; aborting"
    ps aux
    exit 1
  fi
done

echo "Stremio ready, starting nginx"
nginx -g 'daemon off;'