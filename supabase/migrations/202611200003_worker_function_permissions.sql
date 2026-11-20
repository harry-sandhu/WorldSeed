-- The worker uses the Supabase secret key, which runs as service_role.
-- Keep the claim function unavailable to browser roles.
grant execute on function public.claim_simulation_run(text, integer) to service_role;
