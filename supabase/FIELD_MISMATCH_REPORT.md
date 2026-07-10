# Edge Function ↔ schema field mismatch report

*Completed 2026-07-09 · Prompt 2*  
*Schema: `migrations/20260710020928_remote_schema.sql`*  
*Sources: `functions/*/index.ts`*

---

## Executive summary

| Function | Schema fit | Status after Prompt 5 |
|----------|------------|------------------------|
| **update-scores** | Fields OK | Broadened query; no fake 0–0; `data_source_runs`; failure/partial HTTP |
| **update-stats** | **Was broken** | **Pitching columns remapped** to schema; run health + 500 on total write fail |
| **update-news** | Fields OK | `data_source_runs` + partial/failure statuses |
| **update-rankings** | Fields OK | Same |

Deploy via `scripts/deploy-ingestion.sh` after `supabase db push`.

---

## 1. `update-scores` → `games`

### Payload fields vs columns

| Written by function | In `games`? | Notes |
|---------------------|-------------|--------|
| `status` | ✅ | Values: `completed`, `live` — both allowed by CHECK |
| `iu_score` | ✅ | |
| `opponent_score` | ✅ | |
| `innings_played` | ✅ | Function may send a **number** (`period`); column is `text` — Postgres usually coerces |
| `opponent_logo` | ✅ | |
| `broadcast_network` | ✅ | |
| `opponent_record` | ✅ | |
| `box_score_url` | ✅ | |
| `is_conference_game` | ✅ | |
| `updated_at` | ✅ | |

No unknown column names. **Field mismatch is not the primary scores failure mode.**

### Behavioral / 500 analysis

```text
Query: status IN (upcoming, live) AND date < now()
```

| Issue | Severity | Effect |
|-------|----------|--------|
| Only past-dated upcoming/live games are checked | High (data) | Games still “upcoming” with future timestamps never get scores; live games before first pitch time may miss updates |
| ESPN `content.schedule` missing → `throw` | High (500) | Entire run 500s if ESPN changes payload or blocks CDN |
| ESPN HTTP non-OK → `throw` | High (500) | Same |
| Initial `games` select error → `throw` | Medium (500) | Env/network/DB |
| Match by UTC month/day + fuzzy opponent name | Medium (data) | Doubleheaders / name mismatches → “no ESPN match” in `skipped` |
| Missing scores → `parseInt(...\|\|"0")` | Medium (data) | Can write **0–0** finals if ESPN omits scores |
| Per-row update errors go to `skipped`, not 500 | Low | Run still “succeeds” with partial updates |
| Does **not** insert new games or backfill completed rows already marked completed | Info | One-way updater for pending rows only |

### Apparent cause of “repeating 500s” — **confirmed Jul 2026**

`cdn.espn.com` returns **HTTP 202 HTML bot-challenge** from Supabase egress IPs (not usable server-side).

**Fix (deployed code path):** use  
`https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/teams/648/schedule?season=YYYY`  
- Path sport is **`baseball`** (ESPN nests college softball there; `…/softball/…` → 400).  
- Body: top-level **`events[]`** (not `content.schedule`).  
- Scores: competitor `score` may be `{ value, displayValue }` objects.  
- Completed: `competitions[0].status.type.completed`.  
- Season = **end year** of the campaign (Jul–Dec → next calendar year; Jan–Jun → current).  

Live scoreboard (Prompt 4): `site.api…/scoreboard?dates=YYYYMMDD` works; `data.ncaa.com` 404s for 2026.

### Columns never written by this function

`date`, `opponent`, `location`, `venue`, `city`, `stream_url`, `tournament_name`, `notes`, `venue_lat`, `venue_lon`, `created_at` — assumed seeded elsewhere; scores job only patches results/metadata.

---

## 2. `update-stats` → `batting_stats` / `pitching_stats`

### Batting — **aligned**

| Function key | DB column |
|--------------|-----------|
| `player_id` | `player_id` |
| `avg` | `avg` |
| `ops` | `ops` |
| `games_played` | `games_played` |
| `games_started` | `games_started` |
| `at_bats` | `at_bats` |
| `runs` | `runs` |
| `hits` | `hits` |
| `doubles` | `doubles` |
| `triples` | `triples` |
| `home_runs` | `home_runs` |
| `rbi` | `rbi` |
| `total_bases` | `total_bases` |
| `slug_pct` | `slug_pct` |
| `walks` | `walks` |
| `hit_by_pitch` | `hit_by_pitch` |
| `strikeouts` | `strikeouts` |
| `ob_pct` | `ob_pct` |
| `stolen_bases` | `stolen_bases` |
| `stolen_base_attempts` | `stolen_base_attempts` |
| `updated_at` | `updated_at` |

### Pitching — **mismatched (confirmed)**

Function upsert (lines 111–130) vs schema:

| Function sends | Exists on `pitching_stats`? | Correct column |
|----------------|----------------------------|----------------|
| `player_id` | ✅ | |
| `era` | ✅ | |
| `wins` | ✅ | |
| `losses` | ✅ | |
| **`appearances`** | ❌ | **`games_played`** |
| `games_started` | ✅ | |
| `complete_games` | ✅ | |
| `shutouts` | ✅ | |
| `saves` | ✅ | |
| `innings_pitched` | ✅ | |
| **`hits_allowed`** | ❌ | **`hits`** |
| **`runs_allowed`** | ❌ | **`runs`** |
| `earned_runs` | ✅ | |
| **`walks_allowed`** | ❌ | **`walks`** |
| `strikeouts` | ✅ | |
| **`home_runs_allowed`** | ❌ | *no column* — drop or add migration |
| `whip` | ✅ | |
| **`opp_batting_avg`** | ❌ | **`opponent_avg`** |
| `updated_at` | ✅ | |

