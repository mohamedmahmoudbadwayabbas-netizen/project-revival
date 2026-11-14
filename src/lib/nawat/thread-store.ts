import type { UIMessage } from "ai";
import { supabase } from "@/lib/supabase-loose";
import type { Json } from "@/integrations/supabase/types";
import type { NawatMessage } from "./chat-engine";

export type ChatRecord = UIMessage & { data?: NawatMessage };
export function packMessages(messages: NawatMessage[]): Json {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
    data: message,
  })) as unknown as Json;
}
export function unpackMessages(value: Json): NawatMessage[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown as ChatRecord[]).flatMap((item) => {
    if (!item?.data || !["user", "assistant"].includes(item.role)) return [];
    return [item.data];
  });
}
export async function listThreads() {
  const { data, error } = await supabase
    .from("nawat_threads")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createThread() {
  const { data, error } = await supabase.from("nawat_threads").insert({}).select("id").single();
  if (error) throw error;
  return data.id;
}
export async function readThread(id: string) {
  const { data, error } = await supabase
    .from("nawat_threads")
    .select("messages")
    .eq("id", id)
    .single();
  if (error) throw error;
  return unpackMessages(data.messages);
}
export async function saveThread(id: string, messages: NawatMessage[]) {
  const { error, data } = await supabase
    .from("nawat_threads")
    .update({
      title: messages.find((m) => m.role === "user")?.content.slice(0, 64) || "محادثة جديدة",
      messages: packMessages(messages),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) throw error || new Error("لم يتم حفظ المحادثة");
}
