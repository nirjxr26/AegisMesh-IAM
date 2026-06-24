#!/usr/bin/env bash
set -euo pipefail

echo "Installing Argo Rollouts and kubectl-argo-rollouts plugin..."
kubectl create namespace argo-rollouts || true
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm upgrade --install argo-rollouts argo/argo-rollouts --namespace argo-rollouts

echo "Installing kubectl plugin (optional for local control)"
kubectl krew install argo-rollouts || true

echo "Argo Rollouts installed. See platform/kubernetes/rollouts/backend-rollout.yaml for an example rollout." 
