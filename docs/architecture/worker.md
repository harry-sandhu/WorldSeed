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
