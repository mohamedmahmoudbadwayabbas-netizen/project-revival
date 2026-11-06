import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/cart-context";
import {
  NAWAT_STEP_ORDER,
  type NawatErrorKind,
  type NawatStepId,
  type NawatStepState,
  type NawatSuggestion,
} from "@/lib/nawat/types";
import type { NawatController, NawatSteps } from "@/lib/nawat/use-nawat";
import { Composer, QuickSuggestions } from "./Composer";
import {
  IconAlert,
  IconBox,
  IconCheck,
  IconChevronUp,
  IconEdit,
  IconInfo,
  IconPlus,
  IconSearch,
  IconSwap,
  NawatMark,
} from "./icons";
import { StoreLogoCompact } from "./NawatTopBar";

const formatNumber = (value: number) => value.toLocaleString("ar-EG");
const formatMoney = (value: number) =>
  `${value.toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
const productName = (product: Product) => product.name_ar || product.name;

/* ───────────────────────── 1) البداية ───────────────────────── */

export function StartScreen({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
}) {
  return (
    <main className="nw-start">
      <NawatMark size={64} className="nw-start__mark" />
      <h1 className="nw-start__title">مقاضيك تبدأ بفكرة.</h1>
      <p className="nw-start__sub">قولّي بتجهّز لإيه، ومحتاج إيه، ونرتّب اختياراتك سوا.</p>
      <Composer
        variant="large"
        value={value}
        onChange={onChange}
        onSubmit={() => onSubmit(value)}
        placeholder="اكتب وجبة، مكونات، ميزانية، أو احتياجات البيت…"
        hint="اكتب بحرّية — سطر واحد أو أكتر"
        buttonLabel="اقترح لي"
        autoFocus
      />
      <QuickSuggestions
        onPick={(text) => {
          onChange(text);
          onSubmit(text);
        }}
      />
    </main>
  );
}

/* ───────────────────────── مشترك: صدى الطلب ───────────────────────── */

function RequestEcho({ text }: { text: string }) {
  return (
    <section className="nw-card nw-echo" aria-label="طلبك">
      <p className="nw-echo__label">طلبك</p>
      <p className="nw-echo__text">{text}</p>
    </section>
  );
}

/* ───────────────────────── 2) التجهيز ───────────────────────── */

const STEP_LABELS: Record<NawatStepId, { active: string; done: string }> = {
  understand: { active: "بفهم طلبك", done: "تم فهم طلبك" },
  catalog: { active: "براجع الخيارات في الكتالوج", done: "راجعت الخيارات في الكتالوج" },
  compare: { active: "بقارن حسب شروطك", done: "قارنت حسب شروطك" },
  arrange: { active: "برتب اقتراحاتك", done: "رتبت اقتراحاتك" },
};

function StepIndicator({ state }: { state: NawatStepState }) {
  if (state === "done") {
    return (
      <span className="nw-step__dot nw-step__dot--done" aria-hidden="true">
        <IconCheck size={14} color="#fff" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="nw-step__dot nw-step__dot--current" aria-hidden="true">
        <NawatMark size={24} spinning />
      </span>
    );
  }
  return <span className="nw-step__dot nw-step__dot--waiting" aria-hidden="true" />;
}

export function ProcessingScreen({
  request,
  steps,
  followUp,
}: {
  request: string;
  steps: NawatSteps;
  followUp: string;
}) {
  const [open, setOpen] = useState(true);
  const doneCount = NAWAT_STEP_ORDER.filter((id) => steps[id] === "done").length;
  const arcs = Math.min(3, doneCount) as 0 | 1 | 2 | 3;

  return (
    <main className="nw-column" aria-busy="true">
      <RequestEcho text={request} />

      <section className="nw-card nw-status" aria-live="polite">
        <div className="nw-status__header">
          <NawatMark size={56} activeArcs={arcs} spinning className="nw-status__mark" />
          <div className="nw-status__text">
            <h1>بجهّز اقتراحات مناسبة لطلبك…</h1>
            <p>الاقتراحات هتظهر هنا أول ما تجهز.</p>
          </div>
        </div>

        <hr className="nw-rule" />

        <button
          type="button"
          className="nw-disclosure"
          aria-expanded={open}
          aria-controls="nw-steps"
          onClick={() => setOpen((value) => !value)}
        >
          <b>حالة تجهيز الطلب</b>
          <span className="nw-spacer" />
          <IconChevronUp size={20} aria-hidden="true" className={open ? "" : "nw-flip"} />
        </button>

        {open && (
          <ol id="nw-steps" className="nw-steps">
            {NAWAT_STEP_ORDER.map((id) => {
              const state = steps[id];
              return (
                <li
                  key={id}
                  className={`nw-step is-${state}`}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <StepIndicator state={state} />
                  <span>{state === "done" ? STEP_LABELS[id].done : STEP_LABELS[id].active}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <Composer
        variant="compact"
        value={followUp}
        onChange={() => {}}
        onSubmit={() => {}}
        placeholder="عدّل الطلب أو أضف شرط جديد…"
        buttonLabel="حدّث الاقتراح"
        disabled
      />
    </main>
  );
}

/* ───────────────────────── 3) النتيجة ───────────────────────── */

function ProductCard({
  suggestion,
  selected,
  onToggle,
  onReplace,
  busy,
}: {
  suggestion: NawatSuggestion;
  selected: boolean;
  onToggle: () => void;
  onReplace: () => void;
  busy: boolean;
}) {
  const { product, reason, quantity } = suggestion;
  const unit = product.unit_label || "قطعة";
  return (
    <article className={`nw-product${selected ? " is-selected" : ""}`}>
      <div className="nw-product__image">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" />
        ) : (
          <IconBox size={36} aria-hidden="true" />
        )}
      </div>

      <div className="nw-product__info">
        <h3>{productName(product)}</h3>
        <p className="nw-product__unit">
          {unit}
          {quantity > 1 ? ` · الكمية ${formatNumber(quantity)}` : ""}
        </p>
        {reason && (
          <p className="nw-product__reason">
            <IconInfo size={16} aria-hidden="true" />
            <span>{reason}</span>
          </p>
        )}
      </div>

      <p className="nw-product__price">
        <bdi>{formatMoney(product.price_per_unit)}</bdi>
      </p>

      <div className="nw-product__actions">
        <button
          type="button"
          className={`nw-toggle${selected ? " is-on" : ""}`}
          aria-pressed={selected}
          onClick={onToggle}
        >
          <span>{selected ? "تم الاختيار" : "اختيار"}</span>
          {selected ? (
            <IconCheck size={18} aria-hidden="true" />
          ) : (
            <IconPlus size={18} aria-hidden="true" />
          )}
        </button>
        <button type="button" className="nw-replace" disabled={busy} onClick={onReplace}>
          <span>استبدال</span>
          <IconSwap size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function SelectionSummary({ controller }: { controller: NawatController }) {
  const { selectedItems, selectedTotal, addedToCart, addSelectionToCart } = controller;
  const count = selectedItems.length;
  return (
    <aside className="nw-card nw-summary" aria-label="اختياراتك">
      <div className="nw-summary__head">
        <h2>اختياراتك</h2>
        <span className="nw-spacer" />
        <span className="nw-pill">
          {formatNumber(count)} {count === 1 ? "عنصر" : "عناصر"}
        </span>
      </div>

      {count > 0 ? (
        <ul className="nw-summary__items">
          {selectedItems.map(({ product, quantity }) => (
            <li key={product.id}>
              <span>{productName(product)}</span>
              <span className="nw-spacer" />
              <small>×{formatNumber(quantity)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nw-summary__empty">اختار منتج واحد على الأقل من القائمة.</p>
      )}

      <hr className="nw-rule" />

      <div className="nw-summary__total">
        <b>الإجمالي</b>
        <span className="nw-spacer" />
        <b>
          <bdi>{formatMoney(selectedTotal)}</bdi>
        </b>
      </div>

      <button
        type="button"
        className="nw-btn nw-btn--primary nw-btn--block"
        disabled={count === 0 || addedToCart}
        onClick={addSelectionToCart}
      >
        {addedToCart ? "تمت الإضافة للسلة" : "أضف الاختيارات للسلة"}
      </button>

      {addedToCart && (
        <Link to="/cart" className="nw-summary__cart-link">
          مراجعة السلة وإتمام الطلب
        </Link>
      )}

      <div className="nw-summary__store">
        <StoreLogoCompact />
      </div>
      <p className="nw-summary__note">بعد الإضافة تكمّل الطلب والدفع من سلة الوادي الأخضر.</p>
    </aside>
  );
}

export function ResultScreen({
  controller,
  followUp,
  onFollowUpChange,
  onFollowUpSubmit,
}: {
  controller: NawatController;
  followUp: string;
  onFollowUpChange: (value: string) => void;
  onFollowUpSubmit: () => void;
}) {
  const { result, edit, toggle, isSelected, replace, isBusy } = controller;
  if (!result) return null;

  return (
    <main className="nw-result">
      <div className="nw-result__main">
        <section className="nw-card nw-understood" aria-label="فهمت منك">
          <div className="nw-understood__head">
            <h2>فهمت منك</h2>
            <span className="nw-spacer" />
            <button type="button" className="nw-btn nw-btn--secondary nw-btn--sm" onClick={edit}>
              <span>عدّل طلبك</span>
              <IconEdit size={18} aria-hidden="true" />
            </button>
          </div>
          {result.conditions.length > 0 && (
            <ul className="nw-conditions">
              {result.conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          )}
          {result.summary && <p className="nw-understood__summary">{result.summary}</p>}
          <p className="nw-understood__note">
            ده اللي فهمته من طلبك. لو فيه حاجة ناقصة أو غلط، عدّل الطلب وأنا أرتّب الاختيارات من
            جديد.
          </p>
        </section>

        {result.groups.map((group) => (
          <section key={group.title} className="nw-group" aria-label={group.title}>
            <div className="nw-group__head">
              <h2>{group.title}</h2>
              <span className="nw-spacer" />
              <span className="nw-group__count">
                {formatNumber(group.items.length)} {group.items.length === 1 ? "منتج" : "منتجات"}
              </span>
            </div>
            <div className="nw-group__list">
              {group.items.map((suggestion) => (
                <ProductCard
                  key={suggestion.product.id}
                  suggestion={suggestion}
                  selected={isSelected(suggestion.product.id)}
                  busy={isBusy}
                  onToggle={() => toggle(suggestion.product.id)}
                  onReplace={() => void replace(suggestion.product)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="nw-result__summary">
        <SelectionSummary controller={controller} />
      </div>

      <div className="nw-result__composer">
        <Composer
          variant="compact"
          value={followUp}
          onChange={onFollowUpChange}
          onSubmit={onFollowUpSubmit}
          placeholder="عدّل الطلب أو أضف شرط جديد…"
          buttonLabel="حدّث الاقتراح"
        />
      </div>
    </main>
  );
}

/* ───────────────────────── 4/5) الخطأ ولا نتائج ───────────────────────── */

const ERROR_COPY: Record<NawatErrorKind, { title: string; body: string }> = {
  failed: {
    title: "مقدرتش أجهّز الاقتراحات دلوقتي",
    body: "حصلت مشكلة أثناء التجهيز. طلبك لسه موجود، تقدر تجرّب تاني أو تعدّل فيه.",
  },
  unverified: {
    title: "مقدرتش أتأكد من المنتجات دلوقتي",
    body: "معرفتش أقرأ المنتجات والأسعار من المتجر، ومش هقترح حاجة مش متأكد منها. طلبك لسه موجود، جرّب تاني بعد شوية.",
  },
  not_configured: {
    title: "نواة مش متاحة دلوقتي",
    body: "الخدمة لسه بتتجهّز. تقدر تتصفح المتجر عادي، وهنرجع نرتّب مقاضيك قريب.",
  },
};

export function StatusScreen({
  kind,
  request,
  errorKind,
  onEdit,
  onRetry,
  onRestart,
}: {
  kind: "error" | "empty";
  request: string;
  errorKind?: NawatErrorKind | null;
  onEdit: () => void;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const copy = ERROR_COPY[errorKind ?? "failed"];
  const isError = kind === "error";
  return (
    <main className="nw-column">
      <RequestEcho text={request} />
      <section className="nw-card nw-message" role={isError ? "alert" : "status"}>
        <span
          className={`nw-message__icon ${isError ? "is-danger" : "is-info"}`}
          aria-hidden="true"
        >
          {isError ? (
            <IconAlert size={28} color="var(--nw-danger)" />
          ) : (
            <IconSearch size={28} color="var(--nw-indigo)" />
          )}
        </span>
        <h1>{isError ? copy.title : "ملقيتش اختيارات مناسبة"}</h1>
        <p>
          {isError
            ? copy.body
            : "مفيش منتجات في الكتالوج متطابقة مع الشروط اللي كتبتها. جرّب تخفّف شرط أو تغيّر الصياغة."}
        </p>
        <div className="nw-message__actions">
          {isError ? (
            <>
              {errorKind !== "not_configured" && (
                <button type="button" className="nw-btn nw-btn--primary" onClick={onRetry}>
                  جرّب تاني
                </button>
              )}
              <button type="button" className="nw-btn nw-btn--secondary" onClick={onEdit}>
                عدّل طلبك
              </button>
            </>
          ) : (
            <>
              <button type="button" className="nw-btn nw-btn--primary" onClick={onEdit}>
                عدّل طلبك
              </button>
              <button type="button" className="nw-btn nw-btn--secondary" onClick={onRestart}>
                ابدأ فكرة جديدة
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
