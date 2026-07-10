#!/usr/bin/env bash
# Deploy fixed update-scores, invoke it, print latest data_source_runs row.
# Requires: SUPABASE_ACCESS_TOKEN (or prior supabase login) and linked project.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${HOME}/.local/share/supabase:${PATH}"
REF="thrwhtqeogdnkwpvcwlk"

echo ">>> deploy update-scores"
supabase functions deploy update-scores --project-ref "$REF"

echo ">>> invoke update-scores"
# Prefer CLI invoke (uses project auth). Falls back message if missing.
set +e
OUT=$(supabase functions invoke update-scores --project-ref "$REF" 2>&1)
RC=$?
set -e
echo "$OUT"
if [ "$RC" -ne 0 ]; then
  echo
  echo "CLI invoke failed. From Dashboard → Edge Functions → update-scores → Invoke,"
  echo "or curl with the service_role key:"
  echo "  curl -sS -X POST \"https://${REF}.supabase.co/functions/v1/update-scores\" \\"
  echo "    -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\" \\"
  echo "    -H \"apikey: \$SUPABASE_SERVICE_ROLE_KEY\""
  exit "$RC"
fi

echo
echo ">>> latest data_source_runs for update-scores (needs db password / linked)"
# Use REST via service role if available
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  curl -sS "https://${REF}.supabase.co/rest/v1/data_source_runs?source=eq.update-scores&order=started_at.desc&limit=3" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept: application/json" | python3 -m json.tool
else
  echo "Set SUPABASE_SERVICE_ROLE_KEY to query data_source_runs from here,"
  echo "or run in SQL editor:"
  echo "  select * from data_source_runs where source = 'update-scores' order by started_at desc limit 5;"
fi
