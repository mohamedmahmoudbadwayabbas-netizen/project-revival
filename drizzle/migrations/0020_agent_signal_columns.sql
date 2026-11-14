-- Columns the governance screens already read; they were missing from earlier migrations.
ALTER TABLE public.agent_interactions
  ADD COLUMN IF NOT EXISTS implicit_signal text,
  ADD COLUMN IF NOT EXISTS guardrail_triggered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thinking_summary text;
ALTER TABLE public.agent_feedback
  ADD COLUMN IF NOT EXISTS reasons text[] NOT NULL DEFAULT '{}';
