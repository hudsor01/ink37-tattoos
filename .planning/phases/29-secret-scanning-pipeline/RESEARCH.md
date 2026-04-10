# Phase 29: Secret Scanning Pipeline — Research

## Executive Summary

Self-hosted secret scanning on k3s using open-source tools. Both Gitleaks and TruffleHog are **CLI-only** — neither has a server mode. The architecture requires a webhook receiver (n8n, already running) to trigger Kubernetes Jobs, plus CronJobs for scheduled full scans. DefectDojo provides the dashboard layer.

---

## Tool Assessment

### Scanners (CLI tools — no server mode)

| Tool | License | Detectors | Key Differentiator | Docker Image | Verified? |
|------|---------|-----------|-------------------|--------------|-----------|
| **TruffleHog v3** | AGPL-3.0 | 800+ | Live credential verification against APIs | `trufflesecurity/trufflehog:latest` | **Yes** |
| **Gitleaks** | MIT | Regex+entropy | Fastest, composite rules, lowest false positives | `ghcr.io/gitleaks/gitleaks:latest` | No |
| **Betterleaks** | MIT | BPE tokenization | 98.6% recall vs 70.4% entropy-based (Gitleaks successor, March 2026) | Emerging — watch | No |

### Platforms Evaluated

| Platform | Verdict | Why |
|----------|---------|-----|
| **secureCodeBox** (OWASP) | **USE** | K8s-native operator, wraps Gitleaks as scanner, CRD-based scheduling, DefectDojo integration. Apache-2.0. Lightweight |
| **DefectDojo** | **USE** | Best dashboard for findings management. BSD-3. Helm chart. Parsers for Gitleaks + TruffleHog JSON |
| **Trivy Operator** | SKIP | Scans cluster workloads (images, configs), NOT git repos. Wrong tool for this |
| **ThreatMapper** | SKIP | 16GB RAM minimum. Scans production workloads, not git repos |
| **Horusec** | DEAD | Platform archived March 2025. CLI barely maintained |
| **GitGuardian** | SKIP | Self-hosted = Enterprise-only (200+ devs, custom pricing) |
| **TruffleHog Enterprise** | SKIP | Adds daemon mode + dashboard + webhooks, but commercial. OSS is sufficient with custom glue |

### GitHub's Built-in Secret Scanning

- **Public repos:** Free, automatic, push protection enabled by default
- **Private repos:** Requires "GitHub Secret Protection" at **$19/mo per active committer**
- Not available on GitHub Free/Pro for private repos

---

## Recommended Architecture

```
GitHub (push/PR events)
    │
    │ HTTPS webhook (signed HMAC-SHA256)
    ▼
Cloudflare Tunnel → k3s Ingress → n8n Webhook Node
    │
    │ Validates signature, extracts repo/ref/SHA
    ▼
n8n creates Kubernetes Job via k8s API
    │
    ├─→ Gitleaks Job (fast, incremental — new commits only)
    │     └─→ JSON output → POST to DefectDojo API
    │
    └─→ TruffleHog Job (deep, with verification — on PR events)
          └─→ JSON output → POST to DefectDojo API
    │
    ▼
DefectDojo Dashboard (findings, dedup, tracking)
    │
    └─→ Slack notification (on new verified findings)

CronJob (nightly 2 AM):
    └─→ TruffleHog full-org scan → --results=verified,unknown → DefectDojo
```

### Why This Architecture

| Decision | Rationale |
|----------|-----------|
| **n8n as webhook receiver** | Already running, exposed via Cloudflare Tunnel, has GitHub webhook validation, can create k8s Jobs via HTTP Request node |
| **Cloudflare Tunnel** | Already in use for other services. Outbound-only from k3s — no inbound ports. GitHub webhooks need a public URL |
| **Gitleaks for push scans** | Faster than TruffleHog for incremental scans. Low false positives with composite rules |
| **TruffleHog for deep scans** | Live credential verification is unique. Tells you which secrets are *actually dangerous*. Worth the extra time on nightly runs |
| **DefectDojo for dashboard** | Only real option for self-hosted findings management with a web UI. Has native parsers for both tools |
| **GitHub App for auth** | Short-lived tokens (1hr), not tied to user account, fine-grained permissions, webhook delivery built-in |

