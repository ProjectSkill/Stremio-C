# Use a lightweight Node.js image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage Docker layer caching
COPY package*.json ./

# Install the dependencies defined in package.json
RUN npm ci --omit=dev --no-audit --prefer-offline


# Copy the main application file
COPY server.js .

# Expose the port the app runs on (Render will use this)
EXPOSE 3000

# The command to run when the container starts
CMD [ "npm", "start" ]