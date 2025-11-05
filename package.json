FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY server.js ./
COPY manifest.json ./

RUN npm install

EXPOSE 10000

CMD ["node", "server.js"]