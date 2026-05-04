<div align="center">
  <h1>AegisMesh</h1>
  <p>Enterprise-ready IAM platform with MFA, OAuth, session control, audit logs, and dynamic RBAC in one unified admin console.</p>
</div>


## Problem Statement

Managing authentication, authorization, and security governance across modern applications is often fragmented and difficult to scale. Teams need centralized identity controls, policy-based permissions, and clear auditability for sensitive operations. AegisMesh solves this by combining auth, MFA, RBAC, and audit logging into a single platform.


## Features

### Authentication & Sessions

- **Secure Authentication:** Supports email/password auth, JWT access and refresh tokens, secure cookies, and token refresh flow.
- **OAuth Sign-In:** Google and GitHub OAuth login with organization policy enforcement to allow or block OAuth.
- **Multi-Factor Authentication (MFA):** TOTP setup, verification, disable flow, and backup-code regeneration for stronger account security.
- **Session Control:** View active sessions, revoke specific sessions, revoke all other sessions, and monitor device-level access.

### Authorization & Access Control

- **Dynamic RBAC Engine:** Evaluates permissions in real time across users, roles, groups, and policies, with explicit DENY always overriding ALLOW.
- **Policy Simulation:** Lets admins test policy outcomes before rollout to validate access behavior and reduce permission mistakes.
- **Role Management:** Create, update, delete, template, and assign roles, including attaching and detaching policies per role.
- **Group Management:** Organize users into groups, then attach roles to groups for scalable permission inheritance.
- **Granular User Permissions View:** Inspect effective user permissions, assigned roles, and group memberships for fast access audits.

### User & Organization Management

- **User Lifecycle Management:** Create users, update status, verify email, delete users, and perform bulk operations (status, roles, groups, delete, export).
- **Organization Administration:** SuperAdmin controls for organization settings, policy reset, and organization data export.
- **API Key Management:** Create scoped API keys/tokens with extra reauth for privileged scopes, plus key revocation.

### Security, Monitoring & Operations

- **Reauthentication for Sensitive Actions:** Requires fresh identity verification for high-risk operations like password change, account deletion, and privileged token creation.
- **Audit & Security Monitoring:** Centralized audit logs with stream, stats, security alerts, user-specific history, export, and cleanup actions.
- **Notification Center:** Fetch notifications, mark single/all as read, and delete notification entries.
- **Security Hardening:** Built-in validation, rate limiting, account protection controls, and middleware-driven authorization on protected routes.


## Architecture

![Architecture](./diagrams/Architecture_.png)


## Application Flow 

1. User authenticates (email/password, OAuth, MFA) via frontend.
2. Backend issues JWT tokens and manages sessions.
3. Each API call passes through security, authentication, and RBAC checks.
4. Authorized actions are performed; sensitive actions require reauthentication and are logged.
5. Frontend updates state based on backend responses.

**CI/CD:**
- Jenkins pipeline runs on code changes: installs dependencies, lints, tests, builds, and (optionally) builds/pushes Docker images and deploys to Kubernetes.

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS  
**Backend:** Node.js, Express  
**Database:** PostgreSQL, Prisma  
**Security & Auth:** JWT, Passport, TOTP MFA, OAuth

## How It Works

1. Users authenticate via email/password or OAuth, with MFA where enabled.
2. Backend issues JWT access/refresh tokens and tracks active sessions.
3. RBAC engine evaluates user permissions from roles, groups, and policies.
4. Protected routes enforce auth + authorization middleware before actions are executed.
5. Sensitive actions are written to audit logs for traceability and compliance.

## Installation & Setup

### Option 1: Docker (Recommended)

**Requirements:** Docker & Docker Compose

```bash
git clone https://github.com/Nirjar26/Aegismesh-IAM.git
cd AegisMesh-IAM

# Copy and configure environment variables
cp .env.example .env

# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up --build
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

**Development mode with hot reload:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

For detailed Docker setup instructions, see [Docker_Setup.md](./DOCKER_SETUP.md).

### Option 2: Local Development

**Requirements:** Node.js 18+, PostgreSQL 15+

```bash
git clone https://github.com/Nirjar26/Aegismesh-IAM.git
cd AegisMesh-IAM

# Backend setup
cd backend
npm install
npm run prisma:generate

# Frontend setup
cd ../frontend
npm install
```

**Run services:**
```bash
# Terminal 1: Backend (default: port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (default: port 5173)
cd frontend
npm run dev
```

### Option 3: Kubernetes (Docker Desktop)

This repository includes Kubernetes manifests for PostgreSQL, backend, and frontend, configured for Docker Desktop Kubernetes.

Quick start:

```bash
docker build -t aegismesh-backend:local-v2 ./backend
docker build -t aegismesh-frontend:local ./frontend
kubectl apply -k ./k8s
kubectl -n aegismesh port-forward svc/frontend 3000:3000
kubectl -n aegismesh port-forward svc/backend 5000:5000
```

Open the app at `http://aegismesh.localhost:3000`.

Full guide: [k8s/README.md](./k8s/README.md)

## Jenkins CI/CD

This repository includes a ready-to-use Jenkins pipeline at `Jenkinsfile`.

### Pipeline stages

1. Checkout code
2. Install dependencies (`backend` + `frontend`) in parallel
3. Run backend tests, frontend lint, and frontend build in parallel
4. Optionally build Docker images for backend and frontend
5. Archive frontend build artifacts

### Quick start

1. Create a Jenkins **Pipeline** job.
2. Set **Pipeline script from SCM** and point to this repository.
3. Set **Script Path** to `Jenkinsfile`.
4. Run a build.

Detailed Jenkins setup (plugins, node requirements, parameters, and first-run checklist):
[jenkins/README.md](./jenkins/README.md)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database (Docker uses 'db' as hostname, local uses 'localhost')
DATABASE_URL=""

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# OAuth (Google & GitHub)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
SMTP_HOST=smtp.ethereal.email
SMTP_USER=
SMTP_PASS=

# Frontend API URL
VITE_API_URL="http://localhost:5000"
```

See [`.env.example`](./.env.example) for all available options.

## API Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh-token`
- `GET /api/auth/me`
- `GET /api/roles`
- `POST /api/policies`
- `GET /api/users/:id/permissions`

## Folder Structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── k8s/
│   ├── manifests/
│   ├── deploy-docker-desktop.ps1
│   ├── kustomization.yaml
│   └── README.md
├── diagrams/
└── README.md
```

## License

MIT License

## Author / Contact

Nirjar Goswami  
GitHub: https://github.com/Nirjar26

