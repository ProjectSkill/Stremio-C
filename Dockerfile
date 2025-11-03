# --- Stage 1: Build ---
# Reasoning: Use a standard Node.js image to install dependencies. Using Alpine Linux for a smaller footprint.
FROM node:20-alpine AS builder

WORKDIR /app

# Reasoning: Copy package.json and package-lock.json first. Docker caches this layer.
# If these files don't change, 'npm install' won't re-run on subsequent builds, making it faster.
COPY package*.json ./
RUN npm install --only=production

# Reasoning: Copy the rest of the application code.
COPY . .

# --- Stage 2: Production ---
# Reasoning: Use a minimal Alpine image for the final container to keep it as small as possible.
FROM node:20-alpine

WORKDIR /app

# Reasoning: Copy the installed node_modules and the application code from the builder stage.
COPY --from=builder /app .

# Reasoning: This is the "magic" line for Render. It tells Render's proxy that our app
# inside the container will be listening on port 10000.
EXPOSE 10000

# Reasoning: The command to run when the container starts. This executes "npm start" from our package.json.
CMD ["npm", "start"]