# Full Architecture & Production Audit

تاريخ التدقيق: 2026-11-07  
القرار الحالي قبل هذه الجولة: **NO-GO ❌**

## 1. نطاق الفحص

تم فحص:

- جميع المسارات في `src/routes/`.
- خدمات الطلبات، الذكاء الاصطناعي، المصادقة، الأدوات الإدارية، والفروع.
- مكونات المتجر والسائق وPicker.
- جميع migrations في `drizzle/migrations/`.
- سياسات RLS، دوال RPC، القيود، التخزين، ومصادر البيانات الثابتة.
- نتائج TypeScript وESLint والاختبارات وdiff whitespace.

## 2. المشاكل الحرجة

| # | الملف/النطاق | المشكلة | الأثر | الإجراء |
|---|---|---|---|---|
| 1 | `drizzle/migrations/0000_initial_store_schema.sql` | بيانات seed لأقسام ومنتجات وصور داخل migration الإنتاجية | قد يظهر كتالوج غير مملوك للمتجر بعد الاستيراد | تنظيف/تعطيل seed عبر أداة قاعدة البيانات قبل الإطلاق؛ لا تُعدّل migration مطبقة |
| 2 | `drizzle/migrations/0016_critical_operations_hardening.sql` | `create_order` كان لا يخصم المخزون ذرياً | تم إضافة `FOR UPDATE`، فحص المخزون، الخصم، وسجل `inventory_movements` داخل المعاملة؛ يلزم تطبيق migration والتحقق في البيئة |
| 3 | `drizzle/migrations/0016_critical_operations_hardening.sql` | الإسناد لم يكن يملك عقداً تشغيلياً حقيقياً | تم إنشاء role/profile/assignment وRPC `assign_driver` مع RLS؛ ربط واجهة الإدارة بالـRPC خارج نطاق هذه الجولة |
| 4 | `src/routes/admin.settings.tsx`, `src/routes/__root.tsx` | هوية متجر افتراضية كانت معروضة دون إعدادات قاعدة البيانات | تضليل العميل وإيصالات/metadata باسم غير مؤكد | أزيلت القيم التشغيلية الافتراضية؛ ما زالت بعض النصوص القديمة مفتوحة |

## 3. مشاكل عالية

| # | المجال | الملاحظة |
|---|---|---|
| 1 | Order lifecycle | توجد توافقات قراءة للحالات القديمة في الواجهة، لكن constraint/RPC مركزي للمسار canonical يحتاج أن تنشئه أداة الاستيراد. |
| 2 | Financial integrity | الكوبونات أصبحت مقفلة وذات redemption داخل المعاملة، وأضيف wallet ledger؛ الباقات لا تطبق تسعيراً خادمياً بعد. |
| 3 | Inventory | الخصم الذري للمخزون الموحد أصبح موثقاً في migration 0016؛ مخزون الفروع ما زال خارج هذا النطاق. |
| 4 | Driver/Picker | `/driver` و`/picker` واجهات تأسيسية؛ المهام الدائمة، الأدوار، المواقع، والبدائل تحتاج الجداول الموثقة. |
| 5 | Store identity | أجزاء من storefront وmetadata ما زالت تستخدم اسم المتجر الثابت بدلاً من `store_settings_public`. |
| 6 | AI transparency | أزيلت معرفات Gemini المستقبلية غير الموثوقة وسلسلة fallback غير المضمونة؛ الإعدادات المخزنة في قاعدة البيانات تبقى مصدر النموذج الفعلي. |
| 7 | Permissions | RLS الأساسي للطلبات مقيد بعد migrations hardening، لكن تحديث الحالة المباشر من العميل يحتاج RPC وانتقالات مسموحة وسجل تدقيق حتى لا تتحول الصلاحية إلى تعديل حالة عام. |

## 4. مشاكل متوسطة ودين تقني

- وجود `any` في طبقات Supabase وAI يقلل ضمانات النوع.
- عمليات الإدارة كثيرة تعتمد على `useEffect` وجلب client-side بدلاً من React Query موحد مع invalidation.
- بعض التحليلات تعالج الطلبات والأصناف في العميل؛ يلزم aggregation/RPC عند زيادة الحجم.
- وجود `admin-lux` وtokens قديمة في CSS رغم توحيد جزء من الهوية.
- رسائل `console.warn/error` موزعة؛ بعضها مقصود لمسار الأخطاء، لكن يلزم logger موحد وإخفاء التفاصيل الحساسة في الإنتاج.
- `theme_settings` و`store_settings` يملكان تداخلاً تاريخياً يحتاج مصدراً واحداً للحقيقة.

## 5. تقييم الميزات

| الميزة | الحالة |
|---|---|
| Guest Cart | Implemented |
| Buy Again | Partial |
| Favorites | Implemented |
| Shopping Lists | Missing |
| Smart Search | Implemented |
| Delivery Slots | Partial (محفوظة في notes حتى دعم schema/RPC) |
| Product Substitutions | Partial |
| Driver Management | Partial |
| Picker View | Partial |
| Loyalty | Partial |
| Wallet/Cashback | Partial، لا يوجد ledger مالي حقيقي |
| Promotions/Coupons | Partial |
| Inventory | Partial |
| Analytics | Partial |
| Multi Branch | Partial |

## 6. الأمن والصلاحيات

الإيجابيات:

- وجود `has_role` وRLS للطلبات والمنتجات والإعدادات.
- فصل دوال `private` الحساسة خلف wrappers عامة.
- حوكمة AI تعتمد الموافقة قبل العمليات التنفيذية وتحتفظ بالعملية الخام.
- التخزين الخاص موثق في عقد الاستيراد.

