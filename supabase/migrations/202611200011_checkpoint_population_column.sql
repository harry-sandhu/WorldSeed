-- Lets analytics read population trends across many checkpoints without
-- pulling each checkpoint's full agents array over the wire.
alter table public.simulation_checkpoints add column population integer not null default 0;
