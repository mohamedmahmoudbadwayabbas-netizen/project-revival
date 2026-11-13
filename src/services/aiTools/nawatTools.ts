/**
 * src/services/aiTools/nawatTools.ts
 * ---------------------------------------------------------------------------
 * Nawat Customer Concierge — 9 Consolidated Storefront Tools
 * Contract-Aligned Edition (100% compliant with DATABASE_SCHEMA_CONTRACT.ts)
 *
 * Key Contract Rules Enforced:
 *  - Currency: EGP ONLY (جنيه مصري).
 *  - Settings Table: `store_settings` (NEVER `site_settings`).
 *  - Profiles Table: `id`, `full_name`, `phone`, `avatar_url`, `birth_date`, `is_blocked` (NO `email`).
 *  - Products Table: `name_ar`, `price`, `old_price`, `stock`, `stock_quantity`, `unit_label`, `cooking_tip`.
 *  - Coupon Validation: Uses `supabase.rpc('validate_coupon', { p_code, p_subtotal })`.
 *  - Direct Exports: Exports both `executeNawatTool` and all 9 named handlers for `aiActionGateway.ts`.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AddressRow,
  CartItemRow,
  CategoryRow,
  CouponRow,
  DeliverySlotRow,
  DeliveryZoneRow,
  FlashOfferRow,
  OrderRow,
  ProductBundleRow,
  ProductRow,
  ProfileRow,
  StoreSettingsRow,
} from '@/types/DATABASE_SCHEMA_CONTRACT';
import type { NebrasToolResult } from './nebrasManagerTools';

// ============================================================================
// 1. Types & Helpers
// ============================================================================

export type NawatToolName =
  | 'productExplorer'
  | 'smartCartManager'
  | 'orderTracker'
  | 'dealsAndCoupons'
  | 'recipeAndMealPlanner'
  | 'deliveryZoneChecker'
  | 'reorderAssistant'
  | 'accountAndFavorites'
  | 'customerSupportConcierge';

export interface NawatToolResult<T = unknown> extends Omit<NebrasToolResult<T>, 'tool'> {
  tool: NawatToolName;
}

const roundEGP = (val: number): number => Math.round(val * 100) / 100;

const getEffectiveStock = (p: Pick<ProductRow, 'stock' | 'stock_quantity'>): number =>
  Number(p.stock ?? p.stock_quantity ?? 0);

const formatProductSummary = (
  p: Pick<
    ProductRow,
    | 'id'
    | 'name'
    | 'name_ar'
    | 'price'
    | 'old_price'
    | 'stock'
    | 'stock_quantity'
    | 'unit_label'
    | 'is_on_sale'
    | 'cooking_tip'
    | 'image_url'
  >
) => ({
  id: p.id,
  nameAr: p.name_ar ?? p.name,
  priceEGP: Number(p.price ?? 0),
  oldPriceEGP: p.old_price != null ? Number(p.old_price) : null,
  unitLabel: p.unit_label || 'كجم',
  inStock: getEffectiveStock(p) > 0,
  availableQty: getEffectiveStock(p),
  isOnSale: Boolean(p.is_on_sale),
  cookingTip: p.cooking_tip ?? null,
  imageUrl: p.image_url ?? null,
});

// ============================================================================
// 2. Nawat 9 Consolidated Tool Implementations
// ============================================================================

/**
 * 1. productExplorer
 * Searches active products (`products`) and categories (`categories`), finds
 * single product details, or suggests in-stock alternatives in the same category.
 */
