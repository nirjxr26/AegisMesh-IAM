# AegisMesh System Architecture

## 1. Design Philosophy
AegisMesh is built on the **Zero-Trust** model. Every request is verified, authorized, and scored for risk before execution.

## 2. Core Components

### A. Backend (Node.js)
- **Role:** Central API gateway and business logic orchestrator.
- **Stack:** Node.js 22, Express, Prisma, PostgreSQL.
- **Key Services:**
  - `AuthService`: Manages JWT, MFA, and OAuth lifecycle.
  - `PermissionService`: PBAC logic with explicit DENY precedence.
  - `RiskEngine`: Interface to the Security Engine.

### B. Security Engine (Python)
- **Role:** Behavioral anomaly detection and threat scoring.
- **Stack:** Python 3.11, FastAPI, Scikit-learn.
- **Logic:** Uses an **Isolation Forest** model to detect outliers in user behavior (e.g., unusual login times, IP shifts).
- **MLOps:** Integrated with **MLflow** for model lifecycle management.

### C. Frontend (React)
- **Role:** Administrative interface.
- **Stack:** React 19, Vite, Tailwind CSS.

## 3. Infrastructure & Deployment
- **Platform:** **k3s** Kubernetes.
- **GitOps:** **ArgoCD** synchronizes cluster state with Git.
- **Secrets:** **SealedSecrets** ensures credentials are never stored in plain text.
- **Network:** Restricted via **NetworkPolicies** to prevent lateral movement.

## 4. Observability
- **Tracing:** **Datadog APM** provides end-to-end visibility across Node.js and Python.
- **Metrics:** **Prometheus** and **Grafana** for health and ML performance monitoring.
- **Logs:** **Loki** for centralized logging.

---
For specific deployment details, refer to the [Kubernetes Architecture](k8s.md).
