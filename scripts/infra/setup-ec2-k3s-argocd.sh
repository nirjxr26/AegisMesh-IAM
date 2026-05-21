#!/usr/bin/env bash
set -euo pipefail

# Usage: ./setup-ec2-k3s-argocd.sh <KEY_NAME> <SSH_CIDR>
# This script assumes AWS CLI is configured locally with permissions to create EC2 and ECR resources.

KEY_NAME=${1:-aegismesh-key}
SSH_CIDR=${2:-0.0.0.0/0}
INSTANCE_TYPE=${3:-t2.micro}
AMI=${4:-ami-0a313d6098716f372} # Ubuntu 22.04 LTS (example, replace with region-specific AMI)

echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group --group-name aegismesh-sg --description "AegisMesh SG" --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $SSH_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 30000-32767 --cidr 0.0.0.0/0

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
curl -sfL https://get.k3s.io | sh -
kubectl create namespace argocd || true
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
# Expose argocd server as NodePort
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
EOF

scp -o StrictHostKeyChecking=no /tmp/userdata.sh ubuntu@${PUBLIC_IP}:/home/ubuntu/userdata.sh
ssh -o StrictHostKeyChecking=no ubuntu@${PUBLIC_IP} 'chmod +x /home/ubuntu/userdata.sh && sudo /home/ubuntu/userdata.sh'

echo "k3s + ArgoCD installed. ArgoCD server exposed as NodePort. Public IP: $PUBLIC_IP"
echo "Connect to the node and run 'kubectl get svc -n argocd' to see the NodePort for argocd-server"
