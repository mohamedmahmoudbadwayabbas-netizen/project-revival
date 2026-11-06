ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_active IS TRUE);
CREATE POLICY products_admin_read_all
  ON public.products
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
