import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { generateGeminiContent } from "@/lib/gemini.functions";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

/**
 * Admin-only: Intelligent AI Root-Cause Analysis
 * Reads recent Nawat interactions, implicit signals, guardrail triggers, negative feedback,
 * actual product catalog, and current agent rules, then asks Gemini to diagnose real AI
 * behavioral failures and generate executable database fixes.
 */
export const generateProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 864e5).toISOString();

    const [interactionsRes, feedbackRes, productsRes, configRes, existingRes] = await Promise.all([
      supabaseAdmin
        .from("agent_interactions")
        .select(
          "id, input_summary, outcome, tools_called, implicit_signal, guardrail_triggered, thinking_summary, created_at",
        )
        .eq("agent_type", "nawat")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(80),
      supabaseAdmin
        .from("agent_feedback")
        .select("interaction_id, rating, reasons, comment")
        .gte("created_at", since)
        .limit(200),
      supabaseAdmin
        .from("products")
        .select("id, name, name_ar, description_ar, search_keywords, price, stock, is_active")
        .limit(200),
      supabaseAdmin
        .from("ai_agent_configs" as never)
        .select("agent_name, dynamic_rules, forbidden_patterns")
        .eq("agent_name", "nawat")
        .maybeSingle(),
      supabaseAdmin
        .from("ai_governance_proposals" as never)
        .select("dedupe_key")
        .in("status", ["pending", "approved", "executed"])
        .limit(500),
    ]);

    if (interactionsRes.error || feedbackRes.error || productsRes.error) {
      throw new Error("تعذر قراءة سجلات التفاعل والكتالوج");
    }

    const existingKeys = new Set(
      ((existingRes.data as any[]) ?? []).map((r) => r.dedupe_key).filter(Boolean),
    );

    const feedbackMap = new Map<string, any>();
    for (const fb of feedbackRes.data ?? []) {
      feedbackMap.set(fb.interaction_id, fb);
    }

    const enrichedInteractions = (interactionsRes.data ?? []).map((item: any) => ({
      ...item,
      feedback: feedbackMap.get(item.id) ?? null,
    }));

    const catalogSummary = (productsRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name_ar || p.name,
      keywords: p.search_keywords ?? [],
      price: p.price,
      stock: p.stock,
      is_active: p.is_active,
    }));

    const diagnosticPrompt = `
أنت «مهندس حوكمة وجودة وكلاء الذكاء الاصطناعي» لمتجر الوادي الأخضر.
مهمتك تحليل سجل تفاعلات المساعد (نواة) — بما في ذلك الإشارات الضمنية (implicit_signal) وحالات تدخل حارس منع الهلوسة (guardrail_triggered) وتقييمات العملاء — ومقارنتها بالمنتجات الحقيقية الموجودة في قاعدة البيانات لاكتشاف أخطاء الذكاء الاصطناعي الحقيقية واقتراح حلول تنفيذية قابلة للتطبيق الفوري على قاعدة البيانات.

### الكتالوج الحقيقي الموجود في المتجر حالياً:
${JSON.stringify(catalogSummary)}

### القواعد السلوكية المطبقة حالياً على نواة:
${JSON.stringify(configRes.data ?? {})}

### آخر تفاعلات العملاء وإشاراتهم الضمنية وتقييماتهم:
${JSON.stringify(enrichedInteractions)}

### قواعد التحليل الصارمة:
1. لا تولّد مقترحات وهمية مثل "راجع المحادثات يدوياً". كل مقترح يجب أن يكون حلاً تنفيذياً حقيقياً من أحد الأنواع الخمسة التالية فقط:
   - "inject_prompt_rule": لحقن قاعدة سلوكية جديدة في برومبت نواة (مثل: منع هلوسة المنتجات غير الموجودة، منع الإنجليزية في التفكير، أو إجباره على استعراض المتاح عند الأسئلة العامة). ضع النص الدقيق للقاعدة في action_payload.rule_text، وإذا كان هناك نمط خاطئ محظور ضعه في action_payload.forbidden_pattern.
   - "update_tool_hints": لإضافة تلميحات تشغيلية لأداة searchProducts في ai_tool_registry. ضع tool_name="searchProducts" و runtime_hints في action_payload.
   - "add_search_synonym": إذا بحث عميل عن كلمة عامية مصرية (مثل "فراخ" أو "بانيه" أو "دايت") بينما المنتج موجود في الكتالوج باسم آخر (مثل "صدور دجاج طازجة"). ضع term و mapped_terms (مصفوفة) و product_ids (مصفوفة معرفات المنتجات المطابقة) في action_payload.
   - "enrich_product_keywords": لإضافة كلمات مفتاحية لمنتج محدد في جدول products. ضع product_id و product_name و keywords (مصفوفة) في action_payload.
   - "create_draft_product": فقط إذا طلب عميل حقيقي (في input_summary) منتجاً غير موجود نهائياً في الكتالوج. ضع name_ar و suggested_price في action_payload.
2. انتبه: إذا تدخل الحارس (guardrail_triggered = true) أو كان الوكيل هو من اخترع اسم منتج/سعر من خياله، فهذه **هلوسة (hallucination)** تُعالج بـ "inject_prompt_rule" لمنع تكرارها مستقبلاً!
3. أرجع النتيجة بصيغة JSON صالحة فقط بدون أي نص خارجي، على الشكل:
{
  "proposals": [
    {
      "agent_name": "nawat",
      "category": "hallucination" | "synonym_gap" | "language_leak" | "catalog_gap" | "tool_tuning" | "ux_failure",
      "severity": "low" | "medium" | "high" | "critical",
      "title_ar": "عنوان إداري واضح ومختصر",
      "root_cause_ar": "شرح دقيق للسبب الجذري الذي اكتشفته من السجلات",
      "expected_impact_ar": "ماذا سيتغير فعلياً في سلوك الوكيل أو المتجر فور الموافقة",
      "action_type": "inject_prompt_rule" | "update_tool_hints" | "add_search_synonym" | "enrich_product_keywords" | "create_draft_product",
      "action_payload": { ... },
      "evidence_count": 1,
      "dedupe_key": "مفتاح_فريد_للمقترح"
    }
  ]
}
`;

    const aiRes: any = await generateGeminiContent({
      data: {
        purpose: "governance_analysis",
        model: DEFAULT_GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: diagnosticPrompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      } as never,
    });

    const rawText =
      aiRes?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text ?? "")
        .join("") ||
      aiRes?.text ||
      "{}";

    let parsed: { proposals?: any[] } = {};
    try {
      const cleanedJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      throw new Error("تعذر قراءة مخرجات التحليل الذكي");
    }

    const validActionTypes = new Set([
      "inject_prompt_rule",
      "update_tool_hints",
      "add_search_synonym",
      "enrich_product_keywords",
      "create_draft_product",
    ]);

    const freshDrafts = (parsed.proposals ?? [])
      .filter(
        (p) =>
          p &&
          validActionTypes.has(p.action_type) &&
          p.dedupe_key &&
          !existingKeys.has(p.dedupe_key),
      )
      .map((p) => ({
        agent_name: p.agent_name || "nawat",
        category: p.category || "tool_tuning",
        severity: p.severity || "medium",
        title_ar: String(p.title_ar || "تحسين سلوك الوكيل"),
        root_cause_ar: String(p.root_cause_ar || ""),
        expected_impact_ar: String(p.expected_impact_ar || ""),
        action_type: p.action_type,
        action_payload: p.action_payload ?? {},
        evidence_count: Number(p.evidence_count || 1),
        dedupe_key: String(p.dedupe_key),
        status: "pending",
      }));

    if (!freshDrafts.length) return { created: 0 };

    const { error: insErr } = await supabaseAdmin
      .from("ai_governance_proposals" as never)
      .insert(freshDrafts as never);

    if (insErr) {
      console.error("[governance] insert error:", insErr.message);
      throw new Error("تعذر حفظ المقترحات الذكية");
    }

    return { created: freshDrafts.length };
  });

