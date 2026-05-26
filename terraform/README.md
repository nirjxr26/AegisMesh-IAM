# Terraform for AegisMesh infra

This folder contains Terraform to provision the AWS ECR repositories used by CI/CD for backend and frontend images.

Usage

1. Install Terraform and AWS CLI, configure AWS credentials.

2. Create a file `terraform.tfvars` with your AWS region:

```hcl
aws_region = "us-east-1"
```

3. Initialize and apply:

```bash
cd terraform
terraform init
terraform apply -var-file=terraform.tfvars
```

Outputs include ECR repository URLs.

Notes
- This Terraform stack intentionally manages ECR only.
- Kubernetes clusters and compute infrastructure are managed outside this Terraform module.
