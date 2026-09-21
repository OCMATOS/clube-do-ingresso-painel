ALTER TABLE public.sdr_leads
  ADD COLUMN IF NOT EXISTS icp_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS disqualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS disqualified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS disqualified_reason text;

ALTER TABLE public.sdr_leads
  DROP CONSTRAINT IF EXISTS sdr_leads_icp_status_check;
ALTER TABLE public.sdr_leads
  ADD CONSTRAINT sdr_leads_icp_status_check CHECK (icp_status IN ('pendente','fora_icp'));