### Alternative: secureCodeBox Instead of Custom Jobs

secureCodeBox (OWASP) provides a Kubernetes operator that manages scanner Jobs via CRDs:

```yaml
apiVersion: "execution.securecodebox.io/v1"
kind: Scan
metadata:
  name: gitleaks-ink37
spec:
  scanType: gitleaks
  parameters:
    - "--repo-url=https://github.com/hudsor01/ink37-tattoos"
    - "--access-token=$(GITHUB_TOKEN)"
```

**Pros:** No custom Job creation logic needed, `ScheduledScan` CRD replaces CronJobs, built-in DefectDojo persistence hook, Slack notification hook.
**Cons:** Adds operator complexity (CRDs, RBAC, controller pod), only wraps Gitleaks (not TruffleHog), another thing to maintain.

**Verdict:** Use secureCodeBox if you want a more managed experience. Use raw Jobs if you want simplicity and also need TruffleHog (which secureCodeBox doesn't support).

---

## Component Details

### 1. GitHub App Setup

Create a GitHub App (not an OAuth App) with:

| Setting | Value |
|---------|-------|
| Name | `ink37-secret-scanner` |
| Homepage URL | `https://ink37tattoos.com` (or any) |
| Webhook URL | `https://webhooks.yourdomain.com/github/secret-scan` (Cloudflare Tunnel) |
| Webhook secret | Generate 32+ char random string |
| Permissions: Contents | Read |
| Permissions: Pull requests | Read & Write (for PR comments) |
| Permissions: Metadata | Read (implicit) |
| Subscribe to: push | Yes |
| Subscribe to: pull_request | Yes (opened, synchronize, reopened) |

After creation:
1. Note the App ID
2. Generate and download the private key (PEM file)
3. Install the App on your repos/org
4. Note the Installation ID

Store as Kubernetes Secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-credentials
  namespace: secret-scanner
type: Opaque
stringData:
  app-id: "123456"
  installation-id: "78901234"
  webhook-secret: "your-webhook-secret"
data:
  private-key.pem: <base64-encoded PEM>
```

**Alternative (simpler):** Classic PAT with `repo` + `read:org` scopes. Stored as:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-pat
  namespace: secret-scanner
type: Opaque
stringData:
  token: "ghp_xxxxxxxxxxxx"
```

Note: Fine-grained PATs are NOT supported by TruffleHog. Must use classic PATs.

### 2. Scanner Containers

#### Gitleaks CronJob (nightly full scan)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gitleaks-full-scan
  namespace: secret-scanner
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
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
                  name: github-pat
                  key: token
            volumeMounts:
            - name: repo
              mountPath: /repo
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
            resources:
              requests: { cpu: 500m, memory: 512Mi }
              limits: { cpu: "2", memory: 2Gi }
            volumeMounts:
            - name: repo
              mountPath: /repo
              readOnly: true
            - name: output
              mountPath: /output
          # Sidecar to POST results to DefectDojo
          - name: upload-results
            image: curlimages/curl:latest
            command: ["sh", "-c"]
            args:
            - |
              sleep 5  # wait for gitleaks to write results
              if [ -f /output/results.json ] && [ -s /output/results.json ]; then
                curl -X POST "${DEFECTDOJO_URL}/api/v2/import-scan/" \
                  -H "Authorization: Token ${DEFECTDOJO_TOKEN}" \
                  -F "scan_type=Gitleaks Scan" \
                  -F "engagement=${ENGAGEMENT_ID}" \
                  -F "file=@/output/results.json" \
                  -F "minimum_severity=Info" \
                  -F "active=true" \
                  -F "verified=false"
              fi
            env:
            - name: DEFECTDOJO_URL
              value: "http://defectdojo.secret-scanner.svc.cluster.local:8080"
            - name: DEFECTDOJO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: defectdojo-api
                  key: token
            - name: ENGAGEMENT_ID
              value: "1"
            volumeMounts:
            - name: output
              mountPath: /output
              readOnly: true
          restartPolicy: Never
          volumes:
          - name: repo
            emptyDir: { sizeLimit: 2Gi }
          - name: output
            emptyDir: { sizeLimit: 100Mi }
```

#### TruffleHog CronJob (nightly deep scan with verification)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: trufflehog-full-scan
  namespace: secret-scanner
spec:
  schedule: "0 3 * * *"  # 3 AM, after gitleaks
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
      backoffLimit: 2
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
            - --json
            - --results=verified,unknown
            - --fail
            env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: github-pat
                  key: token
            resources:
              requests: { cpu: "1", memory: 1Gi, ephemeral-storage: 5Gi }
              limits: { cpu: "2", memory: 4Gi, ephemeral-storage: 10Gi }
          restartPolicy: Never
```

### 3. Resource Requirements

| Component | CPU Request | RAM Request | Disk | Notes |
|-----------|------------|-------------|------|-------|
| Gitleaks scan Job | 500m | 512Mi | 2Gi emptyDir | Short-lived, bursty. Avoid `--max-decode-depth > 0` (can use 24GB) |
| TruffleHog scan Job | 1 core | 1Gi | 5-10Gi ephemeral | Clones to /tmp. Verification adds network I/O |
| DefectDojo (full stack) | 2 cores | 2-4Gi | 10Gi PVC | PostgreSQL + Redis + Django + Celery + nginx |
| n8n webhook receiver | Already running | Already running | — | Reuse existing instance |
| secureCodeBox operator | 250m | 256Mi | — | Optional, if using CRD approach |

**Total new resource budget:** ~4 CPU cores, ~6-8Gi RAM steady-state (DefectDojo dominates), Jobs are ephemeral.

### 4. DefectDojo Deployment

Official Helm chart:
```bash
helm repo add defectdojo https://raw.githubusercontent.com/DefectDojo/django-DefectDojo/master/helm/defectdojo
helm install defectdojo defectdojo/defectdojo \
  --namespace secret-scanner \
  --set django.ingress.enabled=true \
  --set django.ingress.hosts[0].host=defectdojo.yourdomain.com \
  --set createSecret=true \
  --set createRedisSecret=true \
  --set createPostgresqlSecret=true
```

Key settings:
- Uses embedded PostgreSQL + Redis by default (can point to external)
- Generates admin credentials on first install
- Has 200+ scan parsers including Gitleaks and TruffleHog
- API at `/api/v2/` for programmatic import
- Notifications: Slack, Teams, email, custom webhooks

### 5. n8n Webhook Receiver Flow

```
Webhook Node (POST /github/secret-scan)
    │
    ├─ Code Node: Validate HMAC-SHA256 signature
    │   - Compare X-Hub-Signature-256 header against computed HMAC
    │   - Reject if mismatch (return 401)
    │
    ├─ Switch Node: Route by event type
    │   ├─ push → Extract repo URL, before/after SHAs
    │   └─ pull_request → Extract repo URL, PR number, head SHA
    │
    ├─ HTTP Request Node: Create Kubernetes Job
    │   - POST to k8s API: /apis/batch/v1/namespaces/secret-scanner/jobs
    │   - Job spec: clone repo + run gitleaks on commit range
    │   - Auth: ServiceAccount token mounted in n8n pod
    │
    └─ (Optional) Wait → Check Job status → Post PR comment
```

### 6. Network Exposure

| Approach | Pros | Cons | Recommended? |
|----------|------|------|-------------|
| **Cloudflare Tunnel** | Already in use, outbound-only, production-grade | One more tunnel endpoint to manage | **Yes** |
| **Polling (no public URL)** | Zero exposure | 1-5 min latency, API rate limits, doesn't scale | Backup option |
| **Self-hosted GH Actions runner** | Outbound-only, native GH integration | Runner infra overhead, runs on GH's schedule not yours | No |

**HMAC validation is mandatory** regardless of approach. GitHub signs every webhook payload with `X-Hub-Signature-256` using your webhook secret.

### 7. Notification Channels

| Channel | How | Complexity |
|---------|-----|-----------|
| **Slack** | DefectDojo built-in + n8n Slack node | Low |
| **PR comments** | GitHub API from post-scan step (`POST /repos/{owner}/{repo}/pulls/{number}/reviews`) | Medium |
| **GitHub Security tab (SARIF)** | Requires GitHub Advanced Security (paid for private repos) | **Not available on Free/Pro** |
| **Email** | DefectDojo built-in or Resend via n8n | Low |

### 8. Authentication Comparison

| Method | Security | Simplicity | Recommended |
|--------|----------|-----------|-------------|
| **GitHub App** | Best (short-lived tokens, fine-grained, not tied to user) | Complex setup, token exchange logic | For production |
| **Classic PAT** | Good (long-lived, broad scope) | Simple (just inject env var) | For getting started |
| **Fine-grained PAT** | Best scoping | NOT supported by TruffleHog | Do not use |
| **SSH Deploy Key** | Good (per-repo) | Read-only, can't post PR comments | Clone-only scenarios |

---

## Implementation Plan Sketch

### Wave 1: Foundation (Day 1)
- Create `secret-scanner` namespace
- Create Kubernetes Secrets (GitHub PAT, webhook secret)
- Deploy Gitleaks CronJob (nightly full scan)
- Deploy TruffleHog CronJob (nightly deep scan)
- Verify both run and produce JSON output

### Wave 2: Dashboard (Day 2)
- Deploy DefectDojo via Helm chart
- Configure admin user, create Product + Engagement
- Update CronJobs to POST results to DefectDojo API
- Verify findings appear in DefectDojo UI
- Expose DefectDojo via Cloudflare Tunnel (internal only)

### Wave 3: Real-time Scanning (Day 3)
- Create GitHub App with webhook subscriptions
- Configure n8n webhook workflow (signature validation, Job creation)
- Expose n8n webhook endpoint via Cloudflare Tunnel
- Test: push a dummy secret, verify scan triggers and finding appears
- Add Slack notification on new verified findings

### Wave 4: Hardening (Day 4)
- Custom Gitleaks rules for project-specific patterns (Neon connection strings, Vercel tokens, etc.)
- ResourceQuota on namespace to cap concurrent Jobs
- activeDeadlineSeconds on all Jobs
- Alert on Job failures (Prometheus/Grafana or n8n)
- Upgrade from PAT to GitHub App (if not done in Wave 3)

---

## Open Questions

1. **DefectDojo resource budget** — It needs 2-4GB RAM. Is that acceptable on the k3s cluster alongside existing workloads?
2. **Multiple repos** — Scanning just ink37-tattoos or all GitHub repos? TruffleHog can scan an entire org with `--org`.
3. **Existing secrets** — Should we do a one-time audit of the current repo before setting up ongoing scanning? (Run `trufflehog git file://. --results=verified` locally first)
4. **Custom rules** — Any project-specific secret patterns to add? (e.g., Neon `postgresql://`, Resend API keys, Cal.com keys)
5. **Betterleaks** — The Gitleaks successor launched March 2026. Worth watching, but too early for production use.

---

## Sources

- [TruffleHog GitHub](https://github.com/trufflesecurity/trufflehog) — AGPL-3.0, 800+ detectors, live verification
- [TruffleHog Docs: Docker](https://docs.trufflesecurity.com/docker) — Container deployment patterns
- [TruffleHog Docs: K8s Manifest](https://docs.trufflesecurity.com/kubernetes-manifest) — Enterprise only
- [TruffleHog Docs: Resource Requirements](https://docs.trufflesecurity.com/resource-requirements) — 4 CPU / 16GB (Enterprise); OSS lighter
- [Gitleaks GitHub](https://github.com/gitleaks/gitleaks) — MIT, 26M+ downloads
- [secureCodeBox](https://www.securecodebox.io/) — OWASP Flagship, Apache-2.0, K8s-native scanner orchestration
- [secureCodeBox Gitleaks Scanner](https://www.securecodebox.io/docs/scanners/gitleaks/)
- [DefectDojo GitHub](https://github.com/DefectDojo/django-DefectDojo) — BSD-3, 4.6k stars, 200+ parsers
- [DefectDojo Gitleaks Parser](https://docs.defectdojo.com/supported_tools/parsers/file/gitleaks/)
- [GitHub Apps Docs](https://docs.github.com/en/apps/creating-github-apps)
- [GitHub Webhook Security](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Betterleaks](https://thenewstack.io/betterleaks-open-source-secret-scanner/) — Gitleaks successor, March 2026
