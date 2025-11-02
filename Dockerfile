FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json gen-lock.yml scripts/convert-gen-lock.js ./
# convert gen-lock.yml -> package-lock.json (if you use conversion), otherwise omit
RUN apk add --no-cache curl ca-certificates python3 make g++ \
  && node scripts/convert-gen-lock.js gen-lock.yml package-lock.json || true
RUN npm ci --omit=dev
COPY . .
RUN npm run build || true

FROM node:20-alpine
RUN apk add --no-cache nginx tini gettext
WORKDIR /app
COPY --from=builder /app /app
# nginx template (uses envsubst to substitute $PORT)
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
COPY scripts/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh
EXPOSE 10000
WORKDIR /app
CMD ["/sbin/tini", "--", "/usr/local/bin/start.sh"]