#!/usr/bin/env bash
set -euo pipefail

# backup-everything.sh
# Comprehensive backup for AegisMesh:
# - repository source and git metadata
# - Kubernetes manifests, resources, secrets, PVCs, PVs
# - EC2 attached EBS volumes as snapshots
# - Postgres dump from the cluster
# - local Docker named volumes when present
# - Terraform state and common repo assets

usage() {
  cat <<'EOF'
Usage: backup-everything.sh --instance-id i-xxxxxxxxxxxxxxxxx [options]

Required:
  --instance-id        EC2 instance id to snapshot

Optional:
  --aws-profile NAME   AWS profile name (default: default)
  --backup-dir PATH    Backup output root (default: ./backups)
  --pg-namespace NAME  Kubernetes namespace for Postgres (default: aegismesh)
  --pg-deployment NAME Postgres deployment name (default: postgres)
  --pg-user NAME       Postgres user for pg_dumpall (default: postgres)
  --docker-volumes     Back up local Docker named volumes if present
  --skip-snapshots     Skip EBS snapshot creation
  --skip-k8s           Skip Kubernetes export and database dump
  --skip-repo          Skip repository archive and metadata
  --skip-terraform     Skip Terraform state backup
EOF
}

INSTANCE_ID=""
AWS_PROFILE="default"
BACKUP_DIR="./backups"
PG_NAMESPACE="aegismesh"
PG_DEPLOYMENT="postgres"
PG_USER="postgres"
DOCKER_VOLUMES=0
SKIP_SNAPSHOTS=0
SKIP_K8S=0
SKIP_REPO=0
SKIP_TERRAFORM=0

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --instance-id) INSTANCE_ID="$2"; shift 2 ;;
    --aws-profile) AWS_PROFILE="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --pg-namespace) PG_NAMESPACE="$2"; shift 2 ;;
    --pg-deployment) PG_DEPLOYMENT="$2"; shift 2 ;;
    --pg-user) PG_USER="$2"; shift 2 ;;
    --docker-volumes) DOCKER_VOLUMES=1; shift ;;
    --skip-snapshots) SKIP_SNAPSHOTS=1; shift ;;
    --skip-k8s) SKIP_K8S=1; shift ;;
    --skip-repo) SKIP_REPO=1; shift ;;
    --skip-terraform) SKIP_TERRAFORM=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="$BACKUP_DIR/backup-$TS"
mkdir -p "$OUT_DIR"

log() { printf '%s\n' "$*" | tee -a "$OUT_DIR/backup.log"; }
safe_run() { "$@" >> "$OUT_DIR/backup.log" 2>&1 || true; }

capture_file() {
  local file="$1"
  shift
  "$@" > "$file" 2>> "$OUT_DIR/backup.log" || true
}

write_text() {
  local file="$1"
  shift
  printf '%s\n' "$@" > "$OUT_DIR/$file"
}

archive_if_exists() {
  local archive_name="$1"
  shift
  local items=()
  local item
  for item in "$@"; do
    if [[ -e "$item" ]]; then
      items+=("$item")
    fi
  done
  if [[ "${#items[@]}" -gt 0 ]]; then
    tar -czf "$OUT_DIR/$archive_name" "${items[@]}" >> "$OUT_DIR/backup.log" 2>&1 || true
  fi
}

log "Backup started at $TS"
log "Output directory: $OUT_DIR"

if [[ "$SKIP_REPO" -eq 0 ]]; then
  log "Backing up repository state"
  write_text "git-head.txt" "commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)" "branch: $(git branch --show-current 2>/dev/null || echo unknown)"
  safe_run git status --short
  safe_run git remote -v
  safe_run git log -1 --stat
  archive_if_exists "repo-source.tar.gz" \
    apps docs packages platform scripts \
    README.md CI_CD_RUNBOOK.md Docker_Setup.md LICENSE CODE_OF_CONDUCT.md AegisMesh-IAM-Fix-Logic-Guide.md \
    docker-compose.yml docker-compose.dev.yml
fi

