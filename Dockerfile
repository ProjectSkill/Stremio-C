# --- Stage 1: Build the Node.js Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
# We install all dependencies now, including dev ones if we had them
RUN npm install
COPY . .
# This is a placeholder for a real build step if you ever add one
# RUN npm run build

# --- Stage 2: Production Environment ---
# We start from a clean, lean Nginx image
FROM nginx:alpine

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx configuration file into the container
COPY nginx.conf /etc/nginx/conf.d/

# Copy the built frontend files from our 'public' directory to the Nginx web root
COPY --from=backend-builder /app/public /usr/share/nginx/html

# Create a directory for the Node.js backend to live in
WORKDIR /app/backend

# Copy the backend code and its dependencies from the first stage
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json .
COPY --from=backend-builder /app/server.js .

# Expose port 10000, which is the port our Nginx server is listening on
EXPOSE 10000

# This is the command that starts EVERYTHING.
# It starts the Node.js backend API in the background (&) and then starts the Nginx server in the foreground.
CMD ["/bin/sh", "-c", "node /app/backend/server.js & nginx -g 'daemon off;'"]