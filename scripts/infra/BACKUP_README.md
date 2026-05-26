Backup procedures and scripts for pre-EC2-delete safety

Overview
--------
This folder contains the following helpers:

- `backup-everything.sh` for Linux/EC2 backup runs
- `backup-everything.ps1` for Windows/PowerShell backup runs
- `backup-ec2-and-cluster.sh` as the narrower EC2 + cluster backup helper

The comprehensive scripts:

- archive the repo source and git metadata
- export Kubernetes resources, secrets, configmaps, PVCs, PVs, CRDs, and kubeconfig
- snapshot attached EBS volumes
- dump Postgres from the cluster
- archive Docker named volumes when requested
- copy local Terraform state and config

Usage (example)
-----------------

```bash
# from repo root
chmod +x scripts/infra/backup-everything.sh
scripts/infra/backup-everything.sh --instance-id i-0123456789abcdef --aws-profile default --backup-dir ./backups --docker-volumes
```

```powershell
# from repo root
PowerShell -ExecutionPolicy Bypass -File .\scripts\infra\backup-everything.ps1 -InstanceId i-0123456789abcdef -BackupDir .\backups -DockerVolumes
```

Pre-requisites
-------------
- AWS CLI configured with credentials that can describe instances and create snapshots
- `kubectl` configured and able to access the k3s cluster
- `pg_dumpall` available inside the Postgres container (standard Postgres images include it)
- `docker` installed only if you want local named-volume backups

Important notes
---------------
- The scripts create EBS snapshots but do not wait for snapshot completion; verify in the AWS Console.
- If you use remote Terraform state (S3/remote backend), back it up using your backend's snapshot functionality.
- If Postgres PVs are EBS-backed and you need consistent DB snapshots, prefer taking a DB dump (`pg_dump`) or stopping DB I/O briefly before snapshotting volumes.
- Secrets exported from the cluster are sensitive; store the backup folder in encrypted storage.

Next recommended actions
-----------------------
1. Run the script with the correct `--instance-id` and confirm snapshots in AWS.
2. Copy backups off the machine (S3 or other secure storage).
3. Only delete the EC2 after verifying backups and snapshot completion.
