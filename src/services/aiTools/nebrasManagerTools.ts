/**
 * src/services/aiTools/nebrasManagerTools.ts
 * ---------------------------------------------------------------------------
 * Nebras Admin CoPilot — Unified Operations Manager Tools (10 Consolidated Tools)
 * Contract-Aligned Edition (100% compliant with DATABASE_SCHEMA_CONTRACT.ts)
 *
 * Key Contract Rules Enforced:
 *  - Currency: EGP ONLY.
 *  - Settings Table: `store_settings` (with `hero_image_url`).
 *  - Profiles Table: `id`, `full_name`, `phone`, `avatar_url`, `is_blocked` (NO `email`).
 *  - Products Table: `price`, `old_price`, `stock`, `stock_quantity`, `name_ar`, `unit_label`.
 *  - Orders / OrderItems: `orders.total_amount`, `order_items.price` (NOT `unit_price`).
 *  - Coupons / AbandonedCarts: `discount_type: 'percent' | 'fixed'`, `abandoned_carts.total`.
 *  - Image Service: `generateAdminImage({ prompt, aspectRatio })`.
 *  - Safety Gate: Write/destructive actions require `confirmed === true`.
 */

import { supabase } from '@/lib/supabase-loose';
import { generateAdminImage } from '@/services/geminiImageService';
import type {
  AbandonedCartRow,
  CategoryRow,
  CouponRow,
  OrderItemRow,
  OrderRow,
  ProductRow,
  ProfileRow,
  StoreSettingsRow,
} from '@/types/DATABASE_SCHEMA_CONTRACT';

// ============================================================================
// 1. Core Types & Standardized Response Envelope
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ImpactSummary {
  affectedRecordsCount: number;
  estimatedFinancialImpactEGP?: number;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  previewDiff?: Array<Record<string, unknown>>;
  warnings?: string[];
}

export interface NebrasToolResult<T = unknown> {
  ok: boolean;
  tool: NebrasToolName;
  action: string;
  mode: 'executed' | 'dry_run_simulation' | 'stub_simulation' | 'error';
  summaryAr: string;
  impact?: ImpactSummary;
  data?: T;
  error?: string;
}

export type NebrasToolName =
  | 'manageCatalog'
  | 'pricingManager'
  | 'inventoryManager'
  | 'supplierManager'
  | 'fulfillmentManager'
  | 'promotionsManager'
  | 'customerManager'
  | 'businessIntelligence'
  | 'systemManager'
  | 'mediaManager';

// ============================================================================
// 2. Unified Tool Schemas (Function Calling / MCP Format)
// ============================================================================

