create table public.timeline_branches (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  source_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  source_checkpoint_id uuid not null references public.simulation_checkpoints(id) on delete restrict,
  branch_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index timeline_branches_universe_idx on public.timeline_branches(universe_id, created_at desc);
alter table public.timeline_branches enable row level security;
grant select, insert on public.timeline_branches to authenticated;
grant insert on public.simulation_checkpoints to authenticated;

create policy branch_member_read on public.timeline_branches for select using (
  exists (select 1 from public.universes u where u.id = universe_id and (public.is_workspace_member(u.workspace_id) or u.is_public = true))
);
create policy branch_editor_insert on public.timeline_branches for insert with check (
  created_by = auth.uid() and exists (select 1 from public.universes u where u.id = universe_id and public.has_workspace_role(u.workspace_id, array['owner', 'editor']::public.workspace_role[]))
);
create policy checkpoint_editor_insert on public.simulation_checkpoints for insert with check (
  exists (select 1 from public.simulation_runs r join public.universes u on u.id = r.universe_id where r.id = run_id and public.has_workspace_role(u.workspace_id, array['owner', 'editor']::public.workspace_role[]))
);
