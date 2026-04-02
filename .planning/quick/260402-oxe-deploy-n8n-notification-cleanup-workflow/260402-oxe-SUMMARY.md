# Quick Task 260402-oxe: Deploy n8n notification cleanup workflow - Summary

**Completed:** 2026-04-02

## What was done

1. Added n8n MCP server to Claude Code user config (`claude mcp add n8n-mcp`)
2. Used n8n Workflow SDK to write, validate, and create the workflow
3. Published (activated) the workflow on n8n.thehudsonfam.com
4. **Updated to direct Postgres approach** — eliminated Vercel function invocation entirely

## Architecture change

**Before:** n8n (scheduler) → HTTP Request → Vercel API route → Neon DB
**After:** n8n (scheduler) → Postgres node → Neon DB directly

This eliminates:
- Vercel function invocations (cost savings)
- CRON_SECRET / HTTP Header Auth for this route
- Redis distributed lock (n8n guarantees single execution)
- The entire cron auth chain for notification cleanup

The API route at `/api/cron/notifications-cleanup` can be kept as a manual trigger or removed.

## Deployment details

- **Workflow ID:** `ahHGHSBasO5M9wdr`
- **URL:** https://n8n.thehudsonfam.com/workflow/ahHGHSBasO5M9wdr
- **Schedule:** Daily at 3:00 AM CT (America/Chicago)
- **Approach:** Single CTE query handles both DELETEs + conditional audit log insert

## SQL logic (single atomic query)

1. DELETE read notifications older than 30 days (batch 1000)
2. DELETE unread notifications older than 90 days (batch 1000)
3. INSERT audit_log entry only if rows were deleted
4. RETURN counts for n8n execution visibility

## Manual follow-up required

Create a Postgres credential in n8n pointing to the Neon Ink37 database:
1. Go to n8n > Credentials > Add Credential > Postgres
2. Name: `Neon Ink37`
3. Connection string from Vercel env vars (DATABASE_URL)
4. Open workflow > Click Postgres node > Select the credential (replace auto-assigned "n8n database")

## Existing Ink37 workflows on n8n

- Ink37 - Balance Due Reminders (active)
- Ink37 - No-Show Follow-Up (active)
- Ink37 - Notification Cleanup (active, updated to direct Postgres)
