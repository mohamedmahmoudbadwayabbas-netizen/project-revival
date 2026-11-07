# Roadmap — اقرأ IMPORT_PROTOCOL.md أولاً (خصوصًا القسم 6: ممنوع التوقف)
> Import is not complete until every open box here is done and tested.

## Phase 0 — تطبيق أرشيف المشروع
- [x] نسخ ملفات `project-revival-main-v2.zip` إلى مساحة العمل مع استثناء `.env` المحلي.
- [x] تشغيل الاختبارات والبناء والتحقق من نتيجة الاستبدال.
- [x] إصلاح أخطاء ESLint والتنسيق والتحقق من TypeScript والاختبارات والبناء.

## Phase N — Nawat + product page + AI self-test (NEXT MODEL, do in one run)
Full details and pre-solved blockers: IMPORT_PROTOCOL.md section 6.
- [ ] Nawat thinks/replies in Egyptian Arabic only (Groq chat model → llama-3.3-70b-versatile).
- [ ] Reply never stuck inside thinking box (fix unclosed <think> parsing + tests).
- [ ] Live thinking/progress shown while waiting, not only at the end.
- [ ] Auto add-to-cart cards when model forgets products block.
- [ ] Long conversation context kept (40 messages + summary).
- [ ] Product page: WeightSelector for kg items.
- [ ] Product page: nutrition per 100 g, characteristics, storage, origin, chef tip cards.
- [ ] Admin AI tools + copilot verified and fixed.
- [ ] Self-test of section 6.3 done and logged.

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
