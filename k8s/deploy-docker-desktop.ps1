$ErrorActionPreference = "Stop"

function Assert-LastExitCode {
	param([string]$Step)
	if ($LASTEXITCODE -ne 0) {
		throw "$Step failed with exit code $LASTEXITCODE"
	}
}

$currentContext = kubectl config current-context
Assert-LastExitCode "kubectl context check"
if ($currentContext -ne "docker-desktop") {
	throw "Current kubectl context is '$currentContext'. Switch to 'docker-desktop' first."
}

Write-Host "[1/5] Building backend image..."
docker build -t aegismesh-backend:local-v2 ./backend
Assert-LastExitCode "Backend image build"

Write-Host "[2/5] Building frontend image..."
docker build -t aegismesh-frontend:local ./frontend
Assert-LastExitCode "Frontend image build"

Write-Host "[3/5] Applying Kubernetes manifests..."
kubectl apply -k ./k8s
Assert-LastExitCode "kubectl apply"

Write-Host "[4/5] Waiting for deployments..."
kubectl -n aegismesh rollout status deployment/postgres --timeout=180s
Assert-LastExitCode "Postgres rollout"
kubectl -n aegismesh rollout status deployment/backend --timeout=180s
Assert-LastExitCode "Backend rollout"
kubectl -n aegismesh rollout status deployment/frontend --timeout=180s
Assert-LastExitCode "Frontend rollout"

Write-Host "[5/5] Current status"
kubectl get pods -n aegismesh
Assert-LastExitCode "Get pods"
kubectl get svc -n aegismesh
Assert-LastExitCode "Get services"

Write-Host ""
Write-Host "Run these in separate terminals to access services on localhost:"
Write-Host "kubectl -n aegismesh port-forward svc/frontend 3000:3000"
Write-Host "kubectl -n aegismesh port-forward svc/backend 5000:5000"
