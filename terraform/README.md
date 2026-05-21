# Terraform for AegisMesh infra

This folder contains Terraform to provision a single EC2 instance running k3s and two ECR repositories for backend and frontend images.

Usage

1. Install Terraform and AWS CLI, configure AWS credentials.

2. Create a file `terraform.tfvars` with at minimum your SSH public key:

```hcl
public_key = "ssh-rsa AAAA... user@example.com"
aws_region = "us-east-1"
```

3. Initialize and apply:

```bash
cd terraform
terraform init
terraform apply -var-file=terraform.tfvars
```

Outputs include `public_ip` (node IP) and ECR repository URLs.

Notes
- The AMI is selected automatically (Ubuntu 22.04) via a data lookup — verify for your region.
- The EC2 `user_data` installs k3s and ArgoCD and exposes ArgoCD as a NodePort.
- For production use, replace this single-node k3s with a managed EKS cluster and harden security.
