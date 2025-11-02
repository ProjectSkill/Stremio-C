# builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# copy package files; allow missing package-lock.json
COPY package.json package-lock.json* ./

# prefer npm ci when lockfile exists, fallback to npm install otherwise
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .
RUN npm run build || true
RUN echo "built at $(date -u)" > build-info.txt

# runtime stage
FROM nginx:alpine
WORKDIR /app

# copy app and node runtime artifacts
COPY --from=builder /app /app

# install tini for reliable PID 1 and signal forwarding
RUN apk add --no-cache tini

# copy start script (will generate nginx conf at runtime)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# expose a default port (Render will supply PORT at runtime)
ENV PORT 10000
ENV NODE_PORT 11470
EXPOSE 10000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/start.sh"]