/** Admin-only: Operations & Delivery scan */
export const generateOpsProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [productsRes, existingRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, name_ar, stock, stock_quantity, is_active")
        .eq("is_active", true)
        .limit(500),
      supabaseAdmin
        .from("ai_governance_proposals" as never)
        .select("dedupe_key")
        .in("status", ["pending", "executed"])
        .limit(500),
    ]);

    const existingKeys = new Set(
      ((existingRes.data as any[]) ?? []).map((r) => r.dedupe_key).filter(Boolean),
    );

    const outOfStock = (productsRes.data ?? []).filter(
      (p: any) => Number(p.stock ?? p.stock_quantity ?? 0) <= 0,
    );

    const drafts = outOfStock
      .filter((p: any) => !existingKeys.has(`stock_hint:${p.id}`))
      .slice(0, 10)
      .map((p: any) => ({
        agent_name: "nawat",
        category: "tool_tuning",
        severity: "medium",
        title_ar: `تنبيه نواة بنفاد مخزون «${p.name_ar || p.name}»`,
        root_cause_ar: `المنتج «${p.name_ar || p.name}» نشط في المتجر لكن رصيده وصل إلى صفر.`,
        expected_impact_ar: "إضافة تنبيه في ذاكرة نواة بعدم ترشيح هذا المنتج للعملاء حتى إعادة التوريد.",
        action_type: "inject_prompt_rule",
        action_payload: {
          rule_text: `منتج «${p.name_ar || p.name}» نفد من المخزون مؤقتاً؛ لا تقترحه للعملاء واذكر أنه سيتوفر قريباً إذا سألوا عنه.`,
        },
        evidence_count: 1,
        dedupe_key: `stock_hint:${p.id}`,
        status: "pending",
      }));

    if (!drafts.length) return { created: 0 };

    const { error } = await supabaseAdmin
      .from("ai_governance_proposals" as never)
      .insert(drafts as never);

    if (error) throw new Error("تعذر حفظ مقترحات العمليات");
    return { created: drafts.length };
  });

