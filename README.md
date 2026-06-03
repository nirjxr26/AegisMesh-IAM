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
- **Machine Learning (MLOps):** Scikit-learn, MLflow, Feature Pipelines
- **Database:** PostgreSQL 17, Prisma
- **Security & Auth:** JWT, Passport, TOTP MFA, OAuth 2.0
- **DevOps:** Docker, Kubernetes, Kustomize, Helm, Argo CD, GitHub Actions
- **Infra:** Terraform (ECR), AWS ECR, SealedSecrets, Falco, CrowdSec
- **Observability:** Datadog (Enterprise APM & Security), Prometheus, Grafana (Local Dashboards)

---

## 🚀 Recent Enhancements: Observability & Optimization

We have recently upgraded the AegisMesh ecosystem with enterprise-grade monitoring and high-efficiency builds.

### 📊 Datadog Enterprise Observability
- **Distributed Tracing (APM):** End-to-end request tracking from React Frontend → Node.js Backend → Python Security Engine.
- **Log-to-Trace Correlation:** Every log line is automatically linked to a specific user request trace for rapid debugging.
- **Continuous Profiling:** Real-time code-level performance monitoring to identify CPU/RAM bottlenecks in the ML inference logic.
- **Runtime Security Signals:** Integrated **Falco Sidekick** to stream container intrusion alerts directly into the Datadog Security dashboard.
- **Feature Toggle:** APM can be easily paused/resumed via the `DD_APM_ENABLED` flag in the `.env` file to manage costs.

### ⚡ Optimized Build Pipeline
- **Multi-Stage Docker Builds:** All services (Backend, Frontend, Security Engine, MLflow) now use multi-stage builds, reducing image sizes by up to 60% and cutting build times.
- **Parallel Compilation:** CI/CD pipelines and local Docker Compose now support parallel image building.
- **Security Hardening:** Automatic `chmod -R 555` during build time ensures application code is read-only at runtime, preventing file-system based exploits.
- **Pinned Dependencies:** All system-level packages (apk/apt) and Python requirements are pinned to specific versions to prevent supply-chain drift.

### 🤖 Advanced MLOps Lifecycle
- **Unified ML Pipeline:** Preprocessing and inference are bundled into atomic Scikit-learn Pipeline objects to ensure zero training-serving skew.
- **Automated Retraining:** Kubernetes CronJobs handle the full data-to-model-registry flow without human intervention.
- **Health-Aware Inference:** Added granular healthchecks to the Security Engine and MLflow to ensure the AI feedback loop is always available.

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

## Production MLOps & Threat Intelligence

AegisMesh includes a dedicated **Security Engine** powered by Machine Learning to detect anomalous behavior and provide real-time risk scoring.

### ML Features
- **Anomaly Detection:** Real-time risk scoring using Scikit-learn Isolation Forest, analyzing audit logs for suspicious patterns.
- **Robust Pipelines:** Data preprocessing (imputation, scaling, encoding) is bundled with the model in atomic Scikit-learn `Pipeline` objects to prevent training-serving skew.
- **Experiment Tracking:** Full lineage tracking in **MLflow** with a persistent PostgreSQL backend.
- **Model Registry:** Automated versioning and staging-to-production promotion flow.
- **Continuous Training (CT):** Kubernetes CronJobs automate daily retraining on fresh production audit data.

### MLOps Observability
- **Model Lineage:** Track which model version is currently serving traffic directly in Grafana.
- **Drift Detection:** Monitor model confidence and risk score distributions to identify behavioral shifts.
- **Performance Breakdown:** Stacked latency tracking separating "Data Cleaning" from "ML Inference" time.

---

## Hardened Infrastructure Security

- **Least Privilege:** All containers (Backend, Frontend, ML Engine, MLflow) run as strict non-root users (`UID 10001`).
- **Read-Only Runtime:** Source code and dependencies are set to mode `555` (Read-only) to prevent runtime code injection.
- **Kubernetes Hardening:** Pods are locked down with `drop: [ALL]` capabilities and `allowPrivilegeEscalation: false`.
- **RBAC Tightening:** Zero-trust RBAC for infrastructure operators (Trivy, Falco).

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
- On CI success, the CD workflow uses the triggering commit SHA as the image tag, patches the Kustomize overlay files under `k8s/overlays/prod`, and opens a pull request from a bot branch back to `main`.
- Argo CD watches the deploy path after merge and applies the manifests to the cluster automatically. The SealedSecrets controller decrypts encrypted credentials into live Kubernetes Secrets.
- K3s nodes use the kubelet ECR credential-provider path, so image pulls do not depend on rotating docker-registry secrets.
- On rollout, init containers run in order — `wait-for-db` first, then `prisma-migrate` — before the app starts. Smoke tests run post-deploy; failure triggers an automatic revert of the overlay commit.

### Key Design Decisions

- CI does not run `kubectl apply`. CD writes overlay commits. Argo CD is the only thing that touches the cluster.
- Every deploy is a Git commit tied to an immutable image tag — fully auditable and revertable.
- SealedSecrets keep credentials encrypted in the repo. The in-cluster controller handles decryption.
- Kubelet credential-provider auth is the long-term ECR mechanism; `imagePullSecrets` are legacy only.
- Smoke test failure triggers an automatic `git revert` of the overlay commit, rolling back the image update without manual intervention.

