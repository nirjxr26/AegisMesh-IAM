# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Optimize cache by copying package files first
COPY --chown=root:root --chmod=555 package*.json ./

# Use npm install with cache mount for faster builds
RUN --mount=type=cache,target=/root/.npm \
    sh -lc "npm ci --ignore-scripts --no-audit --no-fund || npm install --ignore-scripts --no-audit --no-fund"

# Copy Prisma schema and generate client
COPY --chown=root:root --chmod=555 prisma ./prisma
RUN npm run prisma:generate

# Copy source code
COPY --chown=root:root --chmod=555 src ./src

# Production stage
FROM node:22-alpine

WORKDIR /app

# Use production environment
ENV NODE_ENV=production

# Install runtime utilities and setup user
RUN apk add --no-cache dumb-init=1.2.5-r4 curl=8.20.0-r1 \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs \
    && mkdir -p /app/logs \
    && chown -R nodejs:nodejs /app/logs

# Copy production files with read-only permissions for security
COPY --from=builder --chown=root:root --chmod=555 /app/node_modules ./node_modules
COPY --from=builder --chown=root:root --chmod=555 /app/prisma ./prisma
COPY --from=builder --chown=root:root --chmod=555 /app/package.json ./package.json
COPY --from=builder --chown=root:root --chmod=555 /app/src ./src

# Surgical permissions (if needed for specific files)
# Instead of recursive chmod 555, we rely on the container user and read-only FS if possible
# For now, ensuring ownership is enough for standard node apps

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
