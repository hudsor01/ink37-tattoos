# Secret Scanning Pipeline — k3s Deployment Prompt

You are deploying a self-hosted secret scanning pipeline on a k3s single-node cluster. This system scans GitHub repositories for leaked secrets (API keys, tokens, passwords, private keys) using two complementary open-source scanners, with a dashboard for findings management and Slack notifications.

---

## Your Environment

- **Server:** k3s single-node cluster (Ubuntu, `homelab-k3s`)
- **User:** `dev-server`
- **Existing services on this cluster:** n8n (`n8n.thehudsonfam.com`), Stirling PDF (`pdf.thehudsonfam.com`), FluxCD for GitOps
- **Ingress:** Cloudflare Tunnels (already configured for other services — outbound-only, no inbound ports)
- **GitHub user:** `hudsor01`
- **Primary repo to scan:** `hudsor01/ink37-tattoos` (private, GitHub Free plan)
- **Domain pattern:** `*.thehudsonfam.com` via Cloudflare

---

## What You Are Building

### Architecture

```
GitHub (push/PR events)
    |
    | HTTPS webhook (HMAC-SHA256 signed)
    v
Cloudflare Tunnel --> k3s Ingress --> n8n Webhook Node
    |
    |-- Validates HMAC-SHA256 signature (reject if invalid)
    |-- Extracts: repo URL, ref, before/after commit SHAs, event type
    |-- Routes by event type:
    |     push --> Gitleaks incremental scan (fast, new commits only)
    |     pull_request --> TruffleHog verified scan (thorough, checks if secrets are live)
    v
n8n creates Kubernetes Job via k8s API (ServiceAccount with Job-creation RBAC)
    |
    v
Scanner Job runs in `secret-scanner` namespace:
    1. Init container: clone repo using GitHub PAT
    2. Scanner container: run gitleaks or trufflehog, output JSON
    3. Upload container: POST JSON results to DefectDojo API
    |
    v
DefectDojo Dashboard (`defectdojo.thehudsonfam.com`)
    |-- Web UI for viewing/triaging findings
    |-- Deduplication across scans
    |-- Sends Slack notification on new findings

Additionally, two CronJobs run nightly:
    - 2:00 AM: Gitleaks full-history scan
    - 3:00 AM: TruffleHog deep scan with live credential verification (--results=verified,unknown)
```

### Components to Deploy

| Component | Image | Purpose | Runs As |
|-----------|-------|---------|---------|
| Gitleaks | `ghcr.io/gitleaks/gitleaks:latest` | Fast regex+entropy secret scanning | K8s Job (webhook-triggered) + CronJob (nightly) |
| TruffleHog v3 | `trufflesecurity/trufflehog:latest` | Deep scanning with 800+ detectors + live credential verification | K8s Job (webhook-triggered) + CronJob (nightly) |
| DefectDojo | `defectdojo/defectdojo-django` | Findings dashboard, dedup, notifications | Helm release (Deployment + PostgreSQL + Redis) |
| n8n webhook workflow | Already running | Receives GitHub webhooks, creates K8s Jobs | Existing deployment |

---

## Step-by-Step Deployment

### Phase 1: Namespace and Secrets

Create the namespace and all required secrets first.

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secret-scanner
  labels:
    app.kubernetes.io/part-of: secret-scanning
```

```yaml
# secrets.yaml — FILL IN VALUES BEFORE APPLYING
apiVersion: v1
kind: Secret
metadata:
  name: github-credentials
  namespace: secret-scanner
type: Opaque
stringData:
  # Classic PAT with scopes: repo, read:org
  # Generate at: https://github.com/settings/tokens/new
  # Fine-grained PATs are NOT supported by TruffleHog
  token: "ghp_REPLACE_ME"

---
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook
  namespace: secret-scanner
type: Opaque
stringData:
  # Generate: openssl rand -hex 32
  # This same value goes into the GitHub webhook configuration
  secret: "REPLACE_WITH_GENERATED_SECRET"

---
apiVersion: v1
kind: Secret
metadata:
  name: defectdojo-credentials
  namespace: secret-scanner
type: Opaque
stringData:
  # DefectDojo admin password — set something strong
  admin-password: "REPLACE_ME"
  # This gets populated AFTER DefectDojo is running — you'll create an API key in the UI
  api-token: "REPLACE_AFTER_SETUP"

