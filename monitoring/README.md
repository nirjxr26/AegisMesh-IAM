# AegisMesh Monitoring

This folder configures Prometheus and Grafana for the Docker Compose stack.

## Services

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002`
- Backend metrics: `http://localhost:5000/metrics`

If you override `PROMETHEUS_PORT` or `GRAFANA_PORT` in `.env`, use those ports instead.

## Grafana Login

Default local credentials:

- Username: `admin`
- Password: `admin`

Change `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in `.env` for shared or non-local environments.

## Provisioned Data Sources

- `Prometheus`: backend runtime metrics from `/metrics`
- `AegisMesh PostgreSQL`: IAM audit/security data from PostgreSQL

## Provisioned Dashboard

Grafana auto-loads the `AegisMesh Overview` dashboard from:

```text
monitoring/grafana/dashboards/aegismesh-overview.json
```

