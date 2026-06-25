# GitHub Actions Runner Setup

AegisMesh uses a self-hosted runner to execute local Kubernetes cluster smoke tests.

## 1. Registration
Run this command from your runner workspace directory (replace `<TOKEN>` with a fresh token from Repository Settings > Actions > Runners):
```powershell
./config.cmd --url https://github.com/nirjxr26/AegisMesh-IAM --token <TOKEN> --labels self-hosted,aegismesh-runner,docker --unattended --replace
```

## 2. Running as a Service
Ensure the runner survives reboots:
- **Windows:** Select "Run as Service" during setup.
- **Linux:** Run `sudo ./svc.sh install` and `sudo ./svc.sh start`. The executing user must belong to the `docker` group.

## 3. Workflow Configuration
All workflows executing integration smoke tests target this runner via:
```yaml
runs-on: aegismesh-runner
```
