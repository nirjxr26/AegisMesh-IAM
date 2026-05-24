#!/usr/bin/env bash
set -euo pipefail
IMAGE_BACKEND=${1:-}
IMAGE_FRONTEND=${2:-}
if [[ -z "$IMAGE_BACKEND" || -z "$IMAGE_FRONTEND" ]]; then
  echo "Usage: update-k8s-images.sh <backend-image> <frontend-image>"
  exit 2
fi

sed -i "s|REPLACE_BACKEND_IMAGE|${IMAGE_BACKEND}|g" k8s/overlays/prod/patch-backend-image.yaml
sed -i "s|REPLACE_FRONTEND_IMAGE|${IMAGE_FRONTEND}|g" k8s/overlays/prod/patch-frontend-image.yaml

git add k8s/overlays/prod/patch-backend-image.yaml k8s/overlays/prod/patch-frontend-image.yaml
git commit -m "chore(ci): update k8s image tags" || true
git push origin HEAD:main || true
