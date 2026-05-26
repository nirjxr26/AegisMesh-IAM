#!/usr/bin/env bash
set -euo pipefail

# backup-ec2-and-cluster.sh
# Usage: ./backup-ec2-and-cluster.sh --instance-id i-0123456789abcdef --aws-profile default --backup-dir ./backups 
# Requires: awscli, kubectl, jq

usage(){
  grep '^#' "$0" | sed 's/^#//'
  exit 1
}

INSTANCE_ID=""
AWS_PROFILE="default"
BACKUP_DIR="./backups"
PG_NAMESPACE="default"
PG_DEPLOYMENT="postgres"
PG_USER="postgres"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --instance-id) INSTANCE_ID="$2"; shift 2;;
    --aws-profile) AWS_PROFILE="$2"; shift 2;;
    --backup-dir) BACKUP_DIR="$2"; shift 2;;
    --pg-namespace) PG_NAMESPACE="$2"; shift 2;;
    --pg-deployment) PG_DEPLOYMENT="$2"; shift 2;;
    --pg-user) PG_USER="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$INSTANCE_ID" ]]; then
  echo "Error: --instance-id is required" >&2
  usage
fi

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="$BACKUP_DIR/backup-$TS"
mkdir -p "$OUT_DIR"

echo "Backing up EC2 instance $INSTANCE_ID to $OUT_DIR"

echo "1) Listing attached volumes"
VOLUME_IDS=$(AWS_PROFILE="$AWS_PROFILE" aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[].Instances[].BlockDeviceMappings[].Ebs.VolumeId' --output text)
if [[ -z "$VOLUME_IDS" ]]; then
  echo "No volumes found for instance $INSTANCE_ID" > "$OUT_DIR/volumes.txt"
else
  echo "$VOLUME_IDS" > "$OUT_DIR/volumes.txt"
fi

echo "2) Creating snapshots for attached volumes"
SNAPSHOT_IDS_FILE="$OUT_DIR/snapshots.txt"
> "$SNAPSHOT_IDS_FILE"
for vol in $VOLUME_IDS; do
  echo "Creating snapshot for $vol"
  snapid=$(AWS_PROFILE="$AWS_PROFILE" aws ec2 create-snapshot --volume-id "$vol" --description "pre-delete backup $INSTANCE_ID $TS" --query SnapshotId --output text)
  echo "$vol -> $snapid" >> "$SNAPSHOT_IDS_FILE"
done

echo "3) Backing up Kubernetes resources"
kubectl get all --all-namespaces -o yaml > "$OUT_DIR/cluster-resources-allns-$TS.yaml" || echo "kubectl get all failed (check kubeconfig)" > "$OUT_DIR/cluster-resources-error.txt"
kubectl get namespace -o yaml > "$OUT_DIR/namespaces-$TS.yaml" || true

echo "Exporting ArgoCD secrets (if present)"
kubectl get secret -n argocd -o yaml > "$OUT_DIR/argocd-secrets-$TS.yaml" || echo "no argocd namespace or secrets"

echo "Exporting kubeconfig"
kubectl config view --flatten > "$OUT_DIR/kubeconfig-flat-$TS" || echo "unable to export kubeconfig"

echo "4) Backing up Postgres (if deployment exists)"
if kubectl -n "$PG_NAMESPACE" get deployment "$PG_DEPLOYMENT" >/dev/null 2>&1; then
  pod=$(kubectl -n "$PG_NAMESPACE" get pods -l app=$PG_DEPLOYMENT -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [[ -n "$pod" ]]; then
    echo "Found Postgres pod $pod; running pg_dumpall"
    kubectl -n "$PG_NAMESPACE" exec "$pod" -- bash -lc "pg_dumpall -U $PG_USER" > "$OUT_DIR/pg_dumpall-$TS.sql" || echo "pg_dumpall failed; ensure credentials/pg client available"
  else
    echo "No pod found with label app=$PG_DEPLOYMENT; skipping pg_dump" > "$OUT_DIR/pg_dump_skip.txt"
  fi
else
  echo "Postgres deployment $PG_DEPLOYMENT not found in namespace $PG_NAMESPACE; skipping pg dump" > "$OUT_DIR/pg_dump_skip.txt"
fi

echo "5) Backing up Terraform state file (if present under /terraform)"
if [[ -f terraform/terraform.tfstate ]]; then
  cp terraform/terraform.tfstate "$OUT_DIR/terraform.tfstate.backup"
  echo "Backed up terraform/terraform.tfstate"
else
  echo "No local terraform state found; if you use remote state, ensure it's backed up separately" > "$OUT_DIR/terraform_state_note.txt"
fi

echo "Backup complete. Files placed in $OUT_DIR"
echo "Please verify snapshots in the AWS console and wait for snapshot completion before deleting the instance."

exit 0
