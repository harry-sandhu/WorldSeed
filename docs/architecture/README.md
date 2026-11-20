# WORLDSEED architecture — Milestone 1

The repository starts as a clean TypeScript workspace. The first boundary is intentional:
`src/simulation-core` contains deterministic domain logic and has no React, Next.js, database, network, or browser dependencies.

## Proposed modules

- `apps/web`: Next.js App Router UI, route handlers, auth-aware queries, and visualization.
- `apps/simulation-worker`: independently deployable job consumer for long runs.
- `packages/simulation-core`: deterministic state transitions, PRNG, checkpoints, and typed events.
- `packages/simulation-engine`: worker orchestration, spatial indexes, batching, and performance adapters.
- `packages/world-system`, `packages/agent-system`, `packages/experiment-engine`: domain extensions behind core interfaces.
- `packages/database`: Supabase clients, repositories, and generated database types; never imported by core.
- `packages/ui`: shared shadcn/ui primitives and scientific visualization components.

## Execution model

The core advances in fixed integer ticks. All random choices come from a serializable seeded PRNG. A worker owns a run, periodically persists checkpoints and append-only event batches, and reports progress through durable rows/realtime notifications. The browser renders snapshots and does not become the source of truth for long-running jobs.

## Risks and mitigations

- Large populations: begin with a flat agent array and add a deterministic spatial hash before claiming scale.
- Replay drift: pin `engine_version`, serialize PRNG state, and run cross-version replay fixtures.
- Concurrent edits: version world configurations and reject stale writes with optimistic concurrency checks.
- Untrusted plugins: execute only capability-limited plugins in an isolated worker; never load uploaded JavaScript in the web process.
- Long jobs: use leased database-backed jobs in the separate worker deployment, not unbounded Vercel requests.
