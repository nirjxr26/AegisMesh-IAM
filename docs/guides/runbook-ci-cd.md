# CI/CD & Operations Runbook

Step-by-step local verification and workflow triggers.

---

## 1. Local Developer Workflow
Run this sequence before committing or pushing code:

```bash
# Install dependencies
cd apps/api && npm install
cd ../dashboard && npm install

# Verify backend code
cd ../api
npm run lint
npm test --silent

# Verify frontend code
cd ../dashboard
npm run lint -- --max-warnings=0
npm run build
```

---

## 2. Docker Orchestration
Verify multi-container builds and runtime environment configurations:

```bash
# Start local containers
docker-compose up --build

# Run with development hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

## 3. GitHub Pipelines
* **CI Workflow (`ci.yml`):** Runs on push/PR to `main` for changes inside `apps/api/**`, `apps/dashboard/**`, or `apps/security-engine/**`. Validates code quality and builds/pushes prod ECR images.
* **CD Workflow (`cd.yml`):** Automatically matches cluster state on image updates by patching Kustomize overlays in `platform/kubernetes/overlays/prod` and triggering ArgoCD reconcile loops.
* **Terraform Workflow (`terraform.yml`):** Manual pipeline for provisioning AWS container registries (`platform/terraform`).

---

## 4. Kubernetes Smoke Tests
Smoke test commands run automatically on the self-hosted runner after GitOps rollout:

```bash
# Check rollout status
kubectl rollout status deployment/backend -n aegismesh --timeout=120s
kubectl rollout status deployment/frontend -n aegismesh --timeout=120s

# Verify traffic flows to frontend
kubectl run smoke-test --rm -n aegismesh --image=curlimages/curl --restart=Never --command -- \
  curl -sS -f http://frontend:80/
```
