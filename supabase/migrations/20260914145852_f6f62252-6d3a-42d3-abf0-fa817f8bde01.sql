ALTER TABLE public.sdr_leads
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'planilha',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);