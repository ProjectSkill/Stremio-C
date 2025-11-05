FROM node:18-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY package*.json ./
COPY server.js ./
COPY nginx.conf /etc/nginx/nginx.conf

RUN npm install && mkdir -p /run/nginx

EXPOSE 80

CMD sh -c "nginx && node server.js"