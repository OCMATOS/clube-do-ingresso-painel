-- 1) INVITES: remove anonymous read/update access
DROP POLICY IF EXISTS "Anyone can validate invite by token" ON public.invites;
DROP POLICY IF EXISTS "Anyone can consume unused invite" ON public.invites;
REVOKE ALL ON public.invites FROM anon;
GRANT ALL ON public.invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;

-- 2) SECURITY DEFINER function exposure
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- has_role only answers about the caller (or when used internally by definer code)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  )
$$;

-- 3) STORAGE: scope panel-uploads by panel permissions
DROP POLICY IF EXISTS "panel_uploads_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "panel_uploads_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "panel_uploads_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "panel_uploads_delete_admin" ON storage.objects;

CREATE POLICY "panel_uploads_select_scoped" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'panel-uploads' AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.status = 'approved')
        AND EXISTS (
          SELECT 1 FROM public.user_panel_permissions p
          WHERE p.user_id = auth.uid()
            AND p.can_view
            AND (
              split_part(storage.objects.name, '/', 1) NOT LIKE 'tab\_%'
              OR p.panel_key = substring(split_part(storage.objects.name, '/', 1) from 5)
            )
        )
      )
    )
  );

CREATE POLICY "panel_uploads_insert_scoped" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'panel-uploads' AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.status = 'approved')
        AND EXISTS (
          SELECT 1 FROM public.user_panel_permissions p
          WHERE p.user_id = auth.uid()
            AND p.can_upload
            AND (
              split_part(storage.objects.name, '/', 1) NOT LIKE 'tab\_%'
              OR p.panel_key = substring(split_part(storage.objects.name, '/', 1) from 5)
            )
        )
      )
    )
  );

CREATE POLICY "panel_uploads_update_scoped" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'panel-uploads' AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.status = 'approved')
        AND EXISTS (
          SELECT 1 FROM public.user_panel_permissions p
          WHERE p.user_id = auth.uid()
            AND p.can_upload
            AND (
              split_part(storage.objects.name, '/', 1) NOT LIKE 'tab\_%'
              OR p.panel_key = substring(split_part(storage.objects.name, '/', 1) from 5)
            )
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'panel-uploads' AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.status = 'approved')
        AND EXISTS (
          SELECT 1 FROM public.user_panel_permissions p
          WHERE p.user_id = auth.uid()
            AND p.can_upload
            AND (
              split_part(storage.objects.name, '/', 1) NOT LIKE 'tab\_%'
              OR p.panel_key = substring(split_part(storage.objects.name, '/', 1) from 5)
            )
        )
      )
    )
  );

CREATE POLICY "panel_uploads_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'panel-uploads' AND public.has_role(auth.uid(), 'admin'));
