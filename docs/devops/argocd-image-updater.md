# Argo CD Image Updater

Purpose: Keep overlays up-to-date automatically by letting Argo CD Image Updater update Kustomize patches with new image tags.

Quick install:

```bash
bash scripts/install/install-argocd-image-updater.sh
```

Configuration notes:

- After install, create `ImageList` and Kubernetes `Secret` resources for registries (if needed) to allow the updater to access private registries.
- Define `argocd-image-updater.argoproj.io/image-list` annotations on Argo CD Application manifests to control which apps are updated.

Security:

- Use least-privileged service account for the updater and restrict write access to overlay paths only.
