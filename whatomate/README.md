# WhatoMate Helm Chart

A Kubernetes Helm chart for deploying the **WhatoMate CRM** API, complete with its bundled PostgreSQL and Redis dependencies.

---

## 🏗️ Current Build (Local / Minikube)

This chart is pre-configured to get you up and running on a local cluster instantly. Out of the box, it provides:
*   **Database Bundle:** Automated provisioning of Bitnami PostgreSQL and Redis.
*   **Local Ingress:** Configured to map `whatomate.local` to the cluster automatically.
*   **Configuration Logic:** Dynamic mapping of `configmap.yaml` to ensure the server gracefully connects to the bundled databases.

---

## 🛑 Production Requirements

If you are pushing this chart to a live production server (e.g., AWS EKS, Google GKE), **do not deploy it with the default `values.yaml`**. 

You must modify the following sections in your `values.yaml` (or create a `values-prod.yaml` override file) to ensure security, high availability, and data persistence.

### 1. Update Domain & SSL (Ingress)
You must change the generic local domain to your real public domain and attach SSL certificates using cert-manager.

```yaml
ingress:
  enabled: true
  className: "nginx" # Change to your Cloud Provider's Ingress Class
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: app.yourdomain.com
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - secretName: whatomate-tls
      hosts:
        - app.yourdomain.com
```

### 2. Change Database Secrets
The default codebase uses hardcoded open passwords (`postgres`, etc) for rapid local testing. **You must change these.**

```yaml
# PostgreSQL Configuration
postgresql:
  auth:
    postgresPassword: "YOUR_SECURE_PG_PASSWORD"

# Redis Configuration
redis:
  auth:
    password: "YOUR_SECURE_REDIS_PASSWORD"
```
*(Alternatively, you can pass these dynamically during deployment using `--set postgresql.auth.postgresPassword=SECRET`)*

### 3. Enable Cloud Storage (Persistent Volumes)
If a pod restarts in production, local data is wiped. You must request a real cloud hard drive (EBS volume, SSD) via `storageClass`.

```yaml
postgresql:
  primary:
    persistence:
      enabled: true
      size: 20Gi
      storageClass: "gp2" # (Example: gp2 for AWS, default for generic)
```

### 4. Enable High Availability (Replica & Limits)
Do not run a single pod in production. Scale up your deployment to `2` and strictly enforce Memory and CPU limits so WhatoMate cannot crash your cluster node.

```yaml
# Increase the number of pods running your application
replicaCount: 2

# Pin the image version (Do NOT use 'latest' in production)
image:
  repository: argonaut/whatomate-backend
  tag: "v1.0"

# Set strict hardware guardrails
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

---

## 🚀 Deployment Commands

Once you have verified your production overrides, navigate into the directory and deploy the chart:

**1. Create the Production Namespace:**
```bash
kubectl create namespace whatomate-prod
```

**2. Deploy to Production:**
```bash
helm install whatomate . -n whatomate-prod -f values.yaml
```

**3. Upgrade an Existing Release:**
```bash
helm upgrade whatomate . -n whatomate-prod -f values.yaml
```
