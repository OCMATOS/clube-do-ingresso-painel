CREATE OR REPLACE FUNCTION public.set_updated_at_ts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_updated_at_ts() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.sdr_assignments (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sdr_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sdr_assignments TO authenticated;
GRANT ALL ON public.sdr_assignments TO service_role;
ALTER TABLE public.sdr_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sdr assignment" ON public.sdr_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage sdr assignments" ON public.sdr_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.current_sdr_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sdr_key FROM public.sdr_assignments WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.current_sdr_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_sdr_key() TO authenticated, service_role;

CREATE TABLE public.sdr_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_key text NOT NULL,
  username text NOT NULL,
  nome_empresa text,
  observacoes text,
  seguidores text,
  link_bio text,
  cidade text,
  fit_bio text,
  plataforma_atual text,
  segmento text,
  frequencia text,
  ticketeira_atual text,
  evento_detectado text,
  data_evento text,
  post_preview text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  rd_integrated_at timestamptz,
  rd_result jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sdr_key, username)
);
GRANT SELECT ON public.sdr_leads TO authenticated;
GRANT ALL ON public.sdr_leads TO service_role;
ALTER TABLE public.sdr_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SDR views own leads" ON public.sdr_leads FOR SELECT TO authenticated
  USING (sdr_key = public.current_sdr_key() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sdr_lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sdr_lead_messages_lead_idx ON public.sdr_lead_messages(lead_id, created_at);
GRANT SELECT ON public.sdr_lead_messages TO authenticated;
GRANT ALL ON public.sdr_lead_messages TO service_role;
ALTER TABLE public.sdr_lead_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SDR views own lead messages" ON public.sdr_lead_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sdr_leads l
    WHERE l.id = lead_id
      AND (l.sdr_key = public.current_sdr_key() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE TRIGGER update_sdr_leads_updated_at BEFORE UPDATE ON public.sdr_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_ts();
CREATE TRIGGER update_sdr_assignments_updated_at BEFORE UPDATE ON public.sdr_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_ts();