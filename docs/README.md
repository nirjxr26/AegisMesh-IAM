# AegisMesh: IAM Documentation Portal

Welcome to the central documentation hub for **AegisMesh**, a high-assurance, self-hosted Identity and Access Management (IAM) platform. This project integrates traditional policy-driven authorization with cutting-edge ML-based threat intelligence and a robust GitOps pipeline.

---

## Project Scope & Implementation

### 1. Identity & Access Management (Backend)
- **Core Engine:** Node.js 22.13.0 (Express) utilizing Prisma ORM.
- **Data Modeling:** PostgreSQL 17.0 for persistent storage of users, roles, groups, and audit logs.
- **Authentication:** JWT-based sessions with HttpOnly/Secure cookies, TOTP MFA, and Google/GitHub OAuth2 integration.
- **Authorization:** Granular PBAC (Policy-Based Access Control) with explicit DENY precedence.
- **Risk Assessment:** Real-time integration with the Python Security Engine during the auth flow.

### 2. Intelligent Security Engine (MLOps)
- **Inference Service:** Python 3.11+ FastAPI microservice.
- **Algorithm:** Scikit-learn **Isolation Forest** for behavioral anomaly detection.
- **Lifecycle Management:** **MLflow** for experiment tracking, model versioning, and registry.
- **Continuous Training:** Automated daily retraining via K8s CronJob querying PostgreSQL audit logs.

### 3. Frontend Experience
- **Framework:** React 19.2.0 + Vite.
- **Styling:** Tailwind CSS for a modern, responsive administrative interface.
- **State Management:** Context API with custom hooks for identity and session persistence.

### 4. Cloud-Native Infrastructure (DevOps)
- **Orchestration:** **k3s** (lightweight Kubernetes) managed via **ArgoCD**.
- **Deployment Strategy:** **Argo Rollouts** for Canary and Blue/Green deployments.
- **Secrets:** **Bitnami SealedSecrets** for encrypted, Git-safe credential management.
- **Networking:** Strict **NetworkPolicies** (default-deny) for inter-service isolation.
- **Observability:** **Datadog APM** (Distributed Tracing), Prometheus (Metrics), Loki (Logs), and Grafana (Dashboards).

---

## Documentation Index

### Architecture & Design
- [System Overview](ARCHITECTURE.md) - High-level system design and component interactions.
- [Security Model](SECURITY_ARCHITECTURE.md) - Deep dive into Zero-Trust, PBAC, and layers of defense.
- [Network Topology](K8S_ARCHITECTURE.md) - K8s service mesh and network policy specifications.

### Kubernetes & Infrastructure
- [K8s Architecture Spec](K8S_ARCHITECTURE.md) - **Recommended Reading.** Comprehensive guide to the GitOps flow.
- [Ingress & TLS Management](devops/ingress-and-tls.md) - Nginx Ingress Controller, MetalLB, and cert-manager configuration.
- [SealedSecrets Guide](devops/sealedsecrets-sops.md) - Safe secrets storage in Git via Bitnami SealedSecrets controller.
- [Backup & Recovery](devops/backups-velero-minio.md) - Disaster recovery using Velero snapshots and local MinIO S3 storage.
- [Network Security & Kyverno](devops/kyverno-networkpolicy.md) - Runtime policies and default-deny Kubernetes NetworkPolicies.
- [Horizontal Pod Autoscaling](devops/hpa-metrics-server.md) - Autoscale application pods based on metrics-server data.

### CI/CD, MLOps, & Security Monitoring
- [Automated Pipelines](devops/argocd-image-updater.md) - GitOps tag update flows via ArgoCD Image Updater.
- [Argo Rollouts](devops/argo-rollouts.md) - Progressive canary deployments and automated rollbacks.
- [Intrusion Detection (Falco)](devops/falco.md) - Kernel syscall audit rules and sidekick notification routing.
- [Observability Stack (Loki & Tempo)](devops/observability-loki-tempo.md) - Centralized logging with Loki, trace context with Tempo, and Alertmanager setups.

### Setup & Operations
- [Docker Quickstart](docker_setup.md) - Local development environment using Docker Compose.
- [GitHub Runner Setup](GITHUB_RUNNER_SETUP.md) - Guide to connecting and configuring self-hosted runners.

---

## How to Navigate
This documentation is optimized for **Obsidian**. Use the `[[Link]]` syntax to navigate between concepts. If you are reading this on GitHub, please refer to the table of contents above.
