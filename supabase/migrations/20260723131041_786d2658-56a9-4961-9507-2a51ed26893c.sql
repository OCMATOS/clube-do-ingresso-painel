
CREATE POLICY "panel_uploads_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'panel-uploads');

CREATE POLICY "panel_uploads_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'panel-uploads');

CREATE POLICY "panel_uploads_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'panel-uploads')
  WITH CHECK (bucket_id = 'panel-uploads');

CREATE POLICY "panel_uploads_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'panel-uploads' AND public.has_role(auth.uid(), 'admin'));
