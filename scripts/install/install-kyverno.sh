#!/usr/bin/env bash
set -euo pipefail

echo "Installing Kyverno..."
kubectl create namespace kyverno || true
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm upgrade --install kyverno kyverno/kyverno --namespace kyverno

echo "Applying example policy: require pod security and enforce default deny network policy"
kubectl apply -f platform/kubernetes/networkpolicies/default-deny.yaml || true