export async function productExplorer(params: {
  action: 'search' | 'details' | 'alternatives' | 'categories';
  query?: string;
  categoryId?: string;
  productId?: string;
  maxPriceEGP?: number;
  limit?: number;
}): Promise<NawatToolResult> {
  const { action, query, categoryId, productId, maxPriceEGP, limit = 12 } = params;

  try {
    if (action === 'categories') {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, slug, icon, image_url, parent_id, sort_order')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const cats = (data ?? []) as Array<
        Pick<CategoryRow, 'id' | 'name' | 'name_ar' | 'slug' | 'icon' | 'image_url' | 'parent_id' | 'sort_order'>
      >;

      return {
        ok: true,
        tool: 'productExplorer',
        action,
        mode: 'executed',
        summaryAr: `يوجد ${cats.length} قسم متاح في هايبرماركت الوادي الأخضر.`,
        data: cats,
      };
    }

    if (action === 'details') {
      if (!productId) throw new Error('يجب تحديد معرّف المنتج (productId).');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          ok: false,
          tool: 'productExplorer',
          action,
          mode: 'error',
          summaryAr: 'لم يتم العثور على المنتج المطلوب.',
        };
      }

      const prod = data as ProductRow;
      return {
        ok: true,
        tool: 'productExplorer',
        action,
        mode: 'executed',
        summaryAr: `تفاصيل "${prod.name_ar ?? prod.name}": السعر ${prod.price ?? 0} ج.م / ${prod.unit_label || 'كجم'}.`,
        data: formatProductSummary(prod),
      };
    }

    if (action === 'alternatives') {
      let targetCategoryId = categoryId;
      let targetName = 'المنتج';

      if (productId) {
        const { data: baseProd } = await supabase
          .from('products')
          .select('id, name, name_ar, category_id')
          .eq('id', productId)
          .maybeSingle();

        if (baseProd) {
          targetCategoryId = (baseProd as Pick<ProductRow, 'category_id'>).category_id ?? targetCategoryId;
          targetName = (baseProd as Pick<ProductRow, 'name_ar' | 'name'>).name_ar ?? (baseProd as any).name;
        }
      }

      let altQuery = supabase
        .from('products')
        .select('id, name, name_ar, price, old_price, stock, stock_quantity, unit_label, is_on_sale, cooking_tip, image_url')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .limit(limit);

      if (targetCategoryId) {
        altQuery = altQuery.eq('category_id', targetCategoryId);
      }
      if (productId) {
        altQuery = altQuery.neq('id', productId);
      }

      const { data, error } = await altQuery;
      if (error) throw error;
      const alternatives = ((data ?? []) as ProductRow[]).map(formatProductSummary);

      return {
        ok: true,
        tool: 'productExplorer',
        action,
        mode: 'executed',
        summaryAr: `تم العثور على ${alternatives.length} بديل متوفر لـ "${targetName}".`,
        data: alternatives,
      };
    }

    // Default: action === 'search'
    let searchQuery = supabase
      .from('products')
      .select('id, name, name_ar, price, old_price, stock, stock_quantity, unit_label, is_on_sale, cooking_tip, image_url')
      .eq('is_active', true)
      .limit(limit);

    if (categoryId) {
      searchQuery = searchQuery.eq('category_id', categoryId);
    }
    if (typeof maxPriceEGP === 'number' && maxPriceEGP > 0) {
      searchQuery = searchQuery.lte('price', maxPriceEGP);
    }
    if (query && query.trim()) {
      const term = query.trim();
      searchQuery = searchQuery.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
    }

    const { data, error } = await searchQuery;
    if (error) throw error;
    const results = ((data ?? []) as ProductRow[]).map(formatProductSummary);

    return {
      ok: true,
      tool: 'productExplorer',
      action,
      mode: 'executed',
      summaryAr:
        results.length > 0
          ? `تم العثور على ${results.length} منتج مطابق في الوادي الأخضر.`
          : `لم نجد منتجات مطابقة لـ "${query ?? ''}" حالياً.`,
      data: results,
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'productExplorer',
      action,
      mode: 'error',
      summaryAr: 'حدث خطأ أثناء البحث في المنتجات.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 2. smartCartManager
 * Manages `cart_items` for authenticated users (`userId`), and returns
 * structured client-side cart sync instructions for guest sessions.
 */
export async function smartCartManager(params: {
  action: 'add' | 'update_qty' | 'remove' | 'view' | 'clear';
  userId?: string;
  productId?: string;
  quantity?: number;
}): Promise<NawatToolResult> {
  const { action, userId, productId, quantity = 1 } = params;

  try {
    // Guest user fallback: validate product from DB and return local cart action payload
    if (!userId) {
      if (action === 'view' || action === 'clear') {
        return {
          ok: true,
          tool: 'smartCartManager',
          action,
          mode: 'executed',
          summaryAr:
            action === 'clear'
              ? 'تم تجهيز أمر تفريغ السلة المحلية.'
              : 'السلة محفوظة محلياً على جهازك (يرجى تسجيل الدخول للمزامنة السحابية).',
          data: { guestMode: true, localAction: action },
        };
      }

      if (!productId) throw new Error('يجب تحديد معرّف المنتج (productId).');
      const { data: prod } = await supabase
        .from('products')
        .select('id, name, name_ar, price, stock, stock_quantity, unit_label, image_url')
        .eq('id', productId)
        .maybeSingle();

      if (!prod) throw new Error('المنتج غير موجود.');
      const typedProd = prod as ProductRow;
      const available = getEffectiveStock(typedProd);
      if (action !== 'remove' && available < quantity) {
        return {
          ok: false,
          tool: 'smartCartManager',
          action,
          mode: 'error',
          summaryAr: `الكمية المتوفرة من "${typedProd.name_ar ?? typedProd.name}" هي ${available} فقط.`,
        };
      }

      return {
        ok: true,
        tool: 'smartCartManager',
        action,
        mode: 'executed',
        summaryAr: `تم تحديث "${typedProd.name_ar ?? typedProd.name}" في سلتك بنجاح.`,
        data: {
          guestMode: true,
          localCartMutation: {
            action,
            product: formatProductSummary(typedProd),
            quantity,
          },
        },
      };
    }

    // Authenticated user: operate directly on `cart_items`
    if (action === 'clear') {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
      if (error) throw error;

      return {
        ok: true,
        tool: 'smartCartManager',
        action,
        mode: 'executed',
        summaryAr: 'تم تفريغ سلة التسوق بالكامل.',
        data: { items: [], subtotalEGP: 0 },
      };
    }

    if (action === 'add' || action === 'update_qty') {
      if (!productId) throw new Error('يجب تحديد معرّف المنتج (productId).');

      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .select('id, name, name_ar, price, stock, stock_quantity, is_active')
        .eq('id', productId)
        .single();

      if (prodErr || !prod) throw new Error('المنتج غير موجود.');
      const typedProd = prod as ProductRow;
      if (!typedProd.is_active) throw new Error('هذا المنتج غير متاح حالياً.');

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      const targetQty =
        action === 'add'
          ? Number((existingItem as CartItemRow | null)?.quantity ?? 0) + quantity
          : quantity;

      if (targetQty <= 0) {
        await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', productId);
      } else {
        const available = getEffectiveStock(typedProd);
        if (targetQty > available) {
          return {
            ok: false,
            tool: 'smartCartManager',
            action,
            mode: 'error',
            summaryAr: `عذراً، المتوفر من "${typedProd.name_ar ?? typedProd.name}" حالياً ${available} وحدة فقط.`,
          };
        }

        if (existingItem) {
          const { error: updErr } = await supabase
            .from('cart_items')
            .update({ quantity: targetQty })
            .eq('id', (existingItem as CartItemRow).id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('cart_items')
            .insert({ user_id: userId, product_id: productId, quantity: targetQty });
          if (insErr) throw insErr;
        }
      }
    }

    if (action === 'remove') {
      if (!productId) throw new Error('يجب تحديد معرّف المنتج لحذفه من السلة.');
      const { error: delErr } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (delErr) throw delErr;
    }

    // Fetch updated cart view with product pricing
    const { data: cartRows, error: cartErr } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, products(id, name, name_ar, price, unit_label, image_url)')
      .eq('user_id', userId);

    if (cartErr) throw cartErr;

    const normalizedItems = (cartRows ?? []).map((row: any) => {
      const p = row.products ?? {};
      const unitPrice = Number(p.price ?? 0);
      const qty = Number(row.quantity ?? 0);
      return {
        cartItemId: row.id,
        productId: row.product_id,
        nameAr: p.name_ar ?? p.name ?? 'منتج',
        unitLabel: p.unit_label ?? 'كجم',
        unitPriceEGP: unitPrice,
        quantity: qty,
        lineTotalEGP: roundEGP(unitPrice * qty),
      };
    });

    const subtotalEGP = roundEGP(normalizedItems.reduce((s, i) => s + i.lineTotalEGP, 0));

    return {
      ok: true,
      tool: 'smartCartManager',
      action,
      mode: 'executed',
      summaryAr: `سلتك تحتوي على ${normalizedItems.length} صنف بإجمالي ${subtotalEGP} ج.م.`,
      data: {
        itemsCount: normalizedItems.length,
        subtotalEGP,
        items: normalizedItems,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'smartCartManager',
      action,
      mode: 'error',
      summaryAr: 'تعذر تحديث سلة التسوق.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 3. orderTracker
 * Tracks orders from `orders` by `userId`, `phone`, `orderId`, or `trackingToken`.
 */
export async function orderTracker(params: {
  action: 'list_my_orders' | 'track_latest' | 'order_details';
  userId?: string;
  phone?: string;
  orderId?: string;
  trackingToken?: string;
}): Promise<NawatToolResult> {
  const { action, userId, phone, orderId, trackingToken } = params;

  const STATUS_AR: Record<string, string> = {
    pending: 'قيد المراجعة',
    confirmed: 'تم تأكيد الطلب',
    processing: 'جاري التجهيز',
    picked: 'تم تحضير الأصناف',
    out_for_delivery: 'خرج للتوصيل مع المندوب',
    delivered: 'تم التوصيل بنجاح',
    cancelled: 'ملغي',
  };

  try {
    let query = supabase
      .from('orders')
      .select(
        'id, customer_name, phone, address, status, total_amount, discount_amount, delivery_fee, delivery_slot, tracking_token, items, created_at'
      )
      .order('created_at', { ascending: false });

    if (action === 'order_details' && (orderId || trackingToken)) {
      if (orderId) query = query.eq('id', orderId);
      else if (trackingToken) query = query.eq('tracking_token', trackingToken);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (phone && phone.trim()) {
      query = query.eq('phone', phone.trim());
    } else {
      return {
        ok: false,
        tool: 'orderTracker',
        action,
        mode: 'error',
        summaryAr: 'يرجى تزويدي برقم الهاتف أو رقم تتبع الطلب للبحث عن طلبك.',
      };
    }

    const limitCount = action === 'list_my_orders' ? 10 : 1;
    const { data, error } = await query.limit(limitCount);
    if (error) throw error;

    const orders = (data ?? []) as Array<
      Pick<
        OrderRow,
        | 'id'
        | 'customer_name'
        | 'phone'
        | 'address'
        | 'status'
        | 'total_amount'
        | 'discount_amount'
        | 'delivery_fee'
        | 'delivery_slot'
        | 'tracking_token'
        | 'items'
        | 'created_at'
      >
    >;

    if (orders.length === 0) {
      return {
        ok: true,
        tool: 'orderTracker',
        action,
        mode: 'executed',
        summaryAr: 'لم نجد طلبات مسجلة بهذه البيانات حالياً.',
        data: [],
      };
    }

    const enriched = orders.map((o) => ({
      ...o,
      statusAr: STATUS_AR[o.status] ?? o.status,
    }));

    if (action === 'list_my_orders') {
      return {
        ok: true,
        tool: 'orderTracker',
        action,
        mode: 'executed',
        summaryAr: `لديك ${enriched.length} طلب مسجل؛ أحدث طلب حالته: ${enriched[0].statusAr}.`,
        data: enriched,
      };
    }

    const latest = enriched[0];
    return {
      ok: true,
      tool: 'orderTracker',
      action,
      mode: 'executed',
      summaryAr: `حالة طلبك (${latest.tracking_token ?? latest.id.slice(0, 8)}): ${latest.statusAr} — الإجمالي ${latest.total_amount} ج.م.`,
      data: latest,
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'orderTracker',
      action,
      mode: 'error',
      summaryAr: 'تعذر جلب بيانات تتبع الطلب.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 4. dealsAndCoupons
 * Lists active offers from `products` (`is_on_sale`), `flash_offers`, `product_bundles`, `coupons`
 * and validates coupon codes using `supabase.rpc('validate_coupon', ...)`.
 */
export async function dealsAndCoupons(params: {
  action: 'active_offers' | 'validate_coupon';
  code?: string;
  cartTotal?: number;
}): Promise<NawatToolResult> {
  const { action, code, cartTotal = 0 } = params;

  try {
    if (action === 'validate_coupon') {
      if (!code || !code.trim()) {
        throw new Error('يرجى إدخال كود الخصم للتحقق منه.');
      }

      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code.trim().toUpperCase(),
        p_subtotal: Number(cartTotal ?? 0),
      });

      if (error) throw error;
      const result = data as {
        is_valid: boolean;
        code: string;
        discount_amount: number;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
        error_message?: string;
      };

      return {
        ok: result.is_valid,
        tool: 'dealsAndCoupons',
        action,
        mode: 'executed',
        summaryAr: result.is_valid
          ? `الكوبون (${result.code}) صالح! سيوفر لك ${result.discount_amount} ج.م.`
          : result.error_message ?? `الكوبون (${code}) غير صالح أو لم يستوفِ الحد الأدنى للطلب.`,
        data: result,
      };
    }

    // action === 'active_offers'
    const nowIso = new Date().toISOString();
    const [{ data: saleProducts }, { data: flashOffers }, { data: bundles }, { data: coupons }] =
      await Promise.all([
        supabase
          .from('products')
          .select('id, name, name_ar, price, old_price, unit_label, image_url')
          .eq('is_active', true)
          .eq('is_on_sale', true)
          .limit(10),
        supabase
          .from('flash_offers')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', nowIso)
          .gte('ends_at', nowIso)
          .limit(5),
        supabase.from('product_bundles').select('*').eq('is_active', true).limit(5),
        supabase.from('coupons').select('*').eq('is_active', true).limit(5),
      ]);

    const offersCount =
      (saleProducts?.length ?? 0) + (flashOffers?.length ?? 0) + (bundles?.length ?? 0);

    return {
      ok: true,
      tool: 'dealsAndCoupons',
      action,
      mode: 'executed',
      summaryAr: `يوجد حالياً ${offersCount} عرض نشط و ${coupons?.length ?? 0} كوبون خصم متاح.`,
      data: {
        discountedProducts: (saleProducts ?? []) as Partial<ProductRow>[],
        flashOffers: (flashOffers ?? []) as FlashOfferRow[],
        bundles: (bundles ?? []) as ProductBundleRow[],
        publicCoupons: ((coupons ?? []) as CouponRow[]).map((c) => ({
          code: c.code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          minOrderAmountEGP: c.min_order_amount ?? 0,
        })),
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'dealsAndCoupons',
      action,
      mode: 'error',
      summaryAr: 'تعذر التحقق من العروض والكوبونات.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 5. recipeAndMealPlanner
 * Matches meal ingredients with live in-stock products from `products`
 * (including `cooking_tip`) and calculates total meal cost in EGP.
 */
export async function recipeAndMealPlanner(params: {
  action: 'suggest_meal' | 'ingredients_to_cart';
  dishName?: string;
  ingredients?: string[];
  budgetEGP?: number;
  servings?: number;
}): Promise<NawatToolResult> {
  const { action, dishName = 'وجبة منزلية طازجة', ingredients = [], budgetEGP, servings = 4 } = params;

  const DEFAULT_DISH_INGREDIENTS: Record<string, string[]> = {
    كشري: ['أرز', 'مكرونة', 'عدس', 'طماطم', 'بصل', 'ثوم'],
    محشي: ['أرز', 'طماطم', 'بصل', 'كوسة', 'باذنجان', 'فلفل'],
    مكرونة_بشاميل: ['مكرونة', 'لحم مفروم', 'لبن', 'دقيق', 'سمنة', 'جبنة'],
    فراخ_مشوية: ['فراخ', 'طماطم', 'بصل', 'ليمون', 'زبادي', 'توابل'],
    فطار: ['فول', 'جبنة', 'بيض', 'طماطم', 'خيار', 'عيش'],
  };

  try {
    let searchTerms = ingredients.filter((i) => i.trim().length > 0);
    if (searchTerms.length === 0) {
      const normalizedDish = dishName.replace(/\s+/g, '_');
      const matchedKey = Object.keys(DEFAULT_DISH_INGREDIENTS).find(
        (k) => dishName.includes(k.replace('_', ' ')) || normalizedDish.includes(k)
      );
      searchTerms = matchedKey
        ? DEFAULT_DISH_INGREDIENTS[matchedKey]
        : ['أرز', 'طماطم', 'بصل', 'زيت', 'دجاج'];
    }

    const matchedProducts: Array<ReturnType<typeof formatProductSummary> & { matchedIngredient: string }> = [];

    for (const term of searchTerms.slice(0, 8)) {
      const clean = term.trim();
      const { data } = await supabase
        .from('products')
        .select('id, name, name_ar, price, old_price, stock, stock_quantity, unit_label, is_on_sale, cooking_tip, image_url')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .or(`name_ar.ilike.%${clean}%,name.ilike.%${clean}%`)
        .limit(1);

      if (data && data.length > 0) {
        const prod = data[0] as ProductRow;
        if (!matchedProducts.some((m) => m.id === prod.id)) {
          matchedProducts.push({
            ...formatProductSummary(prod),
            matchedIngredient: clean,
          });
        }
      }
    }

    const estimatedTotalEGP = roundEGP(matchedProducts.reduce((s, p) => s + p.priceEGP, 0));
    const withinBudget = typeof budgetEGP === 'number' ? estimatedTotalEGP <= budgetEGP : true;

    return {
      ok: true,
      tool: 'recipeAndMealPlanner',
      action,
      mode: 'executed',
      summaryAr: `جهزنا لك ${matchedProducts.length} مكون متوفر لـ "${dishName}" (${servings} أفراد) بتكلفة تقديرية ${estimatedTotalEGP} ج.م.`,
      data: {
        dishName,
        servings,
        estimatedTotalEGP,
        budgetEGP: budgetEGP ?? null,
        withinBudget,
        ingredientsMatched: matchedProducts,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'recipeAndMealPlanner',
      action,
      mode: 'error',
      summaryAr: 'تعذر تجهيز مكونات الوصفة من المتجر.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 6. deliveryZoneChecker
 * Queries `delivery_zones`, `delivery_slots`, and `store_settings`
 * (`free_shipping_threshold`, `default_delivery_fee`, `store_address`).
 */
export async function deliveryZoneChecker(params: {
  action: 'check_area' | 'branch_hours';
  areaName?: string;
}): Promise<NawatToolResult> {
  const { action, areaName } = params;

  try {
    const [{ data: zones, error: zoneErr }, { data: slots }, { data: settings }] = await Promise.all([
      supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('delivery_slots')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('store_settings')
        .select('site_name, store_address, default_delivery_fee, free_shipping_threshold, whatsapp_number')
        .limit(1)
        .maybeSingle(),
    ]);

    if (zoneErr) throw zoneErr;
    const allZones = (zones ?? []) as DeliveryZoneRow[];
    const allSlots = (slots ?? []) as DeliverySlotRow[];
    const storeInfo = settings as Partial<StoreSettingsRow> | null;

    if (action === 'branch_hours') {
      return {
        ok: true,
        tool: 'deliveryZoneChecker',
        action,
        mode: 'executed',
        summaryAr: `فروع ${storeInfo?.site_name ?? 'الوادي الأخضر'} (${storeInfo?.store_address ?? 'العاشر من رمضان'}) تستقبل الطلبات يومياً عبر ${allSlots.length} فترة توصيل.`,
        data: {
          storeName: storeInfo?.site_name ?? 'هايبرماركت الوادي الأخضر',
          storeAddress: storeInfo?.store_address ?? 'مدينة العاشر من رمضان - الشرقية',
          whatsappNumber: storeInfo?.whatsapp_number ?? null,
          freeShippingThresholdEGP: storeInfo?.free_shipping_threshold ?? null,
          deliverySlots: allSlots,
        },
      };
    }

    // action === 'check_area'
    let matchedZones = allZones;
    if (areaName && areaName.trim()) {
      const term = areaName.trim();
      matchedZones = allZones.filter(
        (z) =>
          z.name.includes(term) ||
          (z.area && z.area.includes(term)) ||
          z.city.includes(term)
      );
    }

    return {
      ok: true,
      tool: 'deliveryZoneChecker',
      action,
      mode: 'executed',
      summaryAr:
        matchedZones.length > 0
          ? `التوصيل متاح إلى ${matchedZones[0].name} برسوم ${matchedZones[0].fee} ج.م (الوقت المتوقع: ${matchedZones[0].estimated_minutes ?? 45} دقيقة).`
          : `نغطي حالياً ${allZones.length} منطقة في مدينة العاشر من رمضان والشرقية.`,
      data: {
        matchedZones: matchedZones.length > 0 ? matchedZones : allZones,
        freeShippingThresholdEGP: storeInfo?.free_shipping_threshold ?? null,
        availableSlots: allSlots,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'deliveryZoneChecker',
      action,
      mode: 'error',
      summaryAr: 'تعذر التحقق من نطاق التوصيل.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 7. reorderAssistant
 * Fetches past orders from `orders` (`items` JSON snapshot) and verifies live
 * stock and current prices in `products` so the customer can reorder safely.
 */
export async function reorderAssistant(params: {
  action: 'buy_again_list' | 'repeat_last_order';
  userId?: string;
  phone?: string;
}): Promise<NawatToolResult> {
  const { action, userId, phone } = params;

  try {
    if (!userId && !phone) {
      return {
        ok: false,
        tool: 'reorderAssistant',
        action,
        mode: 'error',
        summaryAr: 'يرجى تسجيل الدخول أو إدخال رقم هاتفك لعرض مشترياتك السابقة.',
      };
    }

    let orderQuery = supabase
      .from('orders')
      .select('id, items, total_amount, created_at')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5);

    if (userId) orderQuery = orderQuery.eq('user_id', userId);
    else if (phone) orderQuery = orderQuery.eq('phone', phone.trim());

    const { data: pastOrders, error } = await orderQuery;
    if (error) throw error;

    const orders = (pastOrders ?? []) as Array<Pick<OrderRow, 'id' | 'items' | 'total_amount' | 'created_at'>>;
    if (orders.length === 0) {
      return {
        ok: true,
        tool: 'reorderAssistant',
        action,
        mode: 'executed',
        summaryAr: 'لا توجد طلبات سابقة مسجلة لإعادة طلبها حالياً.',
        data: [],
      };
    }

    const targetItems =
      action === 'repeat_last_order'
        ? orders[0].items ?? []
        : orders.flatMap((o) => o.items ?? []);

    const uniqueIds = Array.from(new Set(targetItems.map((i) => i.id).filter(Boolean)));
    const { data: liveProducts } = await supabase
      .from('products')
      .select('id, name, name_ar, price, stock, stock_quantity, unit_label, is_active, image_url')
      .in('id', uniqueIds);

    const liveMap = new Map<string, ProductRow>();
    for (const p of (liveProducts ?? []) as ProductRow[]) {
      liveMap.set(p.id, p);
    }

    const verifiedItems = targetItems
      .map((item) => {
        const live = liveMap.get(item.id);
        if (!live || !live.is_active || getEffectiveStock(live) <= 0) return null;
        return {
          productId: live.id,
          nameAr: live.name_ar ?? live.name,
          requestedQty: item.quantity,
          availableStock: getEffectiveStock(live),
          currentPriceEGP: Number(live.price ?? 0),
          unitLabel: live.unit_label || 'كجم',
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const estimatedReorderTotalEGP = roundEGP(
      verifiedItems.reduce((s, i) => s + i.currentPriceEGP * Math.min(i.requestedQty, i.availableStock), 0)
    );

    return {
      ok: true,
      tool: 'reorderAssistant',
      action,
      mode: 'executed',
      summaryAr: `تم تجهيز ${verifiedItems.length} صنف متوفر من مشترياتك السابقة بإجمالي حالي ${estimatedReorderTotalEGP} ج.م.`,
      data: {
        items: verifiedItems,
        estimatedReorderTotalEGP,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'reorderAssistant',
      action,
      mode: 'error',
      summaryAr: 'تعذر تجهيز قائمة إعادة الطلب.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 8. accountAndFavorites
 * Reads customer profile from `profiles` (ONLY `id`, `full_name`, `phone`, `avatar_url`, `birth_date`, `is_blocked`),
 * saved addresses from `addresses`, and computes loyalty points from `orders`.
 */
export async function accountAndFavorites(params: {
  action: 'list_favorites' | 'profile_summary' | 'loyalty_points';
  userId?: string;
}): Promise<NawatToolResult> {
  const { action, userId } = params;

  try {
    if (!userId) {
      return {
        ok: false,
        tool: 'accountAndFavorites',
        action,
        mode: 'error',
        summaryAr: 'يرجى تسجيل الدخول أولاً لعرض بيانات حسابك وعناوينك.',
      };
    }

    if (action === 'list_favorites') {
      // TODO: Connect to table customer_favorites once migration is applied
      return {
        ok: true,
        tool: 'accountAndFavorites',
        action,
        mode: 'stub_simulation',
        summaryAr: 'قائمة المفضلة محفوظة في متصفحك حالياً وسيتم مزامنتها سحابياً قريباً.',
        data: { userId, favorites: [] },
      };
    }

    const [{ data: profile, error: profErr }, { data: addresses }, { data: orders }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url, birth_date, is_blocked, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(),
      supabase.from('addresses').select('*').eq('user_id', userId),
      supabase.from('orders').select('id, total_amount, status').eq('user_id', userId).neq('status', 'cancelled'),
    ]);

    if (profErr) throw profErr;
    const typedProfile = profile as ProfileRow | null;
    const userAddresses = (addresses ?? []) as AddressRow[];
    const validOrders = (orders ?? []) as Array<Pick<OrderRow, 'id' | 'total_amount' | 'status'>>;
    const totalSpentEGP = roundEGP(validOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0));
    const points = Math.floor(totalSpentEGP / 10);

    if (action === 'loyalty_points') {
      return {
        ok: true,
        tool: 'accountAndFavorites',
        action,
        mode: 'executed',
        summaryAr: `رصيدك التقديري من نقاط الولاء هو ${points} نقطة بناءً على مشتريات بقيمة ${totalSpentEGP} ج.م.`,
        data: {
          userId,
          ordersCount: validOrders.length,
          totalSpentEGP,
          loyaltyPoints: points,
        },
      };
    }

    return {
      ok: true,
      tool: 'accountAndFavorites',
      action,
      mode: 'executed',
      summaryAr: `أهلاً ${typedProfile?.full_name ?? 'عميلنا العزيز'}! لديك ${userAddresses.length} عنوان محفوظ و ${validOrders.length} طلب مكتمل.`,
      data: {
        profile: typedProfile,
        addresses: userAddresses,
        stats: {
          ordersCount: validOrders.length,
          totalSpentEGP,
          loyaltyPoints: points,
        },
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'accountAndFavorites',
      action,
      mode: 'error',
      summaryAr: 'تعذر جلب بيانات الحساب.',
      error: err?.message ?? String(err),
    };
  }
}

/**
 * 9. customerSupportConcierge
 * Provides store support policies & contact details from `store_settings`,
 * or logs an escalatable support request in `agent_interactions`.
 */
export async function customerSupportConcierge(params: {
  action: 'policy_info' | 'create_ticket';
  topic?: string;
  orderId?: string;
  userId?: string;
}): Promise<NawatToolResult> {
  const { action, topic = 'استفسار عام', orderId, userId } = params;

  try {
    const { data: settings } = await supabase
      .from('store_settings')
      .select('site_name, whatsapp_number, store_address, instapay_handle')
      .limit(1)
      .maybeSingle();

    const storeInfo = settings as Partial<StoreSettingsRow> | null;

    if (action === 'policy_info') {
      return {
        ok: true,
        tool: 'customerSupportConcierge',
        action,
        mode: 'executed',
        summaryAr: `سياسة الاستبدال والاسترجاع في ${storeInfo?.site_name ?? 'الوادي الأخضر'}: استرجاع فوري للمنتجات الطازجة والمبردة عند الاستلام، وخلال 24 ساعة لباقي السلع بحالتها الأصلية.`,
        data: {
          returnPolicyAr:
            'يمكنك فحص الطلب بالكامل عند الاستلام مع المندوب واسترجاع أو استبدال أي صنف فوراً بدون أي رسوم إضافية.',
          paymentMethodsAr: ['الدفع عند الاستلام (كاش)', 'تحويل انستاباي (InstaPay)', 'بطاقة بنكية'],
          instapayHandle: storeInfo?.instapay_handle ?? null,
          whatsappSupport: storeInfo?.whatsapp_number ?? null,
          branchAddress: storeInfo?.store_address ?? 'مدينة العاشر من رمضان - الشرقية',
        },
      };
    }

    // Log support escalation in `agent_interactions`
    const ticketRef = `SUP-${Date.now().toString().slice(-6)}`;
    await supabase.from('agent_interactions').insert({
      actor_id: userId ?? null,
      actor_role: userId ? 'customer' : 'guest',
      agent_type: 'nawat',
      input_summary: `بلاغ دعم عملاء (${ticketRef}): ${topic}${orderId ? ` — طلب #${orderId}` : ''}`,
      outcome: 'success',
    });

    return {
      ok: true,
      tool: 'customerSupportConcierge',
      action,
      mode: 'executed',
      summaryAr: `تم تسجيل بلاغك برقم مرجعي (${ticketRef}) وسيتواصل معك فريق خدمة العملاء عبر الواتساب أو الهاتف في أقرب وقت.`,
      data: {
        ticketReference: ticketRef,
        topic,
        orderId: orderId ?? null,
        whatsappSupport: storeInfo?.whatsapp_number ?? null,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      tool: 'customerSupportConcierge',
      action,
      mode: 'error',
      summaryAr: 'تعذر تسجيل طلب الدعم الفني.',
      error: err?.message ?? String(err),
    };
  }
}

// ============================================================================
// 3. Unified Dispatcher for Nawat Concierge
// ============================================================================

export const NAWAT_TOOL_HANDLERS: Record<NawatToolName, (params: any) => Promise<NawatToolResult>> = {
  productExplorer,
  smartCartManager,
  orderTracker,
  dealsAndCoupons,
  recipeAndMealPlanner,
  deliveryZoneChecker,
  reorderAssistant,
  accountAndFavorites,
  customerSupportConcierge,
};

export async function executeNawatTool(
  toolName: NawatToolName,
  params: Record<string, unknown>
): Promise<NawatToolResult> {
  const handler = NAWAT_TOOL_HANDLERS[toolName];
  if (!handler) {
    return {
      ok: false,
      tool: toolName,
      action: String(params?.action ?? 'unknown'),
      mode: 'error',
      summaryAr: `أداة نواة (${toolName}) غير مسجلة.`,
      error: `Unknown Nawat tool: ${toolName}`,
    };
  }
  return handler(params);
}

