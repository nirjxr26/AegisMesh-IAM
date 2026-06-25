# AegisMesh Security Architecture

## 1. Zero-Trust Access Control
AegisMesh enforces a Zero-Trust architecture where no user or service is trusted by default.

### A. Authentication
- **Multi-Factor Authentication (MFA):** Mandatory for privileged actions; uses TOTP (Time-based One-Time Password).
- **Session Management:** JWTs are fingerprinted and stored in `HttpOnly` and `Secure` cookies to prevent XSS and session hijacking.
- **OAuth2 Integration:** Secure identity federation with Google and GitHub.

### B. Authorization (PBAC)
- **Deny Precedence:** If multiple policies apply to a request, a single `DENY` effect overrides all `ALLOW` permissions.
- **Granular Scopes:** Permissions are defined at the action level (e.g., `user:write`, `policy:simulate`).

## 2. Dynamic Threat Detection
The **Security Engine** provides a second layer of defense.
- **Risk Scoring:** Every authentication request is scored. High risk scores trigger a mandatory **Step-up Re-authentication** challenge.
- **Behavioral Analysis:** Detects impossible travel, unusual access hours, and brute-force patterns.

## 3. Infrastructure Security
- **Namespace Isolation:** Services are partitioned into `aegismesh`, `monitoring`, and `security` namespaces.
- **Network Policies:** Only explicitly allowed traffic is permitted (e.g., Backend -> Database).
- **Runtime Security:** **Falco** monitors for anomalous system calls and container escapes.
- **Secrets:** All credentials are encrypted via **SealedSecrets** before being committed to source control.

## 4. CI/CD Security
- **Image Scanning:** **Trivy** scans all Docker images for CVEs during the build process.
- **Static Analysis:** **SonarCloud** and **CodeQL** perform deep code analysis for security vulnerabilities.

---
Security is a continuous process. Refer to the [Security Audit Logs](README.md) for visibility into all system activities.
