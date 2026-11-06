ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS allow_signups boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_allow boolean;
BEGIN
  SELECT allow_signups INTO v_allow FROM public.store_settings ORDER BY created_at LIMIT 1;
  IF COALESCE(v_allow, true) = false AND COALESCE(NEW.raw_app_meta_data->>'created_by_admin','false') <> 'true' THEN
    RAISE EXCEPTION 'التسجيل مغلق حاليًا';
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    NEW.raw_user_meta_data->>'avatar_url') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.admin_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_activity TO authenticated;
GRANT ALL ON public.admin_activity TO service_role;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read activity" ON public.admin_activity FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));