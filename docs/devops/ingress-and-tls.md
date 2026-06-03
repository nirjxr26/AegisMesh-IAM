# Ingress & TLS (MetalLB + ingress-nginx + cert-manager + Cloudflare)

- **Purpose:** Provide L4 LB IPs on k3s, host routing and automated TLS via Let's Encrypt.
- **Stack:** MetalLB (L2), ingress-nginx, cert-manager, Cloudflare DNS for ACME DNS01 (optional) or use HTTP01 with external IP.

Quick steps:

1. Edit the MetalLB IP range in `scripts/install/install-ingress-stack.sh` to match your VPC / LAN.
2. Run:

   ```bash
   bash scripts/install/install-ingress-stack.sh
   ```

3. Check the ingress-nginx service external IP:

   ```bash
   kubectl -n ingress-nginx get svc ingress-nginx-controller
   ```

4. Create DNS A records in Cloudflare pointing your hostnames to the MetalLB IP.

Using cert-manager with Cloudflare (DNS01) – recommended for wildcard certs:

1. Create a Cloudflare API Token with Zone:DNS edit permissions.
2. Store token in Kubernetes or as SealedSecret: `cloudflare-api-token`.
3. Create a `ClusterIssuer` for Cloudflare DNS01 (example):

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-cloudflare
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: acme-account-key
    solvers:
      - dns01:
          cloudflare:
            email: ""
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

See cert-manager docs for full Cloudflare setup.

Notes:

- For single-node k3s on AWS, allocate an RFC1918 address range or use public Elastic IPs mapped via NAT if necessary.
- Test with staging Let's Encrypt before switching to production to avoid rate limits.
