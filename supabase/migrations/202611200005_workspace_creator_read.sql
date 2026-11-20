-- A creator must be able to read the workspace ID returned immediately after creation,
-- before the initial owner membership row is inserted.
create policy workspace_creator_read on public.workspaces
  for select using (created_by = auth.uid());
