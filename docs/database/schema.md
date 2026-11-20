# WORLDSEED database proposal

All tables use UUID primary keys and `created_at`/`updated_at` timestamps where mutable. Tenant-owned tables carry `workspace_id`; RLS policies resolve membership through `workspace_members` and universe roles through `universe_members`.

Core relationships:

`profiles` → `workspace_members` → `workspaces` → `universes` → `world_configurations`/`species` → `simulation_runs` → `simulation_checkpoints` and append-only `simulation_events`.

`timeline_branches` references a parent run and fork checkpoint rather than copying history. `experiments` owns immutable configuration snapshots; `experiment_runs` owns seeds and status; `experiment_results` stores raw summaries separately from aggregate statistics. Comments, bookmarks, invitations, and activity logs are scoped to a workspace or public universe.

JSONB is limited to versioned configuration snapshots, flexible inventories, and event payloads. Large checkpoint artifacts belong in Supabase Storage, with checksummed metadata in `simulation_checkpoints`. Every expensive query has a tenant/status/time index, and all list APIs use cursor pagination.

The first migration should create enum-like check constraints, foreign keys with explicit delete behavior, RLS policies for workspace membership, and a transaction-safe job claim function using `FOR UPDATE SKIP LOCKED` plus lease expiry.
