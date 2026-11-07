# Elwadi — System Manifest

> ⛔ Before anything: read `IMPORT_PROTOCOL.md`. The import is not complete until its checklist is 100% done.

Read this first when opening the project in any Lovable account. It lists everything built so far and how to recreate it automatically.

## Rebuild on a new account

1. Enable Lovable Cloud.
2. Every file in `drizzle/migrations/` is applied in order (tables, functions, RLS policies, grants). Apply any pending ones with the migration tool — do not re-author them.
3. Recreate storage buckets (private): `product-images`, `store-assets`.
4. Enable auth providers: email/password, Google.
5. AI provider: Admin → Settings → AI. Choose preset **Dahl Inference**, the owner-approved key and SQL are in `IMPORT_PROTOCOL.md` §5 (stored in the `ai_provider_settings` row id=1, never in app code), save & test.
6. Optional: Google Maps key.

## AI provider and fallback

- Provider config: table `ai_provider_settings` (single row, admin-only, read server-side).
- Presets: `src/lib/ai-providers.ts`.
- Adapter + automatic failover: `src/lib/ai-provider.server.ts`
  - multiple keys in one field (newline/comma) rotate on quota/auth errors;
  - model failover on 404/408/429/5xx/network;
  - Dahl fallback order: last-working model → configured model → `MiniMaxAI/MiniMax-M2.7` → `zai-org/GLM-5.3-Flash` → `deepseek-ai/DeepSeek-V4-Flash-0731`; model_concurrency 429 skips the backup key and switches model; a parallel (hedged) model starts after 15s; overall deadline 75s (product copy 70s);
  - quota/auth problems create an admin alert in `ai_alerts`.

## Agent governance loop (blueprint §VI.6.3)

| Table                | Purpose                                                                 | Access                                          |
| -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| `agent_interactions` | one row per agent action: agent_type, tools_called, model_used, outcome | user inserts own; admin reads all               |
| `agent_feedback`     | rating / repeated question / admin override per interaction             | user inserts own; admin reads all               |
| `ai_proposals`       | improvement proposals with root_cause, raw_operation, risk_tier, status | admin only; status changes only by human review |

Rule: a proposal never changes live behavior until an admin approves it; the approval screen shows `raw_operation`, not the agent's own summary.

## Agents and tools

- Customer agent "Nawat": `src/lib/nawat/*`, `src/components/nawat/*`, routes `/assistant`.
- Admin Copilot: `src/routes/admin.copilot.tsx`, tool gateway `src/services/aiTools/*` (definitions, router, action gateway, planner).
- MCP server for external clients: `src/lib/mcp/*`, routes `/mcp`, `/.well-known/oauth-protected-resource`.

## Build order (blueprint §106)

Product page ✅ → Cart/Checkout ✅ → Admin agent governance (in progress) → Customer agent → Advanced AI.

## Change log

- Migration 0015: `orders.idempotency_key` + `create_order(..., p_idempotency_key)` overload (repeat key returns the existing order).
- Migration 0016: atomic inventory reservation and coupon redemption in `create_order`, driver profiles and assignments with `assign_driver`, and an immutable wallet ledger with `post_wallet_entry`.
- Migrated to a new Lovable account: migrations 0000-0015 applied, buckets recreated, email + Google sign-in enabled, OAuth server activated for MCP.
- Dahl Inference preset + live key configured; GLM and MiniMax verified responding, DeepSeek covered by failover.
- Migration 0013: `agent_interactions`, `agent_feedback`, `ai_proposals`.
- Admin governance screen `/admin/governance` (proposal review, agent stats). Work summary kept in `WORK_LOG.md`.

## Nawat logging

- `src/lib/nawat/agent-log.functions.ts`: `logNawatInteraction` (agent_type='nawat', outcome success|no_results|error) and `submitNawatFeedback` (rating 1/-1), both via requireSupabaseAuth + RLS. Called from `NawatChat.tsx` after each reply.

## Proposal generation (phase 2)

