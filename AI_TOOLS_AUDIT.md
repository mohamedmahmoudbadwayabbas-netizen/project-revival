# AI Tools Audit

تاريخ التدقيق: 2026-11-07  
النطاق: أدوات `AI_TOOL_SUITE` ومسار Admin Copilot في هذا المستودع فقط.  
منهج الإثبات: تم تتبع التعريف، الـ registry، قائمة الأدوات المرسلة للنموذج، الـ router، بوابة الصلاحيات، والتنفيذ الفعلي. لا يوجد سجل تنفيذ إنتاجي محفوظ داخل المستودع؛ لذلك يصف حقل **Last Execution Path** المسار البرمجي القابل للتتبع، وليس دليلاً على أن مستخدماً نفذه فعلاً.

## الخلاصة التنفيذية

- يوجد Registry موحد في [`toolDefinitions.ts`](./src/services/aiTools/toolDefinitions.ts)، و`AI_TOOL_SUITE` يستبعد فقط أدوات تعديل الملفات وGit المعطلة صراحة.
- Admin Copilot يرسل `getActiveTools({ page, userRole })` إلى Gemini، ثم ينفذ function calls عبر `executeAiTool` → `executeAIAction` → `toolRouter` → implementation.
- الأدوات المطلوبة كلها موجودة كتعريفات في `AI_TOOL_SUITE`، لكن هذا لا يعني أنها كلها قابلة لإنجاز عمل ناجح.
- أدوات `HIGH_WRITE` والأدوات التدميرية تصل إلى البوابة ثم تُرجع `approval_required` لأن محول الموافقات غير متاح؛ لا تنفذ تغييراً.
- `sendPushNotification` اسم مضلل: لا يوجد FCM أو OneSignal أو Web Push؛ الأداة تحدث شريط الإعلان فقط.
- أدوات DevOps الأربعة عبارة عن adapters إلى Edge Function باسم `project-engine` غير موجودة في هذا المستودع، لذلك لا يمكن إثبات تنفيذها الحقيقي هنا.
- لم يمكن إثبات أي **Last Execution** إنتاجي من الملفات؛ المسارات التالية هي مسارات invocation قابلة للتتبع.

## مصفوفة الأدوات

