# AegisMesh System Architecture Spec

Central system design for the AegisMesh IAM application.

---

## 1. System Topology
```
[Client Browser]
       │
       ▼
[Nginx Ingress]
       │
       ├─► [React Dashboard (apps/dashboard)]
       │
       └─► [Express API (apps/api)] 
                 │
                 ├─► [Redis Cache] (Sessions/Revocations)
                 │
                 ├─► [FastAPI ML Engine (apps/security-engine)] (Isolation Forest risk)
                 │
                 └─► [PostgreSQL DB] (Prisma Registry)
```

---

## 2. Session Lifecycle
- Authenticated requests are verified against **Redis** for active token validation.
- All log transactions trigger an asynchronous threat assessment call to the `security-engine` microservice.
- Highly anomalous activities (risk score > 0.7) prompt step-up multi-factor authentication.

---

## 3. Policy-Based Access Control (PBAC)
- **Deny Dominance:** If any matching policy contains an explicit `DENY` statement, access is immediately rejected.
- **Inheritance:** Permissions are resolved by compiling policies directly attached to the User, assumed Roles, or parent Groups.
- Matching uses simple glob expressions (e.g. `users/*`).

---

## 4. Observability Integration
- **Distributed Tracing:** Managed via Datadog APM headers injected from Express to FastAPI.
- **Log Scraping:** Runtimes output structured JSON logs, collected by Promtail into Loki.
