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

## Deploying to Render

`render.yaml` at the repo root defines this worker as a Render Background Worker (not a web service — it never binds a port). To deploy:

1. In the Render dashboard: New → Blueprint, and select this GitHub repo. Render reads `render.yaml` and proposes the `worldseed-simulation-worker` service.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` under the service's Environment tab — they're marked `sync: false` in the blueprint so Render prompts for them rather than storing them in the repo.
3. Deploy. The service runs `npm run worker:loop` indefinitely, claiming queued `simulation_runs` the same way it does locally.

