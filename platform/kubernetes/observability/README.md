# Observability & Monitoring Stack

This directory contains the configuration for the AegisMesh observability pipeline.

## Components

### 1. Application Performance Monitoring (Datadog)
- **Tracing:** Distributed tracing across Node.js (Backend) and Python (Security Engine).
- **Log Injection:** Correlates application logs with specific request traces.
- **Profiling:** Continuous profiling enabled in production to identify bottlenecks.

### 2. Infrastructure Metrics (Prometheus)
- **Scraping:** Collects metrics from `/metrics` endpoints in the Backend and Security Engine.
- **ML Monitoring:** Tracks `security_engine_risk_score` and inference latency.

### 3. Log Aggregation (Loki)
- **Collection:** Aggregates container logs via the Loki stack.
- **Querying:** Accessible via Grafana for unified log/metric analysis.

### 4. Visualizations (Grafana)
- **Dashboards:**
  - **IAM Overview:** Auth rates, failure types, and session counts.
  - **MLOps Hub:** Model accuracy, drift detection, and retraining status.
  - **Cluster Health:** K8s resource utilization (HPA status).

### 5. MLOps (MLflow)
- **Tracking:** Logs every training run from the Security Engine.
- **Registry:** Manages the lifecycle of `SecurityEnginePipeline` (v1, v2, Production).

## Accessing Dashboards
When running locally via `docker-compose`:
- **Grafana:** http://localhost:3010
- **MLflow:** http://localhost:5001
- **Prometheus:** http://localhost:9090

---
For technical details on how Datadog is initialized, refer to the source at [backend/src/server.js](../../../apps/backend-api/src/server.js) and [security-engine/src/main.py](../../../apps/security-engine/src/main.py).
