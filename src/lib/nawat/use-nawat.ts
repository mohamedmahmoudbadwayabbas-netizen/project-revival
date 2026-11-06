import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart, type Product } from "@/lib/cart-context";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { normalizeProduct } from "@/lib/store-data-hooks";
import { runAdminCoPilotChat, type ChatMessage } from "@/services/gemini36Service";
import { buildNawatResult, collectSearchRows, extractJsonObject, fallbackResult } from "./parse";
import {
  NAWAT_STEP_ORDER,
  type NawatErrorKind,
  type NawatPhase,
  type NawatProgressEvent,
  type NawatResult,
  type NawatStepId,
  type NawatStepState,
  type NawatSuggestion,
} from "./types";

export type NawatSteps = Record<NawatStepId, NawatStepState>;

const INITIAL_STEPS: NawatSteps = {
  understand: "waiting",
  catalog: "waiting",
  compare: "waiting",
  arrange: "waiting",
};

/**
 * يطبّق حدث تقدم فعلي: عند بدء خطوة تصبح السابقة لها «تمت» واللاحقة «بانتظار».
 * لا توجد أي خطوة تتحرك بمؤقت؛ كل تغيير يأتي من استجابة نموذج أو تنفيذ أداة.
 */
export function applyProgress(previous: NawatSteps, event: NawatProgressEvent): NawatSteps {
  const index = NAWAT_STEP_ORDER.indexOf(event.step);
  const next = { ...previous };
  NAWAT_STEP_ORDER.forEach((id, position) => {
    if (position < index) next[id] = "done";
    else if (position === index) next[id] = event.state;
    else if (event.state === "current") next[id] = "waiting";
  });
  return next;
}

function classifyThrown(error: unknown): NawatErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /GEMINI_API_KEY/i.test(message) ? "not_configured" : "failed";
}

