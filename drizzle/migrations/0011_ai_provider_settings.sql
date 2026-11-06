CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'gemini',
  api_key text,
  base_url text,
  model text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_provider_settings TO service_role;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  provider text,
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ai_alerts TO authenticated;
GRANT ALL ON public.ai_alerts TO service_role;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai alerts" ON public.ai_alerts FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins resolve ai alerts" ON public.ai_alerts FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS ai_alerts_created_idx ON public.ai_alerts (created_at DESC);