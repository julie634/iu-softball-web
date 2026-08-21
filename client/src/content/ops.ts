/** Known pg_cron rows for project thrwhtqeogdnkwpvcwlk as of 2026-08-21. */
export const CRON_JOBS = [
  {
    jobname: "update-softball-stats",
    edgeFunction: "update-stats",
    schedule: "*/30 * * * *",
    cadence: "Every 30 minutes",
    status: "active",
    lastSuccessNote: "Last success ~01:30 UTC on 2026-08-21",
  },
  {
    jobname: "update-softball-scores",
    edgeFunction: "update-scores",
    schedule: "*/30 * * * *",
    cadence: "Every 30 minutes",
    status: "active",
    lastSuccessNote:
      "Last success ~01:30 UTC on 2026-08-21. 23 older failures remain in history.",
  },
  {
    jobname: "update-softball-news",
    edgeFunction: "update-news",
    schedule: "0 */4 * * *",
    cadence: "Every 4 hours",
    status: "active",
    lastSuccessNote: "Last success ~00:00 UTC on 2026-08-21",
  },
  {
    jobname: "update-softball-rankings",
    edgeFunction: "update-rankings",
    schedule: "0 */6 * * *",
    cadence: "Every 6 hours",
    status: "re-enabled",
    lastSuccessNote:
      "Was inactive (last success 2026-07-10). Re-enabled 2026-08-21. Confirm it stays on after deploys.",
  },
  {
    jobname: "check-softball-data-health",
    edgeFunction: "check-data-health",
    schedule: "15 * * * *",
    cadence: "Hourly at :15",
    status: "pending-migration",
    lastSuccessNote:
      "No cron row existed on 2026-08-21. Apply migration 20260821021000_schedule_check_data_health.sql.",
  },
] as const;

export const ALERT_WEBHOOK_STATUS =
  "ALERT_WEBHOOK_URL is not configured. check-data-health will return a report but will not post Slack/Discord alerts until that secret is set in the Edge Function settings.";
