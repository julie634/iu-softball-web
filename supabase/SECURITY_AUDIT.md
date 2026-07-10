# Security & schema audit (Prompt 2)

*Updated 2026-07-09 · Project `thrwhtqeogdnkwpvcwlk` (IU Softball)*  
*Sources: `migrations/20260710020928_remote_schema.sql` + live anon REST probes*

---

## Executive summary

| Check | Result |
|-------|--------|
| RLS enabled on all app tables | **Yes** |
| Anon write policies (INSERT/UPDATE/DELETE) | **None** — only `FOR SELECT USING (true)` |
| Live anon INSERT | **Blocked** (42501 RLS) |
| Live anon UPDATE/DELETE | **0 rows** affected (`Content-Range: */0`) |
| Table `GRANT`s to anon | **`GRANT ALL`** — overly broad; RLS saves you today |
| Default privileges for new tables | **`GRANT DELETE, INSERT, SELECT, UPDATE` to anon** — **fix** |
| Edge Functions in repo | Pending download (script: `scripts/download-edge-functions.sh`) |
| Cron job definitions in migration | **Not present** — `pg_cron` extension created, no `cron.schedule` rows dumped |

**Verdict:** The site is **not currently writable** by anonymous internet clients because RLS has SELECT-only policies. Privileges should still be tightened so a future missing-RLS table is not world-writable. Hardening migration drafted: `migrations/20260710023000_harden_anon_grants.sql` (review before apply).

---

## Tables & policies (from remote schema pull)

| Table | PK | RLS | Anon policy | Anon GRANT |
|-------|-----|-----|-------------|------------|
| `games` | `id` | ON | `"Public read access"` SELECT true | ALL |
| `players` | `id` | ON | `"Public read access"` SELECT true | ALL |
| `batting_stats` | `player_id` → players | ON | `"Public read access"` SELECT true | ALL |
| `pitching_stats` | `player_id` → players | ON | `"Public read access"` SELECT true | ALL |
| `news_articles` | `id` | ON | `"Public read access"` SELECT true | ALL |
| `social_posts` | `id` | ON | `"Public read access"` SELECT true | ALL |
| `rankings` | `id` | ON | `"Allow public read"` SELECT true | ALL |

No INSERT/UPDATE/DELETE policies exist for `anon` or `authenticated`. Under Postgres RLS, that means those commands match no policy → denied (for the table owner / bypass roles excluded). Live probes confirmed this for writes.

### Checks / constraints of note

- `games.location` ∈ `home | away | neutral`
- `games.status` ∈ `upcoming | live | completed | postponed | canceled`
- FKs: batting/pitching `player_id` → `players.id`

### Missing tables (expected later)

| Table | Notes |
|-------|--------|
| `coaches` | Still hard-coded in frontend (Prompt 10) |
| `data_source_runs` | Job health (Prompt 5) |

---

## Privilege findings (flag loudly)

### 1. `GRANT ALL ... TO anon` on every table

Even with RLS, this violates least privilege. Prefer:

```sql
GRANT SELECT ON TABLE public.<t> TO anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.<t> FROM anon;
```

### 2. Default privileges (migration lines 7–9)

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;
```

Any **new** table created by `postgres` without RLS would be **world-writable via the Data API**. Fix in `20260710023000_harden_anon_grants.sql`.

### 3. `GRANT ALL ON ROUTINES TO anon`

Default privileges also grant routines to anon. Lower urgency if no security-definer RPC is exposed; still review before adding RPCs.

### 4. Migration replay risk

The pulled migration begins with `DROP EXTENSION pg_net` / `pg_graphql` and `CREATE ROLE supabase_privileged_role`. Treat this dump as a **snapshot for review**, not something to re-run blindly on a fresh project.

---

## Live probe row counts (anon SELECT)

| Table | ~Rows |
|-------|------:|
| games | 54 |
| players | 25 |
| batting_stats | 16 |
| pitching_stats | 6 |
| news_articles | 97 |
| social_posts | 8 |
| rankings | 309 |

---

## Edge Functions (in repo)

| Name | In repo | Uses service role | Writes |
|------|---------|-------------------|--------|
| `update-scores` | ✅ | Yes | `games` UPDATE |
| `update-stats` | ✅ | Yes | `batting_stats` / `pitching_stats` UPSERT |
| `update-news` | ✅ | Yes | `news_articles` UPSERT |
| `update-rankings` | ✅ | Yes | `rankings` UPSERT |

Service role **bypasses RLS** (expected). Anon cannot call these safely without JWT + function secrets — do not expose service role to the SPA.

Field-mismatch + 500 analysis: **`FIELD_MISMATCH_REPORT.md`** (complete).

### Cron / schedules

Migration enables `pg_cron` but does **not** dump job rows. Code comments claim 30m (scores/stats) and 6h (rankings). Export:

```sql
SELECT * FROM cron.job;
```

---

## Recommended actions (order)

1. ~~Download functions~~ ✅  
2. Review + apply `20260710023000_harden_anon_grants.sql` when ready.  
3. Prompt 5: fix pitching column map; harden scores ESPN handling; add `data_source_runs`.  
4. Export `cron.job` into a documented SQL file.
