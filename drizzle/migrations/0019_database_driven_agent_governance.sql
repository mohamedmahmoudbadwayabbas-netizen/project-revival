CREATE TABLE public.ai_agent_configs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_name text NOT NULL UNIQUE CHECK (agent_name IN ('nawat','nebras')),
 system_prompt_base text NOT NULL,
 dynamic_rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(dynamic_rules)='array'),
 forbidden_patterns jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(forbidden_patterns)='array'),
 temperature numeric NOT NULL DEFAULT 0.3 CHECK (temperature BETWEEN 0 AND 2),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_agent_configs TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_agent_configs TO authenticated;
GRANT ALL ON public.ai_agent_configs TO service_role;
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY configs_read ON public.ai_agent_configs FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY configs_write ON public.ai_agent_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TABLE public.ai_tool_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_name text NOT NULL CHECK (agent_name IN ('nawat','nebras')),
 tool_name text NOT NULL,
 label_ar text NOT NULL,
 description_ar text NOT NULL,
 runtime_hints text NOT NULL DEFAULT '',
 is_enabled boolean NOT NULL DEFAULT true,
 requires_approval boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(agent_name,tool_name)
);
GRANT SELECT ON public.ai_tool_registry TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_tool_registry TO authenticated;
GRANT ALL ON public.ai_tool_registry TO service_role;
ALTER TABLE public.ai_tool_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY tools_read ON public.ai_tool_registry FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY tools_write ON public.ai_tool_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE INDEX ai_tool_registry_enabled_idx ON public.ai_tool_registry(agent_name,is_enabled);

CREATE TABLE public.product_search_synonyms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 term text NOT NULL UNIQUE CHECK (length(btrim(term))>0),
 mapped_terms text[] NOT NULL CHECK (cardinality(mapped_terms)>0),
 product_ids uuid[] NOT NULL DEFAULT '{}',
 source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','governance_approved')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_search_synonyms TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.product_search_synonyms TO authenticated;
GRANT ALL ON public.product_search_synonyms TO service_role;
ALTER TABLE public.product_search_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY synonyms_read ON public.product_search_synonyms FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY synonyms_write ON public.product_search_synonyms FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE INDEX product_search_synonyms_terms_idx ON public.product_search_synonyms USING gin(mapped_terms);
CREATE INDEX product_search_synonyms_products_idx ON public.product_search_synonyms USING gin(product_ids);

CREATE TABLE public.ai_governance_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_name text NOT NULL DEFAULT 'nawat' CHECK (agent_name IN ('nawat','nebras')),
 category text NOT NULL CHECK (category IN ('hallucination','synonym_gap','language_leak','catalog_gap','tool_tuning','ux_failure')),
 severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
 title_ar text NOT NULL,
 root_cause_ar text NOT NULL,
 expected_impact_ar text NOT NULL,
 action_type text NOT NULL CHECK (action_type IN ('inject_prompt_rule','update_tool_hints','add_search_synonym','enrich_product_keywords','create_draft_product')),
 action_payload jsonb NOT NULL CHECK (jsonb_typeof(action_payload)='object'),
 evidence_count integer NOT NULL DEFAULT 1 CHECK (evidence_count>0),
 sample_interaction_ids uuid[] NOT NULL DEFAULT '{}',
 dedupe_key text UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
 execution_result text,
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ai_governance_proposals TO authenticated;
GRANT ALL ON public.ai_governance_proposals TO service_role;
ALTER TABLE public.ai_governance_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposals_read ON public.ai_governance_proposals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY proposals_insert ON public.ai_governance_proposals FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND execution_result IS NULL);
CREATE POLICY proposals_update ON public.ai_governance_proposals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'staff') AND status='pending')) WITH CHECK (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'staff') AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND execution_result IS NULL));
CREATE POLICY proposals_delete ON public.ai_governance_proposals FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND status IN ('pending','rejected'));
CREATE INDEX ai_governance_proposals_queue_idx ON public.ai_governance_proposals(status,severity,created_at DESC);
CREATE INDEX ai_governance_proposals_agent_idx ON public.ai_governance_proposals(agent_name,created_at DESC);

