<div align="center">

<h1>AegisMesh</h1>

</div>

Run your own IAM layer instead of paying for Auth0/Okta which covers policy-driven access, step-up auth, ML threat detection and DevSecOps pipeline.

---

## Overview

AegisMesh is a full-stack identity and access management platform built for teams that want AWS IAM-style access controls without handing user data to a third party.

Core design rules:

- DENY always wins over ALLOW when policies conflict.
- Sensitive actions require step-up authentication before they execute.
- Sessions can be revoked individually or in bulk without logging out every device.
- Audit logging is a first-class control, not an afterthought.
- The ML security engine scores every login in real time and feeds results back into the auth flow.

---

## Features

**Authentication & Sessions**

- JWT access and refresh tokens with secure cookie handling.
- Google and GitHub OAuth with organization-level policy enforcement.
- TOTP-based MFA with backup code support.
- Active session viewer with per-session and bulk revocation.
- Step-up reauthentication for password changes, account deletion, and privileged token actions.

**Authorization & Access Control**

- Dynamic RBAC engine across users, roles, groups, and policies.
- Explicit DENY precedence across direct, inherited, and attached policy sources.
- Policy simulator to test access outcomes before pushing changes.
- Per-user effective permissions view for fast access audits.

**User & Organization Management**

- Full user lifecycle: create, update, verify, bulk operations, delete.
- Organization-level admin controls with data export.
- Scoped API keys with privileged reauth and revocation.

**Audit & Monitoring**

- Centralized audit logs with filtering, export, streaming, and security alerts.
- Rate limiting, input validation, and middleware-based route protection.
- Notification center for user-facing security events and access changes.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Security Engine | Python, FastAPI, Scikit-learn, MLflow |
| Database | PostgreSQL 17, Prisma |
| Auth | JWT, Passport, TOTP MFA, OAuth 2.0 |
| DevOps | Docker, Kubernetes, Kustomize, Helm, ArgoCD, GitHub Actions |
| Infrastructure | Terraform, AWS ECR, EC2, SealedSecrets, Falco, CrowdSec |
| Observability | Datadog APM, Prometheus, Grafana, Loki |

---

## System Architecture Diagram
<div align="center">
<img
  src="./diagrams/system_architecture.png"
  alt="Pipeline Architecture"
/>
</div>


## CI/CD & MLOps Architecture
<div align="center">
<img
  src="./diagrams/ci_cd.png"
  alt="Pipeline Architecture"
/>
</div>

---

## Pipeline Walkthrough

### Dev Workflow & feature branch
- Edit backend (Node), frontend (React), or security-engine (FastAPI) code. 
- Test locally with `docker-compose up --build` or against a local k8s namespace. Push to a feature branch, open a PR into `main`.

### CI — triggers on push/PR touching `backend/`, `frontend/`, or `security-engine/`
- **Backend:** `npm ci --ignore-scripts` → ESLint → `npm test` (Jest)
- **Frontend:** install → syntax check → `vite build`
- **Docker validation:** builds all three Dockerfiles on the runner to catch broken builds before merge
- **On merge to `main` only:** authenticates to ECR, builds hardened prod images (non-root UID, read-only filesystem), tags with commit SHA + `v1`, pushes to ECR

### CD / GitOps — triggers on push to `main` or a green CI run
- Resolves the new image SHA and patches it into the Kustomize overlays (`patch-backend-image.yaml`, `patch-frontend-image.yaml`)
- Commits to a `bot/overlay-update-*` branch, opens a PR, auto-merges
- ArgoCD watches `main` and reconciles the live cluster to match

### Cluster rollout
Init containers run in strict order before the app is reachable:
1. `wait-for-db` — blocks until Postgres accepts connections
2. `prisma-migrate` — runs `npx prisma migrate deploy` using the new image
3. Backend, frontend, and security-engine pods go live

### Smoke tests (self-hosted runner, local cluster)
Checks rollout status, spins up a `curl` pod, hits `frontend:80/` to confirm real traffic, not just `Running`

### MLOps loop
- **Inference:** every login attempt triggers a non-blocking POST from backend to `security-engine:8000/analyze` with event context. FastAPI runs it through a scikit-learn pipeline (impute → scale → encode) into an Isolation Forest. Risk score > 0.7 forces step-up auth.
- **Retraining:** a CronJob hits `/train` daily at midnight, pulls up to 10k recent logs from Postgres, retrains the Isolation Forest, logs the run to MLflow, and hot-swaps `isolation_forest.joblib` in memory — no restart required.

