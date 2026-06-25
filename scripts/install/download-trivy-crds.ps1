$ErrorActionPreference = 'Stop'
$url = "https://raw.githubusercontent.com/aquasecurity/trivy-operator/v0.22.0/deploy/static/trivy-operator.yaml"
Write-Host "Downloading Trivy Operator manifest from $url"
$content = Invoke-WebRequest -Uri $url -UseBasicParsing
$docs = $content.Content -split "---"
$crdDocs = $docs | Where-Object { $_ -match "kind:\s*CustomResourceDefinition" }
Write-Host "Found $($crdDocs.Count) CustomResourceDefinitions"
$crdYaml = $crdDocs -join "`n---`n"
$crdYaml | Out-File -FilePath "platform/kubernetes/manifests/trivy/trivy-crds.yaml" -Encoding utf8
Write-Host "Successfully wrote CRDs to platform/kubernetes/manifests/trivy/trivy-crds.yaml"
