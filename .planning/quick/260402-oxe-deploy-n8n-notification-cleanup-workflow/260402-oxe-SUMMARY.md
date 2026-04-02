# Quick Task 260402-oxe: Deploy n8n notification cleanup workflow - Summary

**Completed:** 2026-04-02

## What was done

1. Added n8n MCP server to Claude Code user config (`claude mcp add n8n-mcp`)
2. Used n8n Workflow SDK to write, validate, and create the workflow
3. Published (activated) the workflow on n8n.thehudsonfam.com

## Deployment details

- **Workflow ID:** `ahHGHSBasO5M9wdr`
- **URL:** https://n8n.thehudsonfam.com/workflow/ahHGHSBasO5M9wdr
- **Active version:** `e97243ad-5b3b-4489-a7f6-544a56e8a00d`
- **Schedule:** Daily at 3:00 AM CT (America/Chicago)
- **Endpoint:** POST https://ink37tattoos.com/api/cron/notifications-cleanup
- **Auth:** HTTP Header Auth (Ink37 Cron Auth credential)

## Manual follow-up required

The HTTP Header Auth credential ("Ink37 Cron Auth") must be created and linked in the n8n UI:
1. Go to n8n > Credentials > Add Credential > HTTP Header Auth
2. Name: `Ink37 Cron Auth`
3. Header Name: `Authorization`
4. Header Value: `Bearer <CRON_SECRET>` (use actual CRON_SECRET from Vercel env vars)
5. Open workflow > Click HTTP Request node > Select the credential

## Existing Ink37 workflows on n8n

- Ink37 - Balance Due Reminders (active)
- Ink37 - No-Show Follow-Up (active)
- Ink37 - Notification Cleanup (active, newly deployed)
