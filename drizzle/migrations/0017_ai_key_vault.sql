CREATE TABLE public.ai_key_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text,
  api_key text NOT NULL,
  base_url text,
  model text,
  priority integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cooling_down','exhausted','invalid','disabled')),
  cooldown_until timestamptz,
  last_error text,
  last_used_at timestamptz,
  total_requests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, api_key)
);
GRANT ALL ON public.ai_key_vault TO service_role;
ALTER TABLE public.ai_key_vault ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_key_vault_order_idx ON public.ai_key_vault (priority, created_at);
COMMENT ON TABLE public.ai_key_vault IS 'Unlimited AI key pool. Server-only (service_role); no client grants so keys never reach the browser. Keys are never auto-deleted: failures only change status/cooldown_until.';