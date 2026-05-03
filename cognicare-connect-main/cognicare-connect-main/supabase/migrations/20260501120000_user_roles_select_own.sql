-- Doctors/patients/admins need to read their own row on login (AuthContext loads from user_roles).
-- Without this, RLS can return zero rows for the account owner while admins still see all rows.

drop policy if exists "user_roles_select_own" on public.user_roles;

create policy "user_roles_select_own" on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);