The CD workflow uses the GitHub Actions token to create and merge pull requests.

Full pipeline docs: [`ci-cd/README.md`](./ci-cd/README.md)

---

## 🎮 Operations Command Center

| Feature | Tool | Purpose | Access Link |
| :--- | :--- | :--- | :--- |
| **Distributed Tracing** | Datadog APM | Request flow (Frontend → Backend → AI) | [US5 Dashboard](https://us5.datadoghq.com/apm/services) |
| **Code Profiling** | Datadog Profiler | Function-level CPU/RAM bottlenecks | [US5 Profiler](https://us5.datadoghq.com/apm/profiler) |
| **Intrusion Detection**| Falco + Datadog | Runtime container security alerts | [US5 Security](https://us5.datadoghq.com/security) |
| **System Metrics** | Grafana | Cluster health (CPU, RAM, Disk) | [Local:3010](http://localhost:3010) |
| **MLOps Experiments** | MLflow | Model versions, accuracy, and lineage | [Local:5001](http://localhost:5001) |
| **Local Monitoring** | Prometheus | Raw metric scraping and time-series data | [Local:9090](http://localhost:9090) |

---

## 🔍 Where to See What?

### 1. In Datadog (Enterprise Cloud)
*   **Request Traces:** See exactly how a user login flows through your system. In **APM > Traces**, you can click any request to see the database query time and the Security Engine's risk analysis time.
*   **Linked Logs:** Click any log line in **Logs > Search** to see the **"Trace"** tab. This shows you the exact code execution that generated that specific log.
*   **Security Signals:** Go to **Security > Signals**. If you or anyone else runs a shell inside a container (`docker exec`), Falco will trigger a "Critical" alert here.

### 2. In MLflow (AI Lifecycle)
*   **Experiment Tracking:** Every time the retraining CronJob runs, a new entry appears in the `Security-Engine-Threat-Detection` experiment.
*   **Model Registry:** You can see which model version is "Production" vs "Staging." The Security Engine always pulls the latest "Production" version automatically.

### 3. In Grafana (Local Infrastructure)
*   **Custom Dashboards:** Navigate to the `AegisMesh Overview` dashboard to see the **Real-time Risk Score Distribution** and **Inference Latency** alongside standard CPU/Memory stats.
*   **ML Stats:** View the "Data Preprocessing vs. Inference Time" breakdown to ensure feature engineering isn't slowing down your AI.

---

## 🛠️ Advanced Local Testing (CI/CD)

You can now test all GitHub Actions locally using `act` before pushing to the cloud.

```bash
# Install act
scoop install act

# Run CI locally (tests, lint, docker build)
act -j backend --container-architecture linux/amd64

# Run Smoke Tests on local cluster
act -j smoke-test-local --container-architecture linux/amd64
```

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
| Grafana | http://localhost:3010 |
| MLflow | http://localhost:5001 |
| Prometheus | http://localhost:9090 |

Full setup guide: [`Docker_Setup.md`](./Docker_Setup.md)

---

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

## 📂 Project Structure

```text
├── 💻 frontend/          # React 19 UI & Tailwind styling
├── ⚙️ backend/           # Node.js API, Prisma & Auth logic
├── 🧠 security-engine/   # Python AI (Anomaly Detection)
├── 🏗️ k8s/               # Manifests, Kustomize & NetPolicies
├── ☁️ terraform/         # AWS Infrastructure (ECR)
├── 📊 monitoring/        # Prometheus, Grafana & MLflow
├── 📜 scripts/           # Cluster install & automation
└── 📝 docs/              # Detailed system guides
```

---

## 📖 Documentation

Detailed guides for specific components of the AegisMesh ecosystem:

| Category | Guide |
| :--- | :--- |
| **Setup** | [Docker Setup](docs/SETUP.md) \| [Local Development](#option-2--local-development) |
| **Deployment** | [CI/CD Pipeline](ci-cd/README.md) \| [GitHub Runner](docs/GITHUB_RUNNER_SETUP.md) |
| **Index** | **[All Documentation](docs/README.md)** |
| **Kubernetes** | [K8s Overview](k8s/README.md) \| [Ingress & TLS](docs/devops/ingress-and-tls.md) \| [HPA](docs/devops/hpa-metrics-server.md) |
| **Security** | [Sealed Secrets](docs/devops/sealedsecrets-sops.md) \| [Falco Runtime](docs/devops/falco.md) \| [Kyverno Policies](docs/devops/kyverno-networkpolicy.md) |
| **Reliability** | [Argo Rollouts](docs/devops/argo-rollouts.md) \| [Backups (Velero)](docs/devops/backups-velero-minio.md) |
| **Observability** | [Loki Stack](docs/devops/observability-loki-tempo.md) \| [Datadog Setup](#-operations-command-center) |

---

## License

MIT — see [`LICENSE`](./LICENSE)
