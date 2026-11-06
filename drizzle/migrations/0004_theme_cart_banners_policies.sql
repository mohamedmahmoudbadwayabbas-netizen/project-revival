CREATE TABLE public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marble_bg_url text,
  dark_marble_bg_url text,
  primary_hex text NOT NULL DEFAULT '#036233',
  accent_hex text NOT NULL DEFAULT '#E85D2F',
  card_radius_px int NOT NULL DEFAULT 24,
  hero_grid_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  hero_title text DEFAULT 'الوادي الأخضر',
  hero_subtitle text DEFAULT 'سوبر ماركت وعطارة - أفضل أنواع الاختيارات وتوصيل سريع مباشر لباب بيتك',
  hero_cta_text text DEFAULT 'تسوّق الآن',
  auth_bg_url text,
  cart_empty_bg_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theme_settings TO anon, authenticated;
GRANT ALL ON public.theme_settings TO service_role;
GRANT UPDATE, INSERT, DELETE ON public.theme_settings TO authenticated;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "theme readable by all" ON public.theme_settings FOR SELECT USING (true);
CREATE POLICY "theme admin insert" ON public.theme_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "theme admin update" ON public.theme_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "theme admin delete" ON public.theme_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER theme_settings_updated_at BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.theme_settings (
  marble_bg_url, dark_marble_bg_url, primary_hex, accent_hex, card_radius_px,
  hero_grid_images, hero_title, hero_subtitle, hero_cta_text
) VALUES (
  'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1600&q=80',
  'https://images.unsplash.com/photo-1604147495798-57beb5d6af73?w=1600&q=80',
  '#036233', '#E85D2F', 24,
  '["https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80","https://images.unsplash.com/photo-1452251889946-8ff5ea7b27ab?w=800&q=80","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80","https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80"]'::jsonb,
  'الوادي الأخضر',
  'سوبر ماركت وعطارة - أفضل أنواع الاختيارات وتوصيل سريع مباشر لباب بيتك',
  'تسوّق الآن'
);
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own cart" ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "orders_user_read_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "orders_user_cancel_own"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status NOT IN ('shipped', 'completed', 'cancelled', 'delivered', 'delivering')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'cancelled'
  );
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
CREATE POLICY "Authenticated users can submit their own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  cta_text text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hero_banners TO authenticated;
GRANT ALL ON public.hero_banners TO service_role;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_banners_public_read" ON public.hero_banners FOR SELECT USING (true);
CREATE POLICY "hero_banners_admin_insert" ON public.hero_banners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "hero_banners_admin_update" ON public.hero_banners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "hero_banners_admin_delete" ON public.hero_banners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER trg_hero_banners_updated_at BEFORE UPDATE ON public.hero_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "store_assets_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "store_assets_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'store-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "store_assets_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'store-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "store_assets_read_all" ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');
GRANT DELETE ON public.profiles TO authenticated;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own addr all" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT UPDATE ON public.wishlists TO authenticated;
CREATE POLICY "own wish all" ON public.wishlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "banners public read" ON public.hero_banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "banners admin write" ON public.hero_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "theme public read" ON public.theme_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "theme admin write" ON public.theme_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
CREATE POLICY "coupons public read" ON public.coupons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "coupons admin write" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
CREATE POLICY "zones public read" ON public.delivery_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "zones admin write" ON public.delivery_zones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
