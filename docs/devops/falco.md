# Falco

Purpose: Detect suspicious runtime behavior inside Kubernetes workloads.

Quick install:

```bash
bash scripts/install/install-falco.sh
```

Notes:

1. Tune Falco rules to reduce noise for your app workload.
1. Route Falco alerts into your alerting stack if you want notifications.
