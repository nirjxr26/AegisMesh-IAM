# Intelligent Security Engine — Architecture (MVP)

> Scope: Real-time risk assessment API, Isolation Forest model pipeline, offline CronJob model retraining, MLflow experiment & model registry integration, Node.js authentication middleware integration. Everything else is deferred — see bottom.

---

## 1. System Boundary

```
+--------------------------------------------------------------+
|                    Client / Browser                          |
+--------------------------------------------------------------+
                               |
                               | (HTTPS / OAuth / JWT)
                               v
+--------------------------------------------------------------+
|                     Node.js Backend                          |
|             (Auth Middleware: authenticate.js)               |
+--------------------------------------------------------------+
            |                                      |
            | (Fast-fail HTTP POST /analyze)       | (Audit Logs)
            v                                      v
+-----------------------+              +-----------------------+
|    Security Engine    |              |      PostgreSQL       |
|    (FastAPI / ML)     |              |      (AuditLog)       |
+-----------------------+              +-----------------------+
            ^                                      ^
            | (Model Registry)                     | (SQL Fetch)
+-----------------------+              +-----------------------+
|    MLflow Tracking    | <----------- |     K8s CronJob       |
|    (HTTP Registry)    |  (Register)  |  (anomaly_detector)   |
+-----------------------+              +-----------------------+
```

*Pattern:* Classification filter with asynchronous retraining lookup loop.

*Editorial Note:* Keeping the security engine out of the main transaction flow for authentication data write prevents database resource locks during training.

---

## 2. Topology/Structure

```
+-----------------------------------------------------------------------------------------+
|                                    Kubernetes Cluster                                   |
|                                                                                         |
|  +--------------------+             +------------------+             +---------------+  |
|  |     Node Pod       |             |  FastAPI Pod     |             |  MLflow Pod   |  |
|  | (backend service)  | --(HTTP)--> | (security-eng)   | --(HTTP)--> | (registry)    |  |
|  +--------------------+             +------------------+             +---------------+  |
|             |                                |                               ^          |
|             | (SQL)                          | (Register Model)              |          |
|             v                                v                               |          |
|  +------------------------------------------------------------------------+  |          |
|  |                      PostgreSQL StatefulSet (AuditLogs)                |  |          |
|  +------------------------------------------------------------------------+  |          |
|                               ^                                              |          |
|                               | (Daily Retrain Job)                          |          |
|                  +--------------------------+                                |          |
|                  |       K8s CronJob        | -------------------------------+          |
|                  +--------------------------+                                           |
+-----------------------------------------------------------------------------------------+
```

*MVP Simplification:* FastAPI inference and CLI training commands share a single Docker image and model deployment codebase. Dedicated training pods are deferred to minimize image maintenance overhead.

*Editorial Note:* Co-locating training logic with inference simplifies model loading dependencies and guarantees code compatibility.

---

## 3. Internal Anatomy

```
+--------------------------------------------------------------------+
|                      security-engine / src                         |
|                                                                    |
|  +------------------------+  (FastAPI route handler)               |
|  |        main.py         | -- Exposes REST API and Prometheus     |
|  +------------------------+    metrics endpoint.                   |
|              |                                                     |
|              v                                                     |
|  +------------------------+  (Core ML operations facade)            |
|  |  anomaly_detector.py   | -- Manages pipeline instantiation,    |
|  +------------------------+    inference, DB query & model training. |
|              |                                                     |
|              v                                                     |
|  +------------------------+  (Scikit-learn Pipeline)               |
|  |     Sklearn Pipeline   | -- Contains ColumnTransformer (Imputer,|
|  +------------------------+    scaler, encoding) & Forest estimator.
+--------------------------------------------------------------------+
```

*Cut from MVP:*
- GPU support is deferred because the Isolation Forest model has negligible compute overhead on standard CPU cores.
- Online streaming/active learning is deferred to avoid complexity with model drift and data poisoning.

*Editorial Note:* Keeping modules decoupled via a clean facade ensures the underlying model framework (e.g. Scikit-learn to PyTorch) can be swapped out without changing API routes.

---

## 4. Real-time Threat Assessment

- **Flow**: The Node.js authenticate middleware intercepts requests, extracts the context, and posts it to the Security Engine `/analyze` route.
- **Example request context**:
```json
{
  "userId": "usr_clj12345",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "action": "AUTHENTICATION_VERIFY",
  "path": "/api/users/profile",
  "duration": 45.0,
  "category": "AUTHENTICATION",
  "result": "SUCCESS"
}
```
- **Example response**:
```json
{
  "risk_score": 0.12,
  "is_anomaly": false,
  "analysis_time_ms": 1.25,
  "active_version": "1"
}
```

