# Quick Task 260402-oxe: Deploy n8n notification cleanup workflow

## Task

Deploy the notification cleanup workflow to n8n at n8n.thehudsonfam.com using n8n MCP tools.

## Tasks

### Task 1: Deploy workflow via n8n MCP

**Files:** n8n/notifications-cleanup-workflow.json
**Action:** Use n8n MCP SDK to create and publish the workflow
**Verify:** Workflow exists and is active on n8n instance
**Done:** Workflow created with ID `ahHGHSBasO5M9wdr`, published and active

### Task 2: Configure credential (manual)

**Action:** User creates "Ink37 Cron Auth" HTTP Header Auth credential in n8n UI
**Details:**
- Header Name: `Authorization`
- Header Value: `Bearer <CRON_SECRET>`
- Then link credential to the HTTP Request node in the workflow
**Done:** Requires manual user action
