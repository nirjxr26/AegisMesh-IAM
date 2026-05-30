#!/usr/bin/env bash
# Shell helper to detect and untrack sensitive files from git index (POSIX)
# Usage: ./scripts/prune-secrets.sh --dry-run

set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "Usage: $0 [--dry-run]"; exit 0 ;;
  esac
done

echo "Scanning repository for tracked sensitive files..."

patterns=("\.env$" "^credentials-velero$" "\bbackups/" "\.archive/" "kubeconfig" "terraform\.tfstate" "\.sql$" "\.sql\.gz$" "\bpg_dump" "\bpg_dumpall" "secrets.*\.ya?ml$" "\.pem$" "\.key$" "\.cred$" "^credentials-")
regex=$(IFS='|'; echo "${patterns[*]}")

tracked=$(git ls-files | grep -E "$regex" | grep -Ev '^backend/prisma/migrations/' || true)

if [ -z "$tracked" ]; then
  echo "No tracked sensitive files found."
  exit 0
fi

echo "Tracked sensitive files found:"
echo "$tracked"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run mode. No changes made."; exit 0
fi

read -p "Proceed to untrack these files from git index? (y/N) " ans
if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
  echo "Aborted."; exit 0
fi

echo "$tracked" | xargs -d '\n' -r git rm --cached --ignore-unmatch --

git add -u
git commit -m "chore: remove sensitive files from index (kept locally)" || echo "Nothing to commit"

cat <<'EOF'
Index updated. Next recommended steps:
1) Inspect the commit and push normally if you want to keep history (no purge):
   git log -n 5 && git show HEAD
   git push

2) If you previously pushed sensitive files and want to purge them from history, use BFG or git-filter-repo.
   Recommended (BFG):
     - Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
     - Run (example): java -jar bfg.jar --delete-files .env,credentials-velero,*.sql
     - Then: git reflog expire --expire=now --all && git gc --prune=now --aggressive && git push --force

3) Rotate any secrets that may have been exposed (DB, OAuth, AWS/minio, JWT, Grafana).
EOF