---
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook
  namespace: secret-scanner
type: Opaque
stringData:
  # Create at: https://api.slack.com/messaging/webhooks
  url: "https://hooks.slack.com/services/REPLACE_ME"
```

**Action:** Ask the user for the GitHub PAT and Slack webhook URL. Generate the webhook secret with `openssl rand -hex 32`.

---

### Phase 2: RBAC for n8n

n8n needs permission to create Jobs in the `secret-scanner` namespace. Create a ServiceAccount + ClusterRole + RoleBinding.

```yaml
# n8n-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: n8n-job-creator
  namespace: secret-scanner

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: job-creator
  namespace: secret-scanner
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "get", "list", "watch", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: n8n-can-create-jobs
  namespace: secret-scanner
subjects:
- kind: ServiceAccount
  name: n8n-job-creator
  namespace: secret-scanner
roleRef:
  kind: Role
  name: job-creator
  apiGroup: rbac.authorization.k8s.io
```

**After applying:** Generate a long-lived token for n8n to use:

```bash
# Create a token for n8n to authenticate to the k8s API
kubectl create token n8n-job-creator -n secret-scanner --duration=8760h
```

Store this token — n8n will use it in HTTP Request nodes to create Jobs.

---

### Phase 3: Scanner Job Templates

These are the Job specs that n8n will create dynamically. Store them as ConfigMaps so n8n can reference them, or hardcode them in the n8n workflow.

#### Gitleaks Incremental Scan (webhook-triggered on push)

```yaml
# gitleaks-job-template.yaml
# n8n creates this Job dynamically, substituting REPO_URL, BEFORE_SHA, AFTER_SHA
apiVersion: batch/v1
kind: Job
metadata:
  generateName: gitleaks-push-
  namespace: secret-scanner
  labels:
    app: secret-scanner
    scanner: gitleaks
    trigger: webhook
spec:
  activeDeadlineSeconds: 600
  backoffLimit: 1
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      initContainers:
      - name: git-clone
        image: alpine/git:latest
        command: ["sh", "-c"]
        args:
        - |
          git clone --no-tags "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_FULL_NAME}.git" /repo
          cd /repo
          git log --oneline "${BEFORE_SHA}..${AFTER_SHA}" || echo "Commit range scan"
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: token
        - name: REPO_FULL_NAME
          value: "hudsor01/ink37-tattoos"  # n8n substitutes this
        - name: BEFORE_SHA
          value: "REPLACE"  # n8n substitutes from webhook payload
        - name: AFTER_SHA
          value: "REPLACE"  # n8n substitutes from webhook payload
        volumeMounts:
        - name: repo
          mountPath: /repo
        resources:
          requests: { cpu: 100m, memory: 128Mi }
          limits: { cpu: 500m, memory: 512Mi }
      containers:
      - name: gitleaks
        image: ghcr.io/gitleaks/gitleaks:latest
        args:
        - git
        - --source=/repo
        - --log-opts=--since-commit=$(BEFORE_SHA)
        - -v
        - -f
        - json
        - -r
        - /output/results.json
        env:
        - name: BEFORE_SHA
          value: "REPLACE"
        volumeMounts:
        - name: repo
          mountPath: /repo
          readOnly: true
        - name: output
          mountPath: /output
        resources:
          requests: { cpu: 500m, memory: 512Mi }
          limits: { cpu: "2", memory: 2Gi }
      - name: upload
        image: curlimages/curl:latest
        command: ["sh", "-c"]
        args:
        - |
          echo "Waiting for scan to complete..."
          # Wait for gitleaks to finish (it shares the pod, runs in parallel)
          while [ ! -f /output/results.json ] && [ ! -f /output/done ]; do sleep 2; done
          sleep 3

          if [ -f /output/results.json ] && [ -s /output/results.json ]; then
            echo "Findings detected — uploading to DefectDojo"
            curl -s -X POST "${DEFECTDOJO_URL}/api/v2/reimport-scan/" \
              -H "Authorization: Token ${DEFECTDOJO_TOKEN}" \
              -F "scan_type=Gitleaks Scan" \
              -F "product_name=ink37-tattoos" \
              -F "engagement_name=Secret Scanning" \
              -F "auto_create_context=true" \
              -F "file=@/output/results.json" \
              -F "minimum_severity=Info" \
              -F "active=true" \
              -F "verified=false" \
              -F "close_old_findings=false"

            # Count findings for Slack notification
            FINDING_COUNT=$(cat /output/results.json | grep -c '"RuleID"' || echo "0")
            if [ "$FINDING_COUNT" -gt "0" ]; then
              curl -s -X POST "${SLACK_WEBHOOK_URL}" \
                -H "Content-Type: application/json" \
                -d "{\"text\":\"Secret Scanner: ${FINDING_COUNT} potential secret(s) found in push to ${REPO_FULL_NAME}. Check DefectDojo for details.\"}"
            fi
          else
            echo "No findings — clean scan"
            touch /output/done
          fi
        env:
        - name: DEFECTDOJO_URL
          value: "http://defectdojo-django.secret-scanner.svc.cluster.local:8080"
        - name: DEFECTDOJO_TOKEN
          valueFrom:
            secretKeyRef:
              name: defectdojo-credentials
              key: api-token
        - name: SLACK_WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: slack-webhook
              key: url
        - name: REPO_FULL_NAME
          value: "hudsor01/ink37-tattoos"
        volumeMounts:
        - name: output
          mountPath: /output
        resources:
          requests: { cpu: 50m, memory: 64Mi }
          limits: { cpu: 200m, memory: 128Mi }
      restartPolicy: Never
      volumes:
      - name: repo
        emptyDir: { sizeLimit: 2Gi }
      - name: output
        emptyDir: { sizeLimit: 100Mi }
