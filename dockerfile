FROM node:18-alpine

WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# IMPORTANT: Don't use npm start if it outputs anything
# Use node directly to avoid npm's output
EXPOSE 8000
CMD ["node", "server.js"]  # NOT "npm", "start"