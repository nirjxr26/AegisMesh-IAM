# Build stage
# Note: we intentionally avoid `COPY . .` to prevent accidentally adding
# sensitive files into the image. See .dockerignore for excluded patterns.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
# Copy package files (include lockfile for reproducible installs)
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy build inputs explicitly so env files, .npmrc and node_modules stay out of the image.
# Add files here rather than using a recursive copy to avoid leaking secrets into the build context.
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

# Install curl for healthcheck. The unprivileged nginx image runs as a non-root
# user by default, which prevents package installation. Temporarily switch to
# root to install the package, then return to the unprivileged user.
USER root
RUN apk add --no-cache curl
USER nginx

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template; nginx entrypoint will envsubst it at startup.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# The final image only contains the built `dist`. No source, secrets, or node_modules are copied.

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
