**Security: Secrets removal & rotation checklist**

- Do NOT commit secrets (env files, keys, kubeconfigs, DB dumps).
- If sensitive files were committed and pushed, follow these steps:
  1. Add sensitive patterns to `.gitignore` (done).
  2. Remove files from git index (keeps local copy):
     - PowerShell: `./scripts/remove_sensitive.ps1`
     - POSIX: `./scripts/prune-secrets.sh --dry-run` then without `--dry-run` to perform.
  3. If files were previously pushed to any remote, purge history using BFG or git-filter-repo, then force-push.
     - BFG example:
       - `java -jar bfg.jar --delete-files .env,credentials-velero,*.sql`
       - `git reflog expire --expire=now --all`
       - `git gc --prune=now --aggressive`
       - `git push --force`
  4. Rotate all exposed secrets immediately (DB users, OAuth client secrets, API keys, AWS/minio keys, JWT secrets, admin passwords).

- Suggested rotation priority:
  1. Database credentials
  2. Cloud provider keys (AWS, MinIO)
  3. OAuth client secrets (Google, GitHub)
  4. JWT/Token secrets
  5. Admin UI passwords (Grafana, etc.)

- After rotation: update `.env` and secrets manager entries, do NOT commit `.env`.