CREATE TABLE public.ai_governance_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposal_id uuid REFERENCES public.ai_governance_proposals(id) ON DELETE SET NULL,
 action_type text NOT NULL,
 before_state jsonb,
 after_state jsonb,
 executed_by uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.ai_governance_audit_logs TO authenticated;
GRANT ALL ON public.ai_governance_audit_logs TO service_role;
ALTER TABLE public.ai_governance_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON public.ai_governance_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY audit_insert ON public.ai_governance_audit_logs FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND executed_by=auth.uid() AND EXISTS (SELECT 1 FROM public.ai_governance_proposals p WHERE p.id=proposal_id AND p.status IN ('approved','executed','failed') AND p.action_type=ai_governance_audit_logs.action_type));
CREATE INDEX ai_governance_audit_proposal_idx ON public.ai_governance_audit_logs(proposal_id,created_at DESC);
CREATE INDEX ai_governance_audit_actor_idx ON public.ai_governance_audit_logs(executed_by,created_at DESC);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_keywords text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_search_keywords_idx ON public.products USING gin(search_keywords);
COMMENT ON COLUMN public.products.search_keywords IS 'Approved colloquial search keywords; never customer-facing descriptions. Runtime search wiring is a separate task.';
COMMENT ON TABLE public.ai_agent_configs IS 'Public runtime configuration: never store credentials, personal data or confidential instructions here.';
COMMENT ON TABLE public.ai_tool_registry IS 'Definition metadata only; does not implement tools or bypass the existing intent router and execution gateway.';
COMMENT ON TABLE public.ai_governance_proposals IS 'New governance contract; does not replace ai_proposals. Approval is not execution. No automatic executor is installed.';
COMMENT ON COLUMN public.ai_governance_proposals.reviewed_by IS 'Plain Auth user UUID; no foreign key into managed auth schema.';
COMMENT ON TABLE public.ai_governance_audit_logs IS 'Client append-only audit history; rollback requires a future approved executor using before_state.';

CREATE FUNCTION public.touch_ai_config_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.touch_ai_config_updated_at() FROM PUBLIC;
CREATE TRIGGER ai_agent_configs_updated BEFORE UPDATE ON public.ai_agent_configs FOR EACH ROW EXECUTE FUNCTION public.touch_ai_config_updated_at();
CREATE TRIGGER ai_tool_registry_updated BEFORE UPDATE ON public.ai_tool_registry FOR EACH ROW EXECUTE FUNCTION public.touch_ai_config_updated_at();

CREATE FUNCTION public.guard_ai_governance_review() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF OLD.status='pending' AND NEW.status IN ('approved','rejected') THEN
   IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin review required'; END IF;
   NEW.reviewed_by=auth.uid(); NEW.reviewed_at=now();
  ELSIF OLD.status='approved' AND NEW.status IN ('executed','failed') THEN
   IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Trusted executor required'; END IF;
  ELSE RAISE EXCEPTION 'Invalid governance status transition'; END IF;
 END IF;
 IF OLD.status <> 'pending' AND (NEW.action_payload IS DISTINCT FROM OLD.action_payload OR NEW.action_type IS DISTINCT FROM OLD.action_type OR NEW.agent_name IS DISTINCT FROM OLD.agent_name) THEN RAISE EXCEPTION 'Reviewed operation is immutable'; END IF;
 IF NEW.status IS NOT DISTINCT FROM OLD.status AND (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN RAISE EXCEPTION 'Review attribution is immutable'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_ai_governance_review() FROM PUBLIC;
CREATE TRIGGER ai_governance_review_guard BEFORE UPDATE ON public.ai_governance_proposals FOR EACH ROW EXECUTE FUNCTION public.guard_ai_governance_review();