**Key design decisions:**

- CI does not run `kubectl apply`. Only ArgoCD touches the cluster.
- Every deploy is a Git commit tied to an immutable image tag — fully auditable and revertable.
- SealedSecrets keep credentials encrypted in the repo. The in-cluster controller handles decryption.
- Kubelet credential-provider handles ECR auth. `imagePullSecrets` are legacy only.


---

## MLOps & Security Engine

The Security Engine is a FastAPI service that scores every login request against IP, time-of-day, and historical behavior signals. A high risk score triggers step-up MFA or blocks the request before the backend processes it.

**ML pipeline:**

- Model: Scikit-learn Isolation Forest trained on production audit logs.
- Preprocessing and inference are bundled into a single `Pipeline` object to prevent training-serving skew.
- MLflow tracks experiment runs, model versions, and staging-to-production promotion with a PostgreSQL backend.
- A Kubernetes CronJob handles daily retraining on fresh audit data without manual intervention.
- Grafana tracks which model version is serving traffic, monitors risk score distributions, and breaks down inference latency by stage.

---

## Observability

**Datadog (enterprise):**

- Distributed tracing from React Frontend through Node.js Backend to the Python Security Engine.
- Every log line is linked to a specific request trace for debugging.
- Falco Sidekick streams container intrusion alerts directly into Datadog Security Signals.
- APM can be paused via `DD_APM_ENABLED` in `.env` to manage costs.

**Grafana stack (local):**

- Prometheus collects system and application metrics.
- Loki aggregates container logs.
- Grafana dashboards cover auth rates, latency, error rates, and ML model health.

---

## Security

**Build-time:**

- All images use multi-stage builds. Application code is set to mode `555` (read-only) at build time.
- System packages and Python dependencies are pinned to specific versions.

**Runtime:**

- All containers run as non-root (`UID 10001`) with `drop: [ALL]` capabilities and `allowPrivilegeEscalation: false`.
- Falco monitors container syscalls and streams alerts to Datadog Security Signals.
- CrowdSec handles brute-force and malicious IP blocking at the network level.
- SealedSecrets keep credentials encrypted in Git.

**CI security:**

- SonarCloud quality gates run on every PR.
- CodeQL performs deep semantic analysis for complex vulnerability patterns.
- Trivy scans Docker images and Kubernetes manifests for CVEs.

---

## Quick Start

### Prerequisites

```bash
git clone https://github.com/nirjxr26/AegisMesh-IAM.git
cd AegisMesh-IAM
cp .env.example .env
```

Edit `.env` with your values before starting.

### Option 1 — Docker

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Security Engine | http://localhost:8000 |
| Grafana | http://localhost:3010 |
| MLflow | http://localhost:5001 |
| Prometheus | http://localhost:9090 |

Full setup guide: [`docker_setup`](docs/docker.md)

### Option 2 — Local Development

Requires Node.js 22+, Python 3.11+, and PostgreSQL 17+.

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run dev        # runs on :5000

# Security Engine
cd security-engine
pip install -r requirements.txt
python src/main.py # runs on :8000
```

---

## Project Structure

```
├── backend/          
├── frontend/         
├── security-engine/  # Python ML engine, MLflow integration
├── k8s/              
├── terraform/        
├── monitoring/       # Prometheus, Grafana, and MLflow configurations
├── .github/          # GHA workflows
├── scripts/          # Cluster install, maintenance and backup scripts
```

---

## Documentation

**Setup**
- [Docker Setup](docs/docker.md)
- [Local Development](#option-2--local-development)

**Deployment**
- [CI/CD Pipeline](ci-cd/README.md)
- [GitHub Runner](docs/github-runner.md)

**Kubernetes**
- [K8s Overview](k8s/README.md)
- [Ingress & TLS](docs/devops/ingress-and-tls.md)
- [HPA](docs/devops/hpa-metrics-server.md)

**Security**
- [SealedSecrets](docs/devops/sealedsecrets-sops.md)
- [Falco](docs/devops/falco.md)
- [Kyverno](docs/devops/kyverno-networkpolicy.md)

**Reliability**
- [Argo Rollouts](docs/devops/argo-rollouts.md)
- [Backups (Velero)](docs/devops/backups-velero-minio.md)

**Observability**
- [Loki Stack](docs/devops/observability-loki-tempo.md)

→ [Full documentation index](docs/README.md)

