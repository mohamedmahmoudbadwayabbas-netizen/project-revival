import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "@/integrations/supabase/mock-client";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all store categories (flat schema: id, name, name_ar, slug, image_url).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const sb =
      url && key
        ? createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : createMockSupabaseClient("mcp:list_categories");
    const { data, error } = await sb
      .from("categories")
      .select("id,name,name_ar,slug,image_url,created_at")
      .order("created_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});
