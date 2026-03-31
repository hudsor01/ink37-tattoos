# Phase 26: Assets + Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 26-assets-infrastructure
**Areas discussed:** Gallery videos, PWA manifest + service worker, n8n workflow configuration, Environment variable audit

---

## Gallery Videos

| Option | Description | Selected |
|--------|-------------|----------|
| Already have them locally | Video files exist on disk | ✓ |
| Need to create/record them | Videos don't exist yet | |
| Pull from existing site | Download from current site | |

**User's choice:** Already have them locally

| Option | Description | Selected |
|--------|-------------|----------|
| MP4 only | Universal browser support, H.264 | ✓ |
| MP4 + WebM fallback | Better compression, double storage | |
| You decide | Claude picks | |

**User's choice:** MP4 only

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Blob | Already using Blob, CDN delivery | ✓ |
| public/ directory | Simpler, increases repo size | |
| You decide | Claude picks | |

**User's choice:** Vercel Blob

---

## PWA Manifest + Service Worker

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone | No browser chrome, native app feel | ✓ |
| Minimal-ui | Keeps minimal browser bar | |
| You decide | Claude picks | |

**User's choice:** Standalone

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal -- cache shell only | Cache HTML/CSS/JS, dynamic needs network | ✓ |
| Cache gallery images too | Pre-cache gallery for offline | |
| No service worker | Just manifest, no offline | |

**User's choice:** Minimal -- cache shell only

| Option | Description | Selected |
|--------|-------------|----------|
| Dark theme | Black/dark gray, tattoo aesthetic | |
| Pull from existing site theme | Use Tailwind config/CSS variables | ✓ |
| You decide | Claude picks | |

**User's choice:** Pull from existing site theme

---

## n8n Workflow Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Document setup steps only | Instructions for manual n8n setup | |
| Export workflow JSON to repo | Version-controlled JSON files | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide (Claude's discretion)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, daily + hourly | Balance-due daily, no-show hourly | |
| Adjust schedules | Different schedules | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide (Claude's discretion)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- email admin on failure | n8n sends failure emails | |
| No -- n8n's built-in error handling | Rely on n8n error tracking UI | ✓ |
| You decide | Claude picks | |

**User's choice:** No email notification on failure

---

## Environment Variable Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Both (.env.example + markdown) | Standard .env.example plus docs | |
| .env.example only | Conventional, simple | |
| Markdown doc only | Full documentation, no .env.example | ✓ |

**User's choice:** Markdown doc only

| Option | Description | Selected |
|--------|-------------|----------|
| Document only | Create checklist, manual verification | |
| Verify via Vercel CLI | Automated verification | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide (Claude's discretion)

---

## Claude's Discretion

- n8n workflow approach (JSON export vs documentation only)
- Cron schedules (specific times for daily balance-due and hourly no-show)
- Vercel env var verification method (CLI/API vs manual checklist)

## Deferred Ideas

None -- discussion stayed within phase scope
