import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_LOVABLE_GATEWAY_GEMINI_MODEL } from "@/lib/gemini-config";

export interface AiCodeModificationPayload {
  filePath: string;
  currentCode: string;
  prompt: string;
}

export interface AiCodeModificationResponse {
  ok: boolean;
  summary: string;
  explanation: string;
  modifiedCode: string;
  error?: string;
}

const SYSTEM_PROMPT = `أنت مهندس واجهات أول (Staff Frontend Engineer) لمشروع "Smart Store" المبني على TanStack Start + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase.
مهمتك: تعديل ملف مصدري واحد بالكامل حسب طلب المدير.
قواعد إلزامية:
- حافظ على كل المنطق والاستيرادات والتصديرات القائمة إلا إن طُلب تغييرها صراحة.
- استخدم Tailwind وأيقونات lucide-react فقط، وحافظ على اتجاه RTL والنصوص العربية.
- أعد الملف كاملاً وليس مقتطفاً.
أعد JSON فقط بهذا الشكل:
{"summary":"جملة واحدة بالعربية","explanation":"شرح مختصر بالعربية","modifiedCode":"الكود الكامل بعد التعديل"}`;

export const generateFileModification = createServerFn({ method: "POST" })
  .validator((data: AiCodeModificationPayload) => {
    if (!data?.filePath || !data?.prompt?.trim()) throw new Error("filePath and prompt are required");
    return {
      filePath: String(data.filePath),
      prompt: String(data.prompt).slice(0, 4000),
      currentCode: String(data.currentCode ?? "").slice(0, 120000),
    };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<AiCodeModificationResponse> => {
    // Admin-only: verified against the user_roles table with the caller's own RLS scope.
    const { data: role, error: roleError } = await context.supabase.rpc("get_my_role");
    const normalizedRole = String(role ?? "").toLowerCase();
    const isAdmin = !roleError && ["admin", "super_admin"].includes(normalizedRole);
    if (!isAdmin) {
      return {
        ok: false,
        summary: "",
        explanation: "",
        modifiedCode: "",
        error: "هذه الميزة متاحة لمدير النظام فقط.",
      };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        ok: false,
        summary: "",
        explanation: "",
        modifiedCode: "",
        error: "مفتاح الذكاء الاصطناعي غير مُهيأ على السيرفر.",
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: DEFAULT_LOVABLE_GATEWAY_GEMINI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `الملف الهدف: ${data.filePath}\n\nالكود الحالي:\n\`\`\`tsx\n${data.currentCode}\n\`\`\`\n\nطلب المدير:\n${data.prompt}\n\nأعد JSON فقط.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const message =
        res.status === 429
          ? "تم تجاوز حد الاستخدام مؤقتاً، جرّب بعد قليل."
          : res.status === 402
            ? "رصيد الذكاء الاصطناعي غير كافٍ لإتمام الطلب."
            : `تعذر الاتصال بمحرك الذكاء الاصطناعي (${res.status}).`;
      console.error("AI gateway error", res.status, body.slice(0, 500));
      return { ok: false, summary: "", explanation: "", modifiedCode: "", error: message };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: { summary?: string; explanation?: string; modifiedCode?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    if (!parsed.modifiedCode) {
      return {
        ok: false,
        summary: "",
        explanation: "",
        modifiedCode: "",
        error: "لم يُعد النموذج كوداً صالحاً، أعد صياغة الطلب بتفصيل أكثر.",
      };
    }

    return {
      ok: true,
      summary: parsed.summary || `تعديل ${data.filePath}`,
      explanation: parsed.explanation || "",
      modifiedCode: parsed.modifiedCode,
    };
  });
