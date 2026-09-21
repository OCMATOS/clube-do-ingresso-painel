ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS sdr_key text,
  ADD COLUMN IF NOT EXISTS sdr_only boolean NOT NULL DEFAULT false;