#!/usr/bin/env bash
set -euo pipefail

echo "Installing Argo CD Image Updater..."

kubectl create namespace argocd || true

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm upgrade --install argocd-image-updater \
  argo/argocd-image-updater \
  --namespace argocd

# Ensure the service account exists even if the chart install is partial or
# the local cluster was restored from an inconsistent state.
kubectl create serviceaccount argocd-image-updater -n argocd >/dev/null 2>&1 || true

echo "Argo CD Image Updater installed."
