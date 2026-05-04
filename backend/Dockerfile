# Multi-stage build for production
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production


# Build stage - for running migrations and setup
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

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
RUN apk add --no-cache dumb-init curl

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy app code
COPY . .

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
