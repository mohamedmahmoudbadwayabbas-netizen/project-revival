CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
DROP POLICY IF EXISTS product_images_admin_update ON storage.objects;
DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY product_images_admin_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY product_images_admin_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS categories_admin_update ON public.categories;
DROP POLICY IF EXISTS categories_admin_delete ON public.categories;
DROP POLICY IF EXISTS categories_admin_insert ON public.categories;
CREATE POLICY categories_admin_update ON public.categories FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY categories_admin_delete ON public.categories FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY categories_admin_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "coupons admin write" ON public.coupons;
DROP POLICY IF EXISTS "coupons public read" ON public.coupons;
CREATE POLICY coupons_admin_all ON public.coupons FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "zones admin write" ON public.delivery_zones;
CREATE POLICY zones_admin_all ON public.delivery_zones FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "banners admin write" ON public.hero_banners;
CREATE POLICY banners_admin_all ON public.hero_banners FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS orders_admin_read ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
DROP POLICY IF EXISTS orders_admin_delete ON public.orders;
DROP POLICY IF EXISTS orders_public_insert ON public.orders;
CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));
CREATE POLICY orders_admin_delete ON public.orders FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY orders_owner_select ON public.orders FOR SELECT TO authenticated USING (user_id IS NOT NULL AND user_id = auth.uid());
DROP POLICY IF EXISTS products_admin_insert ON public.products;
DROP POLICY IF EXISTS products_admin_update ON public.products;
DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_admin_insert ON public.products FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY products_admin_update ON public.products FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY products_admin_delete ON public.products FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY reviews_admin_delete ON public.reviews FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY reviews_admin_update ON public.reviews FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY reviews_insert_own ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS store_settings_admin_insert ON public.store_settings;
DROP POLICY IF EXISTS store_settings_admin_update ON public.store_settings;
DROP POLICY IF EXISTS store_settings_public_read ON public.store_settings;
CREATE POLICY store_settings_admin_insert ON public.store_settings FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY store_settings_admin_update ON public.store_settings FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "theme admin write" ON public.theme_settings;
CREATE POLICY theme_admin_all ON public.theme_settings FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION private.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION private.enforce_order_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent_count int;
BEGIN
  IF NEW.phone IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO recent_count FROM public.orders
   WHERE phone = NEW.phone AND created_at > now() - interval '10 minutes';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many orders submitted recently. Please try again later.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tgname, c.relname, n.nspname, pg_get_triggerdef(tr.oid) AS def
    FROM pg_trigger tr
    JOIN pg_class c ON c.oid = tr.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tr.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE NOT tr.tgisinternal
      AND pn.nspname = 'public'
      AND p.proname IN ('update_updated_at_column','enforce_order_rate_limit')
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %I.%I', t.tgname, t.nspname, t.relname);
    EXECUTE replace(replace(t.def,
      'public.update_updated_at_column', 'private.update_updated_at_column'),
      'public.enforce_order_rate_limit', 'private.enforce_order_rate_limit');
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_order_rate_limit() CASCADE;

