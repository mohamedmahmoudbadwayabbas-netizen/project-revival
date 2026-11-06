ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text, p_phone text, p_address text, p_notes text, p_items jsonb,
  p_delivery_zone_id uuid, p_delivery_method text, p_payment_method text,
  p_payment_reference text, p_coupon_code text, p_ref_source text, p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing uuid;
  v_order uuid;
BEGIN
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    IF length(p_idempotency_key) > 100 THEN
      RAISE EXCEPTION 'invalid idempotency key';
    END IF;
    SELECT id INTO v_existing FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  v_order := private.create_order(
    p_customer_name, p_phone, p_address, p_notes, p_items,
    p_delivery_zone_id, p_delivery_method, p_payment_method,
    p_payment_reference, p_coupon_code, p_ref_source
  );

  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    UPDATE public.orders SET idempotency_key = p_idempotency_key WHERE id = v_order;
  END IF;

  RETURN v_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order(text,text,text,text,jsonb,uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(text,text,text,text,jsonb,uuid,text,text,text,text,text,text) TO anon, authenticated, service_role;