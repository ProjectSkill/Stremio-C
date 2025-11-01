FROM node:18-alpine
WORKDIR /app
COPY package*.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
 && npm ci --production --no-audit --no-fund
COPY . .
RUN mkdir -p public
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"
CMD ["npm", "start"]