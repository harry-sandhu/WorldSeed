# Running the simulation worker

The worker is intentionally separate from the Next.js process. It uses the Supabase secret key, claims one queued `simulation_runs` row through the lease-aware SQL function, advances the independent simulation core, persists checkpoints, and reports progress to stdout.

For local development:

```bash
npm run worker:once
npm run worker:loop
```

To process only one selected run and leave all other universes untouched:

```bash
npm run worker:loop -- --run-id 4333f2e0-467d-45b0-9a81-94ca906c8e87
```

The worker reads `.env`/`.env.local` through `dotenv`. `WORLDSEED_WORKER_ID` is optional; a process-specific local ID is generated when it is absent. In production, deploy this process separately from Vercel with the same Supabase URL and secret key. Keep the secret key out of browser or client bundles.

## Running for free on GitHub Actions

`npm run worker:once` claims a single queued run, advances it to completion (or to its next lease boundary on failure), and exits — a one-shot invocation, not a loop. That maps directly onto a scheduled CI job, which avoids paying for an always-on process.

`.github/workflows/worker.yml` runs this on a cron schedule plus `workflow_dispatch` for an on-demand "Run workflow" button in the Actions tab. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` are read from repository secrets (Settings → Secrets and variables → Actions), never committed.

Trade-off: a queued run waits for the next scheduled tick (default every 30 minutes) unless someone triggers the workflow manually, rather than being picked up within a second like a persistent worker. The 30-minute default keeps monthly usage comfortably inside GitHub's free Actions minutes for a private repo (roughly 1,440 of the 2,000 free minutes/month in the worst case where every scheduled run finds nothing to do); shorten the cron expression if you don't mind using more of that quota.

