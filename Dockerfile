FROM node:20-alpine

WORKDIR /app

RUN apk add –no-cache git

RUN git clone https://github.com/Zaarrg/stremio-community-v5.git .

RUN npm install

RUN npm run build

EXPOSE 8000

CMD [“node”, “server.js”, “–port=8000”, “–host=0.0.0.0”]
