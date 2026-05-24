#!/usr/bin/env bash
set -euo pipefail

# One-shot installer for the OSS stack additions in a safe order.
# Usage: bash scripts/install/install-all.sh

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

run() {
  local description=$1
  shift
  echo
  echo "==> ${description}"
  "$@"
}

run "Install SealedSecrets" bash "$ROOT_DIR/scripts/install/install-sealedsecrets.sh"
echo "Generate the real sealed secret next, then continue after it is committed/applied."

run "Install ingress / TLS stack" bash "$ROOT_DIR/scripts/install/install-ingress-stack.sh"
run "Install Argo CD Image Updater" bash "$ROOT_DIR/scripts/install/install-argocd-image-updater.sh"
run "Install observability (Loki / Tempo)" bash "$ROOT_DIR/scripts/install/install-loki-stack.sh"
run "Install Kyverno" bash "$ROOT_DIR/scripts/install/install-kyverno.sh"
run "Install Argo Rollouts" bash "$ROOT_DIR/scripts/install/install-argorollouts.sh"
run "Install metrics-server" bash "$ROOT_DIR/scripts/install/install-metrics-server.sh"
run "Install Velero / MinIO" bash "$ROOT_DIR/scripts/install/install-velero-minio.sh"
run "Install Falco" bash "$ROOT_DIR/scripts/install/install-falco.sh"

echo
echo "Now create the ECR pull secret (requires AWS CLI creds):"
echo "  bash scripts/install/install-ecr-regcred.sh"
