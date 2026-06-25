#!/usr/bin/env bash
set -euo pipefail

# Install Bitnami Sealed Secrets controller via Helm (cluster-wide)
# Usage: bash scripts/install/install-sealedsecrets.sh

NAMESPACE=kube-system
RELEASE_NAME=sealed-secrets

echo "Installing Sealed Secrets controller into namespace ${NAMESPACE}..."

# add repo
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

if kubectl get crd sealedsecrets.bitnami.com >/dev/null 2>&1; then
  echo "Existing Sealed Secrets CRD detected; installing controller with --skip-crds to avoid conflicts."
  helm upgrade --install ${RELEASE_NAME} sealed-secrets/sealed-secrets \
    --namespace ${NAMESPACE} --create-namespace \
    --set rbac.create=true \
    --skip-crds
else
  helm upgrade --install ${RELEASE_NAME} sealed-secrets/sealed-secrets \
    --namespace ${NAMESPACE} --create-namespace \
    --set rbac.create=true
fi

echo "Sealed Secrets controller installed. To seal secrets locally install 'kubeseal' and run:"
echo "  kubeseal --controller-namespace ${NAMESPACE} --format yaml < platform/kubernetes/manifests/secret.yaml > platform/kubernetes/overlays/prod/sealedsecret-aegismesh.yaml"
