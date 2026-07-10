#!/usr/bin/env bash
# Apply data_source_runs migration + deploy fixed Edge Functions.
# Run from your Terminal (needs linked project + access token).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${HOME}/.local/share/supabase:${PATH}"

echo ">>> db push (migrations)"
supabase db push

echo ">>> deploy functions"
for fn in update-scores update-stats update-news update-rankings check-data-health; do
  echo "  - $fn"
  supabase functions deploy "$fn" --project-ref thrwhtqeogdnkwpvcwlk
done

echo ">>> invoke update-stats + update-scores once (backfill)"
supabase functions invoke update-stats --project-ref thrwhtqeogdnkwpvcwlk || true
supabase functions invoke update-scores --project-ref thrwhtqeogdnkwpvcwlk || true

echo "Done. Review data_source_runs in the Table Editor."
echo "Optional: supabase secrets set ALERT_WEBHOOK_URL=https://hooks.slack.com/... --project-ref thrwhtqeogdnkwpvcwlk"
