#!/usr/bin/env bash
# Download IU Softball Edge Functions into supabase/functions/
# Usage (in your own Terminal, where login/token already works):
#   export PATH="$HOME/.local/share/supabase:$PATH"
#   export SUPABASE_ACCESS_TOKEN="sbp_..."   # if not using keychain login
#   ./scripts/download-edge-functions.sh

set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${HOME}/.local/share/supabase:${PATH}"

if ! command -v supabase >/dev/null; then
  echo "supabase CLI not found on PATH" >&2
  exit 1
fi

funcs=(update-scores update-stats update-news update-rankings)
for fn in "${funcs[@]}"; do
  echo ">>> downloading $fn"
  supabase functions download "$fn"
done

echo
echo "Done. Tree:"
find supabase/functions -type f | sort
