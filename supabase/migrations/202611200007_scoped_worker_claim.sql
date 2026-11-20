-- Optional run scoping lets a local worker process only the run selected by a researcher.
create or replace function public.claim_simulation_run(p_worker_id text, p_lease_seconds integer default 60, p_run_id uuid default null)
returns setof public.simulation_runs
language plpgsql security definer set search_path = public
as $$
begin
  return query
  with candidate as (
    select id from public.simulation_runs
    where (p_run_id is null or id = p_run_id)
    and (status = 'queued' or (status = 'running' and lease_until is not null and lease_until < now()))
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

revoke all on function public.claim_simulation_run(text, integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_simulation_run(text, integer, uuid) to service_role;

notify pgrst, 'reload schema';
