# AegisMesh CI/CD Runbook

This file lists the commands and GitHub Actions triggers this repository uses so you can verify the pipeline locally and understand what GitHub runs.

## After you change code

Run this sequence whenever you modify backend, frontend, Docker, or Kubernetes files.

```bash
# 1) Reinstall deps if package files changed
cd apps/api
npm ci
cd ../dashboard
npm ci

# 2) Verify backend and frontend locally
cd ../api
npm run lint
npm test --silent
npm run build --if-present

cd ../dashboard
npm run lint -- --max-warnings=0
npm run build --if-present

# 3) Validate Docker/Compose config and rebuild local images
cd ../..
docker-compose config
docker-compose up --build

# 3b) If you are deploying to the local Kubernetes stack instead of Docker Compose
docker build -t aegismesh-backend:local-v2 ./apps/api
docker build -t aegismesh-frontend:local ./apps/dashboard
kubectl apply -k ./platform/kubernetes
kubectl rollout status deployment/backend -n aegismesh --timeout=120s
kubectl rollout status deployment/frontend -n aegismesh --timeout=120s
kubectl rollout status deployment/postgres -n aegismesh --timeout=120s

# 4) Confirm the app is healthy
curl http://localhost:5000/api/health
curl http://localhost:3000/

# 5) Commit your changes
git status
git add .
git commit -m "feat: update app"

# 6) Push to GitHub to trigger CI
git push origin <your-branch>

# 7) Merge via pull request to trigger image build + push
#    CI builds backend/frontend images and pushes them to ECR.
#    CD updates k8s overlays on a bot branch and opens a PR to main.
git checkout -b <your-branch>
git push origin <your-branch>
gh pr create --base main --head <your-branch>

# 8) After GitHub Actions finishes, verify the deploy branch and rollout
gh workflow run CI --ref <your-branch>
gh workflow run CD --ref main
kubectl get pods -n aegismesh
kubectl get deployments -n aegismesh
```

If you want to run the GitHub workflows manually instead of waiting for pushes:

```bash
gh workflow run CI --ref <your-branch>
gh workflow run CD --ref main
gh workflow run Terraform --ref main -f action=plan
```

## How the pipeline runs in GitHub

- `CI` runs automatically on pull requests and pushes to `main` when files under `apps/api/**`, `apps/dashboard/**` or `apps/security-engine/**` change.
- `CD` runs on pushes to `main` when files under `platform/kubernetes/**` or `platform/gitops/**` change, and also after a successful `CI` run.
- `CD` is split across two execution environments:
- `update-overlays` runs on GitHub-hosted runners and updates the tracked ECR image tags in `platform/kubernetes/overlays/prod`.
- `smoke-test-local` runs on a self-hosted runner attached to the local Kubernetes machine and validates the live cluster after Argo CD sync.
- `CodeQL` runs on pushes and pull requests to `main`, plus a weekly schedule.
- `Terraform` is manual and runs only through `workflow_dispatch` with `plan` or `apply`.

## Local cluster requirement for CD

The `smoke-test-local` job is designed for a local Kubernetes target such as `kind` or Docker Desktop Kubernetes. Because GitHub-hosted runners cannot reach your laptop's cluster, this job must run on a self-hosted runner registered on the machine that has local `kubectl` access.

Expected self-hosted runner labels:

```text
self-hosted
local-cluster
```

The runner should already have:

- `kubectl` access to the local cluster
- access to the checked-out repository workspace
- network access to GitHub and AWS ECR if you also want to inspect image availability locally

## Local verification commands

Run these from the repository root unless noted otherwise.

```bash
# Backend
cd apps/api
npm ci
npm run lint
npm test --silent
npm run build --if-present

# Frontend
cd ../dashboard
npm ci
npm run lint -- --max-warnings=0
npm run build --if-present
```

## Docker build commands

```bash
# Production stack
docker-compose up --build

# Development stack with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Optional manual image checks
docker build -t aegismesh-backend:local ./apps/api
docker build -t aegismesh-frontend:local ./apps/dashboard
```

## CI workflow commands

These are the commands GitHub Actions executes in `.github/workflows/ci.yml`.

```bash
# Backend job
cd apps/api
npm ci
npm run lint
npm test --silent
npm run build --if-present

# Frontend job
cd apps/dashboard
npm ci
npm run lint -- --max-warnings=0
npm run build --if-present

# Build and push Docker images on main
STABLE_TAG=v1

docker build -t "$ECR_REGISTRY/aegismesh-backend:$IMAGE_TAG" -t "$ECR_REGISTRY/aegismesh-backend:$STABLE_TAG" -f Dockerfile ./apps/api
docker push "$ECR_REGISTRY/aegismesh-backend:$IMAGE_TAG"
docker push "$ECR_REGISTRY/aegismesh-backend:$STABLE_TAG"

docker build -t "$ECR_REGISTRY/aegismesh-frontend:$IMAGE_TAG" -t "$ECR_REGISTRY/aegismesh-frontend:$STABLE_TAG" -f Dockerfile ./apps/dashboard
docker push "$ECR_REGISTRY/aegismesh-frontend:$IMAGE_TAG"
docker push "$ECR_REGISTRY/aegismesh-frontend:$STABLE_TAG"
```

## CD workflow commands

These are the commands GitHub Actions executes in `.github/workflows/cd.yml`.