```

#### TruffleHog Verified Scan (webhook-triggered on PR)

```yaml
# trufflehog-job-template.yaml
apiVersion: batch/v1
kind: Job
metadata:
  generateName: trufflehog-pr-
  namespace: secret-scanner
  labels:
    app: secret-scanner
    scanner: trufflehog
    trigger: webhook
spec:
  activeDeadlineSeconds: 900
  backoffLimit: 1
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
      - name: trufflehog
        image: trufflesecurity/trufflehog:latest
        command: ["/usr/bin/trufflehog"]
        args:
        - github
        - --repo=https://github.com/hudsor01/ink37-tattoos
        - --token=$(GITHUB_TOKEN)
        - --branch=$(PR_HEAD_REF)
        - --json
        - --results=verified,unknown
        - --fail
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: token
        - name: PR_HEAD_REF
          value: "REPLACE"  # n8n substitutes from PR payload
        resources:
          requests: { cpu: "1", memory: 1Gi, ephemeral-storage: 5Gi }
          limits: { cpu: "2", memory: 4Gi, ephemeral-storage: 10Gi }
      restartPolicy: Never
```

---

### Phase 4: Nightly CronJobs

#### Gitleaks Full History Scan (2 AM)

```yaml
# gitleaks-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gitleaks-nightly
  namespace: secret-scanner
  labels:
    app: secret-scanner
    scanner: gitleaks
    trigger: cron
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
      backoffLimit: 2
      template:
        spec:
          initContainers:
          - name: git-clone
            image: alpine/git:latest
            command: ["sh", "-c"]
            args:
            - |
              git clone --mirror "https://x-access-token:${GITHUB_TOKEN}@github.com/hudsor01/ink37-tattoos.git" /repo
            env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-credentials
                  key: token
            volumeMounts:
            - name: repo
              mountPath: /repo
            resources:
              requests: { cpu: 100m, memory: 128Mi }
              limits: { cpu: 500m, memory: 512Mi }
          containers:
          - name: gitleaks
            image: ghcr.io/gitleaks/gitleaks:latest
            args:
            - git
            - --source=/repo
            - -v
            - -f
            - json
            - -r
            - /output/results.json
            volumeMounts:
            - name: repo
              mountPath: /repo
              readOnly: true
            - name: output
              mountPath: /output
            resources:
              requests: { cpu: 500m, memory: 512Mi }
              limits: { cpu: "2", memory: 2Gi }
          - name: upload
            image: curlimages/curl:latest
            command: ["sh", "-c"]
            args:
            - |
              while [ ! -f /output/results.json ] && [ ! -f /output/.done ]; do sleep 5; done
              sleep 3
              if [ -f /output/results.json ] && [ -s /output/results.json ]; then
                FINDING_COUNT=$(grep -c '"RuleID"' /output/results.json || echo "0")
                curl -s -X POST "http://defectdojo-django.secret-scanner.svc.cluster.local:8080/api/v2/reimport-scan/" \
                  -H "Authorization: Token ${DEFECTDOJO_TOKEN}" \
                  -F "scan_type=Gitleaks Scan" \
                  -F "product_name=ink37-tattoos" \
                  -F "engagement_name=Secret Scanning" \
                  -F "auto_create_context=true" \
                  -F "file=@/output/results.json" \
                  -F "minimum_severity=Info" \
                  -F "active=true" \
                  -F "verified=false" \
                  -F "close_old_findings=true" \
                  -F "close_old_findings_product_scope=true"
                if [ "$FINDING_COUNT" -gt "0" ]; then
                  curl -s -X POST "${SLACK_WEBHOOK_URL}" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\":\"Nightly Gitleaks scan: ${FINDING_COUNT} finding(s) in ink37-tattoos. Check DefectDojo.\"}"
                fi
              else
                touch /output/.done
                echo "Clean scan — no findings"
              fi
            env:
            - name: DEFECTDOJO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: defectdojo-credentials
                  key: api-token
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            volumeMounts:
            - name: output
              mountPath: /output
            resources:
              requests: { cpu: 50m, memory: 64Mi }
              limits: { cpu: 200m, memory: 128Mi }
          restartPolicy: Never
          volumes:
          - name: repo
            emptyDir: { sizeLimit: 2Gi }
          - name: output
            emptyDir: { sizeLimit: 100Mi }
