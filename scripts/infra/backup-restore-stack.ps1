param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Backup", "Restore")]
    [string]$Mode,

    [Parameter(Mandatory=$false)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
Set-Location $ProjectRoot

# Helper to log messages
function Log-Info ($msg) {
    Write-Output "[INFO] $msg"
}
function Log-Warn ($msg) {
    Write-Output "[WARN] $msg"
}
function Log-Error ($msg) {
    Write-Output "[ERROR] $msg"
}

if ($Mode -eq "Backup") {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupDir = Join-Path $ProjectRoot "backups\backup-$Timestamp"
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Log-Info "Starting backup to $BackupDir..."

    # 1. Backup secrets
    Log-Info "Backing up aegismesh-secrets..."
    try {
        $secretYaml = kubectl get secret aegismesh-secrets -n aegismesh -o yaml
        # Remove cluster-specific metadata to make it clean for restoration
        $cleanedYaml = $secretYaml -replace '(?m)^\s*uid:\s*.*$', '' `
                                   -replace '(?m)^\s*resourceVersion:\s*.*$', '' `
                                   -replace '(?m)^\s*creationTimestamp:\s*.*$', '' `
                                   -replace '(?m)^\s*namespace:\s*.*$', ''
        $cleanedYaml | Out-File -FilePath (Join-Path $BackupDir "aegismesh-secrets.yaml") -Encoding utf8
    } catch {
        Log-Warn "Could not backup secrets. Make sure the secret exists in aegismesh namespace."
    }

    # 2. Backup Database data
    Log-Info "Backing up PostgreSQL databases..."
    try {
        $postgresPod = kubectl get pods -n aegismesh -l app=postgres -o jsonpath='{.items[0].metadata.name}'
        if ($postgresPod) {
            Log-Info "Found PostgreSQL pod: $postgresPod. Dumping databases..."
            kubectl exec $postgresPod -n aegismesh -- pg_dump -U iam_user -d iam_auth > (Join-Path $BackupDir "iam_auth_backup.sql")
            kubectl exec $postgresPod -n aegismesh -- pg_dump -U iam_user -d mlflow_db > (Join-Path $BackupDir "mlflow_db_backup.sql")
            Log-Info "Database backups completed."
        } else {
            Log-Warn "Postgres pod not found, skipping database dump."
        }
    } catch {
        Log-Warn "Could not dump databases: $_"
    }

    Log-Info "Backup completed successfully! Location: $BackupDir"
}
elseif ($Mode -eq "Restore") {
    # 1. Determine which backup to restore
    if (-not $BackupPath) {
        Log-Info "No BackupPath specified. Finding the latest backup under backups/..."
        $backupsDir = Join-Path $ProjectRoot "backups"
        $latest = Get-ChildItem -Path $backupsDir -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $latest) {
            Log-Error "No backups found in $backupsDir. Please run Backup mode first."
            exit 1
        }
        $BackupPath = $latest.FullName
    }
    if (-not (Test-Path $BackupPath)) {
        Log-Error "Backup path $BackupPath does not exist!"
        exit 1
    }

    Log-Info "Starting restoration from $BackupPath..."

    # 2. Ensure namespaces exist
    Log-Info "Checking namespaces..."
    foreach ($ns in @("aegismesh", "monitoring", "falco")) {
        $nsExists = kubectl get ns $ns -o name -ErrorAction SilentlyContinue
        if (-not $nsExists) {
            Log-Info "Creating namespace: $ns"
            kubectl create namespace $ns | Out-Null
        }
    }

    # 3. Apply secrets
    $secretFile = Join-Path $BackupPath "aegismesh-secrets.yaml"
    if (Test-Path $secretFile) {
        Log-Info "Restoring secrets to aegismesh and monitoring namespaces..."
        kubectl apply -f $secretFile -n aegismesh | Out-Null
        kubectl apply -f $secretFile -n monitoring | Out-Null
    } else {
        Log-Warn "aegismesh-secrets.yaml not found in backup."
    }

    # 4. Apply manifests
    Log-Info "Applying Kustomize and base manifests..."
    kubectl apply -k "$ProjectRoot\k8s"
    kubectl apply -f "$ProjectRoot\k8s\monitoring.yaml"
    kubectl apply -f "$ProjectRoot\k8s\manifests\crowdsec\crowdsec.yaml"
    kubectl apply -f "$ProjectRoot\k8s\manifests\falcosidekick\falcosidekick.yaml"
    kubectl apply -f "$ProjectRoot\k8s\manifests\trivy\trivy-crds.yaml"

    # 5. Wait for PostgreSQL to be ready
    Log-Info "Waiting for PostgreSQL deployment to be ready..."
    kubectl rollout status deployment/postgres -n aegismesh --timeout=120s

    # 6. Verify and create mlflow_db
    Log-Info "Ensuring mlflow_db database exists..."
    $postgresPod = kubectl get pods -n aegismesh -l app=postgres -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $postgresPod -n aegismesh -- psql -U iam_user -d postgres -c "CREATE DATABASE mlflow_db;" -ErrorAction SilentlyContinue | Out-Null

    # 7. Restore Database Data
    $iamAuthBackup = Join-Path $BackupPath "iam_auth_backup.sql"
    if (Test-Path $iamAuthBackup) {
        Log-Info "Restoring iam_auth database data..."
        Get-Content -Raw $iamAuthBackup | kubectl exec -i $postgresPod -n aegismesh -- psql -U iam_user -d iam_auth
    }
    $mlflowDbBackup = Join-Path $BackupPath "mlflow_db_backup.sql"
    if (Test-Path $mlflowDbBackup) {
        Log-Info "Restoring mlflow_db database data..."
        Get-Content -Raw $mlflowDbBackup | kubectl exec -i $postgresPod -n aegismesh -- psql -U iam_user -d mlflow_db
    }

    # 8. Restart dependent services to clear caches/reconnect
    Log-Info "Restarting dependent deployments to re-establish connections..."
    kubectl rollout restart deployment/backend -n aegismesh
    kubectl rollout restart deployment/security-engine -n aegismesh
    kubectl rollout restart deployment/crowdsec -n aegismesh
    kubectl rollout restart deployment/mlflow -n monitoring
    kubectl rollout restart deployment/trivy-operator -n monitoring

    Log-Info "Restoration completed! Checking current pod status..."
    Start-Sleep -Seconds 10
    kubectl get pods -A | Select-String -Pattern "aegismesh|monitoring|falco"
}
