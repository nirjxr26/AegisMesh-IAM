#!/usr/bin/env bash
set -euo pipefail

# Usage: ./setup-ec2-k3s-argocd.sh <KEY_NAME> <SSH_CIDR>
# This script assumes AWS CLI is configured locally with permissions to create EC2 and ECR resources.

KEY_NAME=${1:-aegismesh-key}
SSH_CIDR=${2:-0.0.0.0/0}
INSTANCE_TYPE=${3:-t2.micro}
AMI=${4:-ami-0a313d6098716f372} # Ubuntu 22.04 LTS (example, replace with region-specific AMI)
ALLOW_CIDR=${5:-0.0.0.0/0}

echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group --group-name aegismesh-sg --description "AegisMesh SG" --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $SSH_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr $ALLOW_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr $ALLOW_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 10250 --cidr $ALLOW_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 30000-32767 --cidr $ALLOW_CIDR

echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances --image-id $AMI --instance-type $INSTANCE_TYPE --key-name $KEY_NAME --security-group-ids $SG_ID --query 'Instances[0].InstanceId' --output text)
echo "Instance launched: $INSTANCE_ID"

echo "Waiting for public IP..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Installing k3s and ArgoCD via SSH (you must have the keypair locally)..."
cat <<'EOF' > /tmp/userdata.sh
#!/bin/bash
set -e
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) PROVIDER_ARCH=amd64 ;;
  aarch64|arm64) PROVIDER_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

ECR_PROVIDER_VERSION="v1.36.0"

install -d -m 0755 /etc/rancher/k3s /usr/local/bin

cat > /etc/rancher/k3s/ecr-credential-provider-config.yaml <<'YAML'
apiVersion: kubelet.config.k8s.io/v1
kind: CredentialProviderConfig
providers:
  - name: ecr-credential-provider
    matchImages:
      - "*.dkr.ecr.*.amazonaws.com"
      - "*.dkr.ecr.*.amazonaws.com.cn"
      - "*.dkr.ecr-fips.*.amazonaws.com"
      - "*.dkr.ecr.us-iso-east-1.c2s.ic.gov"
      - "*.dkr.ecr.us-isob-east-1.sc2s.sgov.gov"
    defaultCacheDuration: "0"
    apiVersion: credentialprovider.kubelet.k8s.io/v1
YAML

cat > /etc/rancher/k3s/config.yaml <<'YAML'
write-kubeconfig-mode: "644"
kubelet-arg:
  - image-credential-provider-bin-dir=/usr/local/bin
  - image-credential-provider-config=/etc/rancher/k3s/ecr-credential-provider-config.yaml
YAML

PROVIDER_URL="https://storage.googleapis.com/k8s-staging-provider-aws/releases/provider-aws/${ECR_PROVIDER_VERSION}/linux/${PROVIDER_ARCH}/ecr-credential-provider-linux-${PROVIDER_ARCH}"
if ! curl -fsSL -o /usr/local/bin/ecr-credential-provider "$PROVIDER_URL"; then
  echo "Binary download failed, falling back to go install"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y golang-go
  GO111MODULE=on GOPROXY=https://proxy.golang.org,direct go install github.com/kubernetes/cloud-provider-aws/cmd/ecr-credential-provider@${ECR_PROVIDER_VERSION}
  install -m 0755 "$(go env GOPATH)/bin/ecr-credential-provider" /usr/local/bin/ecr-credential-provider
fi
chmod 0755 /usr/local/bin/ecr-credential-provider

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server" sh -
kubectl create namespace argocd || true
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
# Expose argocd server as NodePort
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
EOF

scp -o StrictHostKeyChecking=no /tmp/userdata.sh ubuntu@${PUBLIC_IP}:/home/ubuntu/userdata.sh
ssh -o StrictHostKeyChecking=no ubuntu@${PUBLIC_IP} 'chmod +x /home/ubuntu/userdata.sh && sudo /home/ubuntu/userdata.sh'

echo "k3s + ArgoCD + kubelet ECR credential provider bootstrap installed. ArgoCD server exposed as NodePort. Public IP: $PUBLIC_IP"
echo "Connect to the node and run 'kubectl get svc -n argocd' to see the NodePort for argocd-server"
