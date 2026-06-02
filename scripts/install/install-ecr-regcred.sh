#!/usr/bin/env bash
set -euo pipefail

# Deprecated: do not use rotating ECR pull secrets for AegisMesh workloads.
# The durable fix is node-side kubelet ECR credential-provider auth.
#
# Use:
#   bash scripts/infra/bootstrap-ecr-credential-provider.sh

echo "This helper is deprecated because ECR pull secrets expire and break rollouts."
echo "Use scripts/infra/bootstrap-ecr-credential-provider.sh on each k3s node instead."
exit 1
