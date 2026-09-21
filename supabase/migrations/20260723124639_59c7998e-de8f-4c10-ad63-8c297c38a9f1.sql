
DROP POLICY IF EXISTS "Anyone can consume unused invite" ON public.invites;
CREATE POLICY "Anyone can consume unused invite" ON public.invites
  FOR UPDATE TO anon
  USING (used_at IS NULL AND expires_at > now())
  WITH CHECK (used_at IS NOT NULL AND used_by IS NOT NULL);