```

#### TruffleHog Deep Scan with Verification (3 AM)

```yaml
# trufflehog-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trufflehog-nightly
  namespace: secret-scanner
  labels:
    app: secret-scanner
    scanner: trufflehog
    trigger: cron
spec:
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
      backoffLimit: 2
      template:
        spec:
          containers:
          - name: trufflehog
            image: trufflesecurity/trufflehog:latest
            command: ["sh", "-c"]
            args:
            - |
              /usr/bin/trufflehog github \
                --repo=https://github.com/hudsor01/ink37-tattoos \
                --token="${GITHUB_TOKEN}" \
                --json \
                --results=verified,unknown \
                > /output/results.json 2>/output/scan.log

              EXIT_CODE=$?

              if [ -s /output/results.json ]; then
                VERIFIED=$(grep -c '"Verified":true' /output/results.json || echo "0")
                UNVERIFIED=$(grep -c '"Verified":false' /output/results.json || echo "0")

                curl -s -X POST "http://defectdojo-django.secret-scanner.svc.cluster.local:8080/api/v2/reimport-scan/" \
                  -H "Authorization: Token ${DEFECTDOJO_TOKEN}" \
                  -F "scan_type=Trufflehog Scan" \
                  -F "product_name=ink37-tattoos" \
                  -F "engagement_name=Secret Scanning" \
                  -F "auto_create_context=true" \
                  -F "file=@/output/results.json" \
                  -F "minimum_severity=Info" \
                  -F "active=true" \
                  -F "close_old_findings=true" \
                  -F "close_old_findings_product_scope=true"

                if [ "$VERIFIED" -gt "0" ]; then
                  curl -s -X POST "${SLACK_WEBHOOK_URL}" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\":\"CRITICAL: TruffleHog found ${VERIFIED} VERIFIED (live) secret(s) in ink37-tattoos! These credentials are active and must be rotated immediately. ${UNVERIFIED} unverified finding(s) also detected. Check DefectDojo.\"}"
                elif [ "$UNVERIFIED" -gt "0" ]; then
                  curl -s -X POST "${SLACK_WEBHOOK_URL}" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\":\"TruffleHog nightly: ${UNVERIFIED} unverified finding(s) in ink37-tattoos. Check DefectDojo.\"}"
                fi
              else
                echo "Clean scan — no findings"
              fi
            env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-credentials
                  key: token
            - name: DEFECTDOJO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: defectdojo-credentials
                  key: api-token
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            volumeMounts:
            - name: output
              mountPath: /output
            resources:
              requests: { cpu: "1", memory: 1Gi, ephemeral-storage: 5Gi }
              limits: { cpu: "2", memory: 4Gi, ephemeral-storage: 10Gi }
          restartPolicy: Never
          volumes:
          - name: output
            emptyDir: { sizeLimit: 200Mi }
