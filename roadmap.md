# Roadmap — اقرأ IMPORT_PROTOCOL.md أولاً (خصوصًا القسم 6: ممنوع التوقف)

> Import is not complete until every open box here is done and tested.

## Phase 0 — تطبيق أرشيف المشروع

- [x] نسخ ملفات `project-revival-main-v2.zip` إلى مساحة العمل مع استثناء `.env` المحلي.
- [x] تشغيل الاختبارات والبناء والتحقق من نتيجة الاستبدال.
- [x] إصلاح أخطاء ESLint والتنسيق والتحقق من TypeScript والاختبارات والبناء.

## Phase N — Nawat + product page + AI self-test

Full details and pre-solved blockers: IMPORT_PROTOCOL.md section 6.

- [x] Nawat Groq lane uses `llama-3.3-70b-versatile` with `llama-3.1-8b-instant` fallback and Arabic-only system policy.
- [x] Unclosed `<think>` parsing keeps the visible reply outside the thinking box; regression tests added.
- [x] Live staged activity labels are shown while the assistant is waiting and searching.
- [x] Product picks are recovered from in-stock catalog results when the model omits its products block.
- [x] Long context keeps 40 messages and summarizes earlier turns plus suggested products.
- [x] Product page uses `WeightSelector` for weighted items.
- [x] Product page shows nutrition per 100 g, characteristics, storage, origin, and chef tip cards.
- [ ] Admin AI tools + copilot verified and fixed.
- [ ] Self-test of section 6.3 done and logged.

## Waves 3–13 — Hypermarket roadmap

- [x] Smart Search, typo tolerance, Arabic normalization, synonyms, suggestions, and advanced filters are wired into the storefront.
- [x] Order management, realtime status updates, driver assignment, tracking view, and admin KPI dashboard exist.
- [x] Product management, bulk-oriented admin surfaces, low-stock/expiry alerts, picker/driver views, coupons, and substitutions exist in the current app.
- [x] Delivery slot selection is available in checkout (within two hours, today evening, or tomorrow morning) and is shown in admin orders.
- [ ] Bundles/mix-and-match: admin bundle management and cart eligibility preview are available; server-authoritative bundle pricing still needs RPC/schema work.
- [ ] Wallet/loyalty: customer tier dashboard, referral link, and wallet activation-state card are available; migration 0016 now provides the guarded wallet ledger primitive, while automatic cashback/referral rewards still need a separate approved workflow.
- [ ] Suppliers/purchase orders: replenishment suggestions and a descriptive demand/stock forecast are available from live data; supplier records and purchase-order workflow still need schema/RPC work. Multi-branch inventory and standalone mobile apps remain open.
- [ ] Picker/Driver apps: existing `/driver` portal and new `/picker` mobile-first screen are available as UI foundations; persistent tasks, aisle/bin data, barcode workflow, role enforcement, and native packaging require the import Schema contract.
- [x] Driver data integrity: removed hard-coded branch, address, support phone, and fallback customer coordinates; live map now requires persisted coordinates and active GPS.
- [x] Admin order operations: canonical status display with legacy compatibility, settings-backed receipts, real customer summaries, mobile action cards, and KPI counters.
- [ ] Multi-branch: `/admin/branches` now reads and manages persisted `branches` only; no delivery-zone or hard-coded branch fallback remains. Independent branch inventory and nearest-branch allocation still require `branches`/`branch_inventory` Schema and RPCs.

## Critical operations hardening

- [x] Atomic inventory reservation, coupon locking, and server-side promotion validation in migration 0016.
- [x] Driver role/profile/assignment contract and guarded `assign_driver` RPC in migration 0016.
- [x] Append-only wallet ledger primitive with idempotent admin posting in migration 0016.
- [x] Removed unsupported Gemini model IDs and unverified model fallback labels from the client.
- [ ] Apply migration 0016 in the target database and connect the admin assignment UI to `assign_driver`.

## Alwadi Assistant

- [x] Inline approval cards execute high-risk and destructive store tools after explicit admin confirmation.
- [x] Enabled `bulkPriceUpdate`, `manageUsersAndRoles`, `rollbackLastAction`, and `updateRawJsonMetadata` through the in-chat approval path.
- [x] Renamed misleading coupon and announcement tool names to match their real behavior.
- [x] Refreshed assistant typography, empty state, quick actions, and mobile approval presentation.
- [x] Rebranded the admin copilot as «نبراس» and completed the responsive visual redesign for desktop, tablet, and mobile.
- [x] Added the operational navigation rail and decision-review card treatment from the approved assistant direction.
- [x] Wired assistant shortcuts to live admin routes and populated executive KPIs from current Supabase orders and inventory.

## Phase A — AI unification + admin fixes

- [x] Dahl in DB, Groq primary via GROQ_API_KEY secret, shared generatePlainText, product copy for new products, save payload fixed, speed fixes.
- [ ] Image generator needs an image-capable key (Dahl/Groq are text-only).

## Phase B — Governance blueprint

- [ ] Nawat logging for guests.
- [ ] Executable keyword-add / reorder-threshold proposals with raw JSON before approval.
- [ ] Ops agent: COD reconciliation + delivery slot grouping (proposals only).
- [ ] Tests for proposal approve/reject permissions.

## Phase C — Data import

- [ ] Old products/categories/orders/customers exports, images.
- [x] تحديث شامل لتصميم المتجر وألوان الهايبر ماركت (الهاتف/التابلت/الكمبيوتر)
- [x] صقل هوية الهايبرماركت: tokens زمردية/ثلجية، بطاقات أقسام دائرية، وكبسولة موقع ووقت التوصيل في الهيدر.

## خزانة مفاتيح الذكاء
- [x] جدول ai_key_vault + محرك تبديل فوري + لوحة إدارة + توثيق
- [ ] إضافة مفاتيح Dahl (ينتظر المستخدم يلصقها في اللوحة)
- [ ] إظهار سلسلة تفكير نبراس + تعريب تفكير نواة
