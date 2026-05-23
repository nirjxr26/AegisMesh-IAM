#!/usr/bin/env bash
set -euo pipefail

echo "Installing Argo CD Image Updater..."

kubectl create namespace argocd || true

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm upgrade --install argocd-image-updater \
  argo/argocd-image-updater \
  --namespace argocd

echo "Argo CD Image Updater installed."