# AegisMesh — Architecture (MVP)

> Scope: React SPA frontend, Express Node.js backend API, FastAPI ML security engine, PostgreSQL database, Redis session cache, MLflow tracking server, and GitOps Kubernetes deployment topology. Everything else is deferred — see bottom.

---

## 1. System Boundary

```
                                  +-----------------------+
                                  |    Client Browser     |
                                  +-----------------------+
                                              |
                                              | (HTTPS / OAuth 2.0)
                                              v
                                  +-----------------------+
                                  |   Nginx Ingress /     |
                                  |     cert-manager      |
                                  +-----------------------+
                                              |
                                              +---------------------------------------+
                                              |                                       |
                                              |                                       |
                                              v                                       v
                                  +-----------------------+               +-----------------------+
                                  |     React Frontend    |               |    Express Backend    |
                                  |     (Static Assets)   |               |         (API)         |
                                  +-----------------------+               +-----------------------+
                                                                                      |
                                                    +---------------------------------+---------------------------------+
                                                    |                                 |                                 |
                                                    v                                 v                                 v
                                        +-----------------------+         +-----------------------+         +-----------------------+
                                        |      Redis Cache      |         |   FastAPI Sec Engine  |         |  PostgreSQL Database  |
                                        |    (Session Validity) |         |  (Anomaly Detection)  |         |   (Prisma / Schema)   |
                                        +-----------------------+         +-----------------------+         +-----------------------+
```

*Pattern:* Single Page Application (SPA) backed by a stateless REST API orchestration layer connected to dedicated cache, ML inference, and relational persistence backends.

*Editorial Note:* Keeping the client entry point restricted through Nginx Ingress ensures uniform SSL termination and routing policies across the entire network boundary.

---

## 2. Topology/Structure

```
+-------------------------------------------------------------------------------------------------------------------+
|                                                 Kubernetes Cluster                                                |
|                                                                                                                   |
|  +-----------------------------+     +-----------------------------+     +-------------------------------------+  |
|  |     "aegismesh" Namespace   |     |     "monitoring" Namespace  |     |        "mlops" Namespace            |  |
|  |                             |     |                             |     |                                     |  |
|  |  +-----------------------+  |     |  +-----------------------+  |     |  +-------------------------------+  |  |
|  |  |    frontend-deploy    |  |     |  |     Prometheus Pod    |  |     |  |          mlflow-deploy           |  |  |
|  |  +-----------------------+  |     |  +-----------------------+  |     |  +-------------------------------+  |  |
|  |              |              |     |              ^              |     |                 ^                 |  |
|  |              v              |     |              | (Scrape)     |     |                 | (Log runs)      |  |
|  |  +-----------------------+  |     |              |              |     |                 |                 |  |
|  |  |    backend-deploy     |  | ----+--------------+              |     |  +-------------------------------+  |  |
|  |  +-----------------------+  |     |                             |     |  |       security-engine         |  |  |
|  |       |      |       |      |     |  +-----------------------+  |     |  |       (FastAPI Pod)           |  |  |
|  | (SQL) |      | (TCP) |(HTTP)|     |  |      Grafana Pod      |  |     |  +-------------------------------+  |  |
|  v       |      v       v      |     |  +-----------------------+  |     |                 ^                 |  |
|  +----+  |    +----+  +----+   |     +-----------------------------+     |                 | (Daily CronJob) |  |
|  | DB | <+    | RD |  | SE | --+-----------------------------------------+                 |                 |  |
|  +----+       +----+  +----+   |                                         |  +-------------------------------+  |  |
| (Stateful)   (Cache) (Inference|                                         |  |      sec-engine-retrain       |  |  |
|                                |                                         |  +-------------------------------+  |  |
|                                |                                         +-------------------------------------+  |
+-------------------------------------------------------------------------------------------------------------------+
```

*MVP Simplification:* Ingress routing is mapped using host-based subdomains instead of path-based routing (e.g. `api.aegismesh.local` and `app.aegismesh.local`) to bypass path rewriting complexities.

*Editorial Note:* Segregating services into logical namespaces guarantees strict NetworkPolicies can prevent lateral developer movement if a frontend asset pod is compromised.

