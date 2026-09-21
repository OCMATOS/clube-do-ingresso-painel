
-- Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
-- Approve all existing users
UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';

-- Ensure existing admin(s): grant admin role to all current users (first user setup)
-- (Safe idempotent seed: promote all existing users so the first account can access admin panel)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT SELECT, UPDATE ON public.invites TO anon;
GRANT ALL ON public.invites TO service_role;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage invites
CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anon can read a specific invite by token to validate it (needed for registration page)
CREATE POLICY "Anyone can validate invite by token" ON public.invites
  FOR SELECT TO anon
  USING (used_at IS NULL AND expires_at > now());

-- Anon can mark an invite used (during signup)
CREATE POLICY "Anyone can consume unused invite" ON public.invites
  FOR UPDATE TO anon
  USING (used_at IS NULL AND expires_at > now())
  WITH CHECK (true);

-- Panel permissions
CREATE TABLE IF NOT EXISTS public.user_panel_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT false,
  can_download boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, panel_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_panel_permissions TO authenticated;
GRANT ALL ON public.user_panel_permissions TO service_role;

ALTER TABLE public.user_panel_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own permissions" ON public.user_panel_permissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage permissions" ON public.user_panel_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can view/update all profiles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins view all roles
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage roles (override deny policies via more permissive)
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user: new users default status pending, no auto role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
