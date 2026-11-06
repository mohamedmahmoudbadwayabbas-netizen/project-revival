// قائمة مزودي الذكاء الاصطناعي الجاهزة. المسؤول يمكنه كتابة أي نموذج أو رابط
// بوابة يريده؛ هذه مجرد اقتراحات لتسهيل الإعداد ولا تقيّد شيئًا.
export type AiProviderPreset = {
  id: string;
  label: string;
  baseUrl: string;
  modelHint: string;
  keyUrl?: string;
};

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  { id: "gemini", label: "Google Gemini", baseUrl: "", modelHint: "gemini-3.8-flash", keyUrl: "https://aistudio.google.com/apikey" },
  { id: "dahl", label: "Dahl Inference (GLM / MiniMax / DeepSeek — تبديل تلقائي)", baseUrl: "https://inference.dahl.global/v1", modelHint: "zai-org/GLM-5.3-Flash", keyUrl: "https://inference.dahl.global" },
  { id: "openai", label: "OpenAI (ChatGPT)", baseUrl: "https://api.openai.com/v1", modelHint: "gpt-5.5", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com/v1", modelHint: "claude-opus-5-5", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openrouter", label: "OpenRouter (كل النماذج بمفتاح واحد)", baseUrl: "https://openrouter.ai/api/v1", modelHint: "openai/gpt-5.5", keyUrl: "https://openrouter.ai/keys" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", modelHint: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", modelHint: "llama-3.3-70b-versatile", keyUrl: "https://console.groq.com/keys" },
  { id: "xai", label: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", modelHint: "grok-4", keyUrl: "https://console.x.ai" },
  { id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", modelHint: "mistral-large-latest", keyUrl: "https://console.mistral.ai/api-keys" },
  { id: "custom", label: "مزود آخر (أي بوابة متوافقة مع OpenAI)", baseUrl: "", modelHint: "اكتب اسم النموذج" },
];

export function findPreset(id: string | null | undefined) {
  return AI_PROVIDER_PRESETS.find((p) => p.id === id);
}
