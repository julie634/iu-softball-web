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

`verify` runs the TypeScript check followed by a production build. The static
site is written to `dist/public`.

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