- Pure analyzer `src/lib/governance/analyze.ts` (tested): repeated empty searches → low-risk proposal; repeated negative feedback reasons → medium-risk proposal. Threshold MIN_REPEATS=2, window 30 days.
- `src/lib/governance/proposals.functions.ts` `generateProposals`: admin-checked via has_role, inserts pending rows with service role; dedupe via `raw_operation.dedupe_key` among pending proposals. Triggered by button on `/admin/governance`. Never applies anything.

## Backlog (not built yet)

- Streaming Nawat replies remain backlog; the current client now shows staged live activity while tools/model calls are pending, and safely recovers unclosed `<think>` responses.
- Phase 3: operations agent + delivery-support agent (proposal-only).
- Phase 4: server-side executor for approved proposals with audit log.
- Hypermarket expansion backlog: server-authoritative bundle pricing, real wallet/cashback ledger and referral attribution, suppliers/purchase orders, forecasting, multi-branch inventory, route optimization, and native mobile apps. The account page has a loyalty tier dashboard based on delivered orders and a referral-link preview, but no financial balance is created client-side. Admin bundle definitions are available at `/admin/bundles`; checkout previews active bundle eligibility and persists the selected bundle in order notes without applying an unverified client-side discount. Delivery slots are implemented in checkout and persisted in order notes for the current RPC schema.

## Import schema contract — operations and apps

The following database objects must be created by the import/migration tool before the operational workflows are declared complete. Do not replace these with browser-only state:

### Tables and columns

### Order status compatibility

The operational UI uses only this canonical order lifecycle:
`pending` (new) → `confirmed` (preparing) → `ready_for_delivery` (ready) →
`shipped` (on the way) → `delivered` (delivered), with `cancelled` terminal.
The import tool must preserve existing rows and map legacy `new` to `pending`,
`preparing` to `confirmed`, and `ready` to `ready_for_delivery` before adding
any database constraint or RPC transition validation. The admin UI also keeps
this mapping at read time so older rows remain visible during import.

All tables use `uuid` primary keys with `gen_random_uuid()` unless noted otherwise,
`timestamptz NOT NULL DEFAULT now()` for creation timestamps, and `updated_at`
triggers where records are editable. Foreign keys must use `ON DELETE RESTRICT`
for operational history; never delete products, suppliers, branches, or orders
that have historical movements.

