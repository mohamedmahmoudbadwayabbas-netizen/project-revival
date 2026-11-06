import { supabase } from "@/integrations/supabase/client";

export type CouponValidationResult = {
  isValid: boolean;
  discountAmount: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  message: string;
  couponId?: string;
  code?: string;
};

/**
 * Coupon validation is delegated to the live validate_coupon RPC so the client
 * never invents first-order/usage rules or trusts mutable client-side fields.
 */
export async function validateCouponCode(
  code: string,
  cartTotal: number,
  _isFirstOrder = false,
): Promise<CouponValidationResult> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { isValid: false, discountAmount: 0, discountType: "percent", discountValue: 0, message: "يرجى إدخال كود الخصم أولاً" };

  try {
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: cleanCode,
      p_subtotal: Number(cartTotal),
    });
    if (error) {
      const messages: Record<string, string> = {
        INVALID_CODE: "كود الخصم غير صحيح أو غير موجود",
        EXPIRED: "انتهت صلاحية كود الخصم هذا",
        EXHAUSTED: "تجاوز هذا الكوبون الحد الأقصى للمرات المسموحة للاستخدام",
        MIN_ORDER: "الحد الأدنى لتفعيل هذا الكوبون غير مستوفى",
      };
      const key = Object.keys(messages).find((k) => error.message?.includes(k));
      return { isValid: false, discountAmount: 0, discountType: "percent", discountValue: 0, message: key ? messages[key] : `تعذر التحقق من الكوبون: ${error.message}` };
    }

    const coupon = data?.[0];
    if (!coupon) return { isValid: false, discountAmount: 0, discountType: "percent", discountValue: 0, message: "كود الخصم غير متاح" };

    const discountType: "percent" | "fixed" = coupon.discount_type === "percentage" ? "percent" : "fixed";
    const discountValue = Number(coupon.discount_value || 0);
    const discountAmount = discountType === "percent" ? Math.min(Number(cartTotal), Number((cartTotal * discountValue / 100).toFixed(2))) : Math.min(discountValue, Number(cartTotal));
    return { isValid: true, discountAmount, discountType, discountValue, message: `تم تفعيل خصم بقيمة ${discountAmount.toFixed(2)} ج.م بنجاح 🎉`, code: coupon.code };
  } catch (err: any) {
    return { isValid: false, discountAmount: 0, discountType: "percent", discountValue: 0, message: `حدث خلل أثناء التحقق: ${err.message}` };
  }
}
