import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productIdSchema = z.string().uuid();

/**
 * Authenticated, read-only product advice. The caller supplies only a product
 * id; facts are loaded server-side from active catalog rows before Gemini is
 * called, so the browser cannot inject fictional product details.
 */
export const getProductAdvice = createServerFn({ method: "POST" })
  .validator(productIdSchema)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: productId, context }): Promise<string> => {
    const { data: product, error } = await context.supabase
      .from("products")
      .select("id,name,description,price_per_unit,old_price,is_active")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error("تعذر التحقق من بيانات المنتج.");
    if (!product) throw new Error("المنتج غير متاح في المتجر.");

    const { generatePlainText } = await import("@/lib/ai-provider.server");
    let text = "";
    try {
      text = await generatePlainText(
        "اكتب نصيحة قصيرة ومفيدة بالعربية المصرية لهذا المنتج اعتمادًا على بيانات المتجر الموثقة أدناه فقط. استنتج نوعه من اسمه ووصفه، وقدّم طريقة تحضير فقط إذا كان واضحًا أنه طعام يُطهى. لا تخترع مكونات أو مقادير أو أوقاتًا أو تعليمات سلامة أو حقائق عن السعر/المخزون. إذا لم تكفِ البيانات لتحديد طريقة الاستخدام، قل ذلك بوضوح وقدّم اقتراحًا عامًا آمنًا أو اطلب من العميل مراجعة ملصق المنتج. لا تذكر أنك بحثت في قاعدة بيانات. اجعل النصيحة جملتين كحد أقصى.\n\nبيانات المنتج (مصدرها سجل نشط في كتالوج المتجر):\n" +
          JSON.stringify({
            name: product.name,
            description: product.description,
          }),
        // النماذج المجانية تفكر قبل الرد؛ حد 400 كان يقطع النصيحة قبل كتابتها.
        { maxTokens: 1200, system: "أجب مباشرة بدون تفكير مطول أو مقدمات.", deadlineMs: 40000 },
      );
    } catch (error) {
      console.error("[product-advice]", String((error as Error)?.message ?? error).slice(0, 300));
      throw new Error("مساعد المنتجات غير متاح الآن.");
    }
    const advice = text.trim();
    if (!advice) throw new Error("لم تصل نصيحة من المساعد. حاول مرة أخرى.");
    return advice.slice(0, 900);
  });
