# IU Softball Fan Hub

An unofficial React and Vite fan site for Indiana University softball. The
browser reads public data directly from Supabase; there is no application
server in this repository.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- A Supabase project URL and public anonymous key

## Local setup

```bash
git clone <repository-url>
cd <repository-directory>
npm ci
cp .env.example .env
```

Fill in the two values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Only use a public Supabase anonymous key in `VITE_` variables. Never put a
service-role key in the client environment.

Start the Vite development server:

```bash
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Verification and production build

```bash
npm run verify
```

`verify` runs the repo bug checker, TypeScript, unit tests, and a production
build. The static site is written to `dist/public`. Vercel rewrites unknown
paths to `index.html` so `/player/...`, `/schedule/...`, `/news/...`,
`/coaches`, and `/fall-ball` are shareable. Old `#/` bookmarks redirect to
those paths.

Preview the production build locally with:

```bash
npm run preview
```

## Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run check` | Type-check the project without emitting files |
| `npm run build` | Create the production static site |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Bug checker, type-check, tests, and production build |
| `npm run check:repo` | Static bug checker (hardcoded seasons, stale feeds) |
| `npm run test` | Run unit tests |

## Fall Ball

The hub treats mid-August through mid-November as Fall Ball. Exhibition
games (August–November, or `tournament_name` / notes matching Fall Ball)
do not count toward the official spring record. See
`docs/FALL_BALL_CONTENT_PLAN.md` for the publishing calendar.

When IU announces the slate, add those rows in Supabase with
`tournament_name = 'Fall Ball'`.

## Shareable paths

| Path | Page |
| --- | --- |
| `/coaches` | Coaching + support staff |
| `/player/:id` | Player card |
| `/schedule/:id` | Schedule with that game expanded |
| `/news/:id` | News article |
| `/fall-ball` | Fall Ball hub |
| `/status` | Cron + data-health notes |

## Data jobs

See `supabase/README.md` and `/status`. Confirmed 2026-08-21:

| Cron job | Cadence | Notes |
| --- | --- | --- |
| `update-softball-stats` | Every 30 min | Active. Last success ~01:30 UTC. |
| `update-softball-scores` | Every 30 min | Active. Last success ~01:30 UTC. 23 older failures. |
| `update-softball-news` | Every 4 hours | Active. Last success ~00:00 UTC. |
| `update-softball-rankings` | Every 6 hours | Was inactive (last success 2026-07-10). Re-enabled. Confirm it stays on. |
| `check-softball-data-health` | Hourly at :15 | Added in migration `20260821021000`. Apply with `supabase db push`. |

`ALERT_WEBHOOK_URL` is still unset, so health checks will not post Slack/Discord alerts until that Edge Function secret is added. Do not commit webhook URLs or service-role keys.

## Coaches

Staff is sourced from [IU Athletics coaches](https://iuhoosiers.com/sports/softball/coaches) (retrieved 2026-08-21). Names, titles, and contacts only. Apply `20260821020000_coaches.sql` so the live table matches the module. The roster page no longer hardcodes staff.
