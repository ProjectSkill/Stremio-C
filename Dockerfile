FROM node:20-alpine

WORKDIR /app

# Copy your project files into the container
COPY . .

# Install dependencies
RUN npm install

# Optional: only if you have a "build" script in package.json
# RUN npm run build

EXPOSE 8000

# Start the app
CMD ["node", "server.js"]
