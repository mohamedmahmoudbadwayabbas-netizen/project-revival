CREATE TABLE public.nawat_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL DEFAULT 'محادثة جديدة',
 messages jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nawat_threads TO authenticated;
GRANT ALL ON public.nawat_threads TO service_role;
ALTER TABLE public.nawat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY nawat_owner_select ON public.nawat_threads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY nawat_owner_insert ON public.nawat_threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY nawat_owner_update ON public.nawat_threads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY nawat_owner_delete ON public.nawat_threads FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX nawat_threads_user_updated ON public.nawat_threads (user_id, updated_at DESC);
