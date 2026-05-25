#!/usr/bin/env bash
set -euo pipefail

# Install MetalLB (for LoadBalancer IPs), ingress-nginx and cert-manager
# Usage: sudo bash scripts/install/install-ingress-stack.sh

echo "Installing MetalLB..."
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml

METALLB_RANGE=${METALLB_RANGE:-192.168.0.240-192.168.0.250}
echo "Create MetalLB addresspool - edit range to match your environment (override with METALLB_RANGE env var)"
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: metallb-pool
  namespace: metallb-system
spec:
  addresses:
  - ${METALLB_RANGE}
EOF

cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2ad
  namespace: metallb-system
EOF

echo "Installing ingress-nginx via Helm"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace

echo "Installing cert-manager via Helm"
helm repo add jetstack https://charts.jetstack.io
helm repo update
kubectl create namespace cert-manager || true
helm upgrade --install cert-manager jetstack/cert-manager --namespace cert-manager --set installCRDs=true

echo "Ingress stack install complete. Configure DNS (Cloudflare) to point to the LoadBalancer IP assigned to your ingress service. Use cert-manager ClusterIssuer for Let's Encrypt." 
