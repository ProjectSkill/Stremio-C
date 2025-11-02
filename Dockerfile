# builder: create package-lock.json inside the build if it's missing, then install
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm i --package-lock-only && npm ci --omit=dev
COPY . .
RUN npm run build || true

# final image with node + nginx + tini
FROM node:20-alpine
RUN apk add --no-cache nginx tini gettext
WORKDIR /app
COPY --from=builder /app /app

# nginx template
RUN mkdir -p /run/nginx
RUN cat > /etc/nginx/conf.d/default.conf.template << 'EOF'
server {
  listen ${PORT:-10000};
  location / {
    proxy_pass http://127.0.0.1:11470;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
EOF

# copy start script (place start.sh in repo root)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 10000
WORKDIR /app
CMD ["/sbin/tini", "--", "/usr/local/bin/start.sh"]