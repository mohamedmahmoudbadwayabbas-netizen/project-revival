import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

/**
 * Loosely-typed Supabase client.
 *
 * The generated `Database` types are regenerated from the live schema and are
 * currently narrower than what parts of the app query (legacy/extra tables and
 * columns). This wrapper keeps those modules compiling without touching the
 * auto-generated client or the database itself.
 */
export const supabase = typedSupabase as unknown as SupabaseClient<any, "public", any>;
export default supabase;
