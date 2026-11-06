CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'customer',
  thread_id text,
  input_summary text,
  tools_called jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text,
  outcome text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_interactions TO authenticated;
GRANT ALL ON public.agent_interactions TO service_role;
ALTER TABLE public.agent_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interactions insert" ON public.agent_interactions FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "own or admin read interactions" ON public.agent_interactions FOR SELECT TO authenticated USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES public.agent_interactions(id) ON DELETE CASCADE,
  user_id uuid,
  signal_type text NOT NULL DEFAULT 'explicit_rating',
  rating smallint,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_feedback TO authenticated;
GRANT ALL ON public.agent_feedback TO service_role;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback insert" ON public.agent_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own or admin read feedback" ON public.agent_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL DEFAULT 'analysis',
  title text NOT NULL,
  root_cause text,
  raw_operation jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_tier text NOT NULL DEFAULT 'high',
  source_interaction_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ai_proposals TO authenticated;
GRANT ALL ON public.ai_proposals TO service_role;
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read proposals" ON public.ai_proposals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin review proposals" ON public.ai_proposals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS agent_interactions_created_idx ON public.agent_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_feedback_interaction_idx ON public.agent_feedback (interaction_id);
CREATE INDEX IF NOT EXISTS ai_proposals_status_idx ON public.ai_proposals (status, created_at DESC);