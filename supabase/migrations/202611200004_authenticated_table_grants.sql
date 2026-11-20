-- API table privileges. RLS still controls which rows each authenticated user may access.
grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.universes to authenticated;
grant select, insert, update on public.simulation_runs to authenticated;
grant select on public.simulation_checkpoints to authenticated;
grant select on public.simulation_event_batches to authenticated;