```

---

### Phase 5: DefectDojo

Deploy DefectDojo using its official Helm chart. This is the heaviest component (~2-4GB RAM).

```bash
# Add the DefectDojo Helm repo
helm repo add defectdojo https://raw.githubusercontent.com/DefectDojo/django-DefectDojo/master/helm/defectdojo
helm repo update

# Install
helm install defectdojo defectdojo/defectdojo \
  --namespace secret-scanner \
  --set django.ingress.enabled=true \
  --set django.ingress.activateTLS=false \
  --set host=defectdojo.thehudsonfam.com \
  --set admin.user=admin \
  --set admin.password="$(kubectl get secret defectdojo-credentials -n secret-scanner -o jsonpath='{.data.admin-password}' | base64 -d)" \
  --set admin.firstName=Richard \
  --set admin.lastName=Hudson \
  --set admin.email=richard@thehudsonfam.com \
  --set createSecret=true \
  --set createRedisSecret=true \
  --set createPostgresqlSecret=true \
  --set django.resources.requests.cpu=500m \
  --set django.resources.requests.memory=1Gi \
  --set django.resources.limits.cpu="2" \
  --set django.resources.limits.memory=2Gi \
  --set celery.worker.resources.requests.cpu=250m \
  --set celery.worker.resources.requests.memory=512Mi \
  --set celery.worker.resources.limits.cpu="1" \
  --set celery.worker.resources.limits.memory=1Gi
```

**After DefectDojo is running:**

1. Access the UI at `defectdojo.thehudsonfam.com` (after Cloudflare Tunnel setup)
2. Log in as `admin`
3. Go to API v2 Key in user profile — copy the API token
4. Update the `defectdojo-credentials` secret with the API token:
   ```bash
   kubectl patch secret defectdojo-credentials -n secret-scanner \
     --type='json' \
     -p='[{"op":"replace","path":"/stringData/api-token","value":"YOUR_API_TOKEN_HERE"}]'
   ```
5. Create a Product called `ink37-tattoos` (or let `auto_create_context=true` handle it on first scan upload)

---

### Phase 6: Cloudflare Tunnel

Expose DefectDojo and the n8n webhook endpoint. If using `cloudflared` on the cluster:

Add to the existing tunnel config (typically a ConfigMap for cloudflared):

```yaml
# Add these entries to the tunnel ingress rules
- hostname: defectdojo.thehudsonfam.com
  service: http://defectdojo-django.secret-scanner.svc.cluster.local:8080
```

The n8n webhook endpoint is already exposed via `n8n.thehudsonfam.com`. The GitHub webhook will POST to:
```
https://n8n.thehudsonfam.com/webhook/github-secret-scan
```

---

### Phase 7: n8n Webhook Workflow

Create a workflow in n8n at `n8n.thehudsonfam.com` with the following nodes:

#### Node 1: Webhook (trigger)
- **Type:** Webhook
- **HTTP Method:** POST
- **Path:** `github-secret-scan`
- **Authentication:** None (we validate HMAC manually)
- **Response Mode:** Immediately (return 202 to GitHub fast)

#### Node 2: Code (HMAC validation)
- **Type:** Code (JavaScript)
```javascript
const crypto = require('crypto');

const webhookSecret = $env.GITHUB_WEBHOOK_SECRET; // Set in n8n environment variables
const signature = $input.first().headers['x-hub-signature-256'];
const body = JSON.stringify($input.first().json);

const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(body, 'utf8');
const expected = 'sha256=' + hmac.digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))) {
  throw new Error('Invalid webhook signature — rejecting');
}

