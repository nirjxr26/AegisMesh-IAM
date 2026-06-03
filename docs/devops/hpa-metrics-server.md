# HPA + metrics-server

Purpose: Enable automatic pod scaling based on resource metrics.

Quick install:

```bash
bash scripts/install/install-metrics-server.sh
```

Example HPA:

```bash
kubectl apply -f k8s/hpa/backend-hpa.yaml
```

Notes:

1. HPA requires metrics-server to be healthy in the cluster.
1. For custom application metrics, add Prometheus Adapter later.
