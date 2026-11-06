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
| Table | Purpose | Access |
|---|---|---|
| `agent_interactions` | one row per agent action: agent_type, tools_called, model_used, outcome | user inserts own; admin reads all |
| `agent_feedback` | rating / repeated question / admin override per interaction | user inserts own; admin reads all |
| `ai_proposals` | improvement proposals with root_cause, raw_operation, risk_tier, status | admin only; status changes only by human review |

Rule: a proposal never changes live behavior until an admin approves it; the approval screen shows `raw_operation`, not the agent's own summary.

## Agents and tools
- Customer agent "Nawat": `src/lib/nawat/*`, `src/components/nawat/*`, routes `/assistant`.
- Admin Copilot: `src/routes/admin.copilot.tsx`, tool gateway `src/services/aiTools/*` (definitions, router, action gateway, planner).
- MCP server for external clients: `src/lib/mcp/*`, routes `/mcp`, `/.well-known/oauth-protected-resource`.

## Build order (blueprint §106)
Product page ✅ → Cart/Checkout ✅ → Admin agent governance (in progress) → Customer agent → Advanced AI.

## Change log
- Migration 0015: `orders.idempotency_key` + `create_order(..., p_idempotency_key)` overload (repeat key returns the existing order).
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
- Streaming Nawat replies + live thinking: provider `stream: true`, server route under src/routes/api emitting SSE, incremental `<think>` parsing in the client.
- Phase 3: operations agent + delivery-support agent (proposal-only).
- Phase 4: server-side executor for approved proposals with audit log.

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