| Tool Name | Status | Implementation File | Registry Location | Can AI Actually Call It? | Is It Exposed To Model? | Last Execution Path | Requires Additional Wiring? | Reason |
|---|---|---|---|---|---|---|---|---|
| `manageProduct` | PARTIAL | [`coreCatalogTools.ts:324`](./src/services/aiTools/coreCatalogTools.ts:324) | [`toolDefinitions.ts:81`](./src/services/aiTools/toolDefinitions.ts:81), suite [`:648`](./src/services/aiTools/toolDefinitions.ts:648) | YES، create/update؛ delete يحتاج موافقة | YES، للـ admin في Copilot العام | Prompt → Gemini declaration → `gemini36Service` → `executeAiTool` → `toolRouter` → `toolManageProduct` → Supabase `products` | YES | التنفيذ الحقيقي والتحقق من read-back موجودان، لكن `delete` ترفضه بوابة `DESTRUCTIVE`، كما أن schema يقبل data عامة دون تحقق JSON عميق |
| `manageCategories` | PARTIAL | [`coreCatalogTools.ts:502`](./src/services/aiTools/coreCatalogTools.ts:502) | [`toolDefinitions.ts:108`](./src/services/aiTools/toolDefinitions.ts:108) | YES، create/update؛ delete يحتاج موافقة | YES | نفس مسار `executeAiTool` → `toolManageCategories` → Supabase `categories` | YES | التنفيذ حقيقي للإنشاء/التعديل، بينما الحذف محجوب بالموافقة؛ لا يوجد سجل تنفيذ فعلي مثبت |
| `bulkPriceUpdate` | PARTIAL | [`coreCatalogTools.ts:652`](./src/services/aiTools/coreCatalogTools.ts:652) | [`toolDefinitions.ts:134`](./src/services/aiTools/toolDefinitions.ts:134) | NO كتنفيذ ناجح؛ يصل إلى البوابة ثم `approval_required` | YES | Prompt → declaration → gateway `classifyAiRisk` → توقف قبل executor | YES | مصنفة `HIGH_WRITE` ولا يوجد approval adapter متاح؛ implementation لا تصل إليه AI حالياً |
| `searchProducts` | ACTIVE | [`coreCatalogTools.ts:1067`](./src/services/aiTools/coreCatalogTools.ts:1067) | [`toolDefinitions.ts:154`](./src/services/aiTools/toolDefinitions.ts:154) | YES | YES، وللعميل أيضاً | Prompt → Gemini → `toolSearchProducts` → Supabase `products` read → function response | NO | قراءة حقيقية من Supabase، ومستخدمة أيضاً كقراءة إلزامية في تجربة العميل |
| `getCategories` | ACTIVE | [`coreCatalogTools.ts:1173`](./src/services/aiTools/coreCatalogTools.ts:1173) | [`toolDefinitions.ts:178`](./src/services/aiTools/toolDefinitions.ts:178) | YES | YES، وللعميل أيضاً | Prompt → Gemini → `toolGetCategories` → Supabase `categories` read | NO | أداة قراءة حقيقية ومستخدمة قبل إنشاء الأقسام |
| `updateLayoutConfig` | PARTIAL | [`coreCatalogTools.ts:733`](./src/services/aiTools/coreCatalogTools.ts:733) | [`toolDefinitions.ts:202`](./src/services/aiTools/toolDefinitions.ts:202) | YES | YES | Prompt → `toolUpdateLayoutConfig` → `ctx.updateLayout` → browser event | YES | تغير سياق الواجهة الحالي وlocal rollback فقط؛ لا يوجد حفظ دائم مثبت في قاعدة البيانات |
| `updateThemeColors` | ACTIVE | [`coreCatalogTools.ts:806`](./src/services/aiTools/coreCatalogTools.ts:806) | [`toolDefinitions.ts:223`](./src/services/aiTools/toolDefinitions.ts:223) | YES | YES | Prompt → `toolUpdateThemeColors` → DOM/layout → `store_settings` update | NO | ينفذ تغييراً حقيقياً ويحاول حفظه في Supabase ويفشل صراحة عند تعذر الحفظ |
| `createDiscountBundle` | ACTIVE | [`coreCatalogTools.ts:886`](./src/services/aiTools/coreCatalogTools.ts:886) | [`toolDefinitions.ts:248`](./src/services/aiTools/toolDefinitions.ts:248) | YES | YES | Prompt → `toolCreateDiscountBundle` → insert/read-back `coupons` → layout flash-sale | NO | ينشئ coupon حقيقياً ويتحقق من الصف بعد الإنشاء؛ اسم bundle هو واجهة لحفظ coupon وليس نظام bundle server-side |
| `sendAbandonedCartRecovery` | ACTIVE | [`coreCatalogTools.ts:972`](./src/services/aiTools/coreCatalogTools.ts:972) | [`toolDefinitions.ts:272`](./src/services/aiTools/toolDefinitions.ts:272) | YES | YES | Prompt → `toolSendAbandonedCartRecovery` → reads `cart_items`, `profiles`, `products`, `orders` → WhatsApp draft | NO | يتحقق من السلة والعميل والمنتجات قبل فتح مسودة؛ لا يدعي إرسالاً آلياً |
| `rollbackLastAction` | PARTIAL | [`coreCatalogTools.ts:65`](./src/services/aiTools/coreCatalogTools.ts:65) | [`toolDefinitions.ts:297`](./src/services/aiTools/toolDefinitions.ts:297) | NO كتنفيذ ناجح من AI؛ gateway يصنفه `DESTRUCTIVE` ويطلب موافقة غير متاحة | YES | Prompt → declaration → `executeAIAction` → `approval_required` | YES | الأداة الحقيقية موجودة، لكن AI لا يستطيع تجاوز بوابة الموافقة الحالية |
| `executeCustomCSS` | PARTIAL | [`operationalTools.ts:14`](./src/services/aiTools/operationalTools.ts:14) | [`toolDefinitions.ts:312`](./src/services/aiTools/toolDefinitions.ts:312) | YES | YES | Prompt → `executeCustomCSS` → `<style>` tag + localStorage | YES | تنفيذ متصفح حقيقي لكنه ليس حفظاً مركزياً ولا يضمن تطبيقاً على أجهزة العملاء الأخرى |
| `updateRawJsonMetadata` | PARTIAL | [`operationalTools.ts:54`](./src/services/aiTools/operationalTools.ts:54) | [`toolDefinitions.ts:333`](./src/services/aiTools/toolDefinitions.ts:333) | NO كتنفيذ ناجح تلقائي؛ gateway يوقف `HIGH_WRITE` | YES | Prompt → declaration → `approval_required` قبل `updateRawJsonMetadata` | YES | implementation حقيقية ومقيدة بمفاتيح مسموحة، لكنها محجوبة قبل executor |
| `manageUsersAndRoles` | PARTIAL | [`operationalTools.ts:131`](./src/services/aiTools/operationalTools.ts:131) | [`toolDefinitions.ts:360`](./src/services/aiTools/toolDefinitions.ts:360) | NO كتنفيذ ناجح تلقائي؛ gateway يوقف `HIGH_WRITE` | YES | Prompt → declaration → `approval_required` قبل Supabase `user_roles` | YES | هذه من الأدوات المشكوك فيها: موجودة ومتصلة، لكنها ليست Fully Usable بسبب approval gate |
| `exportReportsAndAnalytics` | PARTIAL | [`operationalTools.ts:268`](./src/services/aiTools/operationalTools.ts:268) | [`toolDefinitions.ts:383`](./src/services/aiTools/toolDefinitions.ts:383) | YES | YES | Prompt → `exportReportsAndAnalytics` → Supabase orders/items/products → JSON/CSV | YES | البيانات حقيقية، لكن `timeframe` لا يحد الاستعلام فعلياً والاستعلام محدود بآخر 100 طلب؛ لا يحقق عقد التقرير بالكامل |
| `sendPushNotification` | PARTIAL | [`operationalTools.ts:390`](./src/services/aiTools/operationalTools.ts:390) | [`toolDefinitions.ts:407`](./src/services/aiTools/toolDefinitions.ts:407) | YES | YES | Prompt → `sendPushNotification` → layout announcement + `store_settings.announcement_text` | YES | لا توجد قناة Push حقيقية؛ التنفيذ إعلان داخل الموقع فقط، رغم أن الوصف يعلن Push |
| `manageDeliveryZones` | ACTIVE | [`operationalTools.ts:469`](./src/services/aiTools/operationalTools.ts:469) | [`toolDefinitions.ts:431`](./src/services/aiTools/toolDefinitions.ts:431) | YES | YES | Prompt → `manageDeliveryZones` → Supabase `delivery_zones` insert/update | NO | implementation حقيقية مع قراءة سابقة وrollback وتحديث قاعدة البيانات |
| `getDirectoryTree` | DISCONNECTED | [`devopsTools.ts:34`](./src/services/aiTools/devopsTools.ts:34), adapter [`projectEngineService.ts:32`](./src/services/aiTools/projectEngineService.ts:32) | [`toolDefinitions.ts:458`](./src/services/aiTools/toolDefinitions.ts:458) | CALLABLE فقط؛ النجاح غير مثبت | YES، للـ admin Copilot العام | Prompt → Gemini → `getDirectoryTree` → Edge Function `project-engine` | YES | لا توجد implementation لـ`project-engine` داخل هذا المستودع؛ adapter وحده لا يثبت أداة حقيقية |
| `getFileContent` | DISCONNECTED | [`devopsTools.ts:44`](./src/services/aiTools/devopsTools.ts:44), adapter [`projectEngineService.ts:37`](./src/services/aiTools/projectEngineService.ts:37) | [`toolDefinitions.ts:479`](./src/services/aiTools/toolDefinitions.ts:479) | CALLABLE فقط؛ النجاح غير مثبت | YES | Prompt → `getFileContentTool` → `readProjectFile` → `project-engine` | YES | نفس فجوة Edge Function؛ لا يوجد backend implementation محلياً |
| `searchCodebase` | DISCONNECTED | [`devopsTools.ts:56`](./src/services/aiTools/devopsTools.ts:56), adapter [`projectEngineService.ts:52`](./src/services/aiTools/projectEngineService.ts:52) | [`toolDefinitions.ts:501`](./src/services/aiTools/toolDefinitions.ts:501) | CALLABLE فقط؛ النجاح غير مثبت | YES | Prompt → `searchCodebase` → `searchProjectCode` → `project-engine` | YES | لا يمكن إثبات real data أو execution من الكود الموجود وحده |
| `getAppErrors` | DISCONNECTED | [`devopsTools.ts:68`](./src/services/aiTools/devopsTools.ts:68), adapter [`projectEngineService.ts:96`](./src/services/aiTools/projectEngineService.ts:96) | [`toolDefinitions.ts:523`](./src/services/aiTools/toolDefinitions.ts:523) | CALLABLE فقط؛ النجاح غير مثبت | YES | Prompt → `getAppErrors` → `getRealAppErrors` → `project-engine` | YES | يعتمد كلياً على Edge Function غير موجودة في المستودع |

