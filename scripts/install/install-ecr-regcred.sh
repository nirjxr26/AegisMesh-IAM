#!/usr/bin/env bash
set -euo pipefail

# Legacy fallback only: create or refresh the ECR imagePullSecret used by the aegismesh app workloads.
# Usage:
#   bash scripts/install/install-ecr-regcred.sh [namespace] [registry] [region]
# Defaults:
#   namespace = aegismesh
#   registry  = 654654364687.dkr.ecr.us-east-1.amazonaws.com
#   region    = us-east-1

NAMESPACE=${1:-aegismesh}
REGISTRY=${2:-654654364687.dkr.ecr.us-east-1.amazonaws.com}
REGION=${3:-us-east-1}

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required to create the ECR password token"
  exit 1
fi

kubectl create namespace "$NAMESPACE" >/dev/null 2>&1 || true

PASSWORD=$(aws ecr get-login-password --region "$REGION")

kubectl -n "$NAMESPACE" create secret docker-registry ecr-regcred \
  --docker-server="$REGISTRY" \
  --docker-username=AWS \
  --docker-password="$PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Created/updated ecr-regcred in namespace ${NAMESPACE}."
