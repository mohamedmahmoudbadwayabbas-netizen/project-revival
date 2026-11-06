-- Columns the app reads from the original live store, kept in sync with the existing ones.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS price numeric(10,2),
  ADD COLUMN IF NOT EXISTS original_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS images text[],
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1);
UPDATE public.products SET price = price_per_unit, original_price = old_price, stock = stock_quantity, rating = avg_rating;

CREATE OR REPLACE FUNCTION private.sync_product_compat()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.price_per_unit := COALESCE(NEW.price, NEW.price_per_unit);
    NEW.old_price := COALESCE(NEW.original_price, NEW.old_price);
    NEW.stock_quantity := COALESCE(NEW.stock, NEW.stock_quantity, 100);
  ELSE
    IF NEW.price IS DISTINCT FROM OLD.price THEN NEW.price_per_unit := NEW.price; END IF;
    IF NEW.original_price IS DISTINCT FROM OLD.original_price THEN NEW.old_price := NEW.original_price; END IF;
    IF NEW.stock IS DISTINCT FROM OLD.stock THEN NEW.stock_quantity := COALESCE(NEW.stock, 0); END IF;
  END IF;
  NEW.price := NEW.price_per_unit;
  NEW.original_price := NEW.old_price;
  NEW.stock := NEW.stock_quantity;
  NEW.rating := NEW.avg_rating;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_product_compat() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS products_sync_compat ON public.products;
CREATE TRIGGER products_sync_compat BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION private.sync_product_compat();

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_ar text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS shipping_address jsonb;
UPDATE public.orders SET total_amount = total_price;
CREATE OR REPLACE FUNCTION private.sync_order_compat()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.total_price := COALESCE(NEW.total_amount, NEW.total_price);
  ELSIF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.total_price := NEW.total_amount;
  END IF;
  NEW.total_amount := NEW.total_price;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_order_compat() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_sync_compat ON public.orders;
CREATE TRIGGER orders_sync_compat BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION private.sync_order_compat();

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION private.expand_order_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_items (order_id, product_id, quantity, price)
  SELECT NEW.id,
         CASE WHEN (e->>'id') ~ '^[0-9a-fA-F-]{36}$' AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = (e->>'id')::uuid) THEN (e->>'id')::uuid END,
         COALESCE((e->>'quantity')::numeric, 1),
         COALESCE((e->>'price_per_unit')::numeric, (e->>'price')::numeric, 0)
  FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) e;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.expand_order_items() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_expand_items ON public.orders;
CREATE TRIGGER orders_expand_items AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION private.expand_order_items();
