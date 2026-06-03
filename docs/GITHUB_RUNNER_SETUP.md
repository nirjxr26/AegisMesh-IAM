# AegisMesh GitHub Actions Runner Setup Guide

This document provides a permanent, long-term solution for maintaining the self-hosted runner for the AegisMesh-IAM project.

## 🚀 1. Initial Setup
To connect a new runner, execute the following command in your runner directory (replace `<TOKEN>` with a fresh token from GitHub Settings):

```powershell
./config.cmd --url https://github.com/nirjxr26/AegisMesh-IAM --token <TOKEN> --labels self-hosted,aegismesh-runner,docker --unattended --replace
```

## 2. Permanent Service Configuration (Long-Term)
To ensure the runner survives reboots and runs in the background:
1. Run `./svc.sh install` (Linux) or `./config.cmd` and select "Run as Service" (Windows).
2. Ensure the service user has `docker` group permissions.

## 3. Token Rotation
Runner tokens expire after 1 hour. If you need to re-register:
1. Go to `Settings > Actions > Runners`.
2. Generate a new token.
3. Re-run the command in step 1.

## 4. Workflow Target
Ensure all `.github/workflows/*.yml` files target the runner using the custom label:
```yaml
runs-on: aegismesh-runner
```