CREATE OR REPLACE FUNCTION private.get_payment_config()
RETURNS TABLE(instapay_handle text, bank_account_info text, store_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT instapay_handle, bank_account_info, store_address FROM public.store_settings LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.get_payment_config()
RETURNS TABLE(instapay_handle text, bank_account_info text, store_address text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.get_payment_config()
$$;
CREATE OR REPLACE FUNCTION private.validate_coupon(p_code text, p_subtotal numeric)
RETURNS TABLE(code text, discount_type text, discount_value numeric, discount_amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.coupons%ROWTYPE; d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(coupons.code) = upper(trim(p_code)) AND is_active LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_COUPON' USING ERRCODE='check_violation'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'EXPIRED_COUPON' USING ERRCODE='check_violation'; END IF;
  IF c.max_uses IS NOT NULL AND coalesce(c.uses_count,0) >= c.max_uses THEN RAISE EXCEPTION 'EXHAUSTED_COUPON' USING ERRCODE='check_violation'; END IF;
  IF c.min_order_amount IS NOT NULL AND p_subtotal < c.min_order_amount THEN RAISE EXCEPTION 'MIN_ORDER_NOT_MET' USING ERRCODE='check_violation'; END IF;
  IF c.discount_type IN ('percent','percentage') THEN d := round(p_subtotal * (c.discount_value/100.0), 2);
  ELSE d := c.discount_value; END IF;
  IF d > p_subtotal THEN d := p_subtotal; END IF;
  RETURN QUERY SELECT c.code, c.discount_type, c.discount_value, d;
END $$;
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal numeric)
RETURNS TABLE(code text, discount_type text, discount_value numeric, discount_amount numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM private.validate_coupon(p_code, p_subtotal)
$$;

ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'مصر',
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text;
CREATE INDEX IF NOT EXISTS delivery_zones_hierarchy_idx
  ON public.delivery_zones (country, governorate, city, area) WHERE is_active;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'delivery';
UPDATE public.orders SET delivery_fee = 0 WHERE delivery_fee IS NULL;
ALTER TABLE public.orders ALTER COLUMN delivery_fee SET NOT NULL;

CREATE OR REPLACE FUNCTION private.create_order(
  p_customer_name text, p_phone text, p_address text, p_notes text,
  p_items jsonb, p_delivery_zone_id uuid, p_delivery_method text,
  p_payment_method text, p_payment_reference text, p_coupon_code text, p_ref_source text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb; prod public.products%ROWTYPE; qty numeric; ls numeric;
  subtotal numeric := 0; server_items jsonb := '[]'::jsonb;
  zone public.delivery_zones%ROWTYPE; v_delivery_fee numeric := 0;
  discount numeric := 0; coupon_row public.coupons%ROWTYPE;
  new_id uuid; total numeric;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'EMPTY_CART' USING ERRCODE='check_violation'; END IF;
  IF char_length(coalesce(p_customer_name,'')) < 2 OR char_length(p_customer_name) > 120 THEN RAISE EXCEPTION 'INVALID_NAME' USING ERRCODE='check_violation'; END IF;
  IF char_length(coalesce(p_phone,'')) < 5 OR char_length(p_phone) > 30 THEN RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE='check_violation'; END IF;
  IF char_length(coalesce(p_address,'')) < 5 OR char_length(p_address) > 500 THEN RAISE EXCEPTION 'INVALID_ADDRESS' USING ERRCODE='check_violation'; END IF;
  IF p_payment_method NOT IN ('cod','instapay','bank') THEN RAISE EXCEPTION 'INVALID_PAYMENT' USING ERRCODE='check_violation'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO prod FROM public.products WHERE id = (it->>'id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND' USING ERRCODE='check_violation'; END IF;
    qty := (it->>'quantity')::numeric;
    IF qty IS NULL OR qty <= 0 OR qty > 10000 THEN RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE='check_violation'; END IF;
    ls := round(prod.price_per_unit * qty, 2);
    subtotal := subtotal + ls;
    server_items := server_items || jsonb_build_object(
      'id', prod.id, 'name', prod.name, 'unit_label', prod.unit_label,
      'is_by_weight', prod.is_by_weight, 'price_per_unit', prod.price_per_unit,
      'quantity', qty, 'subtotal', ls
    );
  END LOOP;
  IF p_delivery_method = 'delivery' AND p_delivery_zone_id IS NOT NULL THEN
    SELECT * INTO zone FROM public.delivery_zones WHERE id = p_delivery_zone_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ZONE' USING ERRCODE='check_violation'; END IF;
    IF zone.min_order_amount IS NOT NULL AND subtotal < zone.min_order_amount THEN RAISE EXCEPTION 'BELOW_MIN_ORDER' USING ERRCODE='check_violation'; END IF;
    v_delivery_fee := zone.fee;
  END IF;
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    SELECT * INTO coupon_row FROM public.coupons WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_COUPON' USING ERRCODE='check_violation'; END IF;
    IF coupon_row.expires_at IS NOT NULL AND coupon_row.expires_at < now() THEN RAISE EXCEPTION 'EXPIRED_COUPON' USING ERRCODE='check_violation'; END IF;
    IF coupon_row.max_uses IS NOT NULL AND coalesce(coupon_row.uses_count,0) >= coupon_row.max_uses THEN RAISE EXCEPTION 'EXHAUSTED_COUPON' USING ERRCODE='check_violation'; END IF;
    IF coupon_row.min_order_amount IS NOT NULL AND subtotal < coupon_row.min_order_amount THEN RAISE EXCEPTION 'MIN_ORDER_NOT_MET' USING ERRCODE='check_violation'; END IF;
    IF coupon_row.discount_type IN ('percent','percentage') THEN discount := round(subtotal * (coupon_row.discount_value/100.0), 2);
    ELSE discount := coupon_row.discount_value; END IF;
    IF discount > subtotal THEN discount := subtotal; END IF;
    UPDATE public.coupons SET uses_count = coalesce(uses_count,0)+1 WHERE id = coupon_row.id;
  END IF;
  total := round(subtotal - discount + v_delivery_fee, 2);
  INSERT INTO public.orders (
    customer_name, phone, address, notes, items, total_price,
    payment_method, payment_reference, ref_source, user_id, status,
    delivery_zone_id, delivery_fee, delivery_method
  ) VALUES (
    p_customer_name, p_phone, p_address, p_notes, server_items, total,
    p_payment_method, p_payment_reference, p_ref_source, auth.uid(), 'new',
    p_delivery_zone_id, v_delivery_fee, coalesce(p_delivery_method,'delivery')
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $function$;
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text, p_phone text, p_address text, p_notes text, p_items jsonb,
  p_delivery_zone_id uuid, p_delivery_method text, p_payment_method text,
  p_payment_reference text, p_coupon_code text, p_ref_source text
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.create_order(
    p_customer_name, p_phone, p_address, p_notes, p_items,
    p_delivery_zone_id, p_delivery_method, p_payment_method,
    p_payment_reference, p_coupon_code, p_ref_source
  )
$$;
REVOKE ALL ON FUNCTION public.create_order(text,text,text,text,jsonb,uuid,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_payment_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, jsonb, uuid, text, text, text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION private.get_payment_config() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.validate_coupon(text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.create_order(text, text, text, text, jsonb, uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_order_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_order(text, text, text, text, jsonb, uuid, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.validate_coupon(text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_payment_config() TO anon, authenticated;

drop policy if exists "store_assets_read_all" on storage.objects;
drop policy if exists "store_assets_read" on storage.objects;
create policy "store_assets_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'store-assets');
drop policy if exists "store_assets_admin_insert" on storage.objects;
create policy "store_assets_admin_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'store-assets' and private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "store_assets_admin_update" on storage.objects;
create policy "store_assets_admin_update" on storage.objects
for update to authenticated using (bucket_id = 'store-assets' and private.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "store_assets_admin_delete" on storage.objects;
create policy "store_assets_admin_delete" on storage.objects
for delete to authenticated using (bucket_id = 'store-assets' and private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION private.get_store_settings_admin()
RETURNS SETOF public.store_settings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select s.* from public.store_settings s
  where private.has_role(auth.uid(), 'admin'::app_role)
  limit 1
$$;
REVOKE ALL ON FUNCTION private.get_store_settings_admin() FROM public;
GRANT EXECUTE ON FUNCTION private.get_store_settings_admin() TO authenticated;
CREATE OR REPLACE FUNCTION public.get_store_settings_admin()
RETURNS SETOF public.store_settings
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  select * from private.get_store_settings_admin()
$$;
REVOKE ALL ON FUNCTION public.get_store_settings_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.get_store_settings_admin() TO authenticated;
REVOKE SELECT ON public.store_settings FROM anon, authenticated;

create or replace function private.get_store_settings_public()
returns table (
  id uuid, whatsapp_number text, hero_title text, hero_subtitle text, hero_image_url text,
  hero_cta_text text, store_address text, store_lat numeric, store_lng numeric, site_name text,
  logo_url text, favicon_url text, primary_color text, accent_color text, background_color text,
  foreground_color text, announcement_text text, announcement_enabled boolean, announcement_bg_color text,
  min_order_amount numeric, default_delivery_fee numeric, first_order_coupon_enabled boolean,
  first_order_coupon_code text, first_order_discount_percent numeric, hero_bg_image text,
  login_bg_pattern text, cart_empty_bg text, floating_element_image text,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    s.id, s.whatsapp_number, s.hero_title, s.hero_subtitle, s.hero_image_url,
    s.hero_cta_text, s.store_address, s.store_lat, s.store_lng, s.site_name,
    s.logo_url, s.favicon_url, s.primary_color, s.accent_color, s.background_color,
    s.foreground_color, s.announcement_text, s.announcement_enabled, s.announcement_bg_color,
    s.min_order_amount, s.default_delivery_fee, s.first_order_coupon_enabled,
    s.first_order_coupon_code, s.first_order_discount_percent::numeric, s.hero_bg_image,
    s.login_bg_pattern, s.cart_empty_bg, s.floating_element_image,
    s.created_at, s.updated_at
  from public.store_settings s
$$;
revoke all on function private.get_store_settings_public() from public;
grant execute on function private.get_store_settings_public() to anon, authenticated, service_role;
drop view if exists public.store_settings_public;
create view public.store_settings_public
with (security_invoker = true) as
  select * from private.get_store_settings_public();
grant select on public.store_settings_public to anon, authenticated, service_role;
drop policy if exists store_settings_admin_read on public.store_settings;
create policy store_settings_admin_read on public.store_settings
  for select to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role));
GRANT SELECT ON public.store_settings TO authenticated;

CREATE TABLE IF NOT EXISTS public.store_settings_pulse (
  id smallint PRIMARY KEY DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_settings_pulse_single_row CHECK (id = 1)
);
GRANT SELECT ON public.store_settings_pulse TO anon, authenticated;
GRANT ALL ON public.store_settings_pulse TO service_role;
ALTER TABLE public.store_settings_pulse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pulse public read" ON public.store_settings_pulse;
CREATE POLICY "pulse public read" ON public.store_settings_pulse
  FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.store_settings_pulse (id, updated_at) VALUES (1, now()) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION private.bump_store_settings_pulse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_settings_pulse (id, updated_at)
  VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET updated_at = now();
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS store_settings_pulse_trg ON public.store_settings;
CREATE TRIGGER store_settings_pulse_trg
AFTER INSERT OR UPDATE ON public.store_settings
FOR EACH STATEMENT EXECUTE FUNCTION private.bump_store_settings_pulse();
ALTER TABLE public.store_settings_pulse REPLICA IDENTITY FULL;
ALTER TABLE public.theme_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_settings_pulse') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings_pulse;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'theme_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.theme_settings;
  END IF;
END $$;
INSERT INTO public.categories (name, slug, icon, sort_order)
SELECT 'منظفات ومنزل', 'cleaning', '🧼', 6
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'cleaning');

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating numeric(2,1) NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooking_tip text,
ADD COLUMN IF NOT EXISTS is_top_seller boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS unit text;
CREATE OR REPLACE FUNCTION public.increment_product_views(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_product_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_views(uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.sync_product_reviews_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE target_id uuid; calc_count integer; calc_avg numeric(2,1);
BEGIN
  IF TG_OP = 'DELETE' THEN target_id := OLD.product_id; ELSE target_id := NEW.product_id; END IF;
  SELECT COUNT(*), COALESCE(ROUND(AVG(rating)::numeric, 1), 0.0) INTO calc_count, calc_avg
  FROM public.reviews WHERE product_id = target_id;
  UPDATE public.products SET reviews_count = calc_count, avg_rating = calc_avg WHERE id = target_id;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trigger_sync_product_reviews ON public.reviews;
CREATE TRIGGER trigger_sync_product_reviews
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_product_reviews_stats();
CREATE OR REPLACE FUNCTION public.sync_order_purchase_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE affected uuid;
BEGIN
  FOR affected IN
    SELECT DISTINCT (elem->>'id')::uuid
    FROM jsonb_array_elements(
      COALESCE(CASE WHEN TG_OP <> 'INSERT' THEN OLD.items END, '[]'::jsonb)
      || COALESCE(CASE WHEN TG_OP <> 'DELETE' THEN NEW.items END, '[]'::jsonb)
    ) AS elem
    WHERE (elem->>'id') ~ '^[0-9a-fA-F-]{36}$'
  LOOP
    UPDATE public.products p
    SET purchase_count = COALESCE((
      SELECT SUM(COALESCE((elem->>'quantity')::numeric, 1))::integer
      FROM public.orders o, jsonb_array_elements(o.items) AS elem
      WHERE (elem->>'id') = affected::text
    ), 0)
    WHERE p.id = affected;
  END LOOP;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trigger_sync_order_purchases ON public.orders;
CREATE TRIGGER trigger_sync_order_purchases
AFTER INSERT OR UPDATE OF items OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_purchase_stats();
REVOKE ALL ON FUNCTION public.sync_product_reviews_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_purchase_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