*MVP Simplification:* Features are limited to action, category, result, and duration. Advanced behavioral features (e.g. geographic velocity, device fingerprint hash history) are deferred.

*Editorial Note:* Limiting features to basic audit logs guarantees that the database and the API payload schemas remain synchronized.

---

## 5. Model Lifecycle & Retraining

- **Flow**:
  1. The K8s CronJob invokes the retraining command daily.
  2. SQL queries 10k rows of historical event logs.
  3. Columns are passed to the Scikit-learn Pipeline transformer.
  4. The model fits and registers with MLflow.
  5. The next uvicorn worker reload pulls the newest model version from the local directory or MLflow API.

*MVP Simplification:* Manual production staging transition in MLflow UI. Fully automated CI/CD model deployment promotion is deferred.

*Editorial Note:* Manual gating of model versions ensures regression metrics are human-verified before traffic exposure.

---

## 6. Failure/Health Detection & Fail-Safe

- **Flow**:
  1. If `/analyze` fails to respond within 500ms or returns 5xx, the Node.js middleware catches the exception.
  2. It throttles error logging to once every 5 minutes to prevent disk exhaustion.
  3. It falls back to a neutral `risk_score` of `0.1` and `is_anomaly: false`.

```js
// Fail safe implementation from backend/src/utils/riskEngine.js
try {
  const response = await axios.post(`${SECURITY_ENGINE_URL}/analyze`, context, {
    timeout: 500 // Fail fast to avoid blocking user flow
  });
  return response.data;
} catch (error) {
  // Return neutral/low risk to allow authentication execution
  return { risk_score: 0.1, is_anomaly: false, error: true };
}
```

*MVP Simplification:* Circuit breakers are omitted in favor of basic HTTP timeout and fallback handling.

*Editorial Note:* A fail-open authorization posture is mandatory to prevent service outages from disrupting user authentication.

---

## 7. Observability

- **Metrics**: Exposes standard Prometheus metrics under `/metrics`.
  - `security_engine_risk_score`: Histogram tracking score distributions.
  - `security_engine_prediction_duration_seconds`: Histogram of inference latencies.
  - `security_engine_preprocessing_duration_seconds`: Pre-processing times.
  - `security_engine_inference_duration_seconds`: Raw classifier run times.
  - `security_engine_predictions_total`: Counter tracking total predictions by outcome and version.
  - `security_engine_model_info`: Gauge representing model version.
- **APM**: Integrated with Datadog APM tracing context headers.

*Editorial Note:* Splitting preprocessing from inference in metric dashboards exposes feature engineering bottlenecks immediately.

---

## 8. Tech Stack

| Layer | Choice | MVP-honest notes |
|---|---|---|
| Web Framework | FastAPI | High-speed ASGI framework, fast validation. |
| ML Engine | Scikit-learn | Isolation Forest is robust and lightweight. |
| Experiment Tracker | MLflow | Model version control and metadata logging. |
| Database Engine | SQLAlchemy | Basic PostgreSQL connection (skip Prisma for Python). |
| Observability | Prometheus & Datadog | Metrics exporter and trace hooks. |

---

## 9. The Demo

1. Populate database with standard mock data (e.g. 50 logins with `duration: 100`).
2. Run `/train` POST request to trigger the pipeline construction and MLflow run logging.
3. Query `/analyze` with a normal payload (`duration: 100`) and verify `is_anomaly: false` and `risk_score < 0.3`.
4. Query `/analyze` with an anomalous payload (`duration: 9999`) and verify `is_anomaly: true` and `risk_score > 0.7`.
5. Execute authentication call in frontend; verify a `403` and `Security anomaly detected. Re-authentication required.` response on anomalous request.

*This proves that the ML model can dynamically flags anomalous authorization attempts and propagate step-up reauth requirements in under 30 seconds.*

---

## 10. Stretch

- **Redis Caching**: Cache prediction scores for identical client footprint fingerprints for 5 minutes.
- **Dynamic Thresholding**: Auto-adjust contamination rates based on average rolling weekly threat reports.

---

## 11. Deferred — NOT in MVP, do not build yet

- **GPU Acceleration**: Isolation Forest is fast on CPU cores; deferred to save cloud infrastructure cost.
- **Online Streaming Model Updates**: Avoid complexity with model drift and data poisoning.
- **Automated MLflow Production Promotion**: Gating models protects against low precision models in production.
- **Circuit Breaker Middleware**: Basic timeouts are sufficient for initial traffic loads.
- **Advanced Behavioral Features**: Geolocation tracking and device fingerprint hashing require external DB dependencies.

*Keeping this list visible ensures scope creep is logged in the documentation repository rather than inflating the MVP roadmap.*
