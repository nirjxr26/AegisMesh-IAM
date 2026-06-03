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
| **Setup** | [Docker Setup](docs/SETUP.md) \| [Local Development](#quick-start) |
| **Deployment** | [CI/CD Pipeline](ci-cd/README.md) \| [GitHub Runner](docs/GITHUB_RUNNER_SETUP.md) |
| **Index** | **[All Documentation](docs/README.md)** |
| **Kubernetes** | [K8s Overview](k8s/README.md) \| [Ingress & TLS](docs/devops/ingress-and-tls.md) \| [HPA](docs/devops/hpa-metrics-server.md) |
| **Security** | [Sealed Secrets](docs/devops/sealedsecrets-sops.md) \| [Falco Runtime](docs/devops/falco.md) \| [Kyverno Policies](docs/devops/kyverno-networkpolicy.md) |
| **Reliability** | [Argo Rollouts](docs/devops/argo-rollouts.md) \| [Backups (Velero)](docs/devops/backups-velero-minio.md) |
| **Observability** | [Loki Stack](docs/devops/observability-loki-tempo.md) \| [Datadog Setup](#-operations-command-center) |

---

## Quick Start

### Prerequisites

```bash
git clone https://github.com/nirjxr26/Aegismesh-IAM.git
cd AegisMesh-IAM
cp .env.example .env
```

Edit `.env` with your values before starting.

### Docker (Recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:5000 |
| Security Engine | http://localhost:8000 |
| Grafana | http://localhost:3010 |
| MLflow | http://localhost:5001 |
| Prometheus | http://localhost:9090 |

---

## 🛠️ Local Action Testing (CI/CD)

You can now test all GitHub Actions locally using `act` before pushing to the cloud.

```bash
# Install act
scoop install act

# Run CI locally (tests, lint, docker build)
act -j backend --container-architecture linux/amd64

# Run Smoke Tests on local cluster
act -j smoke-test-local --container-architecture linux/amd64
```

---

## 📦 Integrated View (Summary)

AegisMesh is now a **Hardened MLOps Platform** where:
1.  **Code** is verified by **SonarCloud** and **CodeQL**.
2.  **Builds** are optimized via **Multi-Stage Docker** and pinned security layers.
3.  **Deployments** are automated to **Local/Cloud K8s** via **Windows-Ready CI/CD**.
4.  **AI Intelligence** is managed by **MLflow** and retrained automatically via **CronJobs**.
5.  **Observability** is unified in **Datadog** (Cloud APM) and **Grafana** (Local Infra).
6.  **Runtime Security** is enforced by **Falco** and streamed as real-time signals.

---

## License

MIT — see [LICENSE](LICENSE)
