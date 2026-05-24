# Build stage - for running migrations and setup
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy prisma schema and migrations
COPY prisma ./prisma

# Provide build-time database URL required for prisma generate validation.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Generate Prisma client
RUN npm run prisma:generate


# Production stage
FROM node:22-alpine

WORKDIR /app

# Install runtime utilities used by container startup and healthchecks
RUN apk add --no-cache dumb-init curl \
	&& mkdir -p /app/logs \
	&& addgroup -g 1001 -S nodejs \
	&& adduser -S nodejs -u 1001

# Copy all node_modules and app code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy only the runtime app inputs explicitly.
COPY package.json ./
COPY src ./src

USER nodejs

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
