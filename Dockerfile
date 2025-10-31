FROM node:20-alpine

WORKDIR /app

# Install git

RUN apk add –no-cache git

# Clone community addon

RUN git clone –depth 1 https://github.com/Zaarrg/stremio-community-v5.git . &&   
npm ci –only=production &&   
npm run build

# Environment

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

# Start server

CMD [“sh”, “-c”, “node server.js –port=${PORT} –host=0.0.0.0”]
