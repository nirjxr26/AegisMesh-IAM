<#
Safe PowerShell helper to detect and untrack sensitive files from git index.
Usage: Open PowerShell in the repo root and run:
  .\scripts\remove_sensitive.ps1 -DryRun
  .\scripts\remove_sensitive.ps1

This script lists tracked files matching sensitive patterns, asks for confirmation,
then runs git rm --cached for them and commits the change. It does NOT rewrite history
or force-push. For history removal, follow the instructions printed at the end.
#>

param(
    [switch]$DryRun
)

Write-Host "Scanning repository for tracked sensitive files..." -ForegroundColor Cyan

$patterns = @(
    '\.env$',
    '^credentials-velero$',
    '\bbackups/',
    '\.archive/',
    'kubeconfig',
    'terraform\.tfstate',
    '\.sql$',
    '\.sql\.gz$',
    '\bpg_dump',
    '\bpg_dumpall',
    'secrets.*\.ya?ml$',
    '\.pem$',
    '\.key$',
    '\.cred$',
    '^credentials-'
)

# build regex
$regex = ($patterns -join '|')

$tracked = git ls-files 2>$null | Where-Object { $_ -match $regex } | Where-Object { $_ -notlike 'backend/prisma/migrations/*' }

if (-not $tracked) {
    Write-Host "No tracked sensitive files found." -ForegroundColor Green
    exit 0
}

Write-Host "Tracked sensitive files found:" -ForegroundColor Yellow
$tracked | ForEach-Object { Write-Host " - $_" }

if ($DryRun) {
    Write-Host "Dry run mode. No changes made." -ForegroundColor Cyan
    exit 0
}

$confirm = Read-Host "Proceed to untrack these files from git index? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Aborted by user." -ForegroundColor Red
    exit 0
}

Write-Host "Untracking files (kept locally)..." -ForegroundColor Cyan
foreach ($f in $tracked) {
    git rm --cached --ignore-unmatch -- "$f"
}

git add -u
git commit -m "chore: remove sensitive files from index (kept locally)" || Write-Host "Nothing to commit." -ForegroundColor Yellow

Write-Host "Index updated. Next recommended steps:" -ForegroundColor Green
Write-Host "1) Inspect the commit and push normally if you want to keep history (no purge):" -ForegroundColor White
Write-Host "   git log -n 5 && git show HEAD" -ForegroundColor Gray
Write-Host "   git push" -ForegroundColor Gray

Write-Host "2) If you previously pushed sensitive files and want to purge them from history, use BFG or git-filter-repo." -ForegroundColor White
Write-Host "   Recommended (BFG):" -ForegroundColor Gray
Write-Host "     - Download BFG: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Gray
Write-Host "     - Run (example): java -jar bfg.jar --delete-files .env,credentials-velero,*.sql" -ForegroundColor Gray
Write-Host "     - Then: git reflog expire --expire=now --all && git gc --prune=now --aggressive && git push --force" -ForegroundColor Gray

Write-Host "3) Rotate any secrets that may have been exposed (DB, OAuth, AWS/minio, JWT, Grafana)." -ForegroundColor Magenta

Write-Host "Done." -ForegroundColor Green
