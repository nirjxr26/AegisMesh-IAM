# Kyverno + NetworkPolicy

Purpose: Enforce runtime policy and deny-by-default network access.

Quick install:

```bash
bash scripts/install/install-kyverno.sh
```

Baseline network isolation:

```bash
kubectl apply -f k8s/networkpolicies/default-deny.yaml
```

Next steps:

1. Add allow policies for frontend to backend and backend to database.
1. Add Kyverno policies for restricted pods, disallowed hostPath, and forbidden privilege escalation.
