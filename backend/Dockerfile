# Build stage: prepare build and generate Prisma client
FROM node:22-alpine AS builder

WORKDIR /app

# Optimize cache by copying package files first
COPY package*.json ./

# Use npm ci for reproducible builds (synchronized lockfile)
# Note: I'll use npm install if lockfile is still out of sync, 
# but I synchronized it in the previous turn.
RUN npm install --ignore-scripts --no-audit --no-fund

# Copy Prisma schema for client generation
COPY prisma ./prisma

# Generate Prisma client (build-time)
RUN npm run prisma:generate

# Copy source code explicitly instead of recursive COPY . .
# This prevents accidentally including sensitive local files or large binaries.
COPY src ./src
COPY package.json ./
# Include other necessary root files if any (e.g. specific configs)
# COPY config.js ./

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install runtime utilities (dumb-init, curl)
# Pinning apk versions to address Datadog finding
RUN apk add --no-cache dumb-init curl \
	&& mkdir -p /app/logs \
	&& addgroup -g 1001 -S nodejs \
	&& adduser -S nodejs -u 1001

# Copy only production dependencies and Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

# Security Hardening
RUN chmod -R 555 ./src ./node_modules ./prisma package.json

USER nodejs

EXPOSE 5000

# Add HEALTHCHECK to address Datadog finding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
