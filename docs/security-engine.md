# Intelligent Security Engine Spec

The Security Engine detects anomalies and scores risk in real time.

---

## 1. System Integration
```
[Node.js Backend] ──(HTTP POST /analyze)──► [FastAPI (apps/security-engine)]
       │                                                 │
       ▼                                                 ▼
[PostgreSQL (AuditLogs)] ◄──(Daily Retraining Cron)──────┘
```

- **Fail-Open Policy:** If the `/analyze` endpoint fails to respond within 500ms, the API defaults to neutral/low risk to ensure user access is never blocked by a security engine outage.

---

## 2. Machine Learning Pipeline
- **Classifier:** Scikit-learn **Isolation Forest** trained on database audit logs.
- **Features Analyzed:** IP address, action path, user agent, action category, duration (latency), and transaction result.
- **Contamination Gating:** Normal requests yield risk scores < 0.3. Anomalous footprints (e.g. unexpected path duration or location shift) yield scores > 0.7, triggering step-up auth requirements.

---

## 3. Training Loop
- A Kubernetes `CronJob` runs daily.
- Queries up to 10k event records from the PostgreSQL database, fits the Isolation Forest model, and registers the run in **MLflow**.
- The API worker reload catches and updates the active classifier in-memory.

---

## 4. Diagnostics & Observability
- Exposes Prometheus `/metrics` for score distributions, inference latency, preprocessing duration, and prediction count.
- Tracing context is propagated via Datadog APM headers.
