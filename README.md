<div align="center">

<h1>AegisMesh</h1>

<p>A self-hosted IAM platform for teams that need strong authorization rules, step-up authentication, session control, and auditability without outsourcing identity data.</p>

</div>

## Overview

AegisMesh is a full-stack identity and access management platform built for teams that want AWS IAM-style access controls without handing user data to a third party. It combines authentication, policy-driven authorization, MFA, session control, and security auditing in a single self-hosted stack.

The current implementation focuses on a few IAM rules that matter in production:

- DENY always wins over ALLOW when policies conflict.
- Sensitive actions require step-up authentication before they execute.
- Sessions can be revoked individually or in bulk without logging out every device.
- Audit logging is treated as a first-class control, not an afterthought.

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL 15, Prisma
- **Security & Auth:** JWT, Passport, TOTP MFA, OAuth 2.0
- **DevOps:** Docker, Kubernetes, Kustomize, Helm, Argo CD, GitHub Actions
- **Infra:** Terraform (ECR), AWS ECR, SealedSecrets, Falco
- **Observability:** Prometheus, Grafana

---

## Features

### Authentication & Sessions
- JWT access and refresh tokens with secure cookie handling.
- Google and GitHub OAuth with organization-level policy enforcement.
- TOTP-based MFA with backup code support.
- Active session viewer with per-session and bulk revocation.
- Step-up reauthentication for password changes, account deletion, and privileged token actions.

### Authorization & Access Control
- Dynamic RBAC engine across users, roles, groups, and policies.
- Explicit DENY precedence across direct, inherited, and attached policy sources.
- Policy simulator to test access outcomes before pushing changes.
- Role and group management with policy attachment and inheritance.
- Per-user effective permissions view for fast access audits.
- Scoped authorization for admin and support workflows.

### User & Organization Management
- Full user lifecycle: create, update, verify, bulk operations, delete.
- Organization-level admin controls with data export.
- Scoped API keys with privileged reauth and revocation.

### Security & Monitoring
- Centralized audit logs with filtering, export, streaming, and security alerts.
- Rate limiting, input validation, and middleware-based route protection.
- Notification center for user-facing security events and access changes.

---

## CI/CD Architecture

<div align="center">
<img
  src="./diagrams/_architecture.png"
  alt="Pipeline Architecture"
/>
</div>

### Pipeline Overview

- Push or PR triggers GitHub Actions CI, which runs lint, tests, and builds for both backend and frontend. On merge to main, CI builds multi-stage Docker images and pushes them to AWS ECR tagged by commit SHA.
- On CI success, the CD workflow resolves the latest ECR image tags, patches the Kustomize overlay files under `k8s/overlays/prod`, and commits those changes to the `main` branch.
- Argo CD watches that branch and applies the manifests to the cluster automatically. The SealedSecrets controller decrypts encrypted credentials into live Kubernetes Secrets.
- On rollout, init containers run in order — `wait-for-db` first, then `prisma-migrate` — before the app starts. Smoke tests run post-deploy; failure triggers an automatic revert of the overlay commit.

### Key Design Decisions

- CI does not run `kubectl apply`. CD writes overlay commits. Argo CD is the only thing that touches the cluster.
- Every deploy is a Git commit — fully auditable and revertable.
- SealedSecrets keep credentials encrypted in the repo. The in-cluster controller handles decryption.
- Smoke test failure triggers an automatic `git revert` of the overlay commit, rolling back the image update without manual intervention.

Full pipeline docs: [`ci-cd/README.md`](./ci-cd/README.md)

---

## Quick Start

### Prerequisites

```bash
git clone https://github.com/nirjxr26/Aegismesh-IAM.git
cd AegisMesh-IAM
cp .env.example .env
```

Edit `.env` with your values before starting.

---

### Option 1 — Docker (Recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Grafana | http://localhost:3002 |
| Prometheus | http://localhost:9090 |

Dev mode with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Full setup guide: [`Docker_Setup.md`](./Docker_Setup.md)

---

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

---

### Option 3 — Kubernetes (GitOps)

Provision infra with Terraform first, then push to main to trigger the full CI/CD pipeline. Argo CD will sync the cluster from the deploy branch automatically.

For local testing with Docker Desktop:

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

For CI/CD secrets, see [`ci-cd/README.md`](./ci-cd/README.md).

---

## Project Structure

```
├── backend/          # Node.js API, Prisma schema, auth, RBAC engine
├── frontend/         # React 19 app, Tailwind CSS
├── k8s/              # Kubernetes manifests, Kustomize overlays, SealedSecrets
├── terraform/        # AWS infra (ECR repositories)
├── monitoring/       # Prometheus config, Grafana dashboards
├── install/          # Cluster component install scripts
└── diagrams/         # Architecture diagrams
```

---

## Documentation

| Topic | Link |
|---|---|
| Docker Setup | [`Docker_Setup.md`](./Docker_Setup.md) |
| Kubernetes | [`k8s/README.md`](./k8s/README.md) |
| CI/CD Pipeline | [`ci-cd/README.md`](./ci-cd/README.md) |

---

## License

MIT — see [`LICENSE`](./LICENSE)
