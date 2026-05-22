#!/usr/bin/env bash
set -euo pipefail

# Wait for deployments to roll out
kubectl rollout status deployment/backend -n aegismesh --timeout=120s
kubectl rollout status deployment/frontend -n aegismesh --timeout=120s

# Run an in-cluster curl from a temporary pod against the frontend service
kubectl run smoke-test --rm -n aegismesh --image=curlimages/curl --restart=Never --command -- sh -c '
  echo "Running HTTP check against frontend service..."
  curl -sS -f http://frontend:80/ || curl -sS -f http://frontend.aegismesh.svc.cluster.local:80/ || exit 1
'

echo "Smoke tests passed."
