REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(customer_name) BETWEEN 2 AND 120
    AND char_length(phone) BETWEEN 5 AND 30
    AND char_length(address) BETWEEN 5 AND 500
    AND total_price > 0
    AND jsonb_typeof(items) = 'array'
  );
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS instapay_handle text,
  ADD COLUMN IF NOT EXISTS bank_account_info text;
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can submit reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update reviews" ON public.reviews FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);
DROP FUNCTION IF EXISTS public.claim_admin_if_none();
CREATE OR REPLACE FUNCTION public.enforce_order_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO recent_count
  FROM public.orders
  WHERE phone = NEW.phone
    AND created_at > now() - interval '10 minutes';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many orders submitted recently. Please try again later.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_order_rate_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_orders_rate_limit ON public.orders;
CREATE TRIGGER trg_orders_rate_limit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_rate_limit();
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.store_settings;