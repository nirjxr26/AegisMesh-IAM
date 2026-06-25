#!/usr/bin/env bash
set -euo pipefail
IMAGE_BACKEND=${1:-}
IMAGE_FRONTEND=${2:-}
if [[ -z "$IMAGE_BACKEND" || -z "$IMAGE_FRONTEND" ]]; then
  echo "Usage: update-k8s-images.sh <backend-image> <frontend-image>"
  exit 2
fi

cat > platform/kubernetes/overlays/prod/patch-backend-image.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: aegismesh
spec:
  template:
    spec:
      initContainers:
        - name: wait-for-db
          image: postgres:17-alpine
          imagePullPolicy: IfNotPresent
        - name: prisma-migrate
          image: ${IMAGE_BACKEND}
          imagePullPolicy: IfNotPresent
      containers:
        - name: backend
          image: ${IMAGE_BACKEND}
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
EOF

cat > platform/kubernetes/overlays/prod/patch-frontend-image.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: aegismesh
spec:
  template:
    spec:
      containers:
        - name: frontend
          image: ${IMAGE_FRONTEND}
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
EOF
