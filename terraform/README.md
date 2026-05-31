# Terraform for AegisMesh infra

This folder contains Terraform to provision the AWS ECR repositories used by CI/CD for backend and frontend images, plus lifecycle policies that clean up old tags safely.

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
- The lifecycle policy keeps the most recent 50 tagged images in each repo and removes untagged images after 7 days.
- Kubernetes clusters and compute infrastructure are managed outside this Terraform module.
