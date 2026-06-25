# Kubernetes Architecture Specification

AegisMesh deploys onto a GitOps-managed **k3s** Kubernetes cluster.

---

## 1. Segmentation & Namespaces
* `aegismesh`: Core runtimes (API gateway, dashboard frontend, ML security engine, PostgreSQL database).
* `monitoring`: Observability stack (Prometheus, Grafana, Loki, MLflow).
* `security`: Intrusion detection (Falco, CrowdSec).

---

## 2. Ingress & Traffic Flow
- **Ingress Controller:** Nginx Ingress routes external traffic (`/` to frontend, `/api` to backend).
- **SSL/TLS:** `cert-manager` manages automated Let's Encrypt certificates.

---

## 3. Secrets (SealedSecrets)
- Credentials are encrypted in Git repositories as `SealedSecret` resources.
- The in-cluster Bitnami SealedSecrets controller decrypts them into native Kubernetes `Secrets`.

---

## 4. Zero-Trust Network Policies
> [!IMPORTANT]
> All inter-pod traffic is blocked by default (`default-deny`). Opt-in NetworkPolicies are defined for:
> - `Ingress` → `Frontend` / `Backend`
> - `Backend` → `Postgres` / `Security Engine`
> - `Security Engine` → `Postgres`

---

## 5. Resilience & Rollouts
- **HPA:** Horizontal Pod Autoscalers trigger scaling at **70% CPU utilization**.
- **Canary Deployments:** Powered by **Argo Rollouts** for the backend API, enabling automated rollbacks on health anomalies.

---

## 6. Kustomize Structure
Configurations are segmented under `platform/kubernetes`:
- `platform/kubernetes/manifests`: Core resources.
- `platform/kubernetes/overlays/prod`: Production-grade configurations and image patch overlays.