return $input.all();
```

#### Node 3: Switch (route by event type)
- **Type:** Switch
- **Conditions:**
  - `push`: `{{ $json.headers['x-github-event'] === 'push' }}`
  - `pull_request`: `{{ $json.headers['x-github-event'] === 'pull_request' }}`

#### Node 4a: HTTP Request (create Gitleaks Job — push branch)
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://kubernetes.default.svc/apis/batch/v1/namespaces/secret-scanner/jobs`
- **Authentication:** Bearer Token (use the n8n-job-creator ServiceAccount token)
- **Headers:** `Content-Type: application/json`
- **Body:** The Gitleaks Job JSON from the template above, with these substitutions:
  - `REPO_FULL_NAME` = `{{ $json.body.repository.full_name }}`
  - `BEFORE_SHA` = `{{ $json.body.before }}`
  - `AFTER_SHA` = `{{ $json.body.after }}`
  - `metadata.name` = `gitleaks-push-{{ Date.now() }}`

#### Node 4b: HTTP Request (create TruffleHog Job — pull_request branch)
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://kubernetes.default.svc/apis/batch/v1/namespaces/secret-scanner/jobs`
- **Authentication:** Bearer Token
- **Body:** The TruffleHog Job JSON from the template above, with:
  - `PR_HEAD_REF` = `{{ $json.body.pull_request.head.ref }}`
  - `metadata.name` = `trufflehog-pr-{{ $json.body.number }}-{{ Date.now() }}`

**Important n8n environment variables to set:**
- `GITHUB_WEBHOOK_SECRET` — the same value as in the `github-webhook` Kubernetes Secret
- The k8s API bearer token for the `n8n-job-creator` ServiceAccount

**Note:** If n8n runs inside the cluster, it can reach `https://kubernetes.default.svc`. If n8n runs outside the cluster, use the k3s API server's external URL and ensure the ServiceAccount token works externally.

---

### Phase 8: GitHub Webhook Configuration

Go to the repo settings: `https://github.com/hudsor01/ink37-tattoos/settings/hooks/new`

| Setting | Value |
|---------|-------|
| Payload URL | `https://n8n.thehudsonfam.com/webhook/github-secret-scan` |
| Content type | `application/json` |
| Secret | The value from the `github-webhook` Kubernetes Secret |
| SSL verification | Enable |
| Events | Select: **Pushes** and **Pull requests** |
| Active | Yes |

---

### Phase 9: ResourceQuota (guard rails)

Prevent runaway scan Jobs from consuming the entire cluster:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: scanner-limits
  namespace: secret-scanner
spec:
  hard:
    # Max 3 concurrent scan Jobs
    count/jobs.batch: "6"
    # Total resource ceiling for all Jobs in namespace
    requests.cpu: "8"
    requests.memory: 12Gi
    limits.cpu: "12"
    limits.memory: 16Gi
```

---

### Phase 10: Custom Gitleaks Rules (optional)

Create a ConfigMap with custom rules for project-specific secret patterns:

```yaml
# gitleaks-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitleaks-config
  namespace: secret-scanner
data:
  .gitleaks.toml: |
    # Extend default rules with project-specific patterns
    [extend]
    useDefault = true

    [[rules]]
    id = "neon-connection-string"
    description = "Neon PostgreSQL Connection String"
    regex = '''postgresql://[^:]+:[^@]+@[^/]*neon\.tech'''
    tags = ["database", "neon"]

    [[rules]]
    id = "resend-api-key"
    description = "Resend API Key"
    regex = '''re_[a-zA-Z0-9]{20,}'''
    tags = ["email", "resend"]

    [[rules]]
    id = "vercel-token"
    description = "Vercel Token"
    regex = '''(?i)vercel[_\s]*(?:token|key|secret)\s*[=:]\s*['"]?[a-zA-Z0-9_-]{24,}'''
    tags = ["deployment", "vercel"]

    [[rules]]
    id = "better-auth-secret"
    description = "Better Auth Secret"
    regex = '''BETTER_AUTH_SECRET\s*=\s*['"]?[a-zA-Z0-9+/=_-]{32,}'''
    tags = ["auth"]

    [[rules]]
    id = "cal-com-api-key"
    description = "Cal.com API Key"
    regex = '''cal_live_[a-zA-Z0-9]{20,}'''
    tags = ["booking", "cal.com"]

    [[rules]]
    id = "stripe-secret-key"
    description = "Stripe Secret Key"
    regex = '''sk_live_[a-zA-Z0-9]{24,}'''
    tags = ["payments", "stripe"]

    [allowlist]
    description = "Known safe patterns"
    paths = [
      '''\.env\.example$''',
      '''\.env\.local\.example$''',
      '''RESEARCH\.md$''',
      '''\.planning/'''
    ]
