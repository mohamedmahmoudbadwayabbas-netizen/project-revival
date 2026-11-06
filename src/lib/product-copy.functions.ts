import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  productName: z.string().trim().min(1).max(160),
  categoryName: z.string().max(120).optional().nullable(),
  categoryNames: z.array(z.string().max(120)).max(100).optional(),
  isByWeight: z.boolean().optional(),
  description: z.string().max(2000).optional().nullable(),
});

export type ProductCopyDTO = {
  enhancedTitle: string;
  shortDescription: string;
  seoDescription: string;
  tags: string[];
  cookingTip: string;
  characteristics: string[];
  storageInstructions: string;
  originSource: string;
  nutritionalInfo: { calories: string; protein: string; carbs: string; fiber: string; fats: string };
  keySellingPoints: string[];
  suggestedCategory: string;
  isByWeight: boolean;
  unitLabel: string;
};

const str = (v: unknown, max = 1200) => String(v ?? "").trim().slice(0, max);
const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x, 200)).filter(Boolean).slice(0, 12) : []);

/** توليد كل بيانات المنتج (حتى قبل حفظه) للمسؤول فقط عبر المزود النشط. لا يمس السعر أو المخزون. */
export const generateProductCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ProductCopyDTO> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    if (!isAdmin) throw new Error("هذه الأداة متاحة لمسؤولي المتجر فقط.");

    let cats = data.categoryNames ?? [];
    if (!cats.length) {
      const { data: rows } = await context.supabase.from("categories").select("name").limit(100);
      cats = (rows ?? []).map((r: any) => String(r.name)).filter(Boolean);
    }

    const { generatePlainText, extractJsonObject } = await import("@/lib/ai-provider.server");
    const prompt =
      `أنت كاتب محتوى لمتجر بقالة مصري. اكتب بيانات كاملة للمنتج التالي بالعربية المصرية البسيطة.\n` +
      `المنتج: ${data.productName}\nالقسم الحالي: ${data.categoryName || "غير محدد"}\n` +
      (cats.length ? `أقسام المتجر المتاحة (اختر واحدًا منها حرفيًا في suggestedCategory): ${cats.join("، ")}\n` : "") +
      (data.description ? `وصف حالي: ${data.description}\n` : "") +
      `قواعد: لا تذكر أسعارًا أو مخزونًا أو عروضًا. املأ كل المفاتيح ولا تتركها فارغة. characteristics من 3 إلى 5 مميزات. tags من 4 إلى 8 كلمات بحث. ` +
      `القيم الغذائية تقريبية لكل 100 جم مع الوحدة (مثال "15 سعر حراري"، "0.6 جم")، وإن لم يكن طعامًا اتركها فارغة. ` +
      `isByWeight=true للخضار والفاكهة واللحوم والأجبان السائبة، وunitLabel مثل "كجم" أو "قطعة" أو "عبوة" أو "لتر".\n` +
      `أعد JSON فقط دون أي شرح بهذه المفاتيح: {"enhancedTitle":"","shortDescription":"","seoDescription":"","cookingTip":"نصيحة شيف من جملتين","characteristics":[""],"storageInstructions":"","originSource":"","tags":[""],"suggestedCategory":"","isByWeight":false,"unitLabel":"","nutritionalInfo":{"calories":"","protein":"","carbs":"","fiber":"","fats":""}}`;

    const system = "أجب مباشرة بدون تفكير مطول أو مقدمات. اكتب كائن JSON واحدًا فقط.";
    const startedAt = Date.now();
    let j: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 2 && !j; attempt++) {
      // إعادة المحاولة فقط لو الرد وصل ناقصًا وما زال هناك وقت؛ تبديل النماذج المزدحمة يتم داخل المحول.
      if (attempt === 1 && Date.now() - startedAt > 35000) break;
      let text = "";
      try {
        text = await generatePlainText(prompt, { system, maxTokens: 2000, temperature: 0.4, deadlineMs: attempt === 0 ? 70000 : 40000 });
      } catch (error) {
        const msg = String((error as Error)?.message ?? error);
        console.error("[product-copy]", msg.slice(0, 300));
        if (/^(429|5\d\d)\b|network|timeout|abort/i.test(msg)) {
          throw new Error("كل نماذج الذكاء الاصطناعي المجانية مشغولة الآن. حاول مرة أخرى بعد دقيقة.");
        }
        throw new Error("تعذر الاتصال بمزود الذكاء الاصطناعي. راجع الإعدادات ← الذكاء الاصطناعي.");
      }
      j = extractJsonObject(text);
    }
    if (!j) throw new Error("رد الذكاء الاصطناعي لم يكن مكتملًا، حاول مرة أخرى.");

    const n = (j.nutritionalInfo ?? {}) as Record<string, unknown>;
    const sugg = str(j.suggestedCategory, 120);
    const matched = cats.find((c) => c === sugg) || cats.find((c) => sugg && (c.includes(sugg) || sugg.includes(c))) || "";
    return {
      enhancedTitle: str(j.enhancedTitle, 160) || data.productName,
      shortDescription: str(j.shortDescription),
      seoDescription: str(j.seoDescription) || str(j.shortDescription),
      tags: arr(j.tags),
      cookingTip: str(j.cookingTip, 600),
      characteristics: arr(j.characteristics),
      storageInstructions: str(j.storageInstructions, 500),
      originSource: str(j.originSource, 200),
      nutritionalInfo: { calories: str(n.calories, 40), protein: str(n.protein, 40), carbs: str(n.carbs, 40), fiber: str(n.fiber, 40), fats: str(n.fats, 40) },
      keySellingPoints: [],
      suggestedCategory: matched,
      isByWeight: j.isByWeight === true || j.isByWeight === "true",
      unitLabel: str(j.unitLabel, 30),
    };
  });
