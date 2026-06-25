# AegisMesh System Overview

AegisMesh is a self-hosted, high-assurance Identity & Access Management (IAM) platform built on a Zero-Trust security model.

## Core Principles
1. **Deny Overrides Allow:** A matching DENY statement immediately rejects the request.
2. **Step-Up Auth:** Highly sensitive routes require a short-lived (10-minute) reauthentication token.
3. **Session Revocation:** Users can revoke specific sessions or all other sessions without disrupting their active device.
4. **ML Threat Scoring:** FastAPI and Scikit-learn (Isolation Forest) analyze authentications to block anomalies in real time.

## Directory Structure
* [apps/api/](file:///C:/Users/Admin/Desktop/Desktop%20Backup/Projects/AegisMesh%20-%20IAM/apps/api) - Node.js Express & Prisma API.
* [apps/dashboard/](file:///C:/Users/Admin/Desktop/Desktop%20Backup/Projects/AegisMesh%20-%20IAM/apps/dashboard) - React admin console.
* [apps/security-engine/](file:///C:/Users/Admin/Desktop/Desktop%20Backup/Projects/AegisMesh%20-%20IAM/apps/security-engine) - Python ML anomaly scoring engine.
* [platform/kubernetes/](file:///C:/Users/Admin/Desktop/Desktop%20Backup/Projects/AegisMesh%20-%20IAM/platform/kubernetes) - Kustomize resources for GitOps deployment.
* [platform/terraform/](file:///C:/Users/Admin/Desktop/Desktop%20Backup/Projects/AegisMesh%20-%20IAM/platform/terraform) - AWS ECR container repository provisioning.
