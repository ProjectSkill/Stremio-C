# ---------- builder stage ----------
FROM node:20-alpine AS builder

# allow build-time overrides
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# copy package metadata first for Docker layer caching
COPY package.json package-lock.json* npm-shrinkwrap.json* ./

# generate a lockfile if missing, then install production deps only
# - if package-lock.json exists, npm ci will use it
# - if not, npm install --package-lock-only will create it and fall back to npm install
RUN set -eux; \
  if [ -f package-lock.json ]; then \
    npm ci --omit=dev; \
  else \
    npm install --package-lock-only || true; \
    npm ci --omit=dev || npm install --omit=dev; \
  fi

# copy remainder and build
COPY . .
# run build if present; fail the build if your project has a broken build step
RUN set -eux; \
  if npm run | grep -q ' build'; then \
    npm run build; \
  fi

# produce an artifact list (optional) for debugging in CI
RUN set -eux; ls -la /app

# ---------- final image ----------
FROM node:20-alpine

# install runtime packages: nginx, tini, gettext (envsubst)
RUN apk add --no-cache nginx tini gettext bash curl

# create nginx dirs and ensure permissions
RUN mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx \
  && chown -R nginx:nginx /var/log/nginx /var/cache/nginx

WORKDIR /app

# copy built app and node_modules from builder
COPY --from=builder /app /app
# If you want only built assets, adjust COPY above (this copies everything from /app)

# default environment (Render will set PORT to 10000)
ENV PORT=10000
ENV STREMIO_PORT=11470
ENV NODE_ENV=production

# write a strict nginx.conf (includes conf.d/*.conf)
RUN cat > /etc/nginx/nginx.conf <<'EOF'
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
    sendfile        on;
    tcp_nopush      on;
    keepalive_timeout  65;
    access_log /var/log/nginx/access.log;
    server_tokens off;
    include /etc/nginx/conf.d/*.conf;
}
EOF

# default server block template; will be processed with envsubst at container start
RUN cat > /etc/nginx/conf.d/default.conf.template <<'EOF'
server {
  listen ${PORT};
  server_name ${RENDER_EXTERNAL_HOSTNAME:-_};

  # optional: adjust client_max_body_size if uploading
  client_max_body_size 10M;

  location / {
    proxy_pass http://127.0.0.1:${STREMIO_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_request_buffering off;
  }

  # optional health route pass-through
  location /healthz {
    proxy_pass http://127.0.0.1:${STREMIO_PORT}/healthz;
  }
}
EOF

# expose Render expected port (Render sets PORT=10000)
EXPOSE 10000

# basic healthcheck that hits the internal stremio/node endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${STREMIO_PORT}/ || exit 1

# final CMD: envsubst nginx template, ensure Node binds to 0.0.0.0:${STREMIO_PORT},
# start node app in background, then start nginx in foreground under tini.
# Replace "node server.js" below with the real command that starts your Stremio server
# (e.g., "node dist/index.js" or "npm run start"). The app MUST bind to 0.0.0.0:${STREMIO_PORT}.
CMD ["/sbin/tini", "--", "sh", "-c", "\
  # substitute env vars into nginx conf; keep shell quoting exact \
  envsubst '$PORT $RENDER_EXTERNAL_HOSTNAME $STREMIO_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
  echo 'nginx conf:' && sed -n '1,200p' /etc/nginx/conf.d/default.conf || true && \
  # start node app (background) -- ensure your app binds to 0.0.0.0:${STREMIO_PORT} \
  echo 'starting node app' && \
  # recommended: ensure you use a process manager only if needed; run node directly to let docker manage it \
  node server.js & \
  NODE_PID=$! && echo \"node pid=$NODE_PID\" && \
  # tiny wait for node to bind; healthcheck will verify readiness anyway \
  sleep 0.5 && \
  # start nginx in foreground so container stays alive \
  echo 'starting nginx' && nginx -g 'daemon off;' \
"]

# optionally set a non-root user here if your app supports it (advanced)
# USER node