---

## 3. Internal Anatomy

### 3.1 Backend Service (Node.js)
```
+-------------------------------------------------------------------------------------------+
|                                    backend / src                                          |
|                                                                                           |
|  +------------------+  -- HTTP entrypoints, schema validation, rate-limiting.             |
|  |   controllers/   |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Business logics: token minting, user setup, policy evaluations. |
|  |    services/     |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Route authentication guards, API key validators, step-up check. |
|  |   middleware/    |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Database clients and connection utilities.                      |
|  |     config/      |                                                                     |
|  +------------------+                                                                     |
+-------------------------------------------------------------------------------------------+
```
*Cut from MVP (Backend):* Webhooks dispatcher service is cut to avoid handling event retry state loops.

### 3.2 Security Engine (Python)
```
+-------------------------------------------------------------------------------------------+
|                                 security-engine / src                                     |
|                                                                                           |
|  +------------------+  -- API endpoint exposure, metric generation lifespan config.       |
|  |     main.py      |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Model orchestration facade (train, load, predict pipelines).   |
|  |anomaly_detector.p|                                                                     |
|  +------------------+                                                                     |
+-------------------------------------------------------------------------------------------+
```
*Cut from MVP (Security Engine):* Online incremental learning is cut because Isolation Forest requires full fitting to prevent cluster structure collapse.

### 3.3 Admin Interface (React)
```
+-------------------------------------------------------------------------------------------+
|                                    frontend / src                                         |
|                                                                                           |
|  +------------------+  -- Access token state provider and hook decorators.                |
|  |     context/     |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Global HTTP fetch clients with interceptors.                    |
|  |     services/    |                                                                     |
|  +------------------+                                                                     |
|  +------------------+  -- Navigation and role-gated private route managers.               |
|  |    components/   |                                                                     |
|  +------------------+                                                                     |
+-------------------------------------------------------------------------------------------+
```
*Cut from MVP (Frontend):* Custom theme creator is cut to stick to a unified dark theme and reduce CSS bundle overhead.

---

## 4. Authentication & Session Lifecycle

```
Client             Backend             Redis             Postgres         Security Engine
  |                   |                  |                   |                   |
  |--- POST /auth --->|                  |                   |                   |
  |                   |--- Set Cookie -->|                   |                   |
  |                   |    (session id)  |                   |                   |
  |                   |------------------|------------------>|                   |
  |                   |                  |                   | (Persist Session) |
  |                   |                  |                   |<------------------|
  |                   |<-----------------|                   |                   |
  |<-- 200 OK Token --|                  |                   |                   |
  |                   |                  |                   |                   |
  |--- GET /resource -|                  |                   |                   |
  |    (with cookie)  |--- Get Session ->|                   |                   |
  |                   |<-- Session Valid-|                   |                   |
  |                   |------------------|-------------------|--- POST /analyze->| (Compute risk)
  |                   |                  |                   |   (Context log)   |
  |                   |<-----------------|-------------------|<- Risk & Anomaly -|
  |                   |                  |                   |                   |
  |                   |-- (If anomalous) |                   |                   |
  |<-- 403 Forbidden -|   Block request  |                   |                   |
```

- **Authentication Payload**: Token payload contains standard JWT claims:
```json
{
  "sub": "usr_9012389",
  "sessionId": "ses_81726489",
  "jti": "jwt_23984712",
  "exp": 1792942400
}
```

- **Risk Validation Integration**: Middleware intercepts operations and issues a `403` if high-risk indicators are hit, requesting MFA step-up.
```json
{
  "success": false,
  "error": {
    "code": "AUTH_012",
    "message": "Security anomaly detected. Re-authentication required.",
    "riskScore": 0.84
  }
}
```

*MVP Simplification:* Access tokens are validated against Redis list cache instead of parsing JWT cryptographic signatures on every backend call to limit execution time.

*Editorial Note:* Keeping session status checks localized in memory (Redis) prevents database connection pool exhaustion under heavy API request concurrency.

---

## 5. Policy-Based Access Control (PBAC)

