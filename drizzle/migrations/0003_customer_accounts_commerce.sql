ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS site_name text DEFAULT 'الوادي الأخضر',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#166534',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#ea580c',
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#fafaf7',
  ADD COLUMN IF NOT EXISTS foreground_color text DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Tajawal',
  ADD COLUMN IF NOT EXISTS announcement_text text DEFAULT 'شحن مجاني فوق ٣٠٠ ج.م | توصيل سريع خلال ٤٥ دقيقة ⚡ | الدفع عند الاستلام ✓',
  ADD COLUMN IF NOT EXISTS announcement_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcement_bg_color text DEFAULT '#166534',
  ADD COLUMN IF NOT EXISTS ga4_id text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS min_order_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_delivery_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dark_mode_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_order_coupon_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_order_coupon_code text,
  ADD COLUMN IF NOT EXISTS first_order_discount_percent int DEFAULT 10;
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  birth_date date,
  avatar_url text,
  is_blocked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  full_name text NOT NULL,
  phone text NOT NULL,
  area text,
  street text NOT NULL,
  building text,
  apartment text,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view addresses" ON public.addresses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recently viewed" ON public.recently_viewed FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_uses int,
  uses_count int DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  first_order_only boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active coupons readable" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text,
  order_id uuid,
  discount_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  estimated_minutes int DEFAULT 45,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active zones readable" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage zones" ON public.delivery_zones FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_hour int NOT NULL,
  end_hour int NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_slots TO anon, authenticated;
GRANT ALL ON public.delivery_slots TO service_role;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active slots readable" ON public.delivery_slots FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage slots" ON public.delivery_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE IF NOT EXISTS public.product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  buy_quantity int NOT NULL DEFAULT 3,
  pay_quantity int NOT NULL DEFAULT 2,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_bundles TO anon, authenticated;
GRANT ALL ON public.product_bundles TO service_role;
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active bundles readable" ON public.product_bundles FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage bundles" ON public.product_bundles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bundles_updated BEFORE UPDATE ON public.product_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.flash_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  banner_image_url text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  discount_percent int NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flash_offers TO anon, authenticated;
GRANT ALL ON public.flash_offers TO service_role;
ALTER TABLE public.flash_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active offers readable" ON public.flash_offers FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage offers" ON public.flash_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text,
  cart_data jsonb NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  reminded_at timestamptz,
  recovered boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.abandoned_carts TO anon, authenticated;
GRANT ALL ON public.abandoned_carts TO service_role;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own abandoned" ON public.abandoned_carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view abandoned" ON public.abandoned_carts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER abandoned_updated BEFORE UPDATE ON public.abandoned_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own returns" ON public.returns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create returns" ON public.returns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage returns" ON public.returns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER returns_updated BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info',
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mark own read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_slot text,
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS tracking_token text UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  ADD COLUMN IF NOT EXISTS ref_source text;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';
INSERT INTO public.delivery_zones (name, fee, estimated_minutes, sort_order)
SELECT * FROM (VALUES
  ('داخل المدينة', 20, 45, 1),
  ('الضواحي', 35, 60, 2),
  ('خارج المدينة', 50, 90, 3)
) AS v(name, fee, estimated_minutes, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_zones);
INSERT INTO public.delivery_slots (label, start_hour, end_hour, sort_order)
SELECT * FROM (VALUES
  ('صباحاً (9 - 12)', 9, 12, 1),
  ('ظهراً (12 - 3)', 12, 15, 2),
  ('عصراً (3 - 6)', 15, 18, 3),
  ('مساءً (6 - 9)', 18, 21, 4)
) AS v(label, start_hour, end_hour, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_slots);
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_offers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.flash_offers REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_bg_image text,
  ADD COLUMN IF NOT EXISTS login_bg_pattern text,
  ADD COLUMN IF NOT EXISTS cart_empty_bg text,
  ADD COLUMN IF NOT EXISTS floating_element_image text;
