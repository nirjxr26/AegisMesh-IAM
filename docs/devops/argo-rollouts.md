# Argo Rollouts

Purpose: Safer deployments with canary or blue/green rollout control and automated rollback.

Quick install:

```bash
bash scripts/install/install-argorollouts.sh
```

Example rollout:

```bash
kubectl apply -f k8s/rollouts/backend-rollout.yaml
```

Notes:

1. Replace the image tag placeholder before applying.
1. Add analysis templates if you want automated traffic-shift verification.
