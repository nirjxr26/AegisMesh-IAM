#!/usr/bin/env bash
set -euo pipefail

# Install Grafana Loki (loki + promtail) and Tempo and Alertmanager via Helm (kube-prometheus-stack optional)
# Usage: bash scripts/install/install-loki-stack.sh

echo "Installing Loki and Tempo..."
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

kubectl create namespace observability || true

helm upgrade --install loki grafana/loki-stack --namespace observability --set promtail.enabled=true

echo "Installing Tempo (tracing)"
helm upgrade --install tempo grafana/tempo --namespace observability

echo "Note: Install Alertmanager and Prometheus Operator (kube-prometheus-stack) if you want Alertmanager integration and Prometheus metrics." 
