# Supabase (IU Softball)

**Project ref:** `thrwhtqeogdnkwpvcwlk`  
**URL:** `https://thrwhtqeogdnkwpvcwlk.supabase.co`  
**Region:** East US (North Virginia)

Frontend uses the **anon** key only (`VITE_SUPABASE_*` in repo root `.env`).

---

## Repo layout

| Path | Purpose |
|------|---------|
| `migrations/20260710020928_remote_schema.sql` | Pulled remote schema (tables, RLS SELECT policies, grants) |
| `migrations/20260710023000_harden_anon_grants.sql` | **Proposed** least-privilege grants (not applied yet) |
| `functions/` | Edge Functions (download with script below) |
| `SECURITY_AUDIT.md` | RLS / privilege audit |
| `FIELD_MISMATCH_REPORT.md` | Ingestion payload vs column report |
| `AUDIT_rls_and_schema_probe.json` | Live REST sample column dump |

---

## Edge Functions (in repo)

| Name | Source | Purpose | Claimed schedule (code comments) | External source |
|------|--------|---------|----------------------------------|-----------------|
| `update-scores` | `functions/update-scores/index.ts` | Patch scores/status on upcoming/live + incomplete finals | Every 30 min via pg_cron | ESPN **site.api** schedule (`baseball/college-softball/teams/648`, season=end year). Do **not** use `cdn.espn.com` (bot challenge from Supabase IPs). |
| `update-stats` | `functions/update-stats/index.ts` | Upsert batting + pitching | Every 30 min via pg_cron | iuhoosiers.com `/stats/2026` |
| `update-news` | `functions/update-news/index.ts` | Insert new athletics news | (cron TBD) | iuhoosiers.com archives |
| `update-rankings` | `functions/update-rankings/index.ts` | RPI + ELO rankings | Every 6 hours via pg_cron | warrennolan.com 2026 RPI/ELO |

Confirm real schedules with:

```sql
SELECT jobid, schedule, command, nodename FROM cron.job;
```

### Prompt 5 fixes (in repo; deploy required)

- Pitching upsert column map fixed in `update-stats`
- `update-scores` uses `site.api.espn.com` … `/baseball/college-softball/teams/648/schedule?season=YYYY` (`events[]`, score objects, dynamic season end-year). `cdn.espn.com` is unusable from Supabase (HTML bot wall / 202).
- Live scoreboard (Prompt 4): prefer `https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/scoreboard?dates=YYYYMMDD` — `data.ncaa.com` 404s for 2026 paths
- All four jobs write `data_source_runs` (migration `20260710030000_data_source_runs.sql`)
- `check-data-health` Edge Function — set secret `ALERT_WEBHOOK_URL` when you have a Slack/Discord webhook

### Deploy + one-shot backfill

```bash
export PATH="$HOME/.local/share/supabase:$PATH"
cd "/Users/juliewoempner/.codex/worktrees/57a3/Indiana Softball"
./scripts/deploy-ingestion.sh
# optional alerts:
# supabase secrets set ALERT_WEBHOOK_URL='https://hooks.slack.com/...' --project-ref thrwhtqeogdnkwpvcwlk
```

---

## CLI notes (macOS)

Full CLI binaries (includes `supabase-go`):

```bash
export PATH="$HOME/.local/share/supabase:$PATH"
```

Prefer `SUPABASE_ACCESS_TOKEN` over `npx supabase login` (avoids Keychain popup loops).

### Link / pull (already done once)

```bash
supabase link --project-ref thrwhtqeogdnkwpvcwlk --password "$SUPABASE_DB_PASSWORD"
supabase db pull
```

---

## Security posture

See `SECURITY_AUDIT.md`.

- **RLS:** enabled; **SELECT-only** public policies → anon cannot write (confirmed live).
- **Grants:** `GRANT ALL` to anon is broader than needed; apply harden migration after review.
- **Cron:** extension present; job rows not in schema dump — export `SELECT * FROM cron.job;`.

---

## Env vars

| Variable | Where | Commit? |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | App `.env` | no (example yes) |
| `VITE_SUPABASE_ANON_KEY` | App `.env` | no |
| `SUPABASE_ACCESS_TOKEN` | CLI shell only | never |
| `SUPABASE_DB_PASSWORD` | CLI shell only | never |
