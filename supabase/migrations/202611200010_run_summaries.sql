-- Worker-maintained per-run summaries, so dashboards never need to fetch
-- full checkpoint state (including the agents array) just to read a
-- population count or resource totals.
create table public.simulation_run_summaries (
  run_id uuid primary key references public.simulation_runs(id) on delete cascade,
  tick integer not null default 0,
  population integer not null default 0,
  food numeric not null default 0,
  water numeric not null default 0,
  energy numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.simulation_run_summaries enable row level security;

create policy run_summary_member_read on public.simulation_run_summaries for select using (
  exists (select 1 from public.simulation_runs r join public.universes u on u.id = r.universe_id where r.id = run_id and (public.is_workspace_member(u.workspace_id) or u.is_public = true))
);

grant select, insert, update on public.simulation_run_summaries to service_role;
grant select on public.simulation_run_summaries to authenticated;
