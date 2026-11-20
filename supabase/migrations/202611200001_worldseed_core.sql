-- WORLDSEED core persistence and worker queue.
-- Apply with Supabase migrations or paste into the SQL editor.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'editor', 'viewer');
create type public.simulation_run_status as enum ('queued', 'running', 'completed', 'cancelled', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.universes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  is_public boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  status public.simulation_run_status not null default 'queued',
  config jsonb not null,
  seed bigint not null,
  total_ticks integer not null check (total_ticks > 0),
  completed_ticks integer not null default 0 check (completed_ticks >= 0),
  checkpoint_every integer not null default 100 check (checkpoint_every > 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  attempt integer not null default 0 check (attempt >= 0),
  lease_until timestamptz,
  worker_id text,
  cancel_requested boolean not null default false,
  error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.simulation_checkpoints (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  tick integer not null check (tick >= 0),
  state jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, tick)
);

create table public.simulation_event_batches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  first_tick integer not null check (first_tick >= 0),
  last_tick integer not null check (last_tick >= first_tick),
  events jsonb not null,
  created_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index universes_workspace_idx on public.universes(workspace_id, updated_at desc);
create index simulation_runs_queue_idx on public.simulation_runs(status, lease_until, created_at);
create index simulation_runs_universe_idx on public.simulation_runs(universe_id, created_at desc);
create index checkpoints_run_tick_idx on public.simulation_checkpoints(run_id, tick desc);
create index event_batches_run_tick_idx on public.simulation_event_batches(run_id, first_tick);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.universes enable row level security;
alter table public.simulation_runs enable row level security;
alter table public.simulation_checkpoints enable row level security;
alter table public.simulation_event_batches enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

create policy workspace_member_read on public.workspaces for select using (public.is_workspace_member(id));
create policy workspace_owner_insert on public.workspaces for insert with check (created_by = auth.uid());
create policy workspace_editor_update on public.workspaces for update using (public.has_workspace_role(id, array['owner', 'editor']::public.workspace_role[]));

create policy membership_read on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy membership_owner_manage on public.workspace_members for all using (public.has_workspace_role(workspace_id, array['owner']::public.workspace_role[]));

create policy universe_member_read on public.universes for select using (public.is_workspace_member(workspace_id) or is_public = true);
create policy universe_editor_insert on public.universes for insert with check (public.has_workspace_role(workspace_id, array['owner', 'editor']::public.workspace_role[]) and created_by = auth.uid());
create policy universe_editor_update on public.universes for update using (public.has_workspace_role(workspace_id, array['owner', 'editor']::public.workspace_role[]));
create policy universe_editor_delete on public.universes for delete using (public.has_workspace_role(workspace_id, array['owner', 'editor']::public.workspace_role[]));

create policy run_member_read on public.simulation_runs for select using (
  exists (select 1 from public.universes u where u.id = universe_id and (public.is_workspace_member(u.workspace_id) or u.is_public = true))
);
create policy run_editor_insert on public.simulation_runs for insert with check (
  created_by = auth.uid() and exists (select 1 from public.universes u where u.id = universe_id and public.has_workspace_role(u.workspace_id, array['owner', 'editor']::public.workspace_role[]))
);
create policy run_editor_update on public.simulation_runs for update using (
  exists (select 1 from public.universes u where u.id = universe_id and public.has_workspace_role(u.workspace_id, array['owner', 'editor']::public.workspace_role[]))
);

create policy checkpoint_member_read on public.simulation_checkpoints for select using (
  exists (select 1 from public.simulation_runs r join public.universes u on u.id = r.universe_id where r.id = run_id and (public.is_workspace_member(u.workspace_id) or u.is_public = true))
);
create policy event_member_read on public.simulation_event_batches for select using (
  exists (select 1 from public.simulation_runs r join public.universes u on u.id = r.universe_id where r.id = run_id and (public.is_workspace_member(u.workspace_id) or u.is_public = true))
);

-- Called by the trusted worker using the secret key. The row lock makes claims atomic.
create or replace function public.claim_simulation_run(p_worker_id text, p_lease_seconds integer default 60)
returns setof public.simulation_runs
language plpgsql security definer set search_path = public
as $$
begin
  return query
  with candidate as (
    select id from public.simulation_runs
    where (
      status = 'queued'
      or (status = 'running' and lease_until is not null and lease_until < now())
    )
    and attempt < max_attempts
    order by created_at
    for update skip locked
    limit 1
  )
  update public.simulation_runs r
  set status = 'running', attempt = r.attempt + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      worker_id = p_worker_id, error_message = null, updated_at = now()
  from candidate c where r.id = c.id
  returning r.*;
end;
$$;

revoke all on function public.claim_simulation_run(text, integer) from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger universes_updated_at before update on public.universes for each row execute function public.set_updated_at();
create trigger runs_updated_at before update on public.simulation_runs for each row execute function public.set_updated_at();