function timestamp(): string {
  return new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export interface NawatController {
  phase: NawatPhase;
  /** آخر رسالة أرسلها العميل. */
  request: string;
  steps: NawatSteps;
  result: NawatResult | null;
  errorKind: NawatErrorKind | null;
  isBusy: boolean;
  submit: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  /** يعود لشاشة البداية مع إبقاء نص الطلب ليعدّله العميل. */
  edit: () => void;
  /** يطلب من نواة بديلًا لمنتج بعينه بنفس شروط الطلب. */
  replace: (product: Product) => Promise<void>;
  isSelected: (productId: string) => boolean;
  toggle: (productId: string) => void;
  selectedItems: NawatSuggestion[];
  selectedTotal: number;
  addedToCart: boolean;
  addSelectionToCart: () => void;
}

export function useNawat(): NawatController {
  const { addItem } = useCart();
  const [phase, setPhase] = useState<NawatPhase>("start");
  const [request, setRequest] = useState("");
  const [steps, setSteps] = useState<NawatSteps>(INITIAL_STEPS);
  const [result, setResult] = useState<NawatResult | null>(null);
  const [errorKind, setErrorKind] = useState<NawatErrorKind | null>(null);
  const [deselected, setDeselected] = useState<ReadonlySet<string>>(new Set());
  const [addedToCart, setAddedToCart] = useState(false);

  const historyRef = useRef<ChatMessage[]>([]);
  /** منتجات قُرئت فعلًا من Supabase خلال هذه الجلسة (تتحدث مع كل بحث جديد). */
  const catalogRef = useRef(new Map<string, Product>());
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const lastRequestRef = useRef("");

  const submit = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busyRef.current) return;

    const runId = ++runRef.current;
    const isCurrent = () => runRef.current === runId;
    busyRef.current = true;
    lastRequestRef.current = text;

    setRequest(text);
    setPhase("processing");
    setSteps(INITIAL_STEPS);
    setErrorKind(null);
    setAddedToCart(false);

    const fail = (kind: NawatErrorKind) => {
      setErrorKind(kind);
      setPhase("error");
    };

    try {
      const reply = await runAdminCoPilotChat(text, historyRef.current, {
        model: DEFAULT_GEMINI_MODEL,
        role: "copywriter",
        page: "assistant",
        userRole: "customer",
        onProgress: (event) => {
          if (isCurrent()) setSteps((previous) => applyProgress(previous, event));
        },
      });
      if (!isCurrent()) return;

      if (reply.modelUsed === "gemini-server-key-missing") return fail("not_configured");
      if (reply.modelUsed === "gemini-request-failed" || reply.modelUsed === "gemini-unavailable") {
        return fail("failed");
      }
      if (reply.status === "unverified") return fail("unverified");
      if (reply.status === "no_matches" || reply.status === "out_of_stock") {
        setResult(null);
        setPhase("empty");
        return;
      }

      // منتجات هذا الدور فقط (للبديل الآمن) + تراكم الجلسة (للتعديلات التي تعيد استخدام منتجات سابقة).
      const turnCatalog = new Map<string, Product>();
      for (const row of collectSearchRows(reply.toolResults)) {
        const product = normalizeProduct(row);
        turnCatalog.set(product.id, product);
        catalogRef.current.set(product.id, product);
      }

      let resolved = buildNawatResult(reply.text, catalogRef.current);
      if (!resolved && !extractJsonObject(reply.text)) resolved = fallbackResult(turnCatalog);

      if (!resolved) {
        setResult(null);
        setPhase("empty");
        return;
      }

      historyRef.current = [
        ...historyRef.current,
        { id: `customer-${runId}`, role: "user" as const, content: text, timestamp: timestamp() },
        {
          id: `assistant-${runId}`,
          role: "assistant" as const,
          content: reply.text.slice(0, 4000),
          timestamp: timestamp(),
        },
      ].slice(-40);

      setSteps((previous) => applyProgress(previous, { step: "arrange", state: "done" }));
      setResult(resolved);
      setDeselected(new Set());
      setPhase("result");
    } catch (error) {
      if (isCurrent()) fail(classifyThrown(error));
    } finally {
      if (isCurrent()) busyRef.current = false;
    }
  }, []);

  const retry = useCallback(() => submit(lastRequestRef.current), [submit]);

  const reset = useCallback(() => {
    runRef.current++;
    busyRef.current = false;
    historyRef.current = [];
    catalogRef.current = new Map();
    lastRequestRef.current = "";
    setPhase("start");
    setRequest("");
    setSteps(INITIAL_STEPS);
    setResult(null);
    setErrorKind(null);
    setDeselected(new Set());
    setAddedToCart(false);
  }, []);

  const edit = useCallback(() => {
    if (busyRef.current) return;
    setPhase("start");
  }, []);

  const replace = useCallback(
    (product: Product) =>
      submit(`استبدل «${product.name_ar || product.name}» بمنتج بديل مناسب بنفس شروط طلبي`),
    [submit],
  );

  const toggle = useCallback((productId: string) => {
    setAddedToCart(false);
    setDeselected((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const isSelected = useCallback((productId: string) => !deselected.has(productId), [deselected]);

  const selectedItems = useMemo(
    () =>
      result
        ? result.groups
            .flatMap((group) => group.items)
            .filter((item) => !deselected.has(item.product.id))
        : [],
    [result, deselected],
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.product.price_per_unit * item.quantity, 0),
    [selectedItems],
  );

  const addSelectionToCart = useCallback(() => {
    if (!selectedItems.length) return;
    for (const item of selectedItems) addItem(item.product, item.quantity);
    setAddedToCart(true);
    toast.success("أضفت اختياراتك إلى السلة");
  }, [addItem, selectedItems]);

  return {
    phase,
    request,
    steps,
    result,
    errorKind,
    isBusy: phase === "processing",
    submit,
    retry,
    reset,
    edit,
    replace,
    isSelected,
    toggle,
    selectedItems,
    selectedTotal,
    addedToCart,
    addSelectionToCart,
  };
}
