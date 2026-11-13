import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  History,
  Plus,
  ShoppingCart,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  Utensils,
  Wallet,
  Leaf,
  MessageCircle,
  PanelRight,
  ChevronDown,
  Check,
  Search,
  Send,
  ArrowDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { logNawatInteraction, submitNawatFeedback } from "@/lib/nawat/agent-log.functions";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
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

const STARTER_CARDS = [
  {
    title: "غدا لأربع أشخاص",
    desc: "اقتراح أكلة متكاملة بمكوناتها من المتجر",
    prompt: "اعملي غدا لأربع أشخاص",
    icon: Utensils,
  },
  {
    title: "مقاضي بميزانية ٥٠٠ جنيه",
    desc: "تجميعة أساسية ذكية بأفضل قيمة",
    prompt: "مقاضي الأسبوع بميزانية ٥٠٠ جنيه",
    icon: Wallet,
  },
  {
    title: "حفظ الخضار طازج",
    desc: "نصائح عملية لتخزين الخضار والفاكهة",
    prompt: "إيه أفضل طريقة أحفظ بيها الخضار؟",
    icon: Leaf,
  },
  {
    title: "ابدأ دردشة مع نواة",
    desc: "اسأل عن أي منتج أو وصفة في بالك",
    prompt: "إزيك يا نواة؟",
    icon: MessageCircle,
  },
];

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const money = (n: number) => `${n.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

function ThreadList({ activeId, onPick }: { activeId?: string; onPick?: () => void }) {
  const { data = [] } = useQuery({ queryKey: ["nawat-threads"], queryFn: listThreads });
  return (
    <nav className="flex flex-col gap-1.5" aria-label="المحادثات السابقة">
      <Button
        asChild
        className="mb-3 justify-start gap-2 rounded-xl bg-primary font-bold shadow-xs"
      >
        <Link to="/assistant" onClick={onPick}>
          <Plus className="size-4" />
          محادثة جديدة
        </Link>
      </Button>
      <div className="px-2 pb-1 text-[11px] font-bold text-muted-foreground">
        المحادثات السابقة
      </div>
      {data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          لسه مفيش محادثات محفوظة.
        </div>
      )}
      {data.map((thread) => {
        const isActive = thread.id === activeId;
        return (
          <Link
            key={thread.id}
            to="/assistant/$threadId"
            params={{ threadId: thread.id }}
            onClick={onPick}
            className={`group flex items-center gap-2 truncate rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
              isActive
                ? "bg-primary/10 font-bold text-primary dark:bg-primary/20"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            }`}
          >
            <MessageCircle
              className={`size-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="truncate">{thread.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ProductPicks({ picks }: { picks: NawatPick[] }) {
  const { addItem } = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const total = picks.reduce((sum, p) => sum + p.product.price_per_unit * p.quantity, 0);

  const handleAddSingle = (product: NawatPick["product"], quantity: number) => {
    addItem(product, quantity);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    toast.success("اتضاف للسلة");
    window.setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-2xs backdrop-blur-xs"
    >
      <div className="grid gap-2.5 p-3 sm:grid-cols-2">
        {picks.map(({ product, quantity, reason }) => {
          const isAdded = addedIds[product.id];
          return (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-2.5 transition hover:border-primary/40"
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  className="size-14 shrink-0 rounded-lg object-cover bg-muted"
                />
              ) : (
                <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Sparkles className="size-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                  {product.name_ar || product.name}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-primary">
                  {money(product.price_per_unit)} × {quantity.toLocaleString("ar-EG")}
                </p>
                {reason && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{reason}</p>
                )}
              </div>
              <Button
                size="icon"
                variant={isAdded ? "default" : "outline"}
                className="size-9 shrink-0 rounded-xl"
                aria-label="أضف للسلة"
                onClick={() => handleAddSingle(product, quantity)}
              >
                {isAdded ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/40 px-4 py-2.5">
        <div className="text-xs sm:text-sm">
          <span className="text-muted-foreground">الإجمالي: </span>
          <b className="font-black text-foreground">{money(total)}</b>
        </div>
        <Button
          size="sm"
          className="rounded-xl font-bold shadow-2xs"
          onClick={() => {
            picks.forEach((p) => addItem(p.product, p.quantity));
            toast.success("اتضافت كل الاقتراحات للسلة");
          }}
        >
          <ShoppingCart className="me-1.5 size-3.5" />
          أضف الكل للسلة
        </Button>
      </div>
    </motion.div>
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
    <div className="mt-2.5 text-muted-foreground">
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant={(message.rating ?? pending) === 1 ? "secondary" : "ghost"}
          className="size-7 rounded-full"
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
          className="size-7 rounded-full"
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

      <AnimatePresence>
        {pending && !message.rating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-2xl border border-border bg-card p-3.5 text-foreground shadow-xs"
          >
            <p className="text-xs font-bold">
              {pending === 1 ? "إيه اللي عجبك؟" : "إيه اللي كان غلط؟"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {options.map((o) => (
                <Button
                  key={o}
                  size="sm"
                  variant={reasons.includes(o) ? "default" : "outline"}
                  className="h-7 rounded-full text-xs"
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
              className="mt-2.5 rounded-xl text-xs"
            />
            <div className="mt-2.5 flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-xs"
                disabled={sending}
                onClick={() => void submit(pending, false)}
              >
                تخطي
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold"
                disabled={sending || (!reasons.length && !comment.trim())}
                onClick={() => void submit(pending, true)}
              >
                إرسال
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssistantMessage({ message }: { message: NawatMessage }) {
  return (
    <div className="w-full space-y-2.5">
      {message.thinking && (
        <details className="group rounded-2xl border border-border/70 bg-muted/40 px-3.5 py-2 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between select-none font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>أفكار نواة</span>
            </span>
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 whitespace-pre-wrap border-t border-border/50 pt-2 leading-relaxed text-muted-foreground">
            {message.thinking}
          </p>
        </details>
      )}
      {message.tools?.map((tool, i) => (
        <Tool key={i} defaultOpen={false} className="rounded-xl bg-card/80">
          <ToolHeader
            type="dynamic-tool"
            toolName="searchProducts"
            state={tool.ok ? "output-available" : "output-error"}
            title={`بحث في المتجر: ${tool.query || "كل المنتجات"} (${tool.count.toLocaleString("ar-EG")} نتيجة)`}
          />
        </Tool>
      ))}
      <div className="text-sm leading-7 sm:text-[15px]">
        <MessageResponse>{message.content}</MessageResponse>
      </div>
      {message.products && <ProductPicks picks={message.products} />}
    </div>
  );
}

function NawatLiveThinkingBlock({
  activity,
  liveThinking,
}: {
  activity: string;
  liveThinking: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 py-1"
    >
      <div className="relative mt-0.5 grid size-8 shrink-0 place-items-center">
        <motion.span
          animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0.12, 0.45] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-primary/40 blur-xs"
        />
        <motion.div
          animate={{ rotate: [0, 6, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <NawatMark size={28} />
        </motion.div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <details
          open
          className="group overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/[0.06] via-muted/40 to-background px-3.5 py-2.5 text-xs shadow-2xs"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between select-none font-bold text-primary">
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
                    transition={{
                      duration: 0.85,
                      repeat: Infinity,
                      delay: dot * 0.16,
                      ease: "easeInOut",
                    }}
                    className="size-1.5 rounded-full bg-primary"
                  />
                ))}
              </span>
              <span>{activity || "نواة بيفكّر الآن…"}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          <p className="mt-2 whitespace-pre-wrap border-t border-border/50 pt-2 leading-relaxed text-muted-foreground">
            {liveThinking || "بيقرأ سؤالك ويدوّر في منتجات المتجر المتوفرة…"}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="ms-1 inline-block h-3.5 w-1.5 rounded-xs bg-primary align-middle"
            />
          </p>
        </details>

        <div className="h-1 w-40 overflow-hidden rounded-full bg-primary/10">
          <motion.div
            animate={{ x: ["100%", "-100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent"
          />
        </div>
      </div>
    </motion.div>
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, busy, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 140);
  };

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div
      className="relative flex h-[calc(100dvh-var(--nw-topbar-h,64px))] w-full overflow-hidden bg-background"
      dir="rtl"
    >
      {/* ─── DESKTOP COLLAPSIBLE SIDEBAR ─── */}
      <AnimatePresence initial={false}>
        {desktopSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 268, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="hidden lg:flex shrink-0 flex-col overflow-hidden border-e border-border/70 bg-muted/25 p-3"
          >
            <div className="flex-1 overflow-y-auto">
              <ThreadList activeId={threadId} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── MAIN CHAT COLUMN ─── */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Top Shimmer Line when Thinking */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] overflow-hidden bg-primary/15"
            >
              <motion.div
                animate={{ x: ["100%", "-100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single Slim Sub-Header Bar */}
        <header className="flex h-12 flex-none items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarOpen((v) => !v)}
              className="hidden lg:inline-flex size-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="القائمة الجانبية"
            >
              <PanelRight className="size-4" />
            </Button>

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-2.5 text-xs font-semibold lg:hidden"
                >
                  <History className="size-3.5" />
                  <span>المحادثات</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[82vw] max-w-xs overflow-y-auto bg-card"
                dir="rtl"
              >
                <SheetHeader>
                  <SheetTitle className="text-right text-sm font-bold">محادثاتك مع نواة</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ThreadList activeId={threadId} onPick={() => setHistoryOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 rounded-full px-3 text-xs font-bold text-primary hover:bg-primary/10"
          >
            <Link to="/assistant">
              <Plus className="size-3.5" />
              <span>محادثة جديدة</span>
            </Link>
          </Button>
        </header>

        {/* Native Scrollable Messages Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 min-h-0 overflow-y-auto px-3 py-5 sm:px-6 md:py-8"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {/* Empty Welcome Hero State */}
            {loaded && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className="flex flex-col items-center pt-2 pb-4 text-center sm:pt-6"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-4 rounded-3xl bg-primary/[0.06] p-3.5 ring-1 ring-primary/15"
                >
                  <NawatMark size={48} />
                </motion.div>

                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  أهلاً، أنا نواة
                </h1>
                <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground sm:text-sm">
                  مساعدك الذكي في الوادي الأخضر. اسألني عن أي وصفة أو ميزانية، وهارشحلك منتجات
                  حقيقية متوفرة في المتجر فوراً.
                </p>

                {/* Responsive Starter Cards Grid */}
                <div className="mt-6 grid w-full grid-cols-1 gap-2.5 text-right sm:grid-cols-2">
                  {STARTER_CARDS.map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.button
                        key={card.prompt}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => void send(card.prompt)}
                        className="group flex items-start gap-3 rounded-2xl border border-border/80 bg-card/60 p-3.5 text-right transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                      >
                        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-foreground sm:text-sm">
                            {card.title}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {card.desc}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Loading Thread Skeleton */}
            {!loaded && (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-muted-foreground">
                <Search className="size-4 animate-pulse text-primary" />
                <span>بيحمّل المحادثة…</span>
              </div>
            )}

            {/* Messages Thread */}
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`flex w-full items-start gap-3 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="mt-0.5 shrink-0">
                        <NawatMark size={28} />
                      </div>
                    )}

                    <div
                      className={`min-w-0 ${
                        isUser
                          ? "max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tl-md bg-primary px-4 py-2.5 text-sm leading-7 text-primary-foreground shadow-2xs"
                          : m.error
                            ? "w-full rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                            : "flex-1 text-foreground"
                      }`}
                    >
                      {isUser ? (
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
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Live Thinking Indicator */}
            <AnimatePresence>
              {busy && loaded && messages.at(-1)?.role === "user" && (
                <NawatLiveThinkingBlock activity={activity} liveThinking={liveThinking} />
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to Bottom Floating Pill (Only appears when scrolled up) */}
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={() => scrollToBottom("smooth")}
              aria-label="الانتقال للأسفل"
              className="absolute bottom-24 left-1/2 z-20 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur-xs hover:bg-muted"
            >
              <ArrowDown className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Clean Native Floating Prompt Composer */}
        <div className="flex-none bg-gradient-to-t from-background via-background to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6">
          <form onSubmit={handleFormSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-border bg-muted/45 p-1.5 shadow-xs transition-all focus-within:border-primary/60 focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={busy ? "نواة بيفكّر الآن…" : "اكتب رسالتك لنواة…"}
                disabled={busy || !loaded}
                rows={1}
                dir="auto"
                className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-50"
              />

              <motion.button
                type="submit"
                whileTap={{ scale: 0.92 }}
                disabled={busy || !loaded || !input.trim()}
                aria-label="إرسال"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
              >
                <Send className="size-4 rtl:-scale-x-100" />
              </motion.button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
