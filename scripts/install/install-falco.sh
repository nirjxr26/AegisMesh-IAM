#!/usr/bin/env bash
set -euo pipefail

echo "Installing Falco for runtime security..."
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update
kubectl create namespace falco || true
helm upgrade --install falco falcosecurity/falco --namespace falco

echo "Falco installed. Tune rules in the Falco ConfigMap to reduce false positives." 
