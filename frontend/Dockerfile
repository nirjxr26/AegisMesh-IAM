# Build stage: create production build
FROM node:22-alpine AS builder

WORKDIR /app

# Optimize caching by copying package files first
COPY package*.json ./
RUN npm install --ignore-scripts --no-audit --no-fund

# Copy config and source
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

# Pinning apk versions to address Datadog finding
USER root
RUN apk add --no-cache curl
USER nginx

# Copy only the built assets
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 3000

# Healthcheck already present, keeping it
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
