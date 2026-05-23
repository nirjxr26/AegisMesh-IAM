#!/usr/bin/env bash
set -euo pipefail

echo "Installing metrics-server (required for HPA)..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo "metrics-server installed. Create HPA manifests as needed."
