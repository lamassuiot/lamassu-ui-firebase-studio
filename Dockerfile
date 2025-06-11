
# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
# Using npm ci for cleaner installs in CI/build environments
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
# This will output to the 'out' directory due to `output: 'export'` in next.config.ts
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine

# Remove default Nginx server configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static assets from the builder stage
# The 'out' directory contains the result of `next export`
COPY --from=builder /app/out /var/www/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
