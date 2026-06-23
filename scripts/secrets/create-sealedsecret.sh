#!/usr/bin/env bash
set -euo pipefail

# Create a SealedSecret from k8s/manifests/secret.yaml
# Requirements: kubeseal (https://github.com/bitnami-labs/kubeseal) and kubectl configured.
# Usage: bash scripts/seal/create-sealedsecret.sh k8s/manifests/secret.yaml k8s/overlays/prod/sealedsecret-aegismesh.yaml

SRC=${1:-k8s/manifests/secret.yaml}
OUT=${2:-k8s/overlays/prod/sealedsecret-aegismesh.yaml}

if ! command -v kubeseal >/dev/null 2>&1; then
  echo "kubeseal is not installed. See https://github.com/bitnami-labs/kubeseal#installation"
  exit 1
fi

mkdir -p $(dirname "$OUT")

kubeseal --controller-namespace kube-system --format yaml < "$SRC" > "$OUT"

echo "Sealed secret written to $OUT"
