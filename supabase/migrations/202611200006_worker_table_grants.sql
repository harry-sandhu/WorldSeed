-- The worker runs with the secret key as service_role.
grant select, insert, update on public.simulation_runs to service_role;
grant select, insert, update on public.simulation_checkpoints to service_role;
grant select, insert, update on public.simulation_event_batches to service_role;
