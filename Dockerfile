FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build || true

FROM nginx:alpine
# ensure the tag exists and is small
COPY --from=builder /app /app
# install tini for clean PID 1 & signal handling
RUN apk add --no-cache tini
# nginx config
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
  listen 10000;
  location / {
    proxy_pass http://127.0.0.1:11470;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
EOF
EXPOSE 10000
# run tini to manage both processes; start node in background then nginx in foreground
CMD ["/sbin/tini", "--", "sh", "-c", "cd /app && node server.js --transport=https://$RENDER_EXTERNAL_HOSTNAME/manifest.json & nginx -g 'daemon off;'"]