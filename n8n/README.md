# n8n Workflows

Cron workflows for Ink37 Tattoos, configured for n8n.thehudsonfam.com.

## Workflows

| File | Schedule | Endpoint | Purpose |
|------|----------|----------|---------|
| balance-due-workflow.json | Daily 8 AM CT | POST /api/cron/balance-due | Send balance-due reminder emails for scheduled sessions |
| no-show-followup-workflow.json | Every hour | POST /api/cron/no-show-followup | Send follow-up emails for no-show appointments (48h window) |

## Prerequisites

- n8n instance at https://n8n.thehudsonfam.com
- `CRON_SECRET` env var set in Vercel (used as Bearer token for auth)

## Setup

1. Open n8n at https://n8n.thehudsonfam.com
2. Create an HTTP Header Auth credential named "Ink37 Cron Auth":
   - Header Name: `Authorization`
   - Header Value: `Bearer <CRON_SECRET>` (use the same value as the CRON_SECRET env var in Vercel)
3. Import each workflow JSON file (Settings > Import from File)
4. In each imported workflow, update the HTTP Request node's credential to point to "Ink37 Cron Auth"
5. Verify the timezone is set to America/Chicago in workflow settings
6. Activate each workflow

## Testing

Use n8n's "Test Workflow" button to manually trigger each workflow. Expected response:

```json
{ "processed": 0, "sent": 0, "errors": 0 }
```

A response with `processed: 0` is normal when there are no outstanding balances or recent no-shows.

## Retry Configuration

Both workflows have retry-on-fail enabled (2 retries, 5s between). This handles transient network issues without manual intervention.

## Error Handling

Per D-10: No email notification on workflow failure. Rely on n8n's built-in execution log to monitor failures. Check n8n execution history periodically for errors.

## Credential Placeholder

The workflow JSON files contain `"id": "CREDENTIAL_ID"` as a placeholder. After importing, you MUST update the HTTP Request node's credential to point to the "Ink37 Cron Auth" credential you created in step 2.
