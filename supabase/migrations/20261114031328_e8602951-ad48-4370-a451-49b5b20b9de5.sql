ALTER TABLE public.ai_governance_proposals
  ADD COLUMN IF NOT EXISTS confidence_score numeric,
  ADD COLUMN IF NOT EXISTS distinct_sessions_count integer,
  ADD COLUMN IF NOT EXISTS side_effects_evaluated text,
  ADD COLUMN IF NOT EXISTS why_this_fix text,
  ADD COLUMN IF NOT EXISTS reflection jsonb;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;