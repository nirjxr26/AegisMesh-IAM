# Observability: Loki + Tempo + Alerting

Purpose: Centralize logs (Loki), traces (Tempo) and alerts (Alertmanager) to complement Prometheus metrics.

Quick install:

```bash
bash scripts/install/install-loki-stack.sh
```

Integration:

- Configure Promtail to send logs to Loki; configure Grafana to connect to Loki and Tempo data sources.
- If using Prometheus Operator (kube-prometheus-stack), hook Alertmanager into that stack for rule-based alerts.
