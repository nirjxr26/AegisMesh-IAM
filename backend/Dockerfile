# Build stage: prepare build and generate Prisma client
FROM node:22-alpine AS builder

# Set working dir and copy package files
WORKDIR /app
COPY package*.json ./

# Install all deps (dev included)
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy Prisma files
COPY prisma ./prisma

# Set DB URL for prisma generate (build-time)
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Generate Prisma client
RUN npm run prisma:generate


# Production stage
FROM node:22-alpine

WORKDIR /app

# Install runtime utilities (dumb-init, curl)
RUN apk add --no-cache dumb-init curl \
	&& mkdir -p /app/logs \
	&& addgroup -g 1001 -S nodejs \
	&& adduser -S nodejs -u 1001

# Copy runtime deps and Prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy runtime app files
COPY package.json ./
COPY src ./src

USER nodejs

EXPOSE 5000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["npm", "start"]
