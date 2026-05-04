<div align="center">
  <h1>Docker Setup - AegisMesh</h1>
  <p>Complete Docker setup for containerizing the AegisMesh IAM application.</p>
</div>

## Files Created

- `backend/Dockerfile` - Production backend image
- `backend/.dockerignore` - Backend build context exclusions
- `frontend/Dockerfile` - Production frontend image (Nginx)
- `frontend/Dockerfile.dev` - Development frontend image
- `frontend/.dockerignore` - Frontend build context exclusions
- `frontend/nginx.conf` - Nginx configuration for SPA routing
- `docker-compose.yml` - Production orchestration (3 services: DB, Backend, Frontend)
- `docker-compose.dev.yml` - Development override with live reload
- `.env.example` - Environment variables template

## Quick Start

### Production Setup

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Update sensitive values in `.env`:**
   - `DB_PASSWORD` - Change to a secure password
   - `JWT_SECRET` - Generate a secure token
   - `REFRESH_TOKEN_SECRET` - Generate a secure token
   - `SMTP_*` - Configure email settings

3. **Build and start containers:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Development Setup

```bash
# Run with development overrides (hot reload enabled)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend runs at http://localhost:5173 (Vite dev server)
# Backend runs at http://localhost:5000 (nodemon watching)
```

## Common Commands

### Build Images
```bash
# Rebuild all images
docker-compose build --no-cache

# Rebuild specific service
docker-compose build backend
```

### Container Management
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Stop containers
docker-compose stop

# Remove containers and volumes
docker-compose down -v
```

### Database Operations
```bash
# Run Prisma migrations
docker-compose exec backend npm run prisma:migrate

# Access database shell
docker-compose exec db psql -U admin -d aegismesh

# Seed database
docker-compose exec backend npm run seed
```

### Debugging
```bash
# Execute command in running container
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec db bash

# Inspect container
docker inspect aegismesh-backend
```

## Service Architecture

```
┌─────────────────────────────────────────┐
│           Docker Compose                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌──────────────┐    │
│  │  Frontend   │  │   Backend    │    │
│  │  (Nginx)    │  │  (Node.js)   │    │
│  │  :3000      │  │  :5000       │    │
│  └──────┬──────┘  └──────┬───────┘    │
│         │                │             │
│         └────────┬───────┘             │
│                  │                     │
│          ┌───────▼────────┐           │
│          │  PostgreSQL    │           │
│          │  (DB)          │           │
│          │  :5432         │           │
│          └────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

## Security Best Practices

**Implemented:**
- Multi-stage builds to reduce image size
- Non-root user execution (nodejs for backend, nginx for frontend)
- `.dockerignore` to exclude unnecessary files
- Environment-based configuration
- Health checks on all services
- Alpine Linux for smaller footprint

**Before Production:**
1. Change all default secrets in `.env`
2. Enable HTTPS/TLS in Nginx configuration
3. Set up proper logging aggregation
4. Configure resource limits (CPU, memory)
5. Use secrets management (Docker Secrets or external vault)
6. Enable restart policies (`unless-stopped` already set)

## Environment Variables

### Backend Variables
- `NODE_ENV` - Environment (production/development)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `FRONTEND_URL` - Frontend origin for CORS
- `SMTP_*` - Email configuration
- `LOG_LEVEL` - Logging level

### Frontend Variables
- `VITE_API_URL` - Backend API base URL

### Database Variables
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

## Troubleshooting

### Container fails to start
```bash
# Check logs
docker-compose logs backend
docker-compose logs db

# Common issues:
# - Port already in use: Change port in .env
# - Database connection error: Ensure db is healthy
# - Migrations failed: Check DATABASE_URL format
```

### Cannot access frontend
```bash
# Check if service is running
docker-compose ps frontend

# Access container directly
docker-compose exec frontend curl http://localhost:3000
```

### Database connection issues
```bash
# Verify connection string in backend logs
docker-compose logs backend | grep DATABASE_URL

# Connect directly to database
docker-compose exec db psql -U admin -d aegismesh
```

##  Image Sizes (Approximate)

- Backend: ~280 MB (Node 22 Alpine + dependencies)
- Frontend: ~50 MB (Alpine + Nginx)
- PostgreSQL: ~150 MB (Alpine)

Use `docker images` to check actual sizes.

## 🔄 Updating Services

```bash
# Update code and rebuild
git pull origin main
docker-compose build --no-cache backend
docker-compose up -d backend

# No downtime deployment (blue-green ready)
docker-compose up -d --scale backend=2
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Last Updated:** April 2026
**Status:** Production-Ready
