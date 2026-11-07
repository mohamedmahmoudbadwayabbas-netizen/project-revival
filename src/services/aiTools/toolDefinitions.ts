/* =========================================================================
   GEMINI AI ADMIN ENGINE — UNIFIED TOOL SUITE DECLARATIONS
   Precise JSON Schema declarations for Gemini Function Calling & UI Labels
   ========================================================================= */

import type { AiToolDefinition, AiToolGroup } from "./types";

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const bool = (description: string) => ({ type: "boolean", description });
const enumStr = (description: string, values: string[]) => ({
  type: "string",
  description,
  enum: values,
});

const DISABLED_PROJECT_MUTATIONS = new Set([
  "writeNewFile",
  "updateFileAST",
  "deleteFile",
  "gitCommitAndPush",
  "gitRollbackCommit",
]);

export const AI_TOOL_GROUP_LABELS: Record<AiToolGroup, { labelAr: string; icon: string }> = {
  media: { labelAr: "الوسائط والصور", icon: "Image" },
  catalog: { labelAr: "الكتالوج والأسعار", icon: "Layers" },
  ui: { labelAr: "الواجهة والتصميم", icon: "Palette" },
  marketing: { labelAr: "التسويق والعروض", icon: "Megaphone" },
  safety: { labelAr: "الأمان والاسترجاع", icon: "RotateCcw" },
  universal: { labelAr: "التنسيقات المتقدمة", icon: "Code2" },
  operations: { labelAr: "العمليات والتشغيل", icon: "Users" },
  devops: { labelAr: "الكود والبنية التحتية", icon: "Terminal" },
};

