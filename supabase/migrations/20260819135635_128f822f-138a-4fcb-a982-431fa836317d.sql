ALTER TABLE public.sdr_leads
  ADD COLUMN IF NOT EXISTS is_backlog boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rd_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rd_manual_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rd_manual_by uuid REFERENCES auth.users(id);

UPDATE public.sdr_leads SET is_backlog = true WHERE created_at <= now();