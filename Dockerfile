FROM node:20-alpine

# Install git if you really need to clone
RUN apk add --no-cache git

WORKDIR /app

# If deploying your own repo, COPY instead of git clone:
# COPY . .

# If you must clone:
RUN git clone https://github.com/Zaarrg/stremio-community-v5.git . 

RUN npm install

# Only run build if package.json has a "build" script
# RUN npm run build

EXPOSE 8000

CMD ["node", "server.js", "--port=8000", "--host=0.0.0.0"]