| Table                  | Required columns and constraints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suppliers`            | `id`, `name text NOT NULL`, `code text UNIQUE`, `contact_name`, `phone`, `email`, `address`, `payment_terms_days int NOT NULL DEFAULT 0 CHECK >= 0`, `lead_time_days int NOT NULL DEFAULT 0 CHECK >= 0`, `is_active boolean NOT NULL DEFAULT true`, `notes`, `created_by`, `created_at`, `updated_at`                                                                                                                                                                                                                                                |
| `supplier_products`    | `id`, `supplier_id FK suppliers`, `product_id FK products`, `supplier_sku`, `unit_cost numeric(12,2) NOT NULL CHECK >= 0`, `currency text NOT NULL DEFAULT 'EGP'`, `minimum_order_quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK > 0`, `is_preferred boolean NOT NULL DEFAULT false`, `created_at`, `updated_at`; unique `(supplier_id, product_id)`                                                                                                                                                                                                |
| `purchase_orders`      | `id`, `order_number text UNIQUE NOT NULL`, `supplier_id FK suppliers RESTRICT`, `branch_id FK branches RESTRICT`, `status text NOT NULL CHECK IN ('draft','approved','ordered','partially_received','received','cancelled')`, `requested_by`, `approved_by`, `ordered_at`, `expected_at`, `subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK >= 0`, `tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK >= 0`, `total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK >= 0`, `idempotency_key text UNIQUE`, `notes`, `created_at`, `updated_at`           |
| `purchase_order_items` | `id`, `purchase_order_id FK purchase_orders CASCADE`, `product_id FK products RESTRICT`, `supplier_product_id FK supplier_products`, `ordered_quantity numeric(12,3) NOT NULL CHECK > 0`, `received_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `unit_cost numeric(12,2) NOT NULL CHECK >= 0`, `tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK >= 0`, `line_total numeric(12,2) NOT NULL CHECK >= 0`, `created_at`, `updated_at`; received quantity may not exceed ordered quantity except through an audited adjustment                  |
| `goods_receipts`       | `id`, `receipt_number text UNIQUE NOT NULL`, `purchase_order_id FK purchase_orders RESTRICT`, `branch_id FK branches RESTRICT`, `received_by FK auth.users`, `supplier_document_number`, `received_at timestamptz NOT NULL DEFAULT now()`, `status text NOT NULL CHECK IN ('draft','posted','cancelled')`, `idempotency_key text UNIQUE`, `notes`, `created_at`                                                                                                                                                                                      |
| `goods_receipt_items`  | `id`, `receipt_id FK goods_receipts CASCADE`, `purchase_order_item_id FK purchase_order_items RESTRICT`, `product_id FK products RESTRICT`, `received_quantity numeric(12,3) NOT NULL CHECK >= 0`, `damaged_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `batch_number`, `expires_at date`, `notes`, `created_at`; received plus damaged quantity cannot exceed the remaining ordered quantity                                                                                                                                             |
| `inventory_movements`  | `id`, `product_id FK products RESTRICT`, `order_id FK orders RESTRICT`, `movement_type text CHECK IN ('sale','return','adjustment')`, `quantity numeric(12,3) NOT NULL CHECK <> 0`, `stock_before numeric(12,3) NOT NULL`, `stock_after numeric(12,3) NOT NULL`, `performed_by FK auth.users`, `created_at`; immutable after insert. This migration records unified product stock; branch inventory remains a separate future contract. |
| `branches`             | `id`, `name text NOT NULL`, `name_en`, `city`, `governorate`, `address`, `phone`, `latitude numeric(9,6)`, `longitude numeric(9,6)`, `status text NOT NULL DEFAULT 'closed' CHECK IN ('open','busy','closed')`, `is_main boolean NOT NULL DEFAULT false`, `is_active boolean NOT NULL DEFAULT true`, `delivery_zones jsonb NOT NULL DEFAULT '[]'`, `estimated_minutes int CHECK >= 0`, `fee numeric(12,2) CHECK >= 0`, `min_order_amount numeric(12,2) CHECK >= 0`, `created_at`, `updated_at`; no seed rows unless explicitly supplied by the owner |
| `branch_inventory`     | `id`, `branch_id FK branches CASCADE`, `product_id FK products RESTRICT`, `stock numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `safety_stock numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `reorder_point numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `aisle`, `bin`, `barcode`, `updated_at`; unique `(branch_id, product_id)` and indexed `(branch_id, stock, reorder_point)`                                                                                                                                                                    |
| `driver_assignments`   | `id`, `order_id FK orders RESTRICT UNIQUE`, `branch_id FK branches RESTRICT`, `driver_id FK auth.users`, `status text CHECK IN ('assigned','accepted','picked_up','on_the_way','arrived','delivered','failed','cancelled')`, `assigned_by`, `assigned_at`, `accepted_at`, `started_at`, `delivered_at`, `route_metadata jsonb`, `created_at`, `updated_at`                                                                                                                                                                                           |
| `picker_tasks`         | `id`, `order_id FK orders RESTRICT UNIQUE`, `branch_id FK branches RESTRICT`, `picker_id FK auth.users`, `status text CHECK IN ('queued','assigned','in_progress','completed','blocked','cancelled')`, `priority int NOT NULL DEFAULT 0`, `assigned_at`, `started_at`, `completed_at`, `created_at`, `updated_at`                                                                                                                                                                                                                                    |
| `picker_task_items`    | `id`, `task_id FK picker_tasks CASCADE`, `order_item_id FK order_items RESTRICT`, `product_id FK products RESTRICT`, `required_quantity numeric(12,3) NOT NULL CHECK > 0`, `picked_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `short_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK >= 0`, `aisle`, `bin`, `barcode`, `substitution_product_id FK products`, `status text CHECK IN ('pending','picked','short','substituted')`; picked plus short quantity cannot exceed required quantity                                              |
| `audit_logs`           | `id`, `actor_id FK auth.users`, `actor_role`, `action text NOT NULL`, `entity_type text NOT NULL`, `entity_id uuid`, `before_data jsonb`, `after_data jsonb`, `request_id`, `created_at`; append-only                                                                                                                                                                                                                                                                                                                                                |

### Critical operations contract (migration 0016)

- `create_order` locks each product row before validating and reserving stock, updates both compatibility stock columns, and inserts `inventory_movements` in the same transaction.
- Coupon validation, usage increment, and `coupon_redemptions` insertion are transactional and protected by a coupon row lock.
- A driver must have both the `driver` role and an active `driver_profiles` row. Staff/admin assignment is performed through `assign_driver`.
- `wallet_ledger` is append-only from clients. Credits, debits, cashback, refunds, and adjustments are posted through the admin-only `post_wallet_entry` RPC with an idempotency key.                                                                                                                                                                                                                                                                                                                                                |

### Required indexes

- `supplier_products(supplier_id, product_id)` unique and `supplier_products(product_id, is_preferred)`.
- `purchase_orders(supplier_id, status, created_at)` and `purchase_orders(branch_id, status, created_at)`.
- `purchase_order_items(purchase_order_id)` and `goods_receipt_items(receipt_id)`.
- `inventory_movements(branch_id, product_id, created_at DESC)`.
- `branch_inventory(branch_id, product_id)` unique and `branch_inventory(branch_id, reorder_point, stock)`.
- `driver_assignments(driver_id, status)` and `picker_tasks(picker_id, status)`.
- `audit_logs(entity_type, entity_id, created_at DESC)` and `audit_logs(actor_id, created_at DESC)`.

Required server-side operations/RPCs:

Use typed parameters and return the affected record plus its new status:

- `create_purchase_order(p_supplier_id, p_branch_id, p_items jsonb, p_idempotency_key, p_notes)` validates the supplier, branch, products, preferred cost, quantities and idempotency.
- `approve_purchase_order(p_purchase_order_id)` transitions only `draft` orders and records the authenticated approver.
- `mark_purchase_order_ordered(p_purchase_order_id, p_expected_at)` transitions only `approved` orders.
- `receive_purchase_order(p_purchase_order_id, p_receipt jsonb, p_idempotency_key)` atomically creates receipt rows, updates received quantities, writes inventory movements and updates branch stock; repeated receipt keys return the original receipt.
- `assign_driver(p_order_id, p_driver_id, p_branch_id)` and `assign_picker(p_order_id, p_picker_id, p_branch_id)` enforce staff role, active user, branch access and one active assignment per order.
- `update_picker_item(p_task_item_id, p_picked_quantity, p_short_quantity, p_substitution_product_id)` validates quantities and updates the task status.
- `record_delivery_proof(p_assignment_id, p_proof jsonb)` stores proof metadata and transitions the order safely; it must not accept arbitrary customer/order IDs from the browser.
- `allocate_order_branch(p_order_id, p_branch_id)` verifies branch inventory and locks the allocation before picking.

RPCs must be `SECURITY DEFINER`, set a safe `search_path`, check the authenticated role
inside the function, lock affected rows with `FOR UPDATE`, and return explicit errors
for invalid transitions. No browser client may update `stock`, `received_quantity`,
assignment status, or order status directly.

### RLS and role matrix

- Customers: read only their own orders, addresses and delivery status; no access to suppliers, purchase orders, receipts, internal inventory, picker tasks, driver assignments, or audit logs.
- Pickers: read assigned picker tasks and their branch's `branch_inventory`; update task items only through `update_picker_item`.
- Drivers: read assigned delivery assignments and the linked order's delivery fields; update delivery state and proof only through the delivery RPC.
- Staff/managers: read operational records for assigned branches; create and approve purchase orders according to role; never bypass immutable movement and audit history.
- Admins: full operational access through audited server-side actions, including branch and supplier management.
- Service role: migration/import only; never expose its key to browser code.

Enable RLS on every new table. Branch-scoped policies must use a server-side
`has_branch_access(auth.uid(), branch_id)` check; do not trust a branch ID supplied
by the client. Add policies for `SELECT` separately from mutation policies, and
deny public/anonymous access by default.

Important: `delivery_zones` are delivery coverage records, not physical branches. The application must
never synthesize a branch from a zone or from hard-coded store data. Until `branches` exists and has
rows, branch selectors and branch dashboards must show an explicit empty state.
The driver portal must likewise use the authenticated driver's profile and persisted
assignment/branch/customer coordinates. It must not contain fallback names, phone
numbers, addresses, or coordinates; without those values it must show an explicit
missing-data state.
Driver assignment lists must come from authenticated staff/driver records and
`driver_assignments`; never seed demo drivers or phone numbers in the client.
The current role enum contains `admin`, `staff`, and `user`; the import tool must
either add a dedicated `driver` role with its RLS rules or create an explicit
driver profile/source table before enabling assignment. Do not infer driver
eligibility from `staff` alone.

Required invariants: all stock changes happen server-side, received quantity cannot exceed the remaining quantity without an explicit adjustment, financial totals are authoritative on the server, and every transition is audited. RLS must scope staff access by role and branch; customers must never read supplier, purchase-order, or internal inventory data.

## AI engine (current)

- Primary: Groq via project secret `GROQ_API_KEY` (OpenAI-compatible, `https://api.groq.com/openai/v1`). Chat model must be `llama-3.3-70b-versatile` (fallback `llama-3.1-8b-instant`); reasoning models (qwen) think in English — avoid for Nawat.
- Fallback: Dahl from `ai_provider_settings` row id=1 (two keys comma-separated; SQL in IMPORT_PROTOCOL.md §5). If `GROQ_API_KEY` is absent the store runs fully on Dahl.
- Secrets never travel in a ZIP: on a new account, finish all work on Dahl, then ask the owner once for `GROQ_API_KEY` in the final message.

