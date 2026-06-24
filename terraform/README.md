# AWS Infrastructure (Terraform)

This directory contains the Terraform configuration for provisioning the AegisMesh cloud environment.

## Resources
- **ECR Repositories:** Managed private repositories for `aegismesh-backend`, `aegismesh-frontend`, and `aegismesh-security-engine`.
- **Lifecycle Policies:** Automated cleanup of untagged or old images to manage storage costs.
- **Compute:** Provisioning of EC2 instances for the **k3s** control plane and worker nodes.

## Usage

### Prerequisites
- AWS CLI configured with appropriate credentials.
- Terraform CLI (v1.0+).

### Deployment
1. Initialize the workspace:
   ```bash
   terraform init
   ```
2. Plan the changes:
   ```bash
   terraform plan
   ```
3. Apply the infrastructure:
   ```bash
   terraform apply
   ```

## Security Note
Credentials are never hardcoded. Terraform uses environment variables or the AWS credential provider.

---
For CI/CD integration, see [.github/workflows/terraform.yml](../.github/workflows/terraform.yml).
