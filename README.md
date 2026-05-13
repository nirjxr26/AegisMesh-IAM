<div align="center">

<h1>AegisMesh</h1>

<p>A self-hosted IAM platform with RBAC, MFA, session management, and audit logging.</p>
</div>

## Overview

AegisMesh is a full-stack identity and access management platform built for teams that want AWS IAM-style access controls without handing user data to a third party. It handles authentication, fine-grained RBAC, MFA, session control, and security auditing — all in one place, self-hosted.


## Tech Stack

| Layer | Tools |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL 15, Prisma |
| **Security & Auth** | JWT, Passport, TOTP MFA, OAuth 2.0 |
| **DevOps** | Docker, Kubernetes, Jenkins, Prometheus, Grafana |



## Features

### Authentication & Sessions
- JWT access and refresh tokens with secure cookie handling.
- Google and GitHub OAuth with organization-level policy enforcement.
- TOTP-based MFA with backup code support.
- Active session viewer with per-session and bulk revocation.

### Authorization & Access Control
- Dynamic RBAC engine across users, roles, groups, and policies. Explicit DENY always wins.
- Policy simulator — test access outcomes before pushing changes.
- Role and group management with policy attachment and inheritance.
- Per-user effective permissions view for fast access audits.

### User & Organization Management
- Full user lifecycle: create, update, verify, bulk operations, delete.
- Organization-level admin controls with data export.
- Scoped API keys with privileged reauth and revocation.

### Security & Monitoring
- Reauthentication required for sensitive actions (password change, account deletion, privileged tokens).
- Centralized audit logs with filtering, export, and security alerts.
- Rate limiting, input validation, and middleware-based route protection.
- Notification center for user-facing security events.


## Application Architecture
![Architecture](./diagrams/architecture__.png)


## CI/CD Architecture
<div align="center">
<img 
  src="./diagrams/devops.png" 
  alt="Pipeline Architecture"
  width="300"
  height="700"
/>
</div>


**Pipeline overview:**
- Push or PR triggers Jenkins via webhook. Parallel frontend and backend jobs run lint, tests, and build.
- On success, Jenkins builds and pushes Docker images to the configured registry.
- Jenkins applies Kubernetes manifests and waits for readiness probes before marking the deploy complete.
- Prometheus scrapes `/metrics`. Grafana handles dashboards and alerts. Failed rollouts revert with `kubectl rollout undo`.

Full pipeline docs: [`jenkins/README.md`](./jenkins/README.md)

---

## Quick Start

### Prerequisites

Clone the repo first:

```bash
git clone https://github.com/nirjxr26/Aegismesh-IAM.git
cd AegisMesh-IAM
cp .env.example .env
```

Edit `.env` with your values before starting any option below.



### Option 1 — Docker (Recommended)

Requires Docker and Docker Compose.

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:5000 |
| Grafana | http://localhost:3002 |
| Prometheus | http://localhost:9090 |

Dev mode with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Full setup guide: [`Docker_Setup.md`](./Docker_Setup.md)


### Option 2 — Local Development

Requires Node.js 18+ and PostgreSQL 15+.

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run dev        # runs on :5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev        # runs on :5173
```



### Option 3 — Kubernetes (Docker Desktop)

```bash
docker build -t aegismesh-backend:local ./backend
docker build -t aegismesh-frontend:local ./frontend
kubectl apply -k ./k8s
kubectl -n aegismesh port-forward svc/frontend 3000:3000
kubectl -n aegismesh port-forward svc/backend 5000:5000
```

App runs at `http://aegismesh.localhost:3000`.

Full guide: [`k8s/README.md`](./k8s/README.md)

---

## Environment Variables

See [`.env.example`](./.env.example) for all options. Key variables:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/aegismesh

JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

SMTP_HOST=smtp.ethereal.email
SMTP_USER=
SMTP_PASS=

VITE_API_URL=http://localhost:5000
```

---

## Project Structure

```
├── backend/          # Node.js API, Prisma schema, auth, RBAC engine
├── frontend/         # React 19 app, Tailwind CSS
├── k8s/              # Kubernetes manifests and kustomization
├── monitoring/       # Prometheus config, Grafana dashboards
├── jenkins/          # Jenkinsfile and pipeline docs
└── diagrams/         # Architecture diagrams
```

---

## Documentation

| Topic | Link |
|---|---|
| Docker Setup | [`Docker_Setup.md`](./Docker_Setup.md) |
| Kubernetes | [`k8s/README.md`](./k8s/README.md) |
| Jenkins CI/CD | [`jenkins/README.md`](./jenkins/README.md) |

---

## License

MIT — see [`LICENSE`](./LICENSE)