```bash
# Log in to ECR
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Resolve the triggering SHA tag
IMAGE_TAG="${GITHUB_SHA:0:7}"
BE_TAG="$IMAGE_TAG"
FE_TAG="$IMAGE_TAG"

# Patch production overlays
sed -i "s|REPLACE_BACKEND_IMAGE|${ECR_REGISTRY}/aegismesh-backend:${BE_TAG}|g" platform/kubernetes/overlays/prod/patch-backend-image.yaml
sed -i "s|REPLACE_FRONTEND_IMAGE|${ECR_REGISTRY}/aegismesh-frontend:${FE_TAG}|g" platform/kubernetes/overlays/prod/patch-frontend-image.yaml

# Commit overlay updates to a branch and open a pull request
git add platform/kubernetes/overlays/prod/patch-backend-image.yaml platform/kubernetes/overlays/prod/patch-frontend-image.yaml
git commit -m "ci: update prod overlay images to ${GITHUB_SHA:0:7} [skip ci]"
git push origin HEAD:bot/overlay-update-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}

# The workflow uses the GitHub Actions token to open and auto-merge the PR.
```

## Smoke test commands

These are the commands used by `scripts/ci/smoke-test.sh` and the CD workflow after rollout.

```bash
kubectl rollout status deployment/backend -n aegismesh --timeout=120s
kubectl rollout status deployment/frontend -n aegismesh --timeout=120s

kubectl run smoke-test --rm -n aegismesh --image=curlimages/curl --restart=Never --command -- sh -c '
  echo "Running HTTP check against frontend service..."
  curl -sS -f http://frontend:80/ || curl -sS -f http://frontend.aegismesh.svc.cluster.local:80/ || exit 1
'
```

In the local-cluster model, these checks are run by the self-hosted runner after it verifies the current context and target namespace.

## Terraform commands

The Terraform workflow is manual and expects AWS credentials.

```bash
cd platform/terraform
terraform init
terraform plan -out=plan.tfplan
terraform apply -auto-approve
```

## Install / cluster bootstrap commands

```bash
bash scripts/install/install-all.sh
bash scripts/install/install-sealedsecrets.sh
bash scripts/install/install-ingress-stack.sh
bash scripts/install/install-argocd-image-updater.sh
bash scripts/install/install-loki-stack.sh
bash scripts/install/install-kyverno.sh
bash scripts/install/install-argorollouts.sh
bash scripts/install/install-metrics-server.sh
bash scripts/install/install-velero-minio.sh
bash scripts/install/install-falco.sh
```

For fresh k3s nodes, use `scripts/maintenance/setup-ec2-k3s-argocd.sh`. For an existing node, run `scripts/install/bootstrap-ecr-credential-provider.sh` directly. Both paths install the AWS ECR credential-provider binary, write the kubelet provider config, set the kubelet args needed for private ECR pulls without docker-registry secrets, and restart the node runtime where possible.

### Long-term ECR auth for k3s nodes

Required node-side files:

- `/usr/local/bin/ecr-credential-provider`
- `/etc/rancher/k3s/ecr-credential-provider-config.yaml`
- `/etc/rancher/k3s/config.yaml`

Kubelet args used by k3s:

```yaml
kubelet-arg:
  - image-credential-provider-bin-dir=/usr/local/bin
  - image-credential-provider-config=/etc/rancher/k3s/ecr-credential-provider-config.yaml
```

Credential-provider config:

```yaml
apiVersion: kubelet.config.k8s.io/v1
kind: CredentialProviderConfig
providers:
  - name: ecr-credential-provider
    matchImages:
      - "*.dkr.ecr.*.amazonaws.com"
      - "*.dkr.ecr.*.amazonaws.com.cn"
      - "*.dkr.ecr-fips.*.amazonaws.com"
      - "*.dkr.ecr.us-iso-east-1.c2s.ic.gov"
      - "*.dkr.ecr.us-isob-east-1.sc2s.sgov.gov"
    defaultCacheDuration: "0"
    apiVersion: credentialprovider.kubelet.k8s.io/v1
```

Restart / rollout commands after bootstrapping or updating a node:

```bash
sudo systemctl restart k3s
kubectl rollout restart deployment/backend -n aegismesh
kubectl rollout restart deployment/frontend -n aegismesh
kubectl rollout status deployment/backend -n aegismesh --timeout=180s
kubectl rollout status deployment/frontend -n aegismesh --timeout=180s
```

Verification commands:

```bash
kubectl get pods -n aegismesh
kubectl describe pod -n aegismesh -l app=backend
kubectl get applications -n argocd
kubectl get application aegismesh-prod -n argocd -o yaml
```

Rollback steps if the provider path needs to be removed temporarily:

```bash
# Remove the two kubelet-arg lines from /etc/rancher/k3s/config.yaml, restore the prior file,
# and restart k3s.
sudo systemctl restart k3s
```

## Useful GitHub CLI commands

If you use the GitHub CLI, these are the quickest ways to trigger the workflows manually.

```bash
gh workflow run CI --ref main
gh workflow run CD --ref main
gh workflow run Terraform --ref main -f action=plan
gh workflow run Terraform --ref main -f action=apply
```

## Recommended verification order

1. Run the local backend and frontend commands.
2. Run `docker-compose config` and then `docker-compose up --build`.
3. Push a branch or open a pull request to trigger `CI`.
4. Merge to `main` to trigger the Docker image build and CD overlay update.
5. Bootstrap the node with the kubelet ECR credential-provider configuration, or run the standalone bootstrap script on an existing node.
6. Confirm the smoke test passes in GitHub Actions and that backend/frontend pull from ECR without a secret refresh job.
