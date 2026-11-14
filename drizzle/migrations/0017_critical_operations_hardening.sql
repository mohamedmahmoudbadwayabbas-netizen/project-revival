-- Critical production hardening:
-- 1) atomic stock reservation and coupon redemption in create_order
-- 2) driver assignment records and role enforcement
-- 3) immutable wallet ledger primitives

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity <> 0),
  stock_before numeric(12,3) NOT NULL CHECK (stock_before >= 0),
  stock_after numeric(12,3) NOT NULL CHECK (stock_after >= 0),
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'return', 'adjustment')),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx
  ON public.inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_order_idx
  ON public.inventory_movements (order_id);

GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_movements_admin_read ON public.inventory_movements;
CREATE POLICY inventory_movements_admin_read ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));

CREATE OR REPLACE FUNCTION private.create_order(
  p_customer_name text, p_phone text, p_address text, p_notes text,
  p_items jsonb, p_delivery_zone_id uuid, p_delivery_method text,
  p_payment_method text, p_payment_reference text, p_coupon_code text, p_ref_source text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb;
  prod public.products%ROWTYPE;
  qty numeric;
  ls numeric;
  subtotal numeric := 0;
  server_items jsonb := '[]'::jsonb;
  zone public.delivery_zones%ROWTYPE;
  coupon_row public.coupons%ROWTYPE;
  v_delivery_fee numeric := 0;
  discount numeric := 0;
  new_id uuid;
  total numeric;
  stock_before numeric;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(coalesce(p_customer_name, '')) < 2 OR char_length(p_customer_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_NAME' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(coalesce(p_phone, '')) < 5 OR char_length(p_phone) > 30 THEN
    RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(coalesce(p_address, '')) < 5 OR char_length(p_address) > 500 THEN
    RAISE EXCEPTION 'INVALID_ADDRESS' USING ERRCODE = 'check_violation';
  END IF;
  IF p_payment_method NOT IN ('cod', 'instapay', 'bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT' USING ERRCODE = 'check_violation';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO prod
    FROM public.products
    WHERE id = (it->>'id')::uuid
    FOR UPDATE;

    IF NOT FOUND OR coalesce(prod.is_active, true) IS NOT TRUE THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND' USING ERRCODE = 'check_violation';
    END IF;

    qty := (it->>'quantity')::numeric;
    IF qty IS NULL OR qty <= 0 OR qty > 10000 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'check_violation';
    END IF;

    stock_before := coalesce(prod.stock_quantity, prod.stock, 0);
    IF stock_before < qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'check_violation';
    END IF;

    ls := round(prod.price_per_unit * qty, 2);
    subtotal := subtotal + ls;
    server_items := server_items || jsonb_build_object(
      'id', prod.id,
      'name', prod.name,
      'unit_label', prod.unit_label,
      'is_by_weight', prod.is_by_weight,
      'price_per_unit', prod.price_per_unit,
      'quantity', qty,
      'subtotal', ls
    );
  END LOOP;

  IF p_delivery_method = 'delivery' AND p_delivery_zone_id IS NOT NULL THEN
    SELECT * INTO zone
    FROM public.delivery_zones
    WHERE id = p_delivery_zone_id AND is_active
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_ZONE' USING ERRCODE = 'check_violation';
    END IF;
    IF zone.min_order_amount IS NOT NULL AND subtotal < zone.min_order_amount THEN
      RAISE EXCEPTION 'BELOW_MIN_ORDER' USING ERRCODE = 'check_violation';
    END IF;
    v_delivery_fee := zone.fee;
  END IF;

  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    SELECT * INTO coupon_row
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_COUPON' USING ERRCODE = 'check_violation';
    END IF;
    IF coupon_row.expires_at IS NOT NULL AND coupon_row.expires_at < now() THEN
      RAISE EXCEPTION 'EXPIRED_COUPON' USING ERRCODE = 'check_violation';
    END IF;
    IF coupon_row.max_uses IS NOT NULL
      AND coalesce(coupon_row.uses_count, 0) >= coupon_row.max_uses THEN
      RAISE EXCEPTION 'EXHAUSTED_COUPON' USING ERRCODE = 'check_violation';
    END IF;
    IF coupon_row.min_order_amount IS NOT NULL AND subtotal < coupon_row.min_order_amount THEN
      RAISE EXCEPTION 'MIN_ORDER_NOT_MET' USING ERRCODE = 'check_violation';
    END IF;
    IF coupon_row.discount_type IN ('percent', 'percentage') THEN
      discount := round(subtotal * (coupon_row.discount_value / 100.0), 2);
    ELSE
      discount := coupon_row.discount_value;
    END IF;
    discount := least(greatest(discount, 0), subtotal);
  END IF;

  total := round(subtotal - discount + v_delivery_fee, 2);

  INSERT INTO public.orders (
    customer_name, phone, address, notes, items, total_price,
    payment_method, payment_reference, ref_source, user_id, status,
    delivery_zone_id, delivery_fee, delivery_method, coupon_id, coupon_code,
    discount_amount, total_amount
  ) VALUES (
    p_customer_name, p_phone, p_address, p_notes, server_items, total,
    p_payment_method, p_payment_reference, p_ref_source, auth.uid(), 'pending',
    p_delivery_zone_id, v_delivery_fee, coalesce(p_delivery_method, 'delivery'),
    coupon_row.id, nullif(trim(p_coupon_code), ''), discount, total
  ) RETURNING id INTO new_id;

  FOR it IN SELECT * FROM jsonb_array_elements(server_items) LOOP
    SELECT * INTO prod FROM public.products WHERE id = (it->>'id')::uuid FOR UPDATE;
    stock_before := coalesce(prod.stock_quantity, prod.stock, 0);
    IF stock_before < (it->>'quantity')::numeric THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE public.products
    SET stock_quantity = stock_before - (it->>'quantity')::numeric,
        stock = stock_before - (it->>'quantity')::numeric
    WHERE id = prod.id;
    INSERT INTO public.inventory_movements (
      product_id, order_id, quantity, stock_before, stock_after, movement_type, performed_by
    ) VALUES (
      prod.id, new_id, -((it->>'quantity')::numeric), stock_before,
      stock_before - (it->>'quantity')::numeric, 'sale', auth.uid()
    );
  END LOOP;

  IF coupon_row.id IS NOT NULL THEN
    UPDATE public.coupons
    SET uses_count = coalesce(uses_count, 0) + 1
    WHERE id = coupon_row.id;
    INSERT INTO public.coupon_redemptions (coupon_id, user_id, phone, order_id, discount_amount)
    VALUES (coupon_row.id, auth.uid(), p_phone, new_id, discount);
  END IF;

  RETURN new_id;
END $function$;

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  phone text,
  vehicle_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'accepted', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'failed', 'cancelled')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  delivered_at timestamptz,
  route_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.driver_profiles, public.driver_assignments TO authenticated;
GRANT ALL ON public.driver_profiles, public.driver_assignments TO service_role;

CREATE POLICY driver_profiles_admin_read ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff')
    OR auth.uid() = user_id);
CREATE POLICY driver_assignments_admin_all ON public.driver_assignments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
CREATE POLICY driver_assignments_driver_read ON public.driver_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE OR REPLACE FUNCTION public.assign_driver(p_order_id uuid, p_driver_id uuid)
RETURNS public.driver_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  result public.driver_assignments;
  current_order public.orders%ROWTYPE;
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff')) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_driver_id AND role = 'driver'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = p_driver_id AND is_active
  ) THEN
    RAISE EXCEPTION 'DRIVER_NOT_AVAILABLE' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO current_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR current_order.status NOT IN ('confirmed', 'ready_for_delivery') THEN
    RAISE EXCEPTION 'ORDER_NOT_ASSIGNABLE' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.driver_assignments (order_id, driver_id, assigned_by)
  VALUES (p_order_id, p_driver_id, auth.uid())
  ON CONFLICT (order_id) DO UPDATE
    SET driver_id = EXCLUDED.driver_id, status = 'assigned',
        assigned_by = EXCLUDED.assigned_by, assigned_at = now(), updated_at = now()
  RETURNING * INTO result;
  UPDATE public.orders SET status = 'ready_for_delivery', updated_at = now() WHERE id = p_order_id;
  RETURN result;