/**
 * Admin-only review & REAL DATABASE EXECUTION
 * Executes the approved proposal directly against ai_agent_configs, ai_tool_registry,
 * product_search_synonyms, or products, and writes an immutable record to ai_governance_audit_logs.
 */
export const reviewProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; decision: "approved" | "rejected" }) => {
    if (typeof d?.id !== "string" || !["approved", "rejected"].includes(d.decision)) {
      throw new Error("Invalid");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: proposalRow, error } = await supabaseAdmin
      .from("ai_governance_proposals" as never)
      .select("*")
      .eq("id", data.id)
      .eq("status", "pending")
      .maybeSingle();

    if (error || !proposalRow) throw new Error("المقترح غير موجود أو تمت مراجعته بالفعل");
    const proposal = proposalRow as any;

    if (data.decision === "rejected") {
      await supabaseAdmin
        .from("ai_governance_proposals" as never)
        .update({
          status: "rejected",
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
        } as never)
        .eq("id", data.id);
      return { status: "rejected" };
    }

    const payload = (proposal.action_payload ?? {}) as Record<string, any>;
    let beforeState: unknown = null;
    let afterState: unknown = null;
    let executionResult = "";
    let finalStatus: "executed" | "failed" = "executed";

    try {
      if (proposal.action_type === "inject_prompt_rule") {
        const agentName = proposal.agent_name || "nawat";
        const { data: cfg } = await supabaseAdmin
          .from("ai_agent_configs" as never)
          .select("id, dynamic_rules, forbidden_patterns")
          .eq("agent_name", agentName)
          .single();

        beforeState = cfg;
        const prevRules: string[] = Array.isArray((cfg as any)?.dynamic_rules)
          ? (cfg as any).dynamic_rules
          : [];
        const prevForbidden: string[] = Array.isArray((cfg as any)?.forbidden_patterns)
          ? (cfg as any).forbidden_patterns
          : [];

        const nextRules = payload.rule_text
          ? Array.from(new Set([...prevRules, String(payload.rule_text).trim()]))
          : prevRules;
        const nextForbidden = payload.forbidden_pattern
          ? Array.from(new Set([...prevForbidden, String(payload.forbidden_pattern).trim()]))
          : prevForbidden;

        const { data: updated, error: updErr } = await supabaseAdmin
          .from("ai_agent_configs" as never)
          .update({
            dynamic_rules: nextRules,
            forbidden_patterns: nextForbidden,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("agent_name", agentName)
          .select("*")
          .single();

        if (updErr) throw updErr;
        afterState = updated;
        executionResult = `تم حقن القاعدة السلوكية في إعدادات «${agentName}» وتفعيلها فوراً.`;
      } else if (proposal.action_type === "update_tool_hints") {
        const agentName = proposal.agent_name || "nawat";
        const toolName = String(payload.tool_name || "searchProducts");
        const { data: toolRow } = await supabaseAdmin
          .from("ai_tool_registry" as never)
          .select("*")
          .eq("agent_name", agentName)
          .eq("tool_name", toolName)
          .maybeSingle();

        beforeState = toolRow;
        const existingHints = (toolRow as any)?.runtime_hints
          ? String((toolRow as any).runtime_hints)
          : "";
        const newHint = String(payload.runtime_hints || "").trim();
        const combinedHints = existingHints ? `${existingHints}\n${newHint}` : newHint;

        const { data: updated, error: updErr } = await supabaseAdmin
          .from("ai_tool_registry" as never)
          .update({
            runtime_hints: combinedHints,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("agent_name", agentName)
          .eq("tool_name", toolName)
          .select("*")
          .single();

        if (updErr) throw updErr;
        afterState = updated;
        executionResult = `تم تحديث تلميحات الأداة (${toolName}) في سجل الأدوات الحي.`;
      } else if (proposal.action_type === "add_search_synonym") {
        const term = String(payload.term || "").trim();
        const mappedTerms = Array.isArray(payload.mapped_terms)
          ? payload.mapped_terms.map(String)
          : [];
        const productIds = Array.isArray(payload.product_ids)
          ? payload.product_ids.map(String)
          : [];

        const { data: upserted, error: upsErr } = await supabaseAdmin
          .from("product_search_synonyms" as never)
          .upsert(
            {
              term,
              mapped_terms: mappedTerms,
              product_ids: productIds,
              source: "governance_approved",
            } as never,
            { onConflict: "term" },
          )
          .select("*")
          .single();

        if (upsErr) throw upsErr;
        afterState = upserted;
        executionResult = `تم ربط المرادف «${term}» بـ (${mappedTerms.join("، ")}) في محرك البحث.`;
      } else if (proposal.action_type === "enrich_product_keywords") {
        const productId = String(payload.product_id || "");
        const newKeywords = Array.isArray(payload.keywords) ? payload.keywords.map(String) : [];

        const { data: prod, error: fetchErr } = await supabaseAdmin
          .from("products")
          .select("id, name_ar, search_keywords")
          .eq("id", productId)
          .single();

        if (fetchErr) throw fetchErr;
        beforeState = prod;
        const merged = Array.from(
          new Set([...((prod as any).search_keywords ?? []), ...newKeywords]),
        );

        const { data: updated, error: updErr } = await supabaseAdmin
          .from("products")
          .update({ search_keywords: merged } as never)
          .eq("id", productId)
          .select("id, name_ar, search_keywords")
          .single();

        if (updErr) throw updErr;
        afterState = updated;
        executionResult = `تمت إضافة الكلمات المفتاحية (${newKeywords.join("، ")}) للمنتج بنجاح.`;
      } else if (proposal.action_type === "create_draft_product") {
        const nameAr = String(payload.name_ar || "").trim();
        const price = Number(payload.suggested_price || 0);

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("products")
          .insert({
            name: nameAr,
            name_ar: nameAr,
            price,
            stock: 0,
            is_active: false,
            description_ar: "مسودة منتج أُنشئت عبر حوكمة الوكلاء بناءً على طلبات العملاء.",
          } as never)
          .select("id, name_ar, price, is_active")
          .single();

        if (insErr) throw insErr;
        afterState = inserted;
        executionResult = `تم إنشاء مسودة منتج «${nameAr}» في الكتالوج (بانتظار التفعيل وإضافة الصورة).`;
      }

      await supabaseAdmin.from("ai_governance_audit_logs" as never).insert({
        proposal_id: data.id,
        action_type: proposal.action_type,
        before_state: beforeState,
        after_state: afterState,
        executed_by: context.userId,
      } as never);
    } catch (execErr) {
      finalStatus = "failed";
      executionResult = `فشل التنفيذ: ${(execErr as Error).message}`;
    }

    await supabaseAdmin
      .from("ai_governance_proposals" as never)
      .update({
        status: finalStatus,
        execution_result: executionResult,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);

    return { status: finalStatus, message: executionResult };
  });
