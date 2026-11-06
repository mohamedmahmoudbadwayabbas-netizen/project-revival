
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  price_per_unit NUMERIC(10,2) NOT NULL,
  old_price NUMERIC(10,2),
  image_url TEXT,
  is_by_weight BOOLEAN NOT NULL DEFAULT false,
  unit_label TEXT NOT NULL DEFAULT 'قطعة',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_on_sale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_public_insert" ON public.orders FOR INSERT WITH CHECK (true);
-- Reads will be restricted to admins later; for now allow public read for dev mode admin panel
CREATE POLICY "orders_public_read_dev" ON public.orders FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Seed data
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('دواجن', 'poultry', '🍗', 1),
  ('لحوم', 'meat', '🥩', 2),
  ('عطارة', 'spices', '🌿', 3),
  ('بقالة', 'grocery', '🛒', 4),
  ('ألبان', 'dairy', '🥛', 5);

INSERT INTO public.products (name, category_id, description, price_per_unit, old_price, image_url, is_by_weight, unit_label, is_popular, is_on_sale)
SELECT 'صدور دجاج طازجة', id, 'صدور دجاج بلدي طازجة بدون عظم', 180.00, 220.00, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600', true, '1 كجم', true, true FROM public.categories WHERE slug='poultry';

INSERT INTO public.products (name, category_id, description, price_per_unit, image_url, is_by_weight, unit_label, is_popular)
SELECT 'لحم بقري مفروم', id, 'لحم بقري بلدي مفروم طازج', 360.00, 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600', true, '1 كجم', true FROM public.categories WHERE slug='meat';

INSERT INTO public.products (name, category_id, description, price_per_unit, image_url, is_by_weight, unit_label, is_on_sale, old_price)
SELECT 'كمون مطحون فاخر', id, 'كمون مطحون درجة أولى', 45.00, 'https://images.unsplash.com/photo-1599909533730-3781aff20889?w=600', true, '100 جرام', true, 60.00 FROM public.categories WHERE slug='spices';

INSERT INTO public.products (name, category_id, description, price_per_unit, image_url, unit_label, is_popular)
SELECT 'أرز مصري بسمتي', id, 'أرز مصري فاخر - كيس 5 كجم', 250.00, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600', 'كيس 5 كجم', true FROM public.categories WHERE slug='grocery';

INSERT INTO public.products (name, category_id, description, price_per_unit, image_url, unit_label, is_popular, is_on_sale, old_price)
SELECT 'جبنة بيضاء طازجة', id, 'جبنة بيضاء كاملة الدسم', 120.00, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600', 'علبة 500 جرام', true, true, 140.00 FROM public.categories WHERE slug='dairy';
