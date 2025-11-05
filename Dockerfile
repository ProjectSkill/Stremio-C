FROM nginx:alpine

# Install dependencies if needed for Tsardis
RUN apk add --no-cache curl

# Copy configurations
COPY nginx.conf /etc/nginx/nginx.conf
COPY html/ /usr/share/nginx/html/

# If you have Tsardis backend files
# COPY tsardis/ /app/tsardis/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]