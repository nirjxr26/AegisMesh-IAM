$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$namespace = $env:KUBE_NAMESPACE
if ([string]::IsNullOrWhiteSpace($namespace)) {
    $namespace = 'aegismesh'
}

kubectl rollout status deployment/backend -n $namespace --timeout=180s
kubectl rollout status deployment/frontend -n $namespace --timeout=180s

kubectl run smoke-test -i --rm -n $namespace --image=curlimages/curl --restart=Never --command -- sh -c @'
echo "Running HTTP check against frontend service..."
curl -sS -f http://frontend:80/ || curl -sS -f http://frontend.aegismesh.svc.cluster.local:80/ || exit 1
'@

Write-Host 'Smoke tests passed.'
