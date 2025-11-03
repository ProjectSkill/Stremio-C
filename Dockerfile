# ────── LIGHTEST POSSIBLE ──────
FROM node:20-alpine

WORKDIR /app
COPY server.js package*.json ./
RUN npm ci --omit=dev

# Render gives us $PORT (10000). We obey.
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js", "--transport=https://$RENDER_EXTERNAL_HOSTNAME/manifest.json"]