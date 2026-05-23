#!/usr/bin/env bash
set -euo pipefail

# Install MinIO (S3-compatible) and Velero configured to use it.
# Usage: bash scripts/install/install-velero-minio.sh

echo "Installing MinIO in namespace velero-backup..."
kubectl create namespace velero-backup || true
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install minio bitnami/minio --namespace velero-backup \
  --set auth.rootUser=minioadmin \
  --set auth.rootPassword=minioadmin \
  --set persistence.storageClass=local-path

echo "Install Velero (using Velero CLI recommended). This script gives example kubectl/helm steps only."
echo "Create credentials file for MinIO and install Velero with the S3 provider."

cat > credentials-velero <<EOF
[default]
aws_access_key_id = minioadmin
aws_secret_access_key = minioadmin
EOF

velero install \
  --provider aws \
  --bucket velero \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=false \
  --backup-location-config region=minio,s3ForcePathStyle=true,s3Url=http://minio.velero-backup.svc.cluster.local:9000

rm -f ./credentials-velero

echo "Velero installed and configured to use in-cluster MinIO. Create scheduled backups via 'velero schedule create'."
