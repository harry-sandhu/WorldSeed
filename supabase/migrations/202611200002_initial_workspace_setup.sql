-- Allow an authenticated user to initialize their own profile/workspace.
create policy profiles_self_insert on public.profiles
  for insert with check (id = auth.uid());

create policy membership_creator_insert on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.workspaces where id = workspace_id and created_by = auth.uid())
  );
