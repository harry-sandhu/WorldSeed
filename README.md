# WorldSeed

A seeded multi-agent simulation platform. Define a world, queue a run, and watch a deterministic population of agents live, reproduce, and die off resource scarcity — then compare runs, branch from any checkpoint, and inspect the evidence.

Live at [worldseed-alpha.vercel.app](https://worldseed-alpha.vercel.app). MIT licensed — see [LICENSE](LICENSE).

## How it fits together

- **Web app** (`app/`) — Next.js. Lets you build worlds, queue runs, and browse analytics/timeline/experiment views over persisted state. Never computes simulation ticks itself.
- **Simulation core** (`src/simulation-core/`) — the actual engine: a seeded PRNG, per-tick agent movement/resource/reproduction/death logic, and checkpoint serialization. No React, no database, no network — pure deterministic state transitions.
- **Simulation worker** (`src/simulation-worker/`) — claims one queued run at a time from Supabase (`FOR UPDATE SKIP LOCKED` via a Postgres RPC), advances it with the engine, and persists checkpoints as it goes.
- **Database** (`src/database/`, `supabase/migrations/`) — Supabase/Postgres: workspaces, universes, simulation runs, checkpoints, timeline branches, experiments — with row-level security scoping everything to workspace membership.

See `docs/architecture/README.md` for the fuller design doc, `docs/architecture/worker.md` for how the worker runs in production, and `docs/database/schema.md` for the table layout.

## Running locally

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL, publishable key, and secret key
npm run dev             # runs the Next.js app and the worker loop together
```

Or run them separately:

```bash
npm run dev:web         # just the web app
npm run worker:loop     # worker, claims any queued run, repeats
npm run worker:once     # worker, claims and finishes at most one run, then exits
```

## Testing and type checking

```bash
npm run typecheck
npm test
```

## Deployment

- **Web app** deploys to Vercel from this repo (`vercel.json`-free; standard Next.js build). It only needs the two `NEXT_PUBLIC_SUPABASE_*` env vars — it never holds the Supabase secret key.
- **Worker** runs as a scheduled GitHub Actions job (`.github/workflows/worker.yml`), since it needs to run independently of the web process and the project doesn't pay for an always-on host. It claims and finishes at most one run per invocation, on a 30-minute schedule, with a manual "Run workflow" trigger available in the Actions tab for on-demand processing. It needs all three Supabase values as repository secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).

## Current limitations

- Analytics pages aggregate from raw checkpoint snapshots client-side; this is a known stopgap for small runs — see `docs/roadmap/phase-analytics-timeline-experiments.md`.
- The worker's 30-minute cadence means a queued run isn't picked up instantly unless someone manually triggers the Actions workflow.
