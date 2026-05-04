# Kubernetes Setup (Docker Desktop)

This setup is designed for **Docker Desktop Kubernetes** (single-node local cluster), not Minikube or cloud-managed Kubernetes.

## Prerequisites

- Docker Desktop with **Kubernetes enabled**
- `kubectl` configured to use `docker-desktop` context
- Local Docker images built from this repository

Check context:

```powershell
kubectl config current-context
```

It should return `docker-desktop`.

## 1. Build Images

From repository root:

```powershell
docker build -t aegismesh-backend:local-v2 ./backend
docker build -t aegismesh-frontend:local ./frontend
```

## 2. Deploy to Kubernetes

```powershell
kubectl apply -k ./k8s
```

Verify:

```powershell
kubectl get pods -n aegismesh
kubectl get svc -n aegismesh
```

## 3. Access the App Locally

Use `aegismesh.localhost` as the browser hostname. This resolves to `127.0.0.1` automatically, so no hosts-file edit is required.

Use port-forward to expose services exactly like Docker Compose ports:

Terminal 1:

```powershell
kubectl -n aegismesh port-forward svc/frontend 3000:3000
```

Terminal 2:

```powershell
kubectl -n aegismesh port-forward svc/backend 5000:5000
```

Then open:

- Frontend: http://aegismesh.localhost:3000
- Backend health: http://aegismesh.localhost:5000/api/health

The frontend Nginx config proxies `/api` and `/uploads` to the backend service internally, matching your Docker setup behavior.

## 4. Update Secrets Before Production-like Use

Edit `k8s/manifests/secret.yaml` and change at least:

- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Re-apply after edits:

```powershell
kubectl apply -k ./k8s
```

## 5. Cleanup

```powershell
kubectl delete -k ./k8s
```

## Optional One-Command Deploy Script

```powershell
./k8s/deploy-docker-desktop.ps1
```