export interface NebrasToolDefinition {
  name: NebrasToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const NEBRAS_MANAGER_TOOL_SCHEMAS: NebrasToolDefinition[] = [
  {
    name: 'manageCatalog',
    description:
      'إدارة الكتالوج الموحدة: إنشاء، تحديث، أرشفة، أو عرض المنتجات والأقسام في جدولي products و categories.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'update', 'archive', 'list'],
          description: 'العملية المطلوبة على الكتالوج',
        },
        entity: {
          type: 'string',
          enum: ['product', 'category'],
          description: 'الكيان المستهدف (منتج أو قسم)',
        },
        id: { type: 'string', description: 'معرّف المنتج أو القسم للتحديث أو الأرشفة' },
        payload: {
          type: 'object',
          description:
            'بيانات المنتج أو القسم (name, name_ar, price, stock, stock_quantity, category_id, unit, unit_label, image_url, is_active, slug)',
        },
        search: { type: 'string', description: 'كلمة بحث بالعربية أو الإنجليزية عند action=list' },
        limit: { type: 'number', description: 'الحد الأقصى للنتائج (افتراضي 20)' },
        confirmed: {
          type: 'boolean',
          description: 'يجب أن يكون true لتنفيذ التعديلات الفعلية، وإلا يتم حساب الأثر فقط',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'pricingManager',
    description:
      'إدارة التسعير الذكية: تعديل سعر منتج، تطبيق زيادة/خصم نسبة مئوية جماعية، أو التراجع للسعر السابق (old_price).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update_price', 'bulk_percent_change', 'rollback'],
          description: 'نوع عملية التسعير',
        },
        productId: { type: 'string', description: 'معرّف المنتج (في حالة update_price)' },
        newPrice: { type: 'number', description: 'السعر الجديد بالجنيه المصري EGP' },
        categoryId: { type: 'string', description: 'فلترة حسب القسم في التعديل الجماعي' },
        percentChange: {
          type: 'number',
          description: 'نسبة التغيير المئوية (موجبة للزيادة مثل 10، وسالبة للخصم مثل -15)',
        },
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'قائمة معرّفات منتجات محددة للتعديل الجماعي أو التراجع',
        },
        confirmed: {
          type: 'boolean',
          description: 'بوابة الأمان: false لمحاكاة الأثر، true لتطبيق الأسعار فعلياً',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'inventoryManager',
    description:
      'إدارة المخزون: فحص نواقص المخزون من products، تعديل الرصيد (stock و stock_quantity)، أو محاكاة تحويل بضاعة بين الفروع.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check_low_stock', 'adjust_stock', 'simulate_transfer'],
          description: 'إجراء المخزون المطلوب',
        },
        threshold: { type: 'number', description: 'حد التنبيه للنواقص (افتراضي 5)' },
        productId: { type: 'string', description: 'معرّف المنتج' },
        quantityDelta: { type: 'number', description: 'مقدار التعديل (+ للإضافة أو - للخصم)' },
        fromBranch: { type: 'string', description: 'الفرع المصدر في حالة التحويل' },
        toBranch: { type: 'string', description: 'الفرع المستلم في حالة التحويل' },
        confirmed: { type: 'boolean', description: 'تأكيد تعديل الرصيد الفعلي في قاعدة البيانات' },
      },
      required: ['action'],
    },
  },
  {
    name: 'supplierManager',
    description:
      'إدارة الموردين وأوامر الشراء (محاكاة جاهزة للربط مع جدول purchase_orders فور ترحيله).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create_po', 'receive_goods'],
          description: 'إجراء الموردين وأوامر الشراء',
        },
        supplierName: { type: 'string', description: 'اسم المورد' },
        poId: { type: 'string', description: 'رقم أمر الشراء عند الاستلام' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
              unitCost: { type: 'number' },
            },
          },
          description: 'بنود أمر الشراء بالجنيه EGP',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'fulfillmentManager',
    description:
      'إدارة التجهيز والتوصيل: استعراض الطلبات المعلقة من جدول orders، ومحاكاة إسناد السائقين وتتبع الشحنات.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list_pending_orders', 'assign_driver', 'track_delivery'],
          description: 'إجراء التوصيل والتجهيز',
        },
        orderId: { type: 'string', description: 'معرّف الطلب (UUID)' },
        driverId: { type: 'string', description: 'معرّف السائق المقترح' },
        driverName: { type: 'string', description: 'اسم السائق' },
        limit: { type: 'number', description: 'عدد الطلبات المطلوب عرضها' },
      },
      required: ['action'],
    },
  },
  {
    name: 'promotionsManager',
    description:
      'إدارة العروض واسترداد السلال: إنشاء وعرض الكوبونات في جدول coupons، وتحليل السلال المتروكة من abandoned_carts.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create_coupon', 'list_coupons', 'abandoned_cart_blast'],
          description: 'إجراء العروض والكوبونات',
        },
        code: { type: 'string', description: 'كود الكوبون (مثل WADI20)' },
        discountType: { type: 'string', enum: ['percent', 'fixed'] },
        discountValue: { type: 'number', description: 'قيمة أو نسبة الخصم' },
        minOrderAmount: { type: 'number', description: 'الحد الأدنى للطلب بالجنيه EGP' },
        maxUses: { type: 'number', description: 'الحد الأقصى للاستخدام' },
        firstOrderOnly: { type: 'boolean', description: 'هل الكوبون للطلب الأول فقط' },
        minCartValue: { type: 'number', description: 'فلترة السلال المتروكة الأعلى من هذه القيمة' },
        confirmed: { type: 'boolean', description: 'تأكيد إنشاء الكوبون أو إطلاق حملة الاسترداد' },
      },
      required: ['action'],
    },
  },
  {
    name: 'customerManager',
    description:
      'إدارة العملاء: عرض ملف العميل وسجل طلباته من profiles و orders، ومحاكاة المحفظة ونقاط الولاء.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['view_profile', 'adjust_wallet', 'loyalty_summary'],
          description: 'الإجراء المطلوب على حساب العميل',
        },
        userId: { type: 'string', description: 'معرّف العميل (UUID)' },
        phoneOrName: { type: 'string', description: 'رقم الهاتف أو اسم العميل للبحث في profiles' },
        walletDeltaEGP: { type: 'number', description: 'قيمة الإضافة أو الخصم للمحفظة بالجنيه EGP' },
        reason: { type: 'string', description: 'سبب تعديل المحفظة' },
      },
      required: ['action'],
    },
  },
  {
    name: 'businessIntelligence',
    description:
      'ذكاء الأعمال والتقارير: تحليل الإيرادات من orders، الأكثر مبيعاً من order_items، والمنتجات الراكدة من products.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['revenue_report', 'top_selling', 'dead_stock'],
          description: 'نوع التقرير التحليلي',
        },
        days: { type: 'number', description: 'الفترة الزمنية بالأيام (افتراضي 30)' },
        limit: { type: 'number', description: 'عدد العناصر في الترتيب (افتراضي 10)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'systemManager',
    description:
      'إدارة إعدادات المتجر: تحديث شريط الإعلانات، ألوان الهوية، أو حالة المتجر في جدول store_settings.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update_banner', 'update_colors', 'store_status'],
          description: 'إجراء إعدادات النظام',
        },
        settingsPayload: {
          type: 'object',
          description:
            'الحقول المطابقة لـ StoreSettingsRow (مثل announcement_text, announcement_enabled, hero_title, hero_image_url, primary_color, accent_color, allow_signups)',
        },
        confirmed: { type: 'boolean', description: 'تأكيد حفظ التغييرات في store_settings' },
      },
      required: ['action'],
    },
  },
  {
    name: 'mediaManager',
    description:
      'إدارة الوسائط والصور: توليد صور احترافية للمنتجات بالذكاء الاصطناعي عبر generateAdminImage أو تحديث hero_image_url.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['generate_image', 'upload_banner'],
          description: 'إجراء الوسائط',
        },
        productName: { type: 'string', description: 'اسم المنتج باللغة العربية لتوليد الصورة' },
        promptDetails: { type: 'string', description: 'وصف بصري إضافي للصورة أو البنر' },
        aspectRatio: { type: 'string', enum: ['1:1', '16:9'], description: 'أبعاد الصورة' },
        productId: { type: 'string', description: 'معرّف المنتج لربط الصورة به اختيارياً' },
        bannerUrl: { type: 'string', description: 'رابط صورة البنر المرفوعة' },
        confirmed: { type: 'boolean', description: 'تأكيد ربط الصورة بالمنتج أو البنر' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// 3. Helper Utilities
// ============================================================================

const roundEGP = (val: number): number => Math.round(val * 100) / 100;

const getEffectiveStock = (p: Pick<ProductRow, 'stock' | 'stock_quantity'>): number =>
  Number(p.stock ?? p.stock_quantity ?? 0);

// ============================================================================
// 4. Tool Implementations (10 Unified Managers)
// ============================================================================

/**
 * 1. manageCatalog
 * Queries and mutates existing `products` and `categories` tables.
 */
export async function manageCatalog(params: {
  action: 'create' | 'update' | 'archive' | 'list';
  entity?: 'product' | 'category';
  id?: string;
  payload?: Record<string, unknown>;
  search?: string;
  limit?: number;
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const { action, entity = 'product', id, payload = {}, search, limit = 20, confirmed = false } = params;
  const tableName = entity === 'category' ? 'categories' : 'products';

  try {
    if (action === 'list') {
      let query = supabase.from(tableName as any).select('*').limit(limit);
      if (search && search.trim()) {
        const term = search.trim();
        query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;

      return {
        ok: true,
        tool: 'manageCatalog',
        action,
        mode: 'executed',
        summaryAr: `تم جلب ${data?.length ?? 0} سجل من جدول ${tableName}.`,
        data,
      };
    }

    // Critical mutations require confirmed === true
    if (!confirmed) {
      let existingRecord: Record<string, unknown> | null = null;
      if (id) {
        const { data } = await supabase.from(tableName as any).select('*').eq('id', id).maybeSingle();
        existingRecord = data as Record<string, unknown> | null;
      }

      const proposed =
        action === 'archive'
          ? entity === 'product'
            ? { is_active: false }
            : { sort_order: -1 }
          : payload;

      return {
        ok: true,
        tool: 'manageCatalog',
        action,
        mode: 'dry_run_simulation',
        summaryAr: `محاكاة عملية (${action}) على (${entity}) — بانتظار تأكيدك لتنفيذ التعديل الفعلي.`,
        impact: {
          affectedRecordsCount: 1,
          riskLevel: action === 'archive' ? 'high' : 'medium',
          requiresConfirmation: true,
          previewDiff: [
            {
              targetTable: tableName,
              id: id ?? 'NEW_RECORD',
              before: existingRecord,
              proposedChanges: proposed,
            },
          ],
        },
      };
    }

    // Normalize product stock fields if creating/updating a product
    const normalizedPayload: Record<string, unknown> = { ...payload };
    if (entity === 'product') {
      if (typeof normalizedPayload.stock === 'number' && normalizedPayload.stock_quantity === undefined) {
        normalizedPayload.stock_quantity = normalizedPayload.stock;
      } else if (
        typeof normalizedPayload.stock_quantity === 'number' &&
        normalizedPayload.stock === undefined
      ) {
        normalizedPayload.stock = normalizedPayload.stock_quantity;
      }
    }

    if (action === 'create') {
      const { data, error } = await supabase
        .from(tableName as any)
        .insert(normalizedPayload)
        .select()
        .single();
      if (error) throw error;

      return {
        ok: true,
        tool: 'manageCatalog',
        action,
        mode: 'executed',
        summaryAr: `تم إنشاء السجل بنجاح في جدول ${tableName}.`,
        data,
      };
    }

    if (action === 'update') {
      if (!id) throw new Error('معرّف السجل (id) مطلوب لعملية التحديث.');
      const { data, error } = await supabase
        .from(tableName as any)
        .update(normalizedPayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return {
        ok: true,
        tool: 'manageCatalog',
        action,
        mode: 'executed',
        summaryAr: `تم تحديث السجل (${id}) في جدول ${tableName}.`,
        data,
      };
    }

    if (action === 'archive') {
      if (!id) throw new Error('معرّف السجل (id) مطلوب لعملية الأرشفة.');
      if (entity === 'category') {
        // CategoryRow has no `is_active` column in schema contract; move to end via sort_order
        const { data, error } = await supabase
          .from('categories')
          .update({ sort_order: -1 })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return {
          ok: true,
          tool: 'manageCatalog',
          action,
          mode: 'executed',
          summaryAr: `تمت أرشفة القسم (${id}) وتعيين ترتيبه إلى -1.`,
          data,
        };
      }

      const { data, error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return {
        ok: true,
        tool: 'manageCatalog',
        action,
        mode: 'executed',
        summaryAr: `تمت أرشفة المنتج (${id}) وإخفاؤه من الواجهة (is_active = false).`,
        data,
      };
    }

    throw new Error(`إجراء غير مدعوم: ${action}`);
  } catch (err: any) {
    return {
      ok: false,
      tool: 'manageCatalog',
      action,
      mode: 'error',
      summaryAr: 'تعذر تنفيذ عملية الكتالوج.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 2. pricingManager
 * Modifies `products.price` while preserving `products.old_price`, computing
 * exact affected count, average price delta, and financial impact in EGP.
 */
export async function pricingManager(params: {
  action: 'update_price' | 'bulk_percent_change' | 'rollback';
  productId?: string;
  newPrice?: number;
  categoryId?: string;
  percentChange?: number;
  productIds?: string[];
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const {
    action,
    productId,
    newPrice,
    categoryId,
    percentChange,
    productIds,
    confirmed = false,
  } = params;

  try {
    let query = supabase
      .from('products')
      .select('id, name, name_ar, price, old_price, original_price, stock, stock_quantity, category_id');

    if (action === 'update_price') {
      if (!productId || typeof newPrice !== 'number' || newPrice < 0) {
        throw new Error('يجب تحديد productId وسعر جديد صالح بالجنيه (newPrice).');
      }
      query = query.eq('id', productId);
    } else if (productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    } else if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: targets, error } = await query;
    if (error) throw error;

    const products = (targets ?? []) as Array<
      Pick<
        ProductRow,
        'id' | 'name' | 'name_ar' | 'price' | 'old_price' | 'original_price' | 'stock' | 'stock_quantity' | 'category_id'
      >
    >;

    if (products.length === 0) {
      return {
        ok: true,
        tool: 'pricingManager',
        action,
        mode: 'dry_run_simulation',
        summaryAr: 'لم يتم العثور على منتجات مطابقة لمعايير التسعير المحددة.',
        impact: {
          affectedRecordsCount: 0,
          riskLevel: 'low',
          requiresConfirmation: false,
        },
      };
    }

    const computedChanges = products
      .map((p) => {
        const currentPrice = Number(p.price ?? 0);
        let nextPrice = currentPrice;
        let nextOldPrice: number | null = currentPrice;
        let isOnSale = false;

        if (action === 'update_price') {
          nextPrice = roundEGP(newPrice!);
          isOnSale = nextPrice < currentPrice;
        } else if (action === 'bulk_percent_change') {
          if (typeof percentChange !== 'number') {
            throw new Error('يجب تحديد نسبة التغيير المئوية (percentChange).');
          }
          nextPrice = roundEGP(currentPrice * (1 + percentChange / 100));
          isOnSale = percentChange < 0;
        } else if (action === 'rollback') {
          const fallbackPrev = p.old_price ?? p.original_price;
          if (fallbackPrev == null || Number(fallbackPrev) <= 0) return null;
          nextPrice = roundEGP(Number(fallbackPrev));
          nextOldPrice = null;
          isOnSale = false;
        }

        const delta = roundEGP(nextPrice - currentPrice);
        const qty = getEffectiveStock(p);
        const stockValueDelta = roundEGP(delta * qty);

        return {
          id: p.id,
          name_ar: p.name_ar ?? p.name,
          beforePriceEGP: currentPrice,
          afterPriceEGP: nextPrice,
          savedOldPriceEGP: nextOldPrice,
          isOnSale,
          deltaEGP: delta,
          stockInventoryValueDeltaEGP: stockValueDelta,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.deltaEGP !== 0);

    const affectedCount = computedChanges.length;
    const totalDelta = computedChanges.reduce((acc, item) => acc + item.deltaEGP, 0);
    const avgChangeEGP = affectedCount > 0 ? roundEGP(totalDelta / affectedCount) : 0;
    const totalInventoryValuationImpact = roundEGP(
      computedChanges.reduce((acc, item) => acc + item.stockInventoryValueDeltaEGP, 0)
    );

    if (!confirmed) {
      return {
        ok: true,
        tool: 'pricingManager',
        action,
        mode: 'dry_run_simulation',
        summaryAr: `محاكاة التسعير: سيتأثر ${affectedCount} منتج بمتوسط تغير ${avgChangeEGP > 0 ? '+' : ''}${avgChangeEGP} ج.م للوحدة. بانتظار تأكيدك للتنفيذ.`,
        impact: {
          affectedRecordsCount: affectedCount,
          estimatedFinancialImpactEGP: totalInventoryValuationImpact,
          riskLevel: affectedCount > 10 ? 'critical' : 'high',
          requiresConfirmation: true,
          previewDiff: computedChanges.slice(0, 15),
          warnings:
            affectedCount > 25
              ? ['تعديل جماعي واسع النطاق — يُنصح بمراجعة العينة أعلاه قبل الاعتماد.']
              : undefined,
        },
        data: {
          affectedCount,
          averagePriceDeltaEGP: avgChangeEGP,
          inventoryValuationImpactEGP: totalInventoryValuationImpact,
        },
      };
    }

    let updatedCount = 0;
    for (const change of computedChanges) {
      const { error: updateErr } = await supabase
        .from('products')
        .update({
          price: change.afterPriceEGP,
          old_price: change.savedOldPriceEGP,
          is_on_sale: change.isOnSale,
        })
        .eq('id', change.id);

      if (!updateErr) updatedCount += 1;
    }

    return {
      ok: true,
      tool: 'pricingManager',
      action,
      mode: 'executed',
      summaryAr: `تم تحديث أسعار ${updatedCount} منتج بنجاح وحفظ السعر السابق في old_price (متوسط التغير: ${avgChangeEGP} ج.م).`,
      impact: {
        affectedRecordsCount: updatedCount,
        estimatedFinancialImpactEGP: totalInventoryValuationImpact,
        riskLevel: 'high',
        requiresConfirmation: false,
      },
      data: {
        updatedCount,
        averagePriceDeltaEGP: avgChangeEGP,
        changes: computedChanges,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'pricingManager',
      action,
      mode: 'error',
      summaryAr: 'فشلت عملية إدارة التسعير.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 3. inventoryManager
 * Checks low stock from `products`, synchronizes `stock` & `stock_quantity`,
 * and simulates inter-branch transfers.
 */
export async function inventoryManager(params: {
  action: 'check_low_stock' | 'adjust_stock' | 'simulate_transfer';
  threshold?: number;
  productId?: string;
  quantityDelta?: number;
  fromBranch?: string;
  toBranch?: string;
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const {
    action,
    threshold = 5,
    productId,
    quantityDelta = 0,
    fromBranch = 'الفرع الرئيسي - العاشر من رمضان',
    toBranch = 'فرع المجاورة 14',
    confirmed = false,
  } = params;

  try {
    if (action === 'check_low_stock') {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, stock, stock_quantity, low_stock_threshold, price, unit_label, is_active')
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      const allActive = (data ?? []) as Array<
        Pick<
          ProductRow,
          'id' | 'name' | 'name_ar' | 'stock' | 'stock_quantity' | 'low_stock_threshold' | 'price' | 'unit_label' | 'is_active'
        >
      >;

      const lowItems = allActive.filter((item) => {
        const qty = getEffectiveStock(item);
        const itemLimit = threshold ?? item.low_stock_threshold ?? 5;
        return qty <= itemLimit;
      });

      const outOfStockCount = lowItems.filter((i) => getEffectiveStock(i) <= 0).length;

      return {
        ok: true,
        tool: 'inventoryManager',
        action,
        mode: 'executed',
        summaryAr: `تم رصد ${lowItems.length} صنف منخفض المخزون (حد التنبيه ≤ ${threshold})، منها ${outOfStockCount} صنف نفد بالكامل.`,
        data: {
          threshold,
          totalLowStock: lowItems.length,
          outOfStockCount,
          items: lowItems,
        },
      };
    }

    if (action === 'adjust_stock') {
      if (!productId) throw new Error('يجب تحديد معرّف المنتج (productId).');
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, name_ar, stock, stock_quantity, price')
        .eq('id', productId)
        .single();

      if (error || !product) throw new Error('المنتج غير موجود.');
      const typedProduct = product as Pick<ProductRow, 'id' | 'name' | 'name_ar' | 'stock' | 'stock_quantity' | 'price'>;
      const currentStock = getEffectiveStock(typedProduct);
      const nextStock = Math.max(0, currentStock + quantityDelta);
      const valueImpact = roundEGP((nextStock - currentStock) * Number(typedProduct.price ?? 0));
      const displayName = typedProduct.name_ar ?? typedProduct.name;

      if (!confirmed) {
        return {
          ok: true,
          tool: 'inventoryManager',
          action,
          mode: 'dry_run_simulation',
          summaryAr: `محاكاة تعديل مخزون "${displayName}" من ${currentStock} إلى ${nextStock}. بانتظار التأكيد.`,
          impact: {
            affectedRecordsCount: 1,
            estimatedFinancialImpactEGP: valueImpact,
            riskLevel: 'medium',
            requiresConfirmation: true,
            previewDiff: [
              {
                id: typedProduct.id,
                name_ar: displayName,
                beforeStock: currentStock,
                afterStock: nextStock,
                delta: nextStock - currentStock,
              },
            ],
          },
        };
      }

      const { data: updated, error: updErr } = await supabase
        .from('products')
        .update({ stock: nextStock, stock_quantity: nextStock })
        .eq('id', productId)
        .select('id, name, name_ar, stock, stock_quantity')
        .single();

      if (updErr) throw updErr;

      return {
        ok: true,
        tool: 'inventoryManager',
        action,
        mode: 'executed',
        summaryAr: `تم تحديث رصيد "${displayName}" إلى ${nextStock} وحدة.`,
        data: updated,
      };
    }

    if (action === 'simulate_transfer') {
      // TODO: Connect to table branch_inventory & stock_transfers once migration is applied
      const qty = Math.abs(quantityDelta || 10);
      let productInfo = { id: productId ?? 'SAMPLE-SKU', name_ar: 'صنف مختار للتحويل', price: 50, stock: 40 };

      if (productId) {
        const { data } = await supabase
          .from('products')
          .select('id, name, name_ar, price, stock, stock_quantity')
          .eq('id', productId)
          .maybeSingle();
        if (data) {
          const p = data as Pick<ProductRow, 'id' | 'name' | 'name_ar' | 'price' | 'stock' | 'stock_quantity'>;
          productInfo = {
            id: p.id,
            name_ar: p.name_ar ?? p.name,
            price: Number(p.price ?? 0),
            stock: getEffectiveStock(p),
          };
        }
      }

      const transferValue = roundEGP(qty * productInfo.price);
      const hasEnoughStock = productInfo.stock >= qty;

      return {
        ok: true,
        tool: 'inventoryManager',
        action,
        mode: 'stub_simulation',
        summaryAr: `محاكاة تحويل ${qty} وحدة من "${productInfo.name_ar}" من (${fromBranch}) إلى (${toBranch}).`,
        impact: {
          affectedRecordsCount: 1,
          estimatedFinancialImpactEGP: transferValue,
          riskLevel: hasEnoughStock ? 'low' : 'high',
          requiresConfirmation: true,
          warnings: hasEnoughStock
            ? ['وضع المحاكاة: سيتم ربط التحويلات الفعلية فور ترحيل جدول stock_transfers.']
            : [`الكمية المطلوبة (${qty}) تتجاوز الرصيد المتاح حالياً (${productInfo.stock}).`],
        },
        data: {
          transferReference: `TRF-SIM-${Date.now().toString().slice(-6)}`,
          fromBranch,
          toBranch,
          product: productInfo,
          requestedQuantity: qty,
          estimatedGoodsValueEGP: transferValue,
          canFulfillFromCurrentStock: hasEnoughStock,
        },
      };
    }

    throw new Error(`إجراء غير مدعوم: ${action}`);
  } catch (err: any) {
    return {
      ok: false,
      tool: 'inventoryManager',
      action,
      mode: 'error',
      summaryAr: 'حدث خطأ في إدارة المخزون.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 4. supplierManager
 * Dry-Run & Impact Simulation Stub ready for `suppliers` and `purchase_orders` tables.
 */
export async function supplierManager(params: {
  action: 'list' | 'create_po' | 'receive_goods';
  supplierName?: string;
  poId?: string;
  items?: Array<{ productId: string; quantity: number; unitCost: number }>;
}): Promise<NebrasToolResult> {
  const { action, supplierName = 'شركة النيل لتوزيع السلع الغذائية', poId, items = [] } = params;

  // TODO: Connect to table suppliers & purchase_orders once migration is applied
  if (action === 'list') {
    const simulatedSuppliers = [
      { id: 'SUP-01', name: 'شركة النيل لتوزيع السلع الغذائية', leadTimeDays: 2, rating: 4.8, activePOs: 1 },
      { id: 'SUP-02', name: 'مزارع الوادي للخضر والفاكهة', leadTimeDays: 1, rating: 4.9, activePOs: 2 },
      { id: 'SUP-03', name: 'المتحدة للألبان والمجمدات', leadTimeDays: 3, rating: 4.6, activePOs: 0 },
    ];

    return {
      ok: true,
      tool: 'supplierManager',
      action,
      mode: 'stub_simulation',
      summaryAr: `تم عرض ${simulatedSuppliers.length} موردين معتمدين (بيانات محاكاة لحين ربط جدول suppliers).`,
      data: simulatedSuppliers,
    };
  }

  if (action === 'create_po') {
    const effectiveItems =
      items.length > 0
        ? items
        : [
            { productId: 'SIM-PROD-1', quantity: 50, unitCost: 35 },
            { productId: 'SIM-PROD-2', quantity: 30, unitCost: 60 },
          ];

    const totalCostEGP = roundEGP(
      effectiveItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
    );
    const totalUnits = effectiveItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ok: true,
      tool: 'supplierManager',
      action,
      mode: 'stub_simulation',
      summaryAr: `محاكاة أمر شراء للمورد "${supplierName}" بإجمالي ${totalUnits} وحدة وتكلفة تقديرية ${totalCostEGP} ج.م.`,
      impact: {
        affectedRecordsCount: effectiveItems.length,
        estimatedFinancialImpactEGP: -totalCostEGP,
        riskLevel: 'medium',
        requiresConfirmation: true,
        warnings: ['وضع المحاكاة: جاهز للربط المباشر مع جدول purchase_orders بعد الترحيل.'],
      },
      data: {
        simulatedPoNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName,
        itemsCount: effectiveItems.length,
        totalUnits,
        estimatedTotalCostEGP: totalCostEGP,
        status: 'DRAFT_SIMULATED',
      },
    };
  }

  return {
    ok: true,
    tool: 'supplierManager',
    action,
    mode: 'stub_simulation',
    summaryAr: `محاكاة استلام بضائع لأمر الشراء (${poId ?? 'PO-SIM-001'}) وتحديث أرصدة المخزون المتوقعة.`,
    impact: {
      affectedRecordsCount: items.length || 1,
      riskLevel: 'low',
      requiresConfirmation: true,
    },
    data: {
      poId: poId ?? 'PO-SIM-001',
      receivedAt: new Date().toISOString(),
      status: 'RECEIVED_SIMULATED',
    },
  };
}

/**
 * 5. fulfillmentManager
 * Reads real pending orders from `orders` table (using `OrderRow` columns)
 * and simulates driver assignment/tracking.
 */
export async function fulfillmentManager(params: {
  action: 'list_pending_orders' | 'assign_driver' | 'track_delivery';
  orderId?: string;
  driverId?: string;
  driverName?: string;
  limit?: number;
}): Promise<NebrasToolResult> {
  const { action, orderId, driverId = 'DRV-104', driverName = 'كابتن أحمد محمود', limit = 15 } = params;

  try {
    if (action === 'list_pending_orders') {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, customer_name, phone, address, status, total_amount, delivery_slot, tracking_token, created_at, user_id'
        )
        .in('status', ['pending', 'confirmed', 'processing', 'picked'])
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      const pending = (data ?? []) as Array<
        Pick<
          OrderRow,
          | 'id'
          | 'customer_name'
          | 'phone'
          | 'address'
          | 'status'
          | 'total_amount'
          | 'delivery_slot'
          | 'tracking_token'
          | 'created_at'
          | 'user_id'
        >
      >;
      const totalValue = roundEGP(pending.reduce((s, o) => s + Number(o.total_amount ?? 0), 0));

      return {
        ok: true,
        tool: 'fulfillmentManager',
        action,
        mode: 'executed',
        summaryAr: `يوجد ${pending.length} طلب قيد الانتظار والتجهيز بقيمة إجمالية ${totalValue} ج.م.`,
        data: {
          count: pending.length,
          totalPendingValueEGP: totalValue,
          orders: pending,
        },
      };
    }

    // TODO: Connect to table delivery_assignments & drivers once migration is applied
    if (action === 'assign_driver') {
      let targetOrder: Partial<OrderRow> | null = null;
      if (orderId) {
        const { data } = await supabase
          .from('orders')
          .select('id, customer_name, phone, address, status, total_amount, tracking_token')
          .eq('id', orderId)
          .maybeSingle();
        targetOrder = data as Partial<OrderRow> | null;
      }

      const orderRef = targetOrder?.tracking_token ?? targetOrder?.id ?? orderId ?? 'غير محدد';

      return {
        ok: true,
        tool: 'fulfillmentManager',
        action,
        mode: 'stub_simulation',
        summaryAr: `محاكاة إسناد الطلب (${orderRef}) للعميل ${targetOrder?.customer_name ?? ''} إلى ${driverName}.`,
        impact: {
          affectedRecordsCount: 1,
          riskLevel: 'low',
          requiresConfirmation: true,
          warnings: ['وضع المحاكاة: سيتم ربط التعيين بجدول delivery_assignments فور ترحيله.'],
        },
        data: {
          order: targetOrder ?? { id: orderId ?? 'SIM-ORD' },
          assignedDriver: { id: driverId, name: driverName, vehicle: 'موتوسيكل توصيل سريع' },
          estimatedPickupMinutes: 8,
          estimatedDeliveryMinutes: 25,
        },
      };
    }

    return {
      ok: true,
      tool: 'fulfillmentManager',
      action,
      mode: 'stub_simulation',
      summaryAr: `محاكاة تتبع الشحنة للطلب (${orderId ?? 'الحالي'}): السائق في الطريق إلى العميل.`,
      data: {
        orderId: orderId ?? 'SIM-ORD',
        driverName,
        currentStage: 'out_for_delivery',
        etaMinutes: 14,
        lastPing: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'fulfillmentManager',
      action,
      mode: 'error',
      summaryAr: 'تعذر تنفيذ إجراء التجهيز والتوصيل.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 6. promotionsManager
 * Manages `coupons` (`discount_type: 'percent' | 'fixed'`)
 * and analyzes unrecovered carts from `abandoned_carts` (`total`, `recovered`).
 */
export async function promotionsManager(params: {
  action: 'create_coupon' | 'list_coupons' | 'abandoned_cart_blast';
  code?: string;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  minOrderAmount?: number;
  maxUses?: number;
  firstOrderOnly?: boolean;
  minCartValue?: number;
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const {
    action,
    code,
    discountType = 'percent',
    discountValue = 10,
    minOrderAmount = 150,
    maxUses = 100,
    firstOrderOnly = false,
    minCartValue = 100,
    confirmed = false,
  } = params;

  try {
    if (action === 'list_coupons') {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      return {
        ok: true,
        tool: 'promotionsManager',
        action,
        mode: 'executed',
        summaryAr: `تم جلب ${data?.length ?? 0} كوبون خصم من قاعدة البيانات.`,
        data: data as CouponRow[],
      };
    }

    if (action === 'create_coupon') {
      if (!code || !code.trim()) throw new Error('يجب إدخال كود الكوبون (code).');
      const normalizedCode = code.trim().toUpperCase();

      const newCouponPayload: Partial<CouponRow> = {
        code: normalizedCode,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minOrderAmount,
        max_uses: maxUses,
        first_order_only: firstOrderOnly,
        is_active: true,
      };

      if (!confirmed) {
        return {
          ok: true,
          tool: 'promotionsManager',
          action,
          mode: 'dry_run_simulation',
          summaryAr: `محاكاة إنشاء كوبون (${normalizedCode}) بخصم ${discountValue}${discountType === 'percent' ? '%' : ' ج.م'}. بانتظار التأكيد.`,
          impact: {
            affectedRecordsCount: 1,
            estimatedFinancialImpactEGP:
              discountType === 'fixed' ? -roundEGP(discountValue * maxUses) : undefined,
            riskLevel: 'medium',
            requiresConfirmation: true,
            previewDiff: [newCouponPayload],
          },
        };
      }

      const { data, error } = await supabase
        .from('coupons')
        .insert(newCouponPayload as any)
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        tool: 'promotionsManager',
        action,
        mode: 'executed',
        summaryAr: `تم تفعيل الكوبون (${normalizedCode}) بنجاح في جدول coupons.`,
        data,
      };
    }

    if (action === 'abandoned_cart_blast') {
      const { data: carts, error } = await supabase
        .from('abandoned_carts')
        .select('id, user_id, phone, total, recovered, reminded_at, created_at')
        .gte('total', minCartValue)
        .or('recovered.is.null,recovered.eq.false')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const eligibleCarts = (carts ?? []) as Array<
        Pick<AbandonedCartRow, 'id' | 'user_id' | 'phone' | 'total' | 'recovered' | 'reminded_at' | 'created_at'>
      >;
      const totalRecoverableRevenue = roundEGP(
        eligibleCarts.reduce((sum, c) => sum + Number(c.total ?? 0), 0)
      );

      if (confirmed && eligibleCarts.length > 0) {
        const ids = eligibleCarts.map((c) => c.id);
        await supabase
          .from('abandoned_carts')
          .update({ reminded_at: new Date().toISOString() })
          .in('id', ids);
      }

      return {
        ok: true,
        tool: 'promotionsManager',
        action,
        mode: confirmed ? 'executed' : 'dry_run_simulation',
        summaryAr: confirmed
          ? `تم تسجيل إرسال تذكير استرداد لـ ${eligibleCarts.length} سلة متروكة بقيمة إجمالية ${totalRecoverableRevenue} ج.م.`
          : `محاكاة حملة استرداد السلال: تم رصد ${eligibleCarts.length} سلة متروكة غير مستردة بقيمة ${totalRecoverableRevenue} ج.م.`,
        impact: {
          affectedRecordsCount: eligibleCarts.length,
          estimatedFinancialImpactEGP: totalRecoverableRevenue,
          riskLevel: 'low',
          requiresConfirmation: !confirmed,
          previewDiff: eligibleCarts.slice(0, 10) as Array<Record<string, unknown>>,
        },
        data: {
          eligibleCartsCount: eligibleCarts.length,
          totalRecoverableRevenueEGP: totalRecoverableRevenue,
          carts: eligibleCarts,
        },
      };
    }

    throw new Error(`إجراء غير مدعوم: ${action}`);
  } catch (err: any) {
    return {
      ok: false,
      tool: 'promotionsManager',
      action,
      mode: 'error',
      summaryAr: 'حدث خطأ في إدارة العروض والكوبونات.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 7. customerManager
 * Reads customer profiles from `profiles` (ONLY `id`, `full_name`, `phone` — NO `email` column)
 * + order stats from `orders`, and simulates wallet/loyalty operations.
 */
export async function customerManager(params: {
  action: 'view_profile' | 'adjust_wallet' | 'loyalty_summary';
  userId?: string;
  phoneOrName?: string;
  walletDeltaEGP?: number;
  reason?: string;
}): Promise<NebrasToolResult> {
  const { action, userId, phoneOrName, walletDeltaEGP = 0, reason = 'تعويض خدمة عملاء' } = params;

  try {
    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, birth_date, is_blocked, created_at, updated_at');

    if (userId) {
      profileQuery = profileQuery.eq('id', userId);
    } else if (phoneOrName && phoneOrName.trim()) {
      const term = phoneOrName.trim();
      // IMPORTANT: `profiles` has NO `email` column per DATABASE_SCHEMA_CONTRACT.ts
      profileQuery = profileQuery.or(`phone.ilike.%${term}%,full_name.ilike.%${term}%`);
    } else {
      profileQuery = profileQuery.limit(1);
    }

    const { data: profile, error } = await profileQuery.maybeSingle();
    if (error) throw error;

    if (!profile) {
      return {
        ok: false,
        tool: 'customerManager',
        action,
        mode: 'error',
        summaryAr: 'لم يتم العثور على ملف عميل مطابق في جدول profiles.',
      };
    }

    const typedProfile = profile as ProfileRow;

    const { data: customerOrders } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('user_id', typedProfile.id);

    const ordersList = (customerOrders ?? []) as Array<
      Pick<OrderRow, 'id' | 'total_amount' | 'status' | 'created_at'>
    >;
    const totalSpentEGP = roundEGP(ordersList.reduce((s, o) => s + Number(o.total_amount ?? 0), 0));
    const displayName = typedProfile.full_name ?? typedProfile.phone ?? typedProfile.id;

    if (action === 'view_profile') {
      return {
        ok: true,
        tool: 'customerManager',
        action,
        mode: 'executed',
        summaryAr: `ملف العميل ${displayName}: إجمالي ${ordersList.length} طلب بقيمة ${totalSpentEGP} ج.م.`,
        data: {
          profile: typedProfile,
          stats: {
            ordersCount: ordersList.length,
            totalSpentEGP,
            recentOrders: ordersList.slice(0, 5),
          },
        },
      };
    }

    if (action === 'adjust_wallet') {
      // TODO: Connect to table customer_wallets & wallet_transactions once migration is applied
      return {
        ok: true,
        tool: 'customerManager',
        action,
        mode: 'stub_simulation',
        summaryAr: `محاكاة تعديل محفظة العميل (${displayName}) بمقدار ${walletDeltaEGP > 0 ? '+' : ''}${walletDeltaEGP} ج.م.`,
        impact: {
          affectedRecordsCount: 1,
          estimatedFinancialImpactEGP: -walletDeltaEGP,
          riskLevel: 'medium',
          requiresConfirmation: true,
          warnings: ['وضع المحاكاة: سيتم ربط الرصيد الفعلي فور ترحيل جدول customer_wallets.'],
        },
        data: {
          userId: typedProfile.id,
          customerName: displayName,
          phone: typedProfile.phone,
          deltaEGP: walletDeltaEGP,
          reason,
        },
      };
    }

    // TODO: Connect to table loyalty_ledger once migration is applied
    const estimatedPoints = Math.floor(totalSpentEGP / 10);
    const tier =
      totalSpentEGP >= 5000 ? 'ذهبي (Gold)' : totalSpentEGP >= 1500 ? 'فضي (Silver)' : 'أساسي (Standard)';

    return {
      ok: true,
      tool: 'customerManager',
      action,
      mode: 'stub_simulation',
      summaryAr: `ملخص الولاء للعميل ${displayName}: الفئة ${tier} برصيد تقديري ${estimatedPoints} نقطة.`,
      data: {
        userId: typedProfile.id,
        totalSpentEGP,
        ordersCount: ordersList.length,
        estimatedLoyaltyPoints: estimatedPoints,
        tier,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'customerManager',
      action,
      mode: 'error',
      summaryAr: 'حدث خطأ في إدارة بيانات العملاء.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 8. businessIntelligence
 * Extracts real KPIs from `orders`, `order_items` (`price` column), and `products`.
 */
export async function businessIntelligence(params: {
  action: 'revenue_report' | 'top_selling' | 'dead_stock';
  days?: number;
  limit?: number;
}): Promise<NebrasToolResult> {
  const { action, days = 30, limit = 10 } = params;
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    if (action === 'revenue_report') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .gte('created_at', sinceIso);

      if (error) throw error;
      const allOrders = (orders ?? []) as Array<Pick<OrderRow, 'id' | 'total_amount' | 'status' | 'created_at'>>;
      const validOrders = allOrders.filter((o) => o.status !== 'cancelled');
      const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled');

      const grossRevenue = roundEGP(validOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0));
      const avgOrderValue = validOrders.length > 0 ? roundEGP(grossRevenue / validOrders.length) : 0;

      return {
        ok: true,
        tool: 'businessIntelligence',
        action,
        mode: 'executed',
        summaryAr: `تقرير الإيرادات (آخر ${days} يوم): ${grossRevenue} ج.م من ${validOrders.length} طلب (متوسط السلة: ${avgOrderValue} ج.م).`,
        data: {
          periodDays: days,
          totalOrders: allOrders.length,
          completedOrActiveOrders: validOrders.length,
          cancelledOrders: cancelledOrders.length,
          grossRevenueEGP: grossRevenue,
          averageOrderValueEGP: avgOrderValue,
        },
      };
    }

    if (action === 'top_selling') {
      // OrderItemRow columns: id, order_id, product_id, quantity, price, created_at
      const [{ data: items, error: itemsErr }, { data: productsData }] = await Promise.all([
        supabase.from('order_items').select('product_id, quantity, price').limit(1000),
        supabase.from('products').select('id, name, name_ar'),
      ]);

      if (itemsErr) throw itemsErr;

      const productNames = new Map<string, string>();
      for (const p of (productsData ?? []) as Array<Pick<ProductRow, 'id' | 'name' | 'name_ar'>>) {
        productNames.set(p.id, p.name_ar ?? p.name);
      }

      const aggregated = new Map<
        string,
        { productId: string; nameAr: string; totalQty: number; totalRevenueEGP: number }
      >();

      for (const row of (items ?? []) as Array<Pick<OrderItemRow, 'product_id' | 'quantity' | 'price'>>) {
        const key = String(row.product_id);
        const prev = aggregated.get(key) ?? {
          productId: key,
          nameAr: productNames.get(key) ?? key,
          totalQty: 0,
          totalRevenueEGP: 0,
        };
        const qty = Number(row.quantity ?? 0);
        const rev = qty * Number(row.price ?? 0);
        prev.totalQty += qty;
        prev.totalRevenueEGP = roundEGP(prev.totalRevenueEGP + rev);
        aggregated.set(key, prev);
      }

      const ranked = Array.from(aggregated.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, limit);

      return {
        ok: true,
        tool: 'businessIntelligence',
        action,
        mode: 'executed',
        summaryAr: `تم استخراج أعلى ${ranked.length} منتجات مبيعاً من جدول order_items.`,
        data: ranked,
      };
    }

    if (action === 'dead_stock') {
      const [{ data: products, error: prodErr }, { data: recentItems, error: itemErr }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, name_ar, price, stock, stock_quantity, is_active')
          .eq('is_active', true),
        supabase.from('order_items').select('product_id').limit(1500),
      ]);

      if (prodErr) throw prodErr;
      if (itemErr) throw itemErr;

      const soldIds = new Set(((recentItems ?? []) as Array<Pick<OrderItemRow, 'product_id'>>).map((i) => String(i.product_id)));
      const deadProducts = ((products ?? []) as Array<
        Pick<ProductRow, 'id' | 'name' | 'name_ar' | 'price' | 'stock' | 'stock_quantity' | 'is_active'>
      >)
        .filter((p) => getEffectiveStock(p) > 0 && !soldIds.has(String(p.id)))
        .map((p) => {
          const qty = getEffectiveStock(p);
          const price = Number(p.price ?? 0);
          return {
            id: p.id,
            name_ar: p.name_ar ?? p.name,
            stock: qty,
            priceEGP: price,
            tiedCapitalEGP: roundEGP(qty * price),
          };
        })
        .sort((a, b) => b.tiedCapitalEGP - a.tiedCapitalEGP)
        .slice(0, limit);

      const totalTiedCapital = roundEGP(deadProducts.reduce((s, d) => s + d.tiedCapitalEGP, 0));

      return {
        ok: true,
        tool: 'businessIntelligence',
        action,
        mode: 'executed',
        summaryAr: `تم رصد ${deadProducts.length} صنف راكد برأس مال مجمد قيمته ${totalTiedCapital} ج.م.`,
        data: {
          deadStockCount: deadProducts.length,
          totalTiedCapitalEGP: totalTiedCapital,
          items: deadProducts,
        },
      };
    }

    throw new Error(`إجراء غير مدعوم: ${action}`);
  } catch (err: any) {
    return {
      ok: false,
      tool: 'businessIntelligence',
      action,
      mode: 'error',
      summaryAr: 'تعذر استخراج مؤشرات ذكاء الأعمال.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 9. systemManager
 * Reads and updates `store_settings` (NEVER `site_settings`) with confirmation gate.
 */
export async function systemManager(params: {
  action: 'update_banner' | 'update_colors' | 'store_status';
  settingsPayload?: Partial<StoreSettingsRow> & Record<string, unknown>;
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const { action, settingsPayload = {}, confirmed = false } = params;

  try {
    const { data: currentSettings, error: readErr } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (readErr) throw readErr;
    const typedSettings = currentSettings as StoreSettingsRow | null;

    if (!confirmed) {
      return {
        ok: true,
        tool: 'systemManager',
        action,
        mode: 'dry_run_simulation',
        summaryAr: `محاكاة تعديل إعدادات النظام (${action}) في جدول store_settings — بانتظار تأكيدك للتطبيق الفوري على المتجر.`,
        impact: {
          affectedRecordsCount: 1,
          riskLevel: action === 'store_status' ? 'critical' : 'medium',
          requiresConfirmation: true,
          previewDiff: [
            {
              before: typedSettings,
              proposedChanges: settingsPayload,
            },
          ],
        },
      };
    }

    if (typedSettings?.id) {
      const { data: updated, error: updErr } = await supabase
        .from('store_settings')
        .update(settingsPayload as any)
        .eq('id', typedSettings.id)
        .select()
        .single();

      if (updErr) throw updErr;

      return {
        ok: true,
        tool: 'systemManager',
        action,
        mode: 'executed',
        summaryAr: `تم تحديث إعدادات المتجر (${action}) بنجاح في store_settings.`,
        data: updated,
      };
    }

    const { data: inserted, error: insErr } = await supabase
      .from('store_settings')
      .insert(settingsPayload as any)
      .select()
      .single();

    if (insErr) throw insErr;

    return {
      ok: true,
      tool: 'systemManager',
      action,
      mode: 'executed',
      summaryAr: `تم حفظ إعدادات المتجر (${action}) بنجاح في store_settings.`,
      data: inserted,
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'systemManager',
      action,
      mode: 'error',
      summaryAr: 'تعذر تحديث إعدادات النظام.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 10. mediaManager
 * Calls `generateAdminImage({ prompt, aspectRatio })` from `@/services/geminiImageService`
 * and updates `products.image_url` or `store_settings.hero_image_url`.
 */
export async function mediaManager(params: {
  action: 'generate_image' | 'upload_banner';
  productName?: string;
  promptDetails?: string;
  aspectRatio?: '1:1' | '16:9';
  productId?: string;
  bannerUrl?: string;
  confirmed?: boolean;
}): Promise<NebrasToolResult> {
  const {
    action,
    productName = 'منتج غذائي طازج',
    promptDetails,
    aspectRatio = '1:1',
    productId,
    bannerUrl,
    confirmed = false,
  } = params;

  try {
    if (action === 'generate_image') {
      const composedPrompt = promptDetails
        ? `صورة منتج احترافية لمتجر هايبرماركت الوادي الأخضر: ${productName} — ${promptDetails}`
        : `صورة منتج تجارية نظيفة وعالية الجودة لـ ${productName} على خلفية استوديو مشرقة`;

      const generatedResult = await generateAdminImage({
        prompt: composedPrompt,
        aspectRatio,
      });

      const generatedUrl =
        typeof generatedResult === 'string'
          ? generatedResult
          : (generatedResult as any)?.imageUrl ?? (generatedResult as any)?.url ?? String(generatedResult);

      if (productId && confirmed) {
        await supabase.from('products').update({ image_url: generatedUrl }).eq('id', productId);
      }

      return {
        ok: true,
        tool: 'mediaManager',
        action,
        mode: 'executed',
        summaryAr:
          productId && confirmed
            ? `تم توليد الصورة وتحديث صورة المنتج (${productId}) بنجاح.`
            : `تم توليد صورة احترافية لـ "${productName}".`,
        data: {
          productName,
          imageUrl: generatedUrl,
          attachedToProductId: productId && confirmed ? productId : null,
        },
      };
    }

    if (!bannerUrl) throw new Error('يجب توفير رابط البنر (bannerUrl).');

    if (!confirmed) {
      return {
        ok: true,
        tool: 'mediaManager',
        action,
        mode: 'dry_run_simulation',
        summaryAr: 'محاكاة تحديث البنر الرئيسي (hero_image_url) في store_settings — بانتظار تأكيدك للنشر.',
        impact: {
          affectedRecordsCount: 1,
          riskLevel: 'medium',
          requiresConfirmation: true,
          previewDiff: [{ hero_image_url: bannerUrl }],
        },
      };
    }

    const { data: settings } = await supabase.from('store_settings').select('id').limit(1).maybeSingle();
    if (settings?.id) {
      await supabase
        .from('store_settings')
        .update({ hero_image_url: bannerUrl })
        .eq('id', settings.id);
    }

    return {
      ok: true,
      tool: 'mediaManager',
      action,
      mode: 'executed',
      summaryAr: 'تم نشر البنر الجديد في store_settings.hero_image_url بنجاح.',
      data: { hero_image_url: bannerUrl },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'mediaManager',
      action,
      mode: 'error',
      summaryAr: 'تعذر تنفيذ عملية الوسائط والصور.',
      error: err?.message ?? String(err),
    };
  }
}

// ============================================================================
// 5. Unified Dispatcher for Nebras CoPilot
// ============================================================================

export const NEBRAS_TOOL_HANDLERS: Record<NebrasToolName, (params: any) => Promise<NebrasToolResult>> = {
  manageCatalog,
  pricingManager,
  inventoryManager,
  supplierManager,
  fulfillmentManager,
  promotionsManager,
  customerManager,
  businessIntelligence,
  systemManager,
  mediaManager,
};

export async function executeNebrasTool(
  toolName: NebrasToolName,
  params: Record<string, unknown>
): Promise<NebrasToolResult> {
  const handler = NEBRAS_TOOL_HANDLERS[toolName];
  if (!handler) {
    return {
      ok: false,
      tool: toolName,
      action: String(params?.action ?? 'unknown'),
      mode: 'error',
      summaryAr: `الأداة (${toolName}) غير مسجلة في مدير العمليات نبراس.`,
      error: `Unknown tool: ${toolName}`,
    };
  }
  return handler(params);
}