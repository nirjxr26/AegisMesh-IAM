# Build stage
FROM node:22.16.0-alpine AS builder

WORKDIR /app

# Optimize caching by copying package files first (monorepo root + workspace deps)
COPY --chown=root:root --chmod=555 package*.json turbo.json ./
COPY --chown=root:root --chmod=555 apps/dashboard/package*.json ./apps/dashboard/
COPY --chown=root:root --chmod=555 packages/shared/package*.json ./packages/shared/

# Use npm install with cache mount for faster builds
RUN --mount=type=cache,target=/root/.npm \
    npm install --ignore-scripts --no-audit --no-fund

# Copy and build shared package first
COPY --chown=root:root --chmod=555 packages/shared ./packages/shared
RUN npx turbo run build --filter=@aegismesh/shared

# Copy dashboard config and source
COPY --chown=root:root --chmod=555 apps/dashboard/eslint.config.js ./apps/dashboard/
COPY --chown=root:root --chmod=555 apps/dashboard/index.html ./apps/dashboard/
COPY --chown=root:root --chmod=555 apps/dashboard/nginx.conf ./apps/dashboard/
COPY --chown=root:root --chmod=555 apps/dashboard/tailwind.config.js ./apps/dashboard/
COPY --chown=root:root --chmod=555 apps/dashboard/vite.config.js ./apps/dashboard/
COPY --chown=root:root --chmod=555 apps/dashboard/public ./apps/dashboard/public
COPY --chown=root:root --chmod=555 apps/dashboard/src ./apps/dashboard/src

# Build the application
RUN npx turbo run build --filter=frontend

# Production stage - Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
# Install curl for healthcheck
RUN apk add --no-cache curl
USER nginx

# Copy only the built assets and configuration with read-only permissions
COPY --from=builder --chown=root:root --chmod=555 /app/apps/dashboard/dist /usr/share/nginx/html
COPY --chown=root:root --chmod=555 apps/dashboard/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