```

Mount in scanner Jobs by adding to the gitleaks container:
```yaml
volumeMounts:
- name: gitleaks-config
  mountPath: /config
# And in args:
args: ["git", "--source=/repo", "--config=/config/.gitleaks.toml", ...]
# And in volumes:
volumes:
- name: gitleaks-config
  configMap:
    name: gitleaks-config
```

---

## Verification Checklist

After everything is deployed, verify in this order:

1. **Namespace exists:** `kubectl get ns secret-scanner`
2. **Secrets created:** `kubectl get secrets -n secret-scanner`
3. **CronJobs registered:** `kubectl get cronjobs -n secret-scanner` — should show `gitleaks-nightly` and `trufflehog-nightly`
4. **Manual Gitleaks test:** `kubectl create job --from=cronjob/gitleaks-nightly gitleaks-test -n secret-scanner` — watch logs with `kubectl logs -f job/gitleaks-test -n secret-scanner -c gitleaks`
5. **Manual TruffleHog test:** `kubectl create job --from=cronjob/trufflehog-nightly trufflehog-test -n secret-scanner` — watch logs
6. **DefectDojo accessible:** `curl -s https://defectdojo.thehudsonfam.com/api/v2/user_profile/ -H "Authorization: Token YOUR_TOKEN"` — should return JSON
7. **Results uploaded:** After manual test Jobs complete, check DefectDojo UI for findings
8. **Webhook test:** Go to GitHub webhook settings > Recent Deliveries > Redeliver — check n8n execution log
9. **Push test:** Push a commit to a test branch, verify n8n creates a Job, Job runs and completes
10. **Slack test:** If findings are detected, verify Slack message arrives

---

## Scaling to Multiple Repos

To scan all repos under `hudsor01`:

1. **CronJobs:** Change TruffleHog to scan the entire user/org:
   ```
   --org=hudsor01  (instead of --repo=...)
   ```
   Or add separate CronJobs per repo.

2. **Webhooks:** Configure the webhook at the org level (if using a GitHub org) or add the webhook to each repo individually.

3. **DefectDojo:** Create one Product per repo for clean separation of findings.

---

## Resource Budget Summary

| Component | CPU Request | RAM Request | Persistent Disk |
|-----------|------------|-------------|-----------------|
| DefectDojo (Django) | 500m | 1Gi | — |
| DefectDojo (Celery) | 250m | 512Mi | — |
| DefectDojo (PostgreSQL) | 250m | 512Mi | 10Gi PVC |
| DefectDojo (Redis) | 100m | 128Mi | — |
| Scanner Jobs (ephemeral, 0-3 at a time) | 500m-2 ea | 512Mi-4Gi ea | emptyDir only |
| **Steady-state total** | **~1.1 cores** | **~2.2Gi** | **10Gi** |
| **Peak (during scans)** | **~5 cores** | **~10Gi** | **10Gi + emptyDirs** |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Job stuck in `Pending` | Check ResourceQuota: `kubectl describe quota -n secret-scanner`. Check node resources: `kubectl top node` |
| Clone fails `authentication required` | Verify PAT has `repo` scope. Test: `git clone https://x-access-token:TOKEN@github.com/hudsor01/ink37-tattoos.git` |
| TruffleHog OOM killed | Reduce concurrent scans or increase memory limit. Check: `kubectl describe pod -n secret-scanner` for OOMKilled |
| DefectDojo 502 | Check Django pod logs: `kubectl logs -n secret-scanner deploy/defectdojo-django`. May need more memory |
| n8n webhook returns 404 | Verify webhook path matches exactly: `/webhook/github-secret-scan`. Check n8n workflow is active |
| HMAC validation fails | Ensure `GITHUB_WEBHOOK_SECRET` env var in n8n exactly matches the webhook secret in GitHub settings |
| CronJob never runs | Check schedule and timezone: `kubectl get cronjob -n secret-scanner -o wide`. k3s uses UTC |
| Findings not in DefectDojo | Check upload container logs: `kubectl logs job/NAME -n secret-scanner -c upload`. Verify API token is valid |
