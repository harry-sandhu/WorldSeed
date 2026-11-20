# Phase: Evidence and alternate histories

## Goal

Turn completed simulation runs into inspectable evidence. Researchers should be able to compare runs, inspect checkpoints, and understand population/resource changes without reading raw database rows.

## Milestones

1. Analytics foundation — live run summaries, population/resource cards, and compact trend visualizations.
2. Timeline explorer — checkpoint history, run selection, checkpoint inspection, and restore/branch interfaces.
3. Experiment workspace — group seeded runs, compare outcomes, and calculate mean/median/standard deviation.
4. UX hardening — loading/error/empty states, responsive layouts, pagination, and integration tests.

## Data rules

- Raw checkpoints remain in Supabase; the UI derives display summaries.
- No synthetic results are shown when data is absent.
- Population counts come from checkpoint agent state.
- Timeline views are scoped to the selected universe or run.
- Aggregations must identify their source run IDs and ticks.

## Current limitation

Experiments, dashboard, and simulation-studio's run list now read from the worker-maintained `simulation_run_summaries` table (one small numeric row per run) instead of fetching full checkpoint state. The analytics trend chart still reads raw checkpoints, since it genuinely needs per-tick history — that one isn't a scale concern in the same way, since it's bounded by however many checkpoints a single run produces, not by population size.
