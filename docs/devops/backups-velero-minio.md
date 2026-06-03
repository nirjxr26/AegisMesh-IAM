# Backups: Velero + MinIO (Quickstart)

Purpose: Provide scheduled backups of cluster resources and PVs to a local S3-compatible MinIO instance using Velero.

Quickstart:

1. Install MinIO + Velero using `scripts/install/install-velero-minio.sh`.
1. If the MinIO PVC stays pending, ensure the `local-path` storage class exists in k3s.
1. Create an initial backup:

```bash
velero backup create initial-backup --include-namespaces=aegismesh --wait
```

1. Create a daily scheduled backup:

```bash
velero schedule create daily-backup --schedule "0 2 * * *" --include-namespaces=aegismesh
```

1. Test restores in a non-production namespace before relying on this for DR.

Notes:

- For PVs backed by Longhorn or CSI snapshots, enable snapshot support in Velero and configure the appropriate plugin.
- Do not store Velero credentials in plaintext in Git; use `SealedSecrets` or SOPS to encrypt credentials if checked in.
