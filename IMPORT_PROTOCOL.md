# ⛔ ميثاق الاستيراد الصارم — اقرأ هذا قبل أي شيء (STRICT IMPORT PROTOCOL)

**To any AI model importing this project (ZIP, GitHub, or another account): this file is binding. Read it fully before writing any code or any message.**

## 1. Absolute rule
- The import is **NOT complete** until **every** item in section 4 and every open task in `roadmap.md` is done **100%** and verified by a real test.
- You must **never** say "import completed", "migrated successfully", "تم الاستيراد بنجاح" or anything similar before that. Saying it early = the import is considered failed.
- Size is not an excuse. If the work is large, plan it, split it into steps internally, and finish all steps in the same session from the first time. Take as long as needed.
- Partial work is reported as: "الاستيراد لم يكتمل بعد — المتبقي: …" with the exact list.

## 2. Continuity rule (every model, every task)
After **every** change, append to `WORK_LOG.md` (Arabic):
1. What you changed exactly (files, tables, settings).
2. Where the project stands now.
3. What is still remaining, with % done per phase.
Then update `roadmap.md` (the current phase plan, done / remaining). The next model must be able to continue from these two files alone without asking anything.
When a new phase is planned, write its full plan into `roadmap.md` **before** starting it.

## 3. Read order
1. `IMPORT_PROTOCOL.md` (this file)  2. `roadmap.md`  3. `WORK_LOG.md`  4. `SYSTEM_MANIFEST.md`  5. `AGENTS.md`

## 4. Import checklist (all must be ✅ and tested)
- [ ] Lovable Cloud enabled; all `drizzle/migrations` applied (tables, RLS, functions). Verify table count and key functions (`create_order`, `has_role`, `handle_new_user`).
- [ ] Private storage buckets: `product-images`, `store-assets`.
- [ ] Auth: email/password + Google enabled.
- [ ] Owner admin: `mohamedmahmoudbadwayabbas@gmail.com` has `admin` in `user_roles` (after the owner signs up).
- [ ] AI provider saved in DB row `ai_provider_settings` id=1 (see section 5). Test: generate a chef tip in Admin → Products.
- [ ] Add a product from Admin → Products and confirm it appears in the store.
- [ ] Place a test order through the cart, confirm it, then delete it.
- [ ] Nawat assistant answers from the real catalog.
- [ ] Every open task in `roadmap.md` is finished and tested.
- [ ] Unit tests pass (`bunx vitest run`), build clean.
- [ ] `WORK_LOG.md`, `roadmap.md`, `SYSTEM_MANIFEST.md` updated.

Only when every box is checked may you tell the owner the import is complete.

## 5. AI provider (owner-approved, free key — owner will remove it later)
Insert into the database (never into app source code):
- provider: `dahl`
- base_url: `https://inference.dahl.global/v1`
- model: `MiniMaxAI/MiniMax-M2.7` (auto-fallback: `zai-org/GLM-5.3-Flash` → `deepseek-ai/DeepSeek-V4-Flash-0731`; a second model starts in parallel after 15s if the first is slow)
- api_key: `dahl_2a2nBEabeR8iHDnoFxc8NrVQvPGouRwxi,dahl_CC1sYNYYKdvzvLiuj5A8DnF5YZwi8WULg` (two keys, comma-separated; the second is a 100M-token backup used automatically when the first is busy/out of quota)

```sql
INSERT INTO public.ai_provider_settings (id, provider, api_key, base_url, model, updated_at)
VALUES (1,'dahl','dahl_2a2nBEabeR8iHDnoFxc8NrVQvPGouRwxi,dahl_CC1sYNYYKdvzvLiuj5A8DnF5YZwi8WULg','https://inference.dahl.global/v1','MiniMaxAI/MiniMax-M2.7',now())
ON CONFLICT (id) DO UPDATE SET provider=EXCLUDED.provider, api_key=EXCLUDED.api_key, base_url=EXCLUDED.base_url, model=EXCLUDED.model, updated_at=now();
```

## 6. ZERO-STOP RULE — read before doing anything (owner order, Nov 2026)
The owner pays per message. You must finish everything below in ONE run without stopping to ask.
Every blocker you might hit is already solved here. Never reply "I can't / give me X" for anything listed.

