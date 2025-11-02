FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci --omit=dev

FROM nginx:alpine-slim
COPY --from=builder /app /app
RUN apk add --no-cache nodejs npm

RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 10000;
    location / { proxy_pass http://127.0.0.1:11470; }
}
EOF

EXPOSE 10000
CMD cd /app && node server.js --transport=https://$RENDER_EXTERNAL_HOSTNAME/manifest.json & nginx -g 'daemon off;'