## Owner admin

- Owner account: mohamedmahmoudbadwayabbas@gmail.com gets role `admin` in `user_roles`. On a new account where the user doesn't exist: create it server-side with `auth.admin.createUser({ email, email_confirm: true })` (random password, never printed), insert the admin role, owner signs in with Google or "forgot password". Passwords are never stored in the repo.

## Operations & Delivery agents (Phase 3) + governed execution (Phase 4)

- `src/lib/governance/ops-analyze.ts` (pure, tested) — agent_type `operations` / `delivery`; thresholds: pending ≥24h, shipped ≥6h, stock ≤ low_stock_threshold.
- `generateOpsProposals` and `reviewProposal` in `src/lib/governance/proposals.functions.ts` (admin-only). Only ops in `EXECUTABLE_OPS` (`deactivate_product`) run after approval; status becomes `executed`/`failed` with `raw_operation.execution` audit. No new tables.

## Planned: Data Copilot agent (not built yet)

- Admin-only natural-language data assistant on /admin/database. Reads run immediately via whitelisted server-side tools; writes/deletes are staged as previews (affected rows) and run only after explicit admin approval, logged to agent_interactions / ai_proposals. Never raw SQL from the model; no schema changes.

- 2026-11-05: added `generatePlainText` (ai-provider.server.ts) and `generateProductCopy` server fn; product advice now uses the active provider.
- 2026-11-07: Nawat Groq lane switched to Arabic chat models, unclosed thinking recovery and automatic product-pick recovery added; weighted product details now use WeightSelector and structured metadata cards.
- 2026-11-07: delivery slot selection added to checkout and surfaced in admin order lists without requiring a schema migration.
- 2026-11-07: added admin Mix & Match bundle CRUD using the existing `product_bundles` table; checkout pricing remains intentionally pending server-side RPC support.
- 2026-11-07: added active bundle eligibility and estimated-saving calculations to checkout with unit tests; client totals remain unchanged until server-side pricing is available.
- 2026-11-07: added the account loyalty tier dashboard and referral-link preview; wallet/cashback/referral accounting remains server-side backlog.
