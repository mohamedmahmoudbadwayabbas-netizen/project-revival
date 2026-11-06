CREATE TABLE public.store_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot jsonb NOT NULL,
  note text,
  actor_id uuid DEFAULT auth.uid(),
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.store_settings_history TO authenticated;
GRANT ALL ON public.store_settings_history TO service_role;
ALTER TABLE public.store_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings history" ON public.store_settings_history FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins add settings history" ON public.store_settings_history FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete settings history" ON public.store_settings_history FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX store_settings_history_created_idx ON public.store_settings_history (created_at DESC);