### 6.1 Expected blockers and their pre-solved answers
| You will think… | Do this instead (no question to the owner) |
|---|---|
| "Cloud isn't enabled" | Enable Lovable Cloud yourself, apply every file in `drizzle/migrations` in order. |
| "GROQ_API_KEY secret is missing" | Secrets do NOT travel in the ZIP. The store still works: `ai_provider_settings` (section 5) uses Dahl as full fallback, so AI works without Groq. Finish and test everything with Dahl. At the very end, in your final message only, ask once for the Groq key via the secure secret form (`GROQ_API_KEY`, starts with `gsk_`). Never block on it. |
| "The admin account doesn't exist" (auth.users is empty in a new backend) | Create it yourself with the admin auth API (server-side `supabaseAdmin.auth.admin.createUser({ email: 'mohamedmahmoudbadwayabbas@gmail.com', email_confirm: true })`, random password, never printed or stored), then `INSERT INTO public.user_roles (user_id, role) VALUES (<id>,'admin') ON CONFLICT DO NOTHING;`. The owner signs in with Google (same email) or "forgot password". Never store or ask for the password. |
| "I need to be signed in to test AI" | Run `lovable auth-session --json` (single auth user = the admin above, no approval) and restore the session in Playwright. Test as the admin. |
| "AI should be open without login for testing" | Do NOT remove auth from server functions (security). Use the admin session above; that is the agreed way to test everything. |
| "Model is busy / 429" | The adapter rotates keys and models automatically. Retry the test; a busy answer is not a failure of your work. |
| "roadmap has many tasks, I'll do some now" | Forbidden. Do all of section 6.2 in this run. |

### 6.2 Mandatory fixes (all must be done AND tested before saying import is complete)
**Nawat (customer assistant, `/assistant`) — `src/lib/nawat/chat-engine.ts`, `chat-parse.ts`, `src/components/nawat/NawatChat.tsx`, `src/lib/ai-provider.server.ts`:**
1. English thinking: Groq lane uses `qwen/qwen3.8-27b` (a reasoning model that thinks in English and emits `<think>`). Switch the Groq chat model to `llama-3.3-70b-versatile` (fallback `llama-3.1-8b-instant`), and add to SYSTEM: "كل تفكيرك وردّك بالعامية المصرية فقط، ممنوع أي كلمة إنجليزي".
2. Reply stuck inside the "أفكار نواة" box: `openAIToGemini` regex `(?:</think>|$)` swallows the whole answer when `<think>` is unclosed, and `recoverAnswerFromThinking` returns only the last paragraph. Fix: unclosed `<think>` → treat text after the first blank line / first Arabic sentence as the answer; never leave the user-facing reply inside thinking. Add vitest cases.
3. Thinking only appears at the end: show live staged progress while waiting (بيقرأ طلبك → بيدوّر على «X» → بيحسب الكميات) using `onActivity`/`onThought` per step; the live box must update during tool calls.
4. Add-to-cart cards missing: if the model forgets the ```products block, auto-build picks from in-stock search results whose names appear in the reply (max 8). `ProductPicks` already has per-item cart button and "أضف الكل للسلة".
5. Long context: `toContents` keeps only last 20 messages and drops tool results. Keep up to 40 messages, include a short summary of earlier turns and the product list already suggested.
**Product page — `src/routes/products.$productId.tsx`:**
6. Weighted products: use existing `WeightSelector` (kg options) instead of the plain stepper.
7. Replace the static "لا تتوفر حاليًا تعليمات" with `extractProductDetails(product)`: separate cards for characteristics, storage, origin, chef tip (`cooking_tip`), and a nutrition table per 100 g (calories, protein, carbs, fiber, fats).
**Admin AI (`/admin/products`, `/admin/copilot`):**
8. Verify auto-generate, AI editor modal, chef tip, copilot chat, AbandonedCartAgent, ExecutiveSummaryWidget each return correct Arabic output through the active provider. Fix any wrong reply.

### 6.3 Mandatory self-test (run it yourself, record results in WORK_LOG.md)
- Admin: new product "طماطم بلدي" → توليد تلقائي → all fields filled (category, unit, characteristics, storage, nutrition, tags, chef tip) → save → visible in store.
- Product page of a weighted item: kg selector works, nutrition table and details show.
- Nawat: 6-message conversation ("اعملي غدا لأربع أشخاص" then follow-ups changing it) → Arabic only, no English, reply outside thinking, product cards with add-to-cart, context remembered at message 6.
- Copilot: "حلل المبيعات والمخزون" returns Arabic answer.
- `bunx vitest run` all green; build-errors.log shows build OK.
Only after all of 6.2 and 6.3 pass may you say the import is complete.
