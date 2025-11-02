#!/bin/sh
set -e

: "${PORT:=10000}"

# render nginx config
envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

if [ -z "$RENDER_EXTERNAL_HOSTNAME" ]; then
  echo "WARN: RENDER_EXTERNAL_HOSTNAME not set; using localhost"
fi

# start node in background and nginx in foreground under tini
node server.js --transport="https://${RENDER_EXTERNAL_HOSTNAME:-localhost}/manifest.json" &
nginx -g 'daemon off;'