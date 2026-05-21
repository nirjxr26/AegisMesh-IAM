#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=${AWS_REGION:-us-east-1}
REPOS=("aegismesh-backend" "aegismesh-frontend")

for r in "${REPOS[@]}"; do
  echo "Creating ECR repo: $r"
  aws ecr create-repository --repository-name "$r" --region "$AWS_REGION" || true
done

echo "ECR repos created (or already existed)."
