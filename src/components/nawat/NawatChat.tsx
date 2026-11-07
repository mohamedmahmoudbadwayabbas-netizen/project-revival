import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Plus, ShoppingCart, ThumbsDown, ThumbsUp } from "lucide-react";
import { logNawatInteraction, submitNawatFeedback } from "@/lib/nawat/agent-log.functions";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { runNawatTurn, type NawatMessage, type NawatPick } from "@/lib/nawat/chat-engine";
import { createThread, listThreads, readThread, saveThread } from "@/lib/nawat/thread-store";
import { NawatMark } from "./icons";

const pendingRuns = new Set<string>();
const GOOD_REASONS = ["إجابة دقيقة", "اقتراحات مناسبة", "أسلوب مفهوم", "رد سريع"];
const BAD_REASONS = [
  "فهم السؤال غلط",
  "معلومات مش دقيقة",
  "اقتراحات مش مناسبة",
  "مالقاش المنتج",
  "رد ناقص أو فاضي",
  "طويل زيادة",
];
const SUGGESTIONS = [
  "إزيك يا نواة؟",
  "اعملي غدا لأربع أشخاص",
  "إيه أفضل طريقة أحفظ بيها الخضار؟",
  "مقاضي الأسبوع بميزانية ٥٠٠ جنيه",
];
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const money = (n: number) => `${n.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

function ThreadList({ activeId, onPick }: { activeId?: string; onPick?: () => void }) {
  const { data = [] } = useQuery({ queryKey: ["nawat-threads"], queryFn: listThreads });
  return (
    <nav className="flex flex-col gap-1" aria-label="المحادثات السابقة">
      <Button asChild className="mb-2 justify-start gap-2">
        <Link to="/assistant" onClick={onPick}>
          <Plus className="size-4" />
          محادثة جديدة
        </Link>
      </Button>
      {data.length === 0 && (
        <p className="px-2 py-4 text-sm text-muted-foreground">لسه مفيش محادثات محفوظة.</p>
      )}
      {data.map((thread) => (
        <Link
          key={thread.id}
          to="/assistant/$threadId"
          params={{ threadId: thread.id }}
          onClick={onPick}
          className={`truncate rounded-md px-3 py-2 text-sm transition-colors ${thread.id === activeId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
        >
          {thread.title}
        </Link>
      ))}
    </nav>
  );
}

