import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_PROVIDER_PRESETS, findPreset } from "@/lib/ai-providers";
import { getAiSettings, testAiConnection, updateAiSettings } from "@/lib/ai-settings.functions";

export function AiProviderSettings() {
  const load = useServerFn(getAiSettings);
  const save = useServerFn(updateAiSettings);
  const test = useServerFn(testAiConnection);
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "test" | null>("load");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    load()
      .then((s) => {
        setProvider(s.provider);
        setBaseUrl(s.baseUrl);
        setModel(s.model);
        setHasKey(s.hasKey || s.usingServerKey);
      })
      .catch(() => {})
      .finally(() => setBusy(null));
  }, [load]);

  const preset = findPreset(provider);
  const needsUrl = provider === "custom";

  const onSave = async (andTest = false) => {
    setBusy(andTest ? "test" : "save");
    setResult(null);
    try {
      await save({ data: { provider, apiKey, baseUrl, model } });
      if (apiKey) setHasKey(true);
      setApiKey("");
      if (andTest) {
        const r = await test();
        setResult(r);
      } else toast.success("تم حفظ إعدادات الذكاء الاصطناعي");
    } catch (e) {
      toast.error((e as Error).message || "تعذر الحفظ");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-bold text-foreground">الذكاء الاصطناعي (نواة ومساعد الوادي)</h3>
          <p className="text-xs text-muted-foreground">اختر الشركة، والصق مفتاحك، واكتب اسم أي نموذج تريده.</p>
        </div>
      </div>

      {busy === "load" ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">١. الشركة المزودة</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModel("");
                setBaseUrl("");
                setResult(null);
              }}
            >
              {AI_PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {preset?.keyUrl && (
              <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                احصل على مفتاح من هنا <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">٢. المفتاح</span>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? "•••••••• (محفوظ — اتركه فارغًا للإبقاء عليه)" : "الصق المفتاح هنا"}
                dir="ltr"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="إظهار المفتاح">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <span className="block text-xs text-muted-foreground">يمكنك لصق عدة مفاتيح مفصولة بفاصلة أو مسافة — عند نفاد حصة مفتاح ينتقل المتجر للتالي تلقائيًا.</span>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">٣. اسم النموذج (اختياري)</span>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={`مثال: ${preset?.modelHint ?? ""}`} dir="ltr" />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">رابط البوابة {needsUrl ? "(مطلوب)" : "(اختياري — للمتقدمين)"}</span>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={preset?.baseUrl || "https://.../v1"} dir="ltr" disabled={provider === "gemini"} />
          </label>
        </div>
      )}

      {result && (
        <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${result.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <XCircle className="h-4 w-4 mt-0.5" />}
          <span>{result.message}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onSave(true)} disabled={busy !== null} className="gap-2">
          {busy === "test" && <Loader2 className="h-4 w-4 animate-spin" />} حفظ واختبار الاتصال
        </Button>
        <Button variant="outline" onClick={() => onSave(false)} disabled={busy !== null}>
          {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} حفظ فقط
        </Button>
      </div>
    </section>
  );
}