const ALL_AI_TOOL_SUITE: AiToolDefinition[] = [
  // ── CORE 1: MEDIA ──
  {
    name: "generateProductImage",
    group: "media",
    labelAr: "توليد صورة منتج",
    descriptionAr: "إنشاء صورة احترافية لمنتج وحفظها على سجل المنتج في جدول products في Supabase",
    mutatesState: true,
    declaration: {
      name: "generateProductImage",
      description:
        "Generate a professional studio photo for a product and attach it to Supabase products table.",
      parameters: {
        type: "object",
        properties: {
          productName: str("Arabic product name, e.g. جبن قريش بلدي"),
          category: str("Category name in Arabic"),
          productId: str("Existing product uuid to attach the image to (optional)"),
        },
        required: ["productName"],
      },
    },
  },
  {
    name: "uploadBannerImage",
    group: "media",
    labelAr: "توليد بانر إعلاني",
    descriptionAr: "توليد صورة بانر رئيسي وإضافتها كسلايد جديد في الواجهة وتحديث إعدادات المتجر",
    mutatesState: true,
    declaration: {
      name: "uploadBannerImage",
      description: "Generate a hero banner image and add it as a new homepage hero slide.",
      parameters: {
        type: "object",
        properties: {
          bannerText: str("Arabic banner headline"),
          subtitle: str("Optional Arabic subtitle"),
        },
        required: ["bannerText"],
      },
    },
  },

  // ── CORE 2: CATALOG & PRODUCTS ──
  {
    name: "manageProduct",
    group: "catalog",
    labelAr: "إدارة المنتجات",
    descriptionAr: "إضافة أو تعديل أو حذف منتج في قاعدة بيانات Supabase (جدول products)",
    mutatesState: true,
    declaration: {
      name: "manageProduct",
      description: "Create, update or delete a product in Supabase products table.",
      parameters: {
        type: "object",
        properties: {
          action: enumStr("The mutation type to perform on the product.", [
            "create",
            "update",
            "delete",
          ]),
          data: {
            type: "object",
            description:
              "Product fields: id (uuid), name, name_ar, price, original_price, stock, category_id, description, description_ar, image_url, images, rating, reviews_count, is_featured, is_active",
          },
        },
        required: ["action", "data"],
      },
    },
  },
  {
    name: "manageCategories",
    group: "catalog",
    labelAr: "إدارة الأقسام",
    descriptionAr: "إضافة أو تعديل أو حذف قسم من أقسام المتجر (جدول categories في Supabase)",
    mutatesState: true,
    declaration: {
      name: "manageCategories",
      description: "Create, update or delete a store category in Supabase categories table.",
      parameters: {
        type: "object",
        properties: {
          action: enumStr("The mutation type to perform on the category.", [
            "create",
            "update",
            "delete",
          ]),
          data: {
            type: "object",
            description: "Category fields: id (uuid), name, name_ar, slug, image_url",
          },
        },
        required: ["action", "data"],
      },
    },
  },
  {
    name: "bulkPriceUpdate",
    group: "catalog",
    labelAr: "تحديث أسعار جماعي",
    descriptionAr: "رفع أو خفض أسعار كل منتجات قسم معين بنسبة مئوية في جدول products",
    mutatesState: true,
    declaration: {
      name: "bulkPriceUpdate",
      description:
        "Increase or decrease all product prices in a category by a percentage in Supabase products table.",
      parameters: {
        type: "object",
        properties: {
          categoryId: str("Category uuid, or 'all' for the whole catalog"),
          percentage: num("Percentage change, negative to discount (e.g. -15 for 15% discount)"),
        },
        required: ["categoryId", "percentage"],
      },
    },
  },
  {
    name: "searchProducts",
    group: "catalog",
    labelAr: "بحث في المنتجات",
    descriptionAr:
      "البحث عن منتج أو أكثر بالاسم أو القسم في جدول products والتحقق من توفره وسعره ومخزونه الحالي",
    mutatesState: false,
    declaration: {
      name: "searchProducts",
      description:
        'Read-only search against the Supabase products table by name and/or category. Use this BEFORE any manageProduct create call to check whether a matching product already exists (avoid duplicate inserts), and to answer any availability/price/stock question. This tool never modifies data. To list the whole catalog or count products, pass query "*" (the result includes `total`).',
      parameters: {
        type: "object",
        properties: {
          query: str(
            "Arabic or English search term matched against the product name, e.g. جبنة بيضاء",
          ),
          categoryId: str("Optional category uuid to scope the search to a single category"),
          limit: num("Maximum number of results to return (default: 8, max: 20)"),
        },
        required: ["query"],
      },
    },
  },
  {
    name: "getCategories",
    group: "catalog",
    labelAr: "عرض الأقسام",
    descriptionAr:
      "استرجاع قائمة أقسام المتجر الحالية من جدول categories للتحقق من وجود قسم قبل إنشائه",
    mutatesState: false,
    declaration: {
      name: "getCategories",
      description:
        "Read-only fetch of the current store categories from Supabase categories table, optionally filtered by a partial name match. Use this BEFORE any manageCategories create call to check whether a matching category already exists. This tool never modifies data.",
      parameters: {
        type: "object",
        properties: {
          nameQuery: str(
            "Optional Arabic/English partial category name to filter by, e.g. الأعشاب",
          ),
        },
        required: [],
      },
    },
  },

  // ── CORE 3: UI & THEME ──
  {
    name: "updateLayoutConfig",
    group: "ui",
    labelAr: "تعديل تخطيط الواجهة",
    descriptionAr: "تطبيق تعديلات JSON مباشرة على تخطيط الصفحة الرئيسية ومزامنة الإعدادات",
    mutatesState: true,
    declaration: {
      name: "updateLayoutConfig",
      description: "Merge a partial StoreLayoutConfig JSON into the live homepage layout.",
      parameters: {
        type: "object",
        properties: {
          layoutJson: {
            type: "object",
            description: "Partial StoreLayoutConfig object to merge into the live layout",
          },
        },
        required: ["layoutJson"],
      },
    },
  },
  {
    name: "updateThemeColors",
    group: "ui",
    labelAr: "تغيير ألوان الثيم",
    descriptionAr: "تغيير اللون الأساسي والثانوي ووضع الإضاءة للمتجر لحظياً ومزامنة theme_settings",
    mutatesState: true,
    declaration: {
      name: "updateThemeColors",
      description: "Update the store primary/accent colors and light/dark mode instantly.",
      parameters: {
        type: "object",
        properties: {
          primary: str("Primary color hex, e.g. #2F5D4B"),
          accent: str("Accent color hex, e.g. #B6502E"),
          mode: str("light | dark"),
          palette: str(
            "Optional palette key: emerald | dark_green | amber_warm | royal_blue | clean_slate",
          ),
        },
        required: ["primary"],
      },
    },
  },

  // ── CORE 4: MARKETING & RECOVERY ──
  {
    name: "createCouponCampaign",
    group: "marketing",
    labelAr: "إنشاء باقة خصم",
    descriptionAr: "توليد كوبون خصم حقيقي في جدول coupons وربطه بعداد العروض في الواجهة",
    mutatesState: true,
    declaration: {
      name: "createCouponCampaign",
      description:
        "Create a discount coupon in Supabase coupons and surface it in storefront flash sale timer.",
      parameters: {
        type: "object",
        properties: {
          code: str("Coupon code, uppercase latin, e.g. FLASH30"),
          discountValue: num("Discount numeric value"),
          discountType: str("percent | fixed"),
          title: str("Arabic campaign title"),
          hours: num("Campaign duration in hours"),
          minOrderAmount: num("Minimum order amount in EGP (optional)"),
        },
        required: ["code", "discountValue"],
      },
    },
  },
  {
    name: "sendAbandonedCartRecovery",
    group: "marketing",
    labelAr: "استرداد سلة متروكة",
    descriptionAr:
      "التحقق من سلة متروكة ومنتجاتها وبيانات العميل في Supabase ثم إعداد مسودة واتساب محايدة، دون اختراع كوبون أو موعد تسليم",
    mutatesState: false,
    declaration: {
      name: "sendAbandonedCartRecovery",
      description:
        "Read and verify the abandoned cart, customer, and active products from Supabase before opening a neutral WhatsApp draft. Do not invent discounts or delivery promises.",
      parameters: {
        type: "object",
        properties: {
          cartId: str("Abandoned cart / order id"),
          customerName: str("Customer name"),
          phone: str("Customer phone in local format"),
          totalPrice: num("Cart total in EGP"),
        },
        required: ["cartId"],
      },
    },
  },

  // ── CORE 5: SAFETY ──
  {
    name: "rollbackLastAction",
    group: "safety",
    labelAr: "تراجع عن آخر أمر",
    descriptionAr: "استرجاع حالة المتجر وقاعدة البيانات إلى ما قبل آخر أمر تم تنفيذه",
    mutatesState: true,
    declaration: {
      name: "rollbackLastAction",
      description:
        "Restore the store and database rows to the snapshot captured before the last executed tool.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },

  // ── PHASE 1: UNIVERSAL METADATA & CUSTOM CSS ──
  {
    name: "executeCustomCSS",
    group: "universal",
    labelAr: "حقن وتطبيق CSS مخصص",
    descriptionAr: "حقن وتطبيق قواعد CSS وتنسيقات مرئية مخصصة فورية في رأس الصفحة وتخزينها",
    mutatesState: true,
    declaration: {
      name: "executeCustomCSS",
      description:
        "Injects and applies dynamic CSS stylesheet rules to document head for instant visual styling overrides.",
      parameters: {
        type: "object",
        properties: {
          cssRules: str(
            "Valid CSS stylesheet rules or class styling overrides, e.g. ':root { --primary-glow: #10b981; }'",
          ),
        },
        required: ["cssRules"],
      },
    },
  },
  {
    name: "updateRawJsonMetadata",
    group: "universal",
    labelAr: "تحديث إعدادات المتجر (JSON Metadata)",
    descriptionAr: "حفظ وتحديث بيانات وصفية أو إعدادات متقدمة في جدول store_settings في Supabase",
    mutatesState: true,
    declaration: {
      name: "updateRawJsonMetadata",
      description:
        "Writes or updates dynamic custom settings directly into Supabase store_settings table.",
      parameters: {
        type: "object",
        properties: {
          key: str(
            "Existing store_settings key name only (allowed: site_name, hero_title, hero_subtitle, whatsapp_number, announcement_text)",
          ),
          value: {
            type: "object",
            description: "Arbitrary JSON payload or primitive value to persist in store_settings",
          },
        },
        required: ["key", "value"],
      },
    },
  },

  // ── PHASE 2: ADVANCED OPERATIONAL TOOLS ──
  {
    name: "manageUsersAndRoles",
    group: "operations",
    labelAr: "إدارة المستخدمين والصلاحيات",
    descriptionAr:
      "تعديل أدوار وصلاحيات المستخدمين وتحديث بياناتهم في Supabase (user_roles و profiles)",
    mutatesState: true,
    declaration: {
      name: "manageUsersAndRoles",
      description:
        "Updates user roles, permissions, or profile details in Supabase user_roles and profiles tables.",
      parameters: {
        type: "object",
        properties: {
          userId: str("Target user UUID in auth/profiles, or customer phone/name identifier"),
          role: str("Target role: admin | moderator | driver | customer"),
          fullName: str("Optional updated full name"),
          phone: str("Optional updated phone number"),
        },
        required: ["userId", "role"],
      },
    },
  },
  {
    name: "exportReportsAndAnalytics",
    group: "operations",
    labelAr: "تصدير التقارير والتحليلات",
    descriptionAr:
      "استعلام الطلبات والمنتجات وحساب المبيعات وإرجاع تقرير تحليلي قابل للتحميل أو العرض",
    mutatesState: false,
    declaration: {
      name: "exportReportsAndAnalytics",
      description:
        "Queries orders and products to calculate total revenue, top selling items, and returns downloadable structured analytics data.",
      parameters: {
        type: "object",
        properties: {
          timeframe: str(
            "Timeframe for report: today | last_7_days | last_30_days | this_month | all_time",
          ),
          format: str("Format: json | csv | summary_card"),
          includeTopProducts: bool("Whether to include granular top products breakdown"),
        },
        required: ["timeframe", "format"],
      },
    },
  },
  {
    name: "updateStoreAnnouncement",
    group: "operations",
    labelAr: "تحديث شريط الإعلان",
    descriptionAr: "تحديث شريط الإعلان العام في المتجر وحفظه في إعدادات المتجر",
    mutatesState: true,
    declaration: {
      name: "updateStoreAnnouncement",
      description:
        "Updates the on-site store announcement bar and persists it in store_settings. This does not send device push notifications.",
      parameters: {
        type: "object",
        properties: {
          title: str("Notification title in Arabic, e.g. عروض الساعات الذهبية ⚡"),
          message: str("Notification body message in Arabic"),
          targetAudience: str(
            "Target audience: all | active_users | cart_abandoners | vip_customers",
          ),
          actionUrl: str("Optional link URL to redirect user when clicked"),
        },
        required: ["title", "message", "targetAudience"],
      },
    },
  },
  {
    name: "manageDeliveryZones",
    group: "operations",
    labelAr: "إدارة مناطق التوصيل والأسعار",
    descriptionAr:
      "إضافة أو تعديل رسوم وشروط الشحن لمناطق التوصيل في Supabase (جدول delivery_zones)",
    mutatesState: true,
    declaration: {
      name: "manageDeliveryZones",
      description:
        "Creates, updates, or adjusts shipping fees, minimum order amounts, and delivery SLA for zones in Supabase delivery_zones table.",
      parameters: {
        type: "object",
        properties: {
          zoneName: str("Delivery zone name, e.g. مدينة نصر والتجمع الخامس"),
          deliveryFee: num("Shipping fee in EGP"),
          minOrderAmount: num("Minimum order amount in EGP (optional)"),
          estimatedMinutes: num("Estimated delivery SLA in minutes (e.g. 35, 45, 60)"),
          action: str("create | update | toggle_active (default: update)"),
          zoneId: str("Optional existing zone UUID if known"),
        },
        required: ["zoneName", "deliveryFee"],
      },
    },
  },

  // ── PHASE 3: READ-ONLY CODEBASE TOOLS ──
  {
    name: "getDirectoryTree",
    group: "devops",
    labelAr: "فحص شجرة مجلدات وملفات المشروع",
    descriptionAr:
      "قراءة شجرة المشروع الحقيقية عبر Project Engine server-side؛ لا تعتمد على LocalStorage أو registry وهمي",
    mutatesState: false,
    declaration: {
      name: "getDirectoryTree",
      description:
        "Reads the real project directory structure through the server-side Project Engine. Never treats a client registry as the filesystem.",
      parameters: {
        type: "object",
        properties: {
          rootDir: str("Root directory to scan (default: /src)"),
          maxDepth: num("Maximum scanning depth (e.g. 3)"),
        },
        required: [],
      },
    },
  },
  {
    name: "getFileContent",
    group: "devops",
    labelAr: "قراءة محتوى ملف برمجي",
    descriptionAr:
      "قراءة المحتوى الحقيقي لملف عبر Project Engine؛ إذا لم يوجد مزود حقيقي ترجع NOT_CONFIGURED ولا تختلق محتوى",
    mutatesState: false,
    declaration: {
      name: "getFileContent",
      description:
        "Reads real source content through the server-side Project Engine. It never fabricates source when the provider is unavailable.",
      parameters: {
        type: "object",
        properties: {
          filePath: str(
            "Target file path (e.g. /src/routes/cart.tsx, /src/components/storefront/Header.tsx)",
          ),
        },
        required: ["filePath"],
      },
    },
  },
  {
    name: "searchCodebase",
    group: "devops",
    labelAr: "بحث في الكود والمشروع",
    descriptionAr: "البحث في الكود الحقيقي عبر Project Engine server-side",
    mutatesState: false,
    declaration: {
      name: "searchCodebase",
      description:
        "Searches the real project codebase through the server-side Project Engine; no LocalStorage registry fallback.",
      parameters: {
        type: "object",
        properties: {
          query: str("Search term, function name, component name, or code pattern"),
          category: str(
            "Optional category filter: routes | components | services | lib | types | styles | all",
          ),
        },
        required: ["query"],
      },
    },
  },
  {
    name: "getAppErrors",
    group: "devops",
    labelAr: "استعراض سجل أخطاء وتشخيص التطبيق",
    descriptionAr: "استرجاع تشخيصات حقيقية من Project Engine؛ لا تعرض سجلات أو حالة تشغيل مصطنعة",
    mutatesState: false,
    declaration: {
      name: "getAppErrors",
      description:
        "Retrieves real runtime diagnostics through the configured Project Engine provider; never fabricates health or error logs.",
      parameters: {
        type: "object",
        properties: {
          limit: num("Maximum number of recent error logs to return (default: 20)"),
        },
        required: [],
      },
    },
  },
  {
    name: "writeNewFile",
    group: "devops",
    labelAr: "إنشاء أو كتابة ملف كود جديد",
    descriptionAr: "تجهيز إنشاء ملف حقيقي عبر Change Set؛ التطبيق النهائي يتطلب موافقة مدير صريحة",
    mutatesState: true,
    declaration: {
      name: "writeNewFile",
      description:
        "Creates a real project change set. Applying it requires explicit admin approval and a configured server-side provider.",
      parameters: {
        type: "object",
        properties: {
          filePath: str("Relative workspace path, e.g. /src/components/CustomWidget.tsx"),
          content: str("Complete valid source code content to write into the file"),
          description: str("Short Arabic summary of changes made"),
        },
        required: ["filePath", "content"],
      },
    },
  },
  {
    name: "updateFileAST",
    group: "devops",
    labelAr: "تعديل كود وهيكل ملف برمجي (AST)",
    descriptionAr: "تجهيز تعديل ملف حقيقي عبر Change Set؛ لا يتم الحفظ الفعلي قبل الموافقة",
    mutatesState: true,
    declaration: {
      name: "updateFileAST",
      description:
        "Prepares a real project file change set. No client-side filesystem or fake success is allowed.",
      parameters: {
        type: "object",
        properties: {
          filePath: str("Target file path, e.g. /src/routes/index.tsx"),
          changes: {
            type: "object",
            description:
              "Modifications object with searchPattern & replacement, or targetNode & newCode",
          },
        },
        required: ["filePath", "changes"],
      },
    },
  },
  {
    name: "deleteFile",
    group: "devops",
    labelAr: "حذف ملف من مساحة العمل",
    descriptionAr: "تجهيز حذف ملف حقيقي؛ العملية المدمرة تتطلب موافقة مدير صريحة",
    mutatesState: true,
    declaration: {
      name: "deleteFile",
      description:
        "Prepares a real destructive file deletion. Final application requires explicit admin approval through Project Engine.",
      parameters: {
        type: "object",
        properties: {
          filePath: str("Target file path to delete from workspace"),
        },
        required: ["filePath"],
      },
    },
  },
  {
    name: "gitCommitAndPush",
    group: "devops",
    labelAr: "حفظ ومزامنة التعديلات (Git Commit & Push)",
    descriptionAr:
      "Git integration target فقط؛ لا يتم إنشاء commit أو push دون مزود Git حقيقي وموافقة مدير",
    mutatesState: true,
    declaration: {
      name: "gitCommitAndPush",
      description:
        "Uses a configured real Git provider only. Never invents commit hashes or claims a push without provider confirmation.",
      parameters: {
        type: "object",
        properties: {
          commitMessage: str(
            "Conventional commit message in English or Arabic, e.g. 'feat: update checkout delivery zones'",
          ),
        },
        required: ["commitMessage"],
      },
    },
  },
  {
    name: "gitRollbackCommit",
    group: "devops",
    labelAr: "التراجع عن آخر كوميت (Git Rollback)",
    descriptionAr: "Git rollback حقيقي فقط عبر مزود Git مهيأ وموافقة مدير؛ لا يوجد rollback وهمي",
    mutatesState: true,
    declaration: {
      name: "gitRollbackCommit",
      description:
        "Reverts through a configured real Git provider only; never simulates a rollback.",
      parameters: {
        type: "object",
        properties: {
          commitHash: str("Optional target commit hash to revert to (defaults to HEAD~1)"),
        },
        required: [],
      },
    },
  },
];

export const AI_TOOL_SUITE = ALL_AI_TOOL_SUITE.filter(
  (tool) => !DISABLED_PROJECT_MUTATIONS.has(tool.name),
);

export const GEMINI_TOOL_DECLARATIONS = AI_TOOL_SUITE.map((t) => t.declaration);

/**
 * Dynamic Tool Router
 * Returns a subset of tools based on the current page context and user role.
 * Fails safe: if role/context is unknown, returns only read-only tools.
 */
export function getActiveTools(context?: { page?: string; userRole?: string }) {
  const rawRole = (context?.userRole || "customer").toLowerCase();
  const role = rawRole === "super_admin" ? "admin" : rawRole;
  const page = context?.page || "global";

  // Non-admins/moderators get safe read-only tools — includes catalog search
  // so a shopper asking "فيه جبنة بيضاء؟" gets a real DB-backed answer instead
  // of the model reaching for an unrelated devops tool.
  if (role !== "admin" && role !== "moderator") {
    return AI_TOOL_SUITE.filter(
      (t) => t.name === "searchProducts" || t.name === "getCategories",
    ).map((t) => t.declaration);
  }

  // Admin / Moderator dynamic routing
  let allowedGroups: AiToolGroup[] = [];

  if (role === "moderator") {
    // Moderators never receive code/filesystem/Git tools.
    allowedGroups = ["catalog", "media", "ui", "operations", "marketing", "universal"];
  } else if (page.includes("products") || page.includes("catalog")) {
    allowedGroups = ["catalog", "media", "ui", "universal"];
  } else if (page.includes("delivery-zones") || page.includes("orders")) {
    allowedGroups = ["operations", "universal"];
  } else if (page.includes("settings") || page.includes("design")) {
    allowedGroups = ["ui", "operations", "universal"];
  } else if (page === "admin.copilot" || page === "global") {
    // Global Copilot gets all tools for full capability
    allowedGroups = ["catalog", "media", "ui", "operations", "marketing", "devops", "universal"];
  } else {
    // Fail safe unknown context
    return AI_TOOL_SUITE.filter((t) => !t.mutatesState).map((t) => t.declaration);
  }

  return AI_TOOL_SUITE.filter((t) => allowedGroups.includes(t.group)).map((t) => t.declaration);
}
