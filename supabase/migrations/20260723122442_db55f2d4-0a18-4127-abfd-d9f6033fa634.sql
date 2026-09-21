
-- 1) profiles: allow authenticated users to insert only their own row
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2) user_roles: explicit deny for all writes from authenticated/anon.
-- Role assignment happens via SECURITY DEFINER trigger handle_new_user() only.
CREATE POLICY "No one can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No one can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "No one can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated, anon
USING (false);

-- 3) Revoke EXECUTE on SECURITY DEFINER helper from public API roles.
-- has_role is used inside RLS policies as auth.uid() context; RLS evaluation
-- runs as the definer regardless of grants, so revoking client execute is safe.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- handle_new_user is a trigger function; revoke direct execute as well.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