## تحقق الطبقات

### 1. Implementation

جميع الأسماء الـ19 لها implementation أو adapter في `coreCatalogTools.ts`,
`operationalTools.ts` أو `devopsTools.ts`. لا توجد أداة مطلوبة مفقودة اسمياً.

لكن وجود implementation ليس دليلاً كافياً:

- `sendPushNotification` implementation لا ترسل Push.
- DevOps implementations لا تتجاوز استدعاء Edge Function خارج المستودع.
- `rollbackLastAction` implementation موجودة لكن gateway يمنع AI من الوصول إلى نجاحها.

### 2. Export وRegistry

- `AI_TOOL_SUITE` هو المصدر المسجل في [`toolDefinitions.ts:648`](./src/services/aiTools/toolDefinitions.ts:648).
- كل الأدوات المطلوبة موجودة في `ALL_AI_TOOL_SUITE` ثم تمر إلى `GEMINI_TOOL_DECLARATIONS`.
- `toolRouter.ts` يحتوي switch لكل الأدوات المطلوبة، لذلك لا توجد أداة مطلوبة مسجلة دون router case.

### 3. Exposure to the model

- في Admin Copilot، [`gemini36Service.ts:553`](./src/services/gemini36Service.ts:553) يحسب `activeTools` ثم يرسلها للنموذج في [`:564`](./src/services/gemini36Service.ts:564).
- صفحة `admin.copilot` للمستخدم admin تعطي كل المجموعات، ومنها الأدوات الـ19.
- المستخدم غير admin/moderator يرى فقط `searchProducts` و`getCategories` عبر [`toolDefinitions.ts:668`](./src/services/aiTools/toolDefinitions.ts:668).
- وضع `suggest` يستبعد كل الأدوات التي `mutatesState=true`؛ لذلك أدوات الكتابة لا تكون مكشوفة في هذا الوضع.

