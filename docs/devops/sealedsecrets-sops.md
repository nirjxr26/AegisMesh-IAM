# SealedSecrets / SOPS

Purpose: Remove plaintext secrets from Git while keeping GitOps-friendly encrypted manifests.

Recommended default:

1. Install Bitnami Sealed Secrets controller using `scripts/install/install-sealedsecrets.sh`.
1. Install `kubeseal` locally.
1. Convert `k8s/manifests/secret.yaml` into a sealed manifest:

```bash
bash scripts/seal/create-sealedsecret.sh .archive/secrets/secret.yaml k8s/overlays/prod/sealedsecret-aegismesh.yaml
```

Alternative: SOPS + age

1. Generate an age keypair.
1. Commit only encrypted YAML files.
1. Decrypt in CI or locally using the age private key from a secure secret store.

Notes:

- Use SealedSecrets when you want cluster-side decryption.
- Use SOPS when you want file-level encryption with a stronger local workflow.

If your app images live in ECR, prefer the kubelet credential-provider bootstrap in `scripts/infra/setup-ec2-k3s-argocd.sh`. The old pull-secret helper is only a temporary fallback:

```bash
bash scripts/install/install-ecr-regcred.sh
```