END $function$;

GRANT EXECUTE ON FUNCTION public.assign_driver(uuid, uuid) TO authenticated;

-- Serialize retries for the same key so the legacy wrapper cannot create
-- duplicate orders before it writes idempotency_key.
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text, p_phone text, p_address text, p_notes text, p_items jsonb,
  p_delivery_zone_id uuid, p_delivery_method text, p_payment_method text,
  p_payment_reference text, p_coupon_code text, p_ref_source text, p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_existing uuid;
  v_order uuid;
BEGIN
  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    IF length(p_idempotency_key) > 100 THEN
      RAISE EXCEPTION 'invalid idempotency key';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
    SELECT id INTO v_existing
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
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

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  entry_type text NOT NULL CHECK (entry_type IN ('credit', 'debit', 'cashback', 'refund', 'adjustment')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_ledger_user_created_idx
  ON public.wallet_ledger (user_id, created_at DESC);
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.wallet_accounts, public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_accounts, public.wallet_ledger TO service_role;

CREATE POLICY wallet_accounts_owner_read ON public.wallet_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY wallet_accounts_admin_read ON public.wallet_accounts
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY wallet_ledger_owner_read ON public.wallet_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY wallet_ledger_admin_read ON public.wallet_ledger
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.post_wallet_entry(
  p_user_id uuid, p_entry_type text, p_amount numeric,
  p_idempotency_key text, p_order_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallet_ledger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  account public.wallet_accounts%ROWTYPE;
  current_balance numeric := 0;
  result public.wallet_ledger;
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'check_violation';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO result FROM public.wallet_ledger WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN result; END IF;
  END IF;
  INSERT INTO public.wallet_accounts (user_id)
  VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO account FROM public.wallet_accounts WHERE user_id = p_user_id FOR UPDATE;
  SELECT coalesce(balance_after, 0) INTO current_balance
  FROM public.wallet_ledger WHERE user_id = p_user_id
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF p_entry_type IN ('debit') AND current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_WALLET_BALANCE' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.wallet_ledger (
    user_id, order_id, entry_type, amount, balance_after, idempotency_key, metadata, created_by
  ) VALUES (
    p_user_id, p_order_id, p_entry_type, p_amount,
    CASE WHEN p_entry_type = 'debit' THEN current_balance - p_amount ELSE current_balance + p_amount END,
    p_idempotency_key, coalesce(p_metadata, '{}'::jsonb), auth.uid()
  ) RETURNING * INTO result;
  RETURN result;
END $function$;

GRANT EXECUTE ON FUNCTION public.post_wallet_entry(uuid, text, numeric, text, uuid, jsonb) TO authenticated;