المخاطر:

- صلاحية تحديث الطلب مباشرة من العميل أوسع من انتقالات الحالة المطلوبة.
- إنشاء الطلب العام يحتاج ربطاً أوضح بين الهوية والـ guest flow مع rate limit ومخزون ذري.
- يجب التأكد من أن كل جداول العمليات الجديدة لها RLS مطابق للفرع والدور قبل تفعيل الواجهات.

## 7. الأداء وقابلية التوسع

- لا يوجد دليل على N+1 حرج في المسار الأساسي؛ جلب الطلبات والعناصر يتم على دفعات.
- التحليلات والتنبؤات تعالج بيانات كثيرة في المتصفح، وهذا غير مناسب لمخزن متعدد الفروع.
- يلزم فهارس على `orders(status, created_at)`, `orders(user_id, created_at)`,
  `order_items(order_id)`, والمخزون حسب الفرع.
- Realtime يعيد جلب الطلبات كاملة عند INSERT، وهو مقبول لحجم صغير لكنه يحتاج invalidation محدوداً عند التوسع.

## 8. Top 20 fixes by impact

1. إزالة seed الإنتاج من import وتنظيف الصفوف الحالية.
2. تنفيذ خصم المخزون الذري داخل `create_order`.
3. إنشاء `inventory_movements` وسجل الحجز/الإلغاء/المرتجع.
4. إنشاء `driver_profiles`/دور `driver` و`driver_assignments`.
5. إنشاء RPC `assign_driver` مع RLS وسجل تدقيق.
6. إنشاء `picker_tasks` وحفظ تقدم الجمع.
7. إضافة canonical order status constraint وRPC transitions.
8. توحيد تسعير bundles server-side.
9. إنشاء wallet ledger وcashback/referral attribution.
10. ربط `branch_inventory` بالفرع الأقرب وتخصيص الطلب.
11. إزالة كل metadata والرسائل الثابتة الخاصة باسم المتجر.
12. جعل AI model label يطابق provider/model الفعلي من الإعدادات.
13. توحيد مصدر الحقيقة بين `theme_settings` و`store_settings`.
14. إضافة refund/cancellation financial ledger.
15. إضافة idempotency لكل عمليات الشراء والاستلام والتعيين.
16. إضافة audit log لكل تغيير حالة/سعر/مخزون/صلاحية.
17. نقل aggregation الثقيلة إلى RPC أو materialized views.
18. إضافة اختبارات RLS للعميل والموظف والسائق والمدير.
19. إزالة `any` من RPCs وطبقات Supabase الحرجة.
20. اختبار E2E للطلب من guest cart حتى التسليم والفشل والإلغاء.

## 9. Scorecard

| المحور | التقييم |
|---|---:|
| Architecture | 6/10 |
| Database | 5/10 |
| Security | 6/10 |
| Orders | 6/10 |
| Inventory | 3/10 |
| Delivery | 4/10 |
| Operations | 5/10 |
| Admin UI | 7/10 |
| Customer Experience | 7/10 |
| Mobile Experience | 6/10 |
| Quick Commerce Readiness | 4/10 |
| Hypermarket Readiness | 4/10 |
| Production Readiness | 4/10 |
| Scalability Readiness | 4/10 |
| No-Fake-Data Compliance | 6/10 بعد الإصلاحات الحالية |

## 10. الإصلاحات المنفذة في هذه الجولة

- إزالة `auto-seed` واستدعائه من التطبيق.
- إزالة الاسم والواتساب والعنوان والإحداثيات الافتراضية من إعدادات الإدارة.
- إزالة رسالة «محادثة واتساب التجريبية».
- جعل metadata العامة محايدة عند غياب إعدادات المتجر.
- توثيق المخاطر والبنود التي تحتاج أداة قاعدة البيانات.

## 11. التحقق

- TypeScript: ناجح.
- ESLint للملفات المعدلة: ناجح دون أخطاء، مع تحذيرات `any` موجودة مسبقاً.
- Vitest: 51/51 ناجحة.
- `git diff --check`: ناجح.
- Build: أوقفه النظام بـ`exit 143` أثناء تحويل الوحدات بسبب حد الموارد، وليس بخطأ TypeScript/Vite.

## 12. قرار الإطلاق

**NO-GO ❌**

السبب المتبقي: يجب تطبيق migration 0016 فعلياً، ربط واجهة الإسناد بـ`assign_driver`,
وتنظيف seed الأرشيفي قبل الإطلاق. كما أن تسعير الباقات الخادمي ما زال خارج نطاق
هذه الجولة.

## 13. إعادة التدقيق المركزة بعد التنفيذ

| المحور | النتيجة |
|---|---|
| Atomic inventory reservation | PASS على مستوى migration: `FOR UPDATE`، فحص الكمية، خصم، و`inventory_movements` في نفس المعاملة |
| Driver assignments | PASS على مستوى العقد: role + profile + assignment + RLS + RPC؛ UI integration بقي خارج هذه الجولة |
| Wallet ledger | PASS على مستوى العقد: append-only ledger، قفل الحساب، منع الرصيد السالب، وidempotency |
| Server-side promotion validation | PASS: coupon row lock، شروط الصلاحية، سقف الخصم، usage increment وredemption داخل المعاملة |
| AI model identity | PASS جزئي: أزيلت معرفات Gemini غير الموثوقة وسلسلة fallback؛ مزود Dahl يظل معتمداً على إعدادات قاعدة البيانات |

قرار الإطلاق بعد إعادة التدقيق: **NO-GO ❌** حتى تُطبّق migration 0016
وتُربط واجهة الإسناد بها وتُزال بيانات seed من بيئة الإنتاج.
