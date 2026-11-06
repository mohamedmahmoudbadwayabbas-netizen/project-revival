import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Safe Supabase Query Wrapper for handling errors gracefully & alerting users via Toast
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessagePrefix: string = "حدث خلل أثناء الاتصال بقاعدة البيانات",
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.error(`[Supabase Error]: ${errorMessagePrefix}`, error);
      toast.error(`${errorMessagePrefix}: ${error.message || "تعذر إكمال الطلب"}`);
      return null;
    }
    return data;
  } catch (err: any) {
    console.error(`[Supabase Exception]: ${errorMessagePrefix}`, err);
    toast.error(`${errorMessagePrefix}: ${err.message || "انقطع الاتصال بالسيرفر"}`);
    return null;
  }
}