PostgREST rejects unknown columns → every pitching upsert errors. The function **swallows** errors (`if (!error) pitchingUpdated++`), so the HTTP response is often **200** with `pitching.updated: 0` — not always a 500, but data never lands.

### Other stats risks

| Issue | Effect |
|-------|--------|
| Jersey-number match only | Players with missing/changed numbers skip silently |
| Batting HTML expects ≥22 columns | Site redesign → 0 batting rows, still 200 |
| Nuxt JSON shape change | 0 pitching rows parsed |
| Stats URL hard-coded `/stats/2026` | Fine for 2026; breaks next season without edit |

### Prompt 5 fix (sketch)

```ts
// pitching upsert — map to real columns
{
  player_id: playerId,
  era: pitch.era,
  wins: pitch.wins,
  losses: pitch.losses,
  games_played: pitch.appearances,      // was appearances
  games_started: pitch.gamesStarted,
  complete_games: pitch.completeGames,
  shutouts: pitch.shutouts,
  saves: pitch.saves,
  innings_pitched: pitch.inningsPitched,
  hits: pitch.hitsAllowed,              // was hits_allowed
  runs: pitch.runsAllowed,              // was runs_allowed
  earned_runs: pitch.earnedRuns,
  walks: pitch.walksAllowed,            // was walks_allowed
  strikeouts: pitch.strikeouts,
  opponent_avg: pitch.oppBattingAvg,    // was opp_batting_avg
  whip: pitch.whip,
  updated_at: new Date().toISOString(),
  // do not send home_runs_allowed unless column added
}
```

Also: fail the run (or mark partial) when `pitchingStats.length > 0 && pitchingUpdated === 0`.

---

## 3. `update-news` → `news_articles`

| Function field | DB column | Fit |
|----------------|-----------|-----|
| `id` | `id` | ✅ `news-{slug}` max 100 chars |
| `title` | `title` | ✅ |
| `summary` | `summary` | ✅ uses `""` if missing (NOT NULL ok) |
| `source` | `source` | ✅ `"IU Athletics"` |
| `url` | `url` | ✅ |
| `image_url` | `image_url` | ✅ |
| `published_date` | `published_date` | ✅ ISO from archive date |
| `category` | `category` | ✅ `"Softball"` |
| `created_at` | `created_at` | ✅ |

**No column mismatches.** 500s only from archives fetch, initial URL select, or uncaught parse issues. Per-article insert errors are counted in `failed`, not thrown.

---

## 4. `update-rankings` → `rankings`

| Function field | DB column | Fit |
|----------------|-----------|-----|
| `id` | `id` | ✅ slugified team name |
| `team_name` | `team_name` | ✅ |
| `rpi_rank` | `rpi_rank` | ✅ |
| `elo_rank` | `elo_rank` | ✅ |
| `elo_value` | `elo_value` | ✅ (numeric) |
| `record` | `record` | ✅ |
| `conference` | `conference` | ✅ |
| `last_updated` | `last_updated` | ✅ |

**No column mismatches.** Fragile HTML scrapers on Warren Nolan; year hard-coded `2026` in URLs. Batch upsert errors only `console.error` — response can still say success with partial `upserted`.

---

## 5. Failure semantics (all four)

| Function | Partial failure behavior |
|----------|---------------------------|
| update-scores | Returns 200 with `skipped[]`; 500 only on top-level throw |
| update-stats | Returns 200 even if all upserts fail |
| update-news | Returns 200 with `failed[]` |
| update-rankings | Returns 200 even if some batches fail |

None write a `data_source_runs` row (table does not exist yet — Prompt 5).

---

## 6. Recommended Prompt 5 order

1. **Fix pitching column map** in `update-stats` (above) and redeploy.  
2. **Verify** invoke: `pitching.updated > 0`.  
3. **update-scores:** confirm ESPN logs; broaden query if late-season games stay `upcoming` without `date < now`.  
4. Add `data_source_runs` + real partial/failure statuses.  
5. Optional: add `home_runs_allowed` to `pitching_stats` if you want that metric later.

---

## Canonical DB columns (reference)

### `games`
`id`, `date`, `opponent`, `opponent_logo`, `location`, `venue`, `city`, `status`,  
`iu_score`, `opponent_score`, `broadcast_network`, `stream_url`, `box_score_url`,  
`is_conference_game`, `tournament_name`, `notes`, `innings_played`,  
`created_at`, `updated_at`, `venue_lat`, `venue_lon`, `opponent_record`

### `pitching_stats`
`player_id`, `era`, `wins`, `losses`, `games_played`, `games_started`,  
`complete_games`, `shutouts`, `saves`, `innings_pitched`, `hits`, `runs`,  
`earned_runs`, `walks`, `strikeouts`, `opponent_avg`, `whip`, `updated_at`

### `batting_stats`
`player_id`, `avg`, `ops`, `games_played`, `games_started`, `at_bats`, `runs`,  
`hits`, `doubles`, `triples`, `home_runs`, `rbi`, `total_bases`, `slug_pct`,  
`walks`, `hit_by_pitch`, `strikeouts`, `ob_pct`, `stolen_bases`,  
`stolen_base_attempts`, `updated_at`

### `news_articles` / `rankings`
As in migration; both functions align.
