param(
  [Parameter(Mandatory = $true)]
  [string]$InstanceId,

  [string]$AwsProfile = 'default',
  [string]$BackupDir = './backups',
  [string]$PgNamespace = 'aegismesh',
  [string]$PgDeployment = 'postgres',
  [string]$PgUser = 'postgres',
  [switch]$DockerVolumes,
  [switch]$SkipSnapshots,
  [switch]$SkipK8s,
  [switch]$SkipRepo,
  [switch]$SkipTerraform
)

$ErrorActionPreference = 'Stop'

function Write-Log {
  param([string]$Message)
  $Message | Tee-Object -FilePath (Join-Path $OutDir 'backup.log') -Append
}

function Save-TextFile {
  param(
    [string]$Name,
    [string[]]$Lines
  )
  $Lines | Set-Content -Path (Join-Path $OutDir $Name)
}

function Invoke-Safe {
  param([scriptblock]$Script)
  try {
    & $Script *>> (Join-Path $OutDir 'backup.log')
  } catch {
    Write-Log $_.Exception.Message
  }
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$Timestamp = Get-Date -AsUTC -Format 'yyyyMMddTHHmmssZ'
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$OutDir = Join-Path $BackupDir "backup-$Timestamp"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType File -Force -Path (Join-Path $OutDir 'backup.log') | Out-Null

Write-Log "Backup started at $Timestamp"
Write-Log "Output directory: $OutDir"

if (-not $SkipRepo) {
  Write-Log 'Backing up repository state'
  $head = git rev-parse HEAD 2>$null
  $branch = git branch --show-current 2>$null
  Save-TextFile -Name 'git-head.txt' -Lines @("commit: $head", "branch: $branch")
  Invoke-Safe { git status --short }
  Invoke-Safe { git remote -v }
  Invoke-Safe { git log -1 --stat }

  $repoItems = @(
    'argocd','backend','docs','frontend','k8s','monitoring','scripts','terraform',
    'README.md','CI_CD_RUNBOOK.md','Docker_Setup.md','LICENSE','CODE_OF_CONDUCT.md','AegisMesh-IAM-Fix-Logic-Guide.md',
    'docker-compose.yml','docker-compose.dev.yml'
  )
  $existing = @()
  foreach ($item in $repoItems) {
    if (Test-Path $item) { $existing += $item }
  }
  if ($existing.Count -gt 0) {
    Compress-Archive -Path $existing -DestinationPath (Join-Path $OutDir 'repo-source.zip') -Force
  }
}

if (-not $SkipTerraform) {
  Write-Log 'Backing up Terraform state and vars'
  foreach ($file in @('terraform/terraform.tfstate','terraform/terraform.tfstate.backup','terraform/terraform.tfvars')) {
    if (Test-Path $file) {
      Copy-Item $file -Destination $OutDir -Force
    }
  }
  $tfExisting = @()
  foreach ($item in @('terraform/main.tf','terraform/outputs.tf','terraform/variables.tf')) {
    if (Test-Path $item) { $tfExisting += $item }
  }
  if ($tfExisting.Count -gt 0) {
    Compress-Archive -Path $tfExisting -DestinationPath (Join-Path $OutDir 'terraform-config.zip') -Force
  }
}

if (-not $SkipK8s) {
  Write-Log 'Exporting Kubernetes resources'
  Invoke-Safe { kubectl get namespaces -o yaml }
  Invoke-Safe { kubectl get all,cm,secret,pvc,pv,ingress,storageclass -A -o yaml | Set-Content -Path (Join-Path $OutDir 'k8s-all.yaml') }
  Invoke-Safe { kubectl get crd -o yaml | Set-Content -Path (Join-Path $OutDir 'k8s-crds.yaml') }
  Invoke-Safe { kubectl get events -A --sort-by=.metadata.creationTimestamp | Set-Content -Path (Join-Path $OutDir 'k8s-events.txt') }
  Invoke-Safe { kubectl config view --flatten | Set-Content -Path (Join-Path $OutDir 'kubeconfig.yaml') }
  Invoke-Safe { kubectl get secret -A -o yaml | Set-Content -Path (Join-Path $OutDir 'all-secrets.yaml') }
  Invoke-Safe { kubectl get configmap -A -o yaml | Set-Content -Path (Join-Path $OutDir 'all-configmaps.yaml') }
  Invoke-Safe { kubectl get sealedsecrets -A -o yaml | Set-Content -Path (Join-Path $OutDir 'sealedsecrets.yaml') }

  Write-Log 'Backing up Postgres from Kubernetes'
  try {
    kubectl -n $PgNamespace get deployment $PgDeployment | Out-Null
    $pgPod = kubectl -n $PgNamespace get pods -l "app=$PgDeployment" -o jsonpath='{.items[0].metadata.name}'
    if ($pgPod) {
      kubectl -n $PgNamespace exec $pgPod -- bash -lc "pg_dumpall -U $PgUser" | Set-Content -Path (Join-Path $OutDir 'postgres-pg_dumpall.sql')
    }
  } catch {
    Write-Log "Postgres dump skipped or failed: $($_.Exception.Message)"
  }
}

if (-not $SkipSnapshots) {
  Write-Log 'Creating EBS snapshots for attached volumes'
  $volumes = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[].Instances[].BlockDeviceMappings[].Ebs.VolumeId' --output text --profile $AwsProfile
  Save-TextFile -Name 'attached-volumes.txt' -Lines @($volumes)
  $snapshotLines = @()
  foreach ($vol in ($volumes -split '\s+')) {
    if ([string]::IsNullOrWhiteSpace($vol)) { continue }
    $snap = aws ec2 create-snapshot --volume-id $vol --description "AegisMesh pre-delete backup $InstanceId $Timestamp" --query SnapshotId --output text --profile $AwsProfile
    $snapshotLines += "$vol -> $snap"
  }
  Save-TextFile -Name 'ebs-snapshots.txt' -Lines $snapshotLines
}

if ($DockerVolumes -and (Test-Command docker)) {
  Write-Log 'Backing up local Docker named volumes'
  $dockerBackupDir = Join-Path $OutDir 'docker-volumes'
  New-Item -ItemType Directory -Force -Path $dockerBackupDir | Out-Null
  foreach ($vol in @('db_data','prometheus_data','grafana_data')) {
    try {
      docker volume inspect $vol | Out-Null
      $volumeMount = $vol + ':/volume'
      $backupMount = $dockerBackupDir + ':/backup'
      $tarName = $vol + '.tar.gz'
      docker run --rm -v $volumeMount -v $backupMount busybox:1.36 sh -c "cd /volume && tar czf /backup/$tarName ." | Out-Null
    } catch {
      Write-Log "Docker volume backup skipped or failed for ${vol}: $($_.Exception.Message)"
    }
  }
}

Write-Log 'Collecting local config and logs'
foreach ($path in @('backend/logs','monitoring/prometheus','monitoring/grafana')) {
  if (Test-Path $path) {
    $name = ($path -replace '[\\/]', '-') + '.zip'
    Compress-Archive -Path $path -DestinationPath (Join-Path $OutDir $name) -Force
  }
}

Write-Log 'Backup complete'
Write-Log 'Move the backup directory to durable storage (S3, another machine, or encrypted archive).'
