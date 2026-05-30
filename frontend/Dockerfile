# Build stage: create production build (explicit copies only)
FROM node:22-alpine AS builder

# Set working dir and copy package files
WORKDIR /app
COPY package*.json ./

# Install deps
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy only build inputs to avoid leaking secrets
COPY eslint.config.js ./
COPY index.html ./
COPY nginx.conf ./
COPY tailwind.config.js ./
COPY vite.config.js ./
COPY public ./public
COPY src ./src

# Build app
RUN npm run build


# Production stage - Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Temporarily become root to install curl, then revert
USER root
RUN apk add --no-cache curl
USER nginx

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template; envsubst runs at startup
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Final image contains only built assets
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
