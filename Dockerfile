# builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
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

# make entrypoint script executable (script will generate nginx conf at runtime)
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 10000
ENV PORT 10000
ENV NODE_PORT 11470

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/start.sh"]