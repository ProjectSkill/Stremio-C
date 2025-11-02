# ---------- builder stage ----------
FROM node:20-alpine AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# copy package metadata (lockfile present)
COPY package.json package-lock.json ./

# install production dependencies using lockfile
RUN set -eux; npm ci --omit=dev

# copy source and build if a build script exists
COPY . .
RUN set -eux; \
  if npm run | grep -q ' build'; then npm run build; fi

# ---------- final image ----------
FROM node:20-alpine

# runtime deps: nginx, tini, envsubst (gettext), curl for healthcheck
RUN apk add --no-cache nginx tini gettext curl

# create nginx dirs with expected permissions
RUN mkdir -p /etc/nginx /etc/nginx/conf.d /run/nginx /var/log/nginx /var/cache/nginx \
  && chown -R nginx:nginx /var/log/nginx /var/cache/nginx || true

WORKDIR /app

# copy built app and node_modules from builder
COPY --from=builder /app /app

# Render conventions and internal stremio port
ENV PORT=10000
ENV STREMIO_PORT=11470
ENV NODE_PORT=11470
ENV NODE_ENV=production

# nginx main conf
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

# server block template; envsubst will fill PORT and RENDER_EXTERNAL_HOSTNAME
RUN cat > /etc/nginx/conf.d/default.conf.template <<'EOF'
server {
  listen ${PORT};
  server_name ${RENDER_EXTERNAL_HOSTNAME:-_};

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

  location /healthz {
    proxy_pass http://127.0.0.1:${STREMIO_PORT}/healthz;
  }
}
EOF

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${STREMIO_PORT}/ || exit 1

# No start.sh. Template nginx, start node app (background), then nginx foreground under tini.
CMD ["/sbin/tini", "--", "sh", "-c", "\
  envsubst '$PORT $RENDER_EXTERNAL_HOSTNAME $STREMIO_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && \
  echo '---- /etc/nginx/conf.d/default.conf ----' && sed -n '1,200p' /etc/nginx/conf.d/default.conf || true && \
  echo 'starting node (stremio) on 0.0.0.0:'${NODE_PORT} && \
  node server.js & \
  NODE_PID=$! && echo node_pid=$NODE_PID && sleep 0.5 && \
  echo 'starting nginx' && nginx -g 'daemon off;' \
"]