### 4. Invocation

المسار العام المثبت هو:

```text
Prompt
  -> Gemini functionDeclarations
  -> gemini36Service agentic loop
  -> executeAiTool
  -> executeAIAction
  -> toolRouter switch
  -> implementation
  -> Supabase / browser / project-engine
  -> functionResponse back to Gemini
```

الدليل على التنفيذ الفعلي داخل الكود هو [`gemini36Service.ts:750`](./src/services/gemini36Service.ts:750)،
حيث تُنفذ كل function calls التي أعادها النموذج. لا يوجد في المستودع log أو fixture يثبت آخر استدعاء لكل أداة.

### 5. Permissions and feature flags

- أدوات project mutation الخمس مستبعدة من `AI_TOOL_SUITE` صراحة عبر `DISABLED_PROJECT_MUTATIONS`.
- الأدوات المطلوبة في هذا التقرير ليست ضمن تلك المجموعة، لذلك ليست feature-flag disabled على مستوى registry.
- بوابة [`aiActionGateway.ts:232`](./src/services/aiTools/aiActionGateway.ts:232) تمنع `HIGH_WRITE` و`DESTRUCTIVE` بـ`approval_required`.
- هذا يجعل `bulkPriceUpdate`, `updateRawJsonMetadata`, `manageUsersAndRoles`, و`rollbackLastAction` غير قابلة لإنجاز AI تلقائياً، رغم ظهورها للنموذج.

### 6. Schema validity

كل تعريفات الأدوات تستخدم `type: "object"` وتحدد `properties` و`required`.  
التحقق سطحي: لا توجد JSON schemas عميقة لـ`data` في `manageProduct` و`manageCategories`,
ولا enum فعلي لبعض القيم مثل `discountType` و`targetAudience` و`action`. لذلك schema صالح شكلياً،
لكنه لا يمنع كل المدخلات غير الصحيحة قبل التنفيذ.

## تصنيف الأدوات الخاصة المطلوبة

| Tool | Verdict |
|---|---|
| `manageProduct` | **FULLY USABLE BY AI** للإنشاء والتعديل؛ **PARTIAL** لأن الحذف يحتاج approval adapter |
| `manageCategories` | **FULLY USABLE BY AI** للإنشاء والتعديل؛ **PARTIAL** لأن الحذف يحتاج approval adapter |
| `bulkPriceUpdate` | **EXISTS IN CODE ONLY بالنسبة للتنفيذ الحالي**؛ declaration وrouter موجودان لكن gateway يمنع الوصول إلى التنفيذ |
| `createDiscountBundle` | **FULLY USABLE BY AI** لإنشاء coupon حقيقي، وليس bundle pricing server-side |
| `rollbackLastAction` | **EXISTS IN CODE ONLY بالنسبة لـAI**؛ implementation موجودة لكن destructive approval غير موصول |
| `manageUsersAndRoles` | **EXISTS IN CODE ONLY بالنسبة للتنفيذ الحالي**؛ gateway يمنعها قبل Supabase |
| `sendPushNotification` | **EXISTS IN CODE ONLY كـPush**؛ AI يستطيع استدعاء tool، لكن الناتج الحقيقي إعلان داخل الموقع وليس Push |

## Active Tools

الأدوات التي تحقق مساراً قابلاً للاستدعاء مع backend/browser behavior حقيقي، دون فجوة تشغيلية جوهرية في تعريفها:

- `searchProducts`
- `getCategories`
- `updateThemeColors`
- `createDiscountBundle`
- `sendAbandonedCartRecovery`
- `manageDeliveryZones`

## Disconnected Tools

- `getDirectoryTree`
- `getFileContent`
- `searchCodebase`
- `getAppErrors`

سبب التصنيف: لا توجد Edge Function `project-engine` أو implementation server-side مقابلة داخل المستودع، لذلك لا يمكن إثبات real data أو نجاح التنفيذ.

## Dead Tools

- لا توجد أداة مطلوبة بلا router case.
- `bulkPriceUpdate`, `updateRawJsonMetadata`, `manageUsersAndRoles`, و`rollbackLastAction` ليست dead code، لكنها dead-ended بالنسبة لتنفيذ AI الحالي بسبب بوابة الموافقة غير الموصولة.

## Fake Tools

- `sendPushNotification` **Fake/Misnamed capability**: لا يوجد Push channel؛ الأداة تحدث announcement bar و`store_settings` فقط.
- لا توجد أدوات تستخدم `return "coming soon"` أو `throw NOT_IMPLEMENTED` ضمن الأدوات الـ19 نفسها.

## Missing Implementations

- Approval adapter قابل للتنفيذ لـ`bulkPriceUpdate`, `updateRawJsonMetadata`, `manageUsersAndRoles`, و`rollbackLastAction`.
- FCM/Web Push/OneSignal backend حقيقي لـ`sendPushNotification`.
- Edge Function `project-engine` ومصدرها التشغيلي لـDevOps tools.
- Server-side bundle pricing إذا كان المقصود من `createDiscountBundle` باقة منتجات لا coupon.

## Unused Registrations

- لا توجد registrations مطلوبة غير موجودة في `toolRouter`.
- توجد registrations إضافية خارج نطاق الطلب: media tools وأدوات project mutation المعطلة.
- `getGitCommits()` في [`devopsTools.ts:140`](./src/services/aiTools/devopsTools.ts:140) يعيد `[]` لكنه ليس من الأدوات المطلوبة ولا مسجلاً كأداة AI مستقلة.

## Unreachable Tools

- `writeNewFile`, `updateFileAST`, `deleteFile`, `gitCommitAndPush`, `gitRollbackCommit` unreachable من `AI_TOOL_SUITE` بسبب filter صريح؛ ليست ضمن قائمة التدقيق المطلوبة.
- بالنسبة للقائمة المطلوبة، الأدوات الأربعة ذات `approval_required` تصل إلى gateway لكنها لا تصل إلى implementation.
- أدوات DevOps قابلة للوصول إلى adapter فقط، وغير قابلة للإثبات كتنفيذ ناجح دون backend خارجي.

## Score

### AI Tool Coverage Score: **5.5/10**

الحساب يعتمد على:

- Registry وschema وexposure: قوي لمعظم الأدوات.
- التنفيذ الناجح القابل للإثبات: محدود بسبب approval gate، Push المضلل، وغياب project-engine.
- real data: مثبت لأدوات Supabase العاملة، وغير مثبت لأدوات DevOps.

### Actually usable by AI: **6 / 19 = 31.6%**

هذا الرقم محافظ ويعد فقط الأدوات المصنفة `ACTIVE`.  
إذا عُدّت `manageProduct` و`manageCategories` جزئياً قابلة للاستخدام للـcreate/update،
تصبح التغطية الجزئية `8 / 19 = 42.1%`، لكنها ليست نسبة النجاح الكامل المطلوبة في هذا التدقيق.

## الحكم النهائي

**NO-GO لمنظومة AI Tools كمنظومة إنتاجية كاملة.**

الـRegistry والـagentic loop موجودان، لكن لا يجوز وصف كل الأدوات بأنها قابلة للاستخدام من AI:

1. سبع أدوات على الأقل إما محجوبة بالموافقة أو ناقصة القدرة الفعلية.
2. Push notification غير موجود كقناة حقيقية.
3. DevOps tools غير مثبتة لأن backend الخاص بها خارج المستودع.
4. لا يوجد إثبات runtime execution history لكل أداة.
