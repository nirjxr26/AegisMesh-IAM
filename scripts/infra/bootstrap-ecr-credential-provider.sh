#!/usr/bin/env bash
set -euo pipefail

# Install the kubelet ECR credential provider on a k3s node.
# Run this directly on each node that must pull private ECR images.

ECR_PROVIDER_VERSION="${ECR_PROVIDER_VERSION:-v1.36.0}"

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) PROVIDER_ARCH=amd64 ;;
  aarch64|arm64) PROVIDER_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download the ECR credential provider"
  exit 1
fi

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
  if ! command -v go >/dev/null 2>&1; then
    echo "go is required if the binary download fails"
    exit 1
  fi
  GO111MODULE=on GOPROXY=https://proxy.golang.org,direct go install k8s.io/cloud-provider-aws/cmd/ecr-credential-provider@${ECR_PROVIDER_VERSION}
  install -m 0755 "$(go env GOPATH)/bin/ecr-credential-provider" /usr/local/bin/ecr-credential-provider
fi

chmod 0755 /usr/local/bin/ecr-credential-provider

if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files | grep -q '^k3s\.service'; then
    echo "Restarting k3s so kubelet picks up the new credential-provider configuration..."
    systemctl restart k3s
    systemctl is-active --quiet k3s
  elif systemctl list-unit-files | grep -q '^kubelet\.service'; then
    echo "Restarting kubelet so the new credential-provider configuration is active..."
    systemctl restart kubelet
    systemctl is-active --quiet kubelet
  else
    echo "No k3s or kubelet systemd unit found; restart the node runtime manually to activate the new auth path."
  fi
else
  echo "systemctl not available; restart the node runtime manually to activate the new auth path."
fi

echo "Installed kubelet ECR credential-provider config and restarted the node runtime where possible."