- **Mechanisms**:
  - Evaluation priority: **DENY** always overrides **ALLOW**.
  - Policy sources: Evaluates policies attached directly to the `User`, inherited from parent `Groups`, or associated with assumed `Roles`.

```js
// Simple PBAC flow representation in backend/src/services/permission.service.js
const hasPermission = (policies, action, resource) => {
  const matches = policies.filter(p => matchPolicy(p, action, resource));
  if (matches.some(p => p.effect === 'DENY')) return false;
  return matches.some(p => p.effect === 'ALLOW');
};
```

- **Policy Payload Example**:
```json
{
  "Version": "2026-06-23",
  "Statement": [
    {
      "Effect": "DENY",
      "Action": ["user:delete"],
      "Resource": ["arn:aegismesh:iam::org_01:user/*"]
    },
    {
      "Effect": "ALLOW",
      "Action": ["user:*"],
      "Resource": ["*"]
    }
  ]
}
```

*MVP Simplification:* Resource matching uses simple glob matches (`*`) instead of complex regex matching engines to simplify string evaluations.

*Editorial Note:* Enforcing explicit DENY dominance at the engine core mitigates misconfiguration risks during programmatic policy changes.

---

## 6. Observability

- **APM & Tracing**: Distributed context propagation using Datadog APM headers spans from the Express gateway to the FastAPI classification service.
- **Log Format**: JSON formatted logs generated to ensure smooth ingestion by vector scrapers into Loki.
```json
{"timestamp":"2026-06-23T09:55:54Z","level":"info","message":"Risk analysis processed","userId":"usr_clj123","riskScore":0.12,"duration_ms":1.2}
```

*MVP Simplification:* Log indexing parameters are hardcoded instead of dynamically updated via agents.

*Editorial Note:* Clean structured logs containing tenant IDs allow prompt query isolation in multi-tenant environments.

---

## 7. Tech Stack

| Layer | Choice | MVP-honest notes |
|---|---|---|
| Frontend SPA | React 19 / Vite | Client interface (Skip Server-Side Rendering for MVP). |
| Core API Engine | Node.js (Express) | Asynchronous runtime, clean routing. |
| ML Pipeline | Python (FastAPI) | Isolation Forest integration via Scikit-learn. |
| Registry Database | PostgreSQL 17 | Relational schema storage managed by Prisma ORM. |
| In-Memory Cache | Redis | Fast token revocation and cached user profiles. |
| Deployment Orchestrator| K3s / ArgoCD | Lightweight K8s engine, GitOps deployment pipeline. |

---

## 8. The Demo

1. Boot stack via `docker-compose up --build` or deploy via Kustomize resources.
2. Sign in as a test developer and perform normal API activities to seed logs.
3. Query `/api/audit` to confirm audit lines are persisted with duration timings.
4. Execute `curl` POST command invoking `/train` on the security engine container.
5. Emulate an anomalous threat footprint (e.g. request from novel UA or large duration) and verify response returns `403` with code `AUTH_012`.

*This proves that the system captures events, trains on them, identifies behavioral anomalies, and enforces step-up authentication boundaries in 30 seconds.*

---

## 9. Stretch

- **Multi-region Redis Replication**: Sync session blacklists across geo-distributed nodes.
- **Argo Rollouts Canary Analysis**: Automate version rollbacks based on ML service error spikes.

---

## 10. Deferred — NOT in MVP, do not build yet

- **Webhooks Dispatcher Engine**: Webhook notifications require dedicated queue queues; deferred to reduce queue-infrastructure footprint.
- **Online Incremental ML Training**: Streaming learning models are prone to data poisoning; deferred to ensure static retraining predictability.
- **Dynamic Theme Customizer**: Custom layout variables increase CSS bundle size; deferred to stick to pure dark theme.
- **Regex Policy Evaluator**: High compute consumption during evaluations; deferred in favor of basic glob prefix matching.
- **Server-Side Rendering (SSR)**: Unnecessary build/hydration layers; deferred in favor of a simpler Static React SPA.

*Excluding these components protects the primary development lifecycle from early-stage infrastructure inflation.*
