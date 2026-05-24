# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy build inputs explicitly so env files and node_modules stay out of the image.
COPY eslint.config.js ./
COPY index.html ./
COPY nginx.conf ./
COPY tailwind.config.js ./
COPY vite.config.js ./
COPY public ./public
COPY src ./src

# Build the application
RUN npm run build


# Production stage - Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template; nginx entrypoint will envsubst it at startup.
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