if [[ "$SKIP_TERRAFORM" -eq 0 ]]; then
  log "Backing up Terraform state and vars"
  if [[ -f platform/terraform/terraform.tfstate ]]; then
    cp platform/terraform/terraform.tfstate "$OUT_DIR/terraform.tfstate"
  fi
  if [[ -f platform/terraform/terraform.tfstate.backup ]]; then
    cp platform/terraform/terraform.tfstate.backup "$OUT_DIR/terraform.tfstate.backup.local"
  fi
  archive_if_exists "terraform-config.tar.gz" platform/terraform/main.tf platform/terraform/outputs.tf platform/terraform/variables.tf platform/terraform/terraform.tfvars
fi

if [[ "$SKIP_K8S" -eq 0 ]]; then
  log "Exporting Kubernetes resources"
  capture_file "$OUT_DIR/k8s-namespaces.yaml" kubectl get namespaces -o yaml
  capture_file "$OUT_DIR/k8s-all.yaml" kubectl get all,cm,secret,pvc,pv,ingress,storageclass -A -o yaml
  capture_file "$OUT_DIR/k8s-crds.yaml" kubectl get crd -o yaml
  capture_file "$OUT_DIR/k8s-events.txt" kubectl get events -A --sort-by=.metadata.creationTimestamp
  capture_file "$OUT_DIR/sealedsecrets.yaml" kubectl get sealedsecrets -A -o yaml
  capture_file "$OUT_DIR/kubeconfig.yaml" kubectl config view --flatten
  capture_file "$OUT_DIR/all-secrets.yaml" kubectl get secret -A -o yaml
  capture_file "$OUT_DIR/all-configmaps.yaml" kubectl get configmap -A -o yaml

  log "Backing up Postgres from Kubernetes"
  if kubectl -n "$PG_NAMESPACE" get deployment "$PG_DEPLOYMENT" >/dev/null 2>&1; then
    PG_POD=$(kubectl -n "$PG_NAMESPACE" get pods -l app="$PG_DEPLOYMENT" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [[ -n "$PG_POD" ]]; then
      kubectl -n "$PG_NAMESPACE" exec "$PG_POD" -- bash -lc "pg_dumpall -U $PG_USER" > "$OUT_DIR/postgres-pg_dumpall.sql" 2>> "$OUT_DIR/backup.log" || true
    fi
  fi
fi

if [[ "$SKIP_SNAPSHOTS" -eq 0 ]]; then
  log "Creating EBS snapshots for attached volumes"
  AWS_CMD=(aws)
  if [[ -n "$AWS_PROFILE" ]]; then
    AWS_CMD+=(--profile "$AWS_PROFILE")
  fi
  VOLUME_IDS=$(AWS_PROFILE="$AWS_PROFILE" aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[].Instances[].BlockDeviceMappings[].Ebs.VolumeId' --output text 2>> "$OUT_DIR/backup.log" || true)
  write_text "attached-volumes.txt" "$VOLUME_IDS"
  : > "$OUT_DIR/ebs-snapshots.txt"
  for vol in $VOLUME_IDS; do
    [[ -z "$vol" ]] && continue
    SNAP_ID=$(AWS_PROFILE="$AWS_PROFILE" aws ec2 create-snapshot --volume-id "$vol" --description "AegisMesh pre-delete backup $INSTANCE_ID $TS" --query SnapshotId --output text 2>> "$OUT_DIR/backup.log" || true)
    printf '%s -> %s\n' "$vol" "$SNAP_ID" >> "$OUT_DIR/ebs-snapshots.txt"
  done
fi

if [[ "$DOCKER_VOLUMES" -eq 1 ]] && command -v docker >/dev/null 2>&1; then
  log "Backing up local Docker named volumes"
  DOCKER_BACKUP_DIR="$OUT_DIR/docker-volumes"
  mkdir -p "$DOCKER_BACKUP_DIR"
  for vol in db_data prometheus_data grafana_data; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      docker run --rm -v "$vol":/volume -v "$DOCKER_BACKUP_DIR":/backup busybox:1.36 sh -c "cd /volume && tar czf /backup/${vol}.tar.gz ." >> "$OUT_DIR/backup.log" 2>&1 || true
    fi
  done
fi

log "Collecting local files and logs"
archive_if_exists "backend-logs.tar.gz" apps/backend-api/logs
archive_if_exists "monitoring-config.tar.gz" platform/kubernetes/observability/prometheus platform/kubernetes/observability/grafana

log "Backup complete"
log "Review $OUT_DIR and move it to durable storage (S3, another server, or encrypted archive)."
