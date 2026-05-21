# Jenkins Setup for AegisMesh IAM

This repository includes a root `Jenkinsfile` for CI/CD.

## What the pipeline does

1. Checks out source code.
2. Installs backend and frontend dependencies in parallel.
3. Runs backend tests, frontend lint, and frontend build in parallel.
4. Builds backend/frontend Docker images.
5. Archives frontend build artifacts (`frontend/dist/**`).

## Jenkins Job Configuration

Create a **Pipeline** job and configure:

- **Definition:** Pipeline script from SCM
- **SCM:** Git
- **Repository URL:** your repo URL
- **Branch Specifier:** `*/main` (or your branch)
- **Branch Specifier:** `*/main` (create a second Pipeline job with `*/aws-k3s-argocd` if not using Multibranch)
- **Script Path:** `Jenkinsfile`

## Multibranch Pipeline (Recommended, No Webhook)

Use this when you want Jenkins to auto-detect changes on both `main` and `aws-k3s-argocd` without webhooks.

1. Create a new job: **Multibranch Pipeline**
2. In **Branch Sources**, add **Git** (or **GitHub**):
   - Repository URL: your repo URL
   - Credentials: set if repo is private
3. In **Behaviors**:
   - Add **Filter by name (with wildcards)**
   - Include: `main aws-k3s-argocd`
   - Exclude: *(leave empty)*
4. In **Build Configuration**:
   - Mode: **by Jenkinsfile**
   - Script Path: `Jenkinsfile`
5. In **Scan Multibranch Pipeline Triggers**:
   - Enable **Periodically if not otherwise run**
   - Schedule: `H/5 * * * *`
6. Save and click **Scan Repository Now**

Notes:
- `Jenkinsfile` already contains `pollSCM('H/5 * * * *')`, so each discovered branch job polls for commits.
- Branch indexing schedule discovers branch-level updates; `pollSCM` detects commit updates per discovered branch.
- If you later enable webhooks, you can reduce polling frequency.

## Recommended Jenkins Plugins

Install these plugins:

- Pipeline
- Git
- Credentials Binding
- NodeJS
- Timestamper
- Docker Pipeline (only if you will build/push Docker images)

## Configure NodeJS Tool in Jenkins (Required)

The pipeline now expects a Jenkins-managed NodeJS tool so npm is always available.

1. Go to **Manage Jenkins -> Tools -> NodeJS installations**.
2. Click **Add NodeJS**.
3. Name it `NodeJS_22_12` (or choose another name and pass it via the `JENKINS_NODEJS_TOOL` build parameter).
4. Select Node.js **22.12+** (or 24.x).
5. Save.

If this is not configured, the `Node Toolchain Check` stage will fail before dependency installation.

## Jenkins Node Requirements

Your Jenkins agent must have:

- Node.js 22.12+ and npm (or Node.js 24+)
- Git
- Docker (required; pipeline always builds Docker images)

If you use Jenkins tool management for Node, define a Node.js installation at 22.12+.

## Environment and Secrets

The pipeline supports secure credentials via Jenkins Credentials.

### Manual credentials setup (required for secure runs)

1. Go to **Manage Jenkins -> Credentials -> System -> Global credentials (unrestricted)**.
2. Click **Add Credentials**.
3. Create these credentials with **Kind: Secret text**:
	 - ID: `aegismesh-database-url`
		 - Secret example: `postgresql://user:password@host:5432/aegismesh_ci`
	 - ID: `aegismesh-jwt-access-secret`
		 - Secret: long random string
	 - ID: `aegismesh-jwt-refresh-secret`
		 - Secret: long random string
4. Save each credential.

### Pipeline parameters for credentials

When running the job, use:

- `USE_JENKINS_CREDENTIALS=true`
- `DATABASE_URL_CREDENTIAL_ID=aegismesh-database-url`
- `JWT_ACCESS_SECRET_CREDENTIAL_ID=aegismesh-jwt-access-secret`
- `JWT_REFRESH_SECRET_CREDENTIAL_ID=aegismesh-jwt-refresh-secret`

If credentials are not configured yet, you can temporarily set `USE_JENKINS_CREDENTIALS=false` to use non-production fallback values.

### Optional additional credentials (if you extend pipeline)

- Docker registry credentials (Username with password):
	- ID example: `aegismesh-docker-registry`
- SMTP or OAuth secrets (Secret text):
	- `aegismesh-smtp-password`
	- `aegismesh-google-client-secret`
	- `aegismesh-github-client-secret`

## Docker Build

The pipeline always builds Docker images using:

- `BACKEND_IMAGE` (default `aegismesh/backend`)
- `FRONTEND_IMAGE` (default `aegismesh/frontend`)
- `IMAGE_TAG` (default `latest`)

If you want push/deploy stages, add registry login and deployment steps in your Jenkins job or extend the `Jenkinsfile`.

## Lint Behavior Controls

The pipeline includes parameters to control frontend lint strictness:

- `RUN_FRONTEND_LINT=true` to execute lint stage (set false to skip it).
- `FAIL_ON_LINT=false` keeps the build running even when lint fails (stage is marked unstable).
- `FAIL_ON_LINT=true` makes lint failures break the build.

Recommended rollout while fixing existing lint debt:

1. Keep `RUN_FRONTEND_LINT=true`.
2. Keep `FAIL_ON_LINT=false` temporarily.
3. Switch `FAIL_ON_LINT=true` after frontend lint errors are resolved.

## Suggested Triggers

- No-webhook mode (recommended): use `pollSCM('H/5 * * * *')` from `Jenkinsfile`
- For multiple branches (`main` and `aws-k3s-argocd`):
  - Best: Multibranch Pipeline + periodic branch indexing
  - Alternative: two Pipeline jobs (one per branch), both using polling
- Optional nightly build for regression checks

## First Run Checklist

1. Ensure Jenkins agent has Node.js 22.12+.
2. Ensure Jenkins agent has Docker CLI available for Jenkins user.
3. Run one build from `main`, then one from `aws-k3s-argocd`.
4. Fix any lint/test issues surfaced by CI.
