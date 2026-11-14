CREATE OR REPLACE FUNCTION public.guard_ai_governance_review()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status IN ('approved','rejected') THEN
      IF auth.role() = 'service_role' THEN
        NEW.reviewed_at = coalesce(NEW.reviewed_at, now());
      ELSIF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin review required';
      ELSE
        NEW.reviewed_by = auth.uid();
        NEW.reviewed_at = now();
      END IF;
    ELSIF OLD.status IN ('pending','approved') AND NEW.status IN ('executed','failed') THEN
      IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Trusted executor required';
      END IF;
      NEW.reviewed_at = coalesce(NEW.reviewed_at, now());
    ELSE
      RAISE EXCEPTION 'Invalid governance status transition';
    END IF;
  END IF;
  IF OLD.status <> 'pending' AND (NEW.action_payload IS DISTINCT FROM OLD.action_payload OR NEW.action_type IS DISTINCT FROM OLD.action_type) THEN
    RAISE EXCEPTION 'Reviewed operation is immutable';
  END IF;
  RETURN NEW;
END $function$;