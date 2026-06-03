# 📖 AegisMesh Documentation Index

Welcome to the AegisMesh documentation. Below is a categorized list of all guides and technical deep-dives for the ecosystem.

---

### 🚀 Getting Started
*   **[Local Setup Guide](SETUP.md)**: How to run the entire stack locally using Docker Compose.
*   **[Local Development](https://github.com/nirjxr26/AegisMesh-IAM#option-2--local-development)**: Setting up raw Node.js and Python environments.

### 🏗️ Infrastructure & DevOps
*   **[Kubernetes Overview](../k8s/README.md)**: Manifest structure and cluster management.
*   **[Ingress & TLS](devops/ingress-and-tls.md)**: Configuring external access and certificates.
*   **[HPA & Scaling](devops/hpa-metrics-server.md)**: Horizontal Pod Autoscaling and Metrics Server.
*   **[Argo Rollouts](devops/argo-rollouts.md)**: Advanced deployment strategies (Blue/Green, Canary).
*   **[Backups & Recovery](devops/backups-velero-minio.md)**: Using Velero and Minio for cluster snapshots.

### 🛡️ Security & Hardening
*   **[Sealed Secrets](devops/sealedsecrets-sops.md)**: Managing encrypted credentials in Git.
*   **[Falco Runtime Security](devops/falco.md)**: Configuring runtime intrusion detection.
*   **[Kyverno Policies](devops/kyverno-networkpolicy.md)**: Enforcing best practices and network isolation.

### 📊 Observability
*   **[Loki & Logging](devops/observability-loki-tempo.md)**: Local log aggregation and visualization.
*   **[Datadog Integration](https://github.com/nirjxr26/AegisMesh-IAM#-operations-command-center)**: Cloud-native APM and Security Signals.

---

### 🤖 MLOps & AI
*   **[MLflow Lifecycle](../monitoring/README.md)**: Tracking experiments and model versions.
*   **[Security Engine](../security-engine/README.md)**: Technical details of the anomaly detection pipeline.

---
[Return to Main README](../README.md)