function ProductPicks({ picks }: { picks: NawatPick[] }) {
  const { addItem } = useCart();
  const total = picks.reduce((sum, p) => sum + p.product.price_per_unit * p.quantity, 0);
  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 text-card-foreground">
      <div className="grid gap-2 sm:grid-cols-2">
        {picks.map(({ product, quantity, reason }) => (
          <div
            key={product.id}
            className="flex gap-3 rounded-md border border-border bg-background p-2"
          >
            {product.image_url ? (
              <img src={product.image_url} alt="" className="size-14 rounded object-cover" />
            ) : (
              <div className="size-14 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{product.name_ar || product.name}</p>
              <p className="text-xs text-muted-foreground">
                {money(product.price_per_unit)} × {quantity.toLocaleString("ar-EG")}
              </p>
              {reason && <p className="line-clamp-2 text-xs text-muted-foreground">{reason}</p>}
            </div>
            <Button
              size="icon"
              variant="outline"
              aria-label="أضف للسلة"
              onClick={() => {
                addItem(product, quantity);
                toast.success("اتضاف للسلة");
              }}
            >
              <ShoppingCart className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <b>الإجمالي: {money(total)}</b>
        <Button
          onClick={() => {
            picks.forEach((p) => addItem(p.product, p.quantity));
            toast.success("اتضافت كل الاقتراحات للسلة");
          }}
        >
          أضف الكل للسلة
        </Button>
      </div>
    </div>
  );
}

function RateReply({ message, onRated }: { message: NawatMessage; onRated: (r: 1 | -1) => void }) {
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<1 | -1 | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  if (!message.interactionId || message.error) return null;
  const submit = async (rating: 1 | -1, detailed: boolean) => {
    if (sending || message.rating) return;
    setSending(true);
    try {
      await submitNawatFeedback({
        data: {
          interactionId: message.interactionId!,
          rating,
          ...(detailed ? { reasons, comment: comment.trim().slice(0, 500) || undefined } : {}),
        },
      });
      onRated(rating);
      setPending(null);
      toast.success(rating === 1 ? "شكرًا! هيساعدنا نحسّن نواة" : "شكرًا، هنراجع الرد ده ونحسّنه");
    } catch {
      toast.error("مقدرتش أحفظ تقييمك");
    }
    setSending(false);
  };
  const options = pending === 1 ? GOOD_REASONS : BAD_REASONS;
  return (
    <div className="mt-2 text-muted-foreground">
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant={(message.rating ?? pending) === 1 ? "secondary" : "ghost"}
          className="size-7"
          aria-label="رد مفيد"
          disabled={sending || !!message.rating}
          onClick={() => {
            setPending(1);
            setReasons([]);
          }}
        >
          <ThumbsUp className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant={(message.rating ?? pending) === -1 ? "secondary" : "ghost"}
          className="size-7"
          aria-label="رد مش مفيد"
          disabled={sending || !!message.rating}
          onClick={() => {
            setPending(-1);
            setReasons([]);
          }}
        >
          <ThumbsDown className="size-3.5" />
        </Button>
      </div>
      {pending && !message.rating && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-card p-3 text-foreground">
          <p className="text-sm font-medium">
            {pending === 1 ? "إيه اللي عجبك؟" : "إيه اللي كان غلط؟"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <Button
                key={o}
                size="sm"
                variant={reasons.includes(o) ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() =>
                  setReasons((r) => (r.includes(o) ? r.filter((x) => x !== o) : [...r, o]))
                }
              >
                {o}
              </Button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="وضّح أكتر (اختياري)…"
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={sending}
              onClick={() => void submit(pending, false)}
            >
              تخطي
            </Button>
            <Button
              size="sm"
              disabled={sending || (!reasons.length && !comment.trim())}
              onClick={() => void submit(pending, true)}
            >
              إرسال
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ message }: { message: NawatMessage }) {
  return (
    <div className="w-full">
      {message.thinking && (
        <details className="mb-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none font-medium text-muted-foreground">
            أفكار نواة
          </summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {message.thinking}
          </p>
        </details>
      )}
      {message.tools?.map((tool, i) => (
        <Tool key={i} defaultOpen={false} className="mb-2 bg-card">
          <ToolHeader
            type="dynamic-tool"
            toolName="searchProducts"
            state={tool.ok ? "output-available" : "output-error"}
            title={`بحث في المتجر: ${tool.query || "كل المنتجات"} (${tool.count.toLocaleString("ar-EG")} نتيجة)`}
          />
        </Tool>
      ))}
      <MessageResponse>{message.content}</MessageResponse>
      {message.products && <ProductPicks picks={message.products} />}
    </div>
  );
}

export function NawatChat({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<NawatMessage[]>([]);
  const [loaded, setLoaded] = useState(!threadId);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState("");
  const [liveThinking, setLiveThinking] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const respond = useCallback(
    async (id: string, conversation: NawatMessage[]) => {
      setBusy(true);
      setActivity("");
      setLiveThinking("");
      let next: NawatMessage[];
      const lastUser = conversation.at(-1)?.content ?? "";
      const log = async (
        tools: NawatMessage["tools"],
        outcome: "success" | "no_results" | "error",
      ) => {
        try {
          const r = await logNawatInteraction({
            data: {
              threadId: id,
              inputSummary: lastUser.slice(0, 500),
              tools: (tools ?? []).slice(0, 20),
              outcome,
            },
          });
          return r.id ?? undefined;
        } catch {
          return undefined;
        }
      };
      try {
        const reply = await runNawatTurn(conversation, setActivity, setLiveThinking);
        const noResults = !!reply.tools?.length && reply.tools.every((t) => t.count === 0);
        const interactionId = await log(reply.tools, noResults ? "no_results" : "success");
        next = [
          ...conversation,
          { id: uid(), role: "assistant", createdAt: now(), ...reply, interactionId },
        ];
      } catch (error) {
        console.error("[Nawat]", error);
        await log(undefined, "error");
        next = [
          ...conversation,
          {
            id: uid(),
            role: "assistant",
            createdAt: now(),
            error: true,
            content: "حصلت مشكلة في الاتصال بالمساعد. رسالتك محفوظة، جرّب تبعتها تاني بعد شوية.",
          },
        ];
      }
      setMessages(next);
      try {
        await saveThread(id, next);
      } catch {
        toast.error("مقدرتش أحفظ آخر رد في محادثتك");
      }
      await queryClient.invalidateQueries({ queryKey: ["nawat-threads"] });
      setBusy(false);
      setActivity("");
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;
    if (!threadId) {
      setMessages([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    readThread(threadId)
      .then((saved) => {
        if (cancelled) return;
        setMessages(saved);
        setLoaded(true);
        if (pendingRuns.delete(threadId) && saved.at(-1)?.role === "user")
          void respond(threadId, saved);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("المحادثة دي مش موجودة");
          void navigate({ to: "/assistant" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, navigate, respond]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, loaded]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 2000);
    if (!text || busy) return;
    setInput("");
    const userMessage: NawatMessage = { id: uid(), role: "user", content: text, createdAt: now() };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setBusy(true);
    try {
      if (!threadId) {
        const id = await createThread();
        await saveThread(id, conversation);
        pendingRuns.add(id);
        await queryClient.invalidateQueries({ queryKey: ["nawat-threads"] });
        setBusy(false);
        await navigate({ to: "/assistant/$threadId", params: { threadId: id } });
        return;
      }
      await saveThread(threadId, conversation);
      void respond(threadId, conversation);
    } catch {
      setBusy(false);
      setMessages(messages);
      setInput(text);
      toast.error("مقدرتش أحفظ رسالتك، جرّب تاني");
    }
  };

  return (
    <div
      className="mx-auto flex h-[calc(100dvh-var(--nw-topbar-h,72px))] w-full max-w-6xl gap-4 px-3 pb-3 pt-2"
      dir="rtl"
    >
      <aside className="hidden w-64 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-3 md:block">
        <ThreadList activeId={threadId} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="size-4" />
                المحادثات
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 overflow-y-auto bg-card" dir="rtl">
              <SheetHeader>
                <SheetTitle>محادثاتك</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ThreadList activeId={threadId} onPick={() => setHistoryOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="flex-1" />
          <Button asChild size="sm" variant="secondary" className="gap-2">
            <Link to="/assistant">
              <Plus className="size-4" />
              جديدة
            </Link>
          </Button>
        </div>

        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5">
            {loaded && messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <NawatMark size={56} />
                <h1 className="text-2xl font-bold text-foreground">أهلاً، أنا نواة</h1>
                <p className="max-w-md text-muted-foreground">
                  اسألني عن أي حاجة، أو قولّي محتاج إيه من المتجر وأنا أرشحلك منتجات حقيقية متوفرة.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => void send(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {!loaded && <Shimmer>بيحمّل المحادثة…</Shimmer>}
            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent
                  className={
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.error
                        ? "text-destructive"
                        : ""
                  }
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <>
                      <AssistantMessage message={m} />
                      <RateReply
                        message={m}
                        onRated={(rating) => {
                          const updated = messages.map((x) =>
                            x.id === m.id ? { ...x, rating } : x,
                          );
                          setMessages(updated);
                          if (threadId) void saveThread(threadId, updated).catch(() => undefined);
                        }}
                      />
                    </>
                  )}
                </MessageContent>
              </Message>
            ))}
            {busy && loaded && messages.at(-1)?.role === "user" && (
              <Message from="assistant">
                <MessageContent>
                  <div className="w-full">
                    <details
                      open
                      className="mb-2 rounded-md border border-border bg-muted px-3 py-2 text-sm"
                    >
                      <summary className="cursor-pointer select-none font-medium text-muted-foreground">
                        <Shimmer>نواة بيفكّر الآن…</Shimmer>
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                        {liveThinking || "بيقرأ سؤالك ويحدد يرد إزاي…"}
                      </p>
                    </details>
                    <Shimmer>{activity || "نواة بيكتب الرد…"}</Shimmer>
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border bg-card p-3">
          <PromptInput
            className="mx-auto max-w-3xl"
            onSubmit={(message) => void send(message.text ?? input)}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لنواة…"
              disabled={busy || !loaded}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={busy ? "submitted" : undefined}
                disabled={busy || !loaded || !input.trim()}
                aria-label="إرسال"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>
    </div>
  );
}
