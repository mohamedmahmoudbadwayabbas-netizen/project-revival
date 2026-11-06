import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const interactionSchema = z.object({
  threadId: z.string().max(100).optional(),
  inputSummary: z.string().max(500),
  tools: z.array(z.object({ query: z.string().max(80), ok: z.boolean(), count: z.number().int().min(0) })).max(20),
  outcome: z.enum(["success", "no_results", "error"]),
});

/** Records one Nawat turn (agent_interactions) as the signed-in customer. RLS enforces actor_id = caller. */
export const logNawatInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => interactionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("agent_interactions" as never)
      .insert({
        agent_type: "nawat",
        actor_id: context.userId,
        actor_role: "customer",
        thread_id: data.threadId ?? null,
        input_summary: data.inputSummary,
        tools_called: data.tools,
        outcome: data.outcome,
      } as never)
      .select("id")
      .single();
    if (error) {
      console.error("[agent-log] interaction", error.message);
      return { id: null as string | null };
    }
    return { id: (row as { id: string }).id };
  });

const feedbackSchema = z.object({
  interactionId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(500).optional(),
  reasons: z.array(z.string().max(60)).max(8).optional(),
});

/** Stores a customer's thumbs up/down on a Nawat reply (agent_feedback). */
export const submitNawatFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => feedbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agent_feedback" as never).insert({
      interaction_id: data.interactionId,
      user_id: context.userId,
      signal_type: data.reasons?.length || data.comment ? "detailed_rating" : "explicit_rating",
      rating: data.rating,
      comment: [data.reasons?.length ? `[${data.reasons.join("، ")}]` : "", data.comment ?? ""].filter(Boolean).join(" ") || null,
    } as never);
    if (error) throw new Error("تعذر حفظ التقييم");
    return { ok: true };
  });
