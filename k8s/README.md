# Kubernetes (k3s) Infrastructure

This directory contains the complete GitOps-driven infrastructure for AegisMesh.

## Architecture Overview
AegisMesh is deployed as a cloud-native application on a **k3s** cluster. We utilize **ArgoCD** for continuous synchronization and **Kustomize** for environment-specific configuration (overlays).

### Key Components
- **Ingress:** Nginx Ingress Controller with `cert-manager`.
- **Security:** Bitnami **SealedSecrets** for encrypted Git-safe secrets.
- **Networking:** Strict **NetworkPolicies** enforcing a zero-trust model.
- **Deployments:** **Argo Rollouts** for managed Canary deployments of the Backend.

## Directory Structure
- `manifests/`: Base Kubernetes resources (Deployments, Services, ConfigMaps).
- `overlays/`: Environment-specific overrides.
  - `prod/`: Production-grade configurations, high availability, and immutable image tags.
- `networkpolicies/`: Zero-trust traffic rules.
- `rollouts/`: Argo Rollout definitions for progressive delivery.
- `hpa/`: Autoscaling configurations based on CPU/Memory metrics.

## Deployment (GitOps)
1. **CI Pipeline:** Builds and pushes Docker images to AWS ECR.
2. **Overlay Patching:** CI updates `overlays/prod/kustomization.yaml` with the new image hash.
3. **ArgoCD Sync:** ArgoCD detects the change and synchronizes the cluster to match the repository state.

## Local Development (Docker Desktop)
For local testing on Docker Desktop Kubernetes:
1. Ensure Kubernetes is enabled in Docker Desktop.
2. Build local images:
   ```bash
   docker build -t aegismesh-backend:local ./backend
   docker build -t aegismesh-frontend:local ./frontend
   ```
3. Apply the base manifests:
   ```bash
   kubectl apply -k ./k8s
   ```

## Managing Secrets
Do **not** commit raw secrets. Use the SealedSecrets controller:
```bash
kubeseal --format yaml < secret.yaml > manifests/sealedsecret.yaml
```

---
For a deeper dive into the cluster logic, see the [Detailed K8s Specification](../docs/k8s.md).
