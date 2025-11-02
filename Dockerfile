# builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
# if no package-lock.json in repo, create one from package.json then install exact deps
RUN if [ ! -f package-lock.json ]; then npm i --package-lock-only; fi
COPY package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build || true

# final image with node + nginx + tini
FROM node:20-alpine
RUN apk add --no-cache nginx tini gettext
WORKDIR /app
COPY --from=builder /app /app

# nginx template (envsubst will replace $PORT)
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

# copy start script (start.sh must be at repo root)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 10000
WORKDIR /app
CMD ["/sbin/tini", "--", "/usr/local/bin/start.sh"]