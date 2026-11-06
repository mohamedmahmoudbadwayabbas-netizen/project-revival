import { useId, type KeyboardEvent } from "react";
import { LoaderCircle } from "lucide-react";

export const NAWAT_MAX_REQUEST_LENGTH = 600;

interface ComposerProps {
  variant: "large" | "compact";
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  buttonLabel: string;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
  autoFocus?: boolean;
}

/** صندوق كتابة الطلب: الكبير في البداية، والمدمج للمتابعة وتعديل الاقتراح. */
export function Composer({
  variant,
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
  disabled = false,
  loading = false,
  hint,
  autoFocus,
}: ComposerProps) {
  const fieldId = useId();
  const canSubmit = !disabled && !loading && value.trim().length > 0;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  const button = (
    <button
      type="button"
      className="nw-btn nw-btn--primary nw-composer__button"
      disabled={!canSubmit}
      aria-busy={loading || undefined}
      onClick={onSubmit}
    >
      {loading && <LoaderCircle size={18} className="nw-spin" aria-hidden="true" />}
      {buttonLabel}
    </button>
  );

  const field = (
    <div className="nw-composer__input">
      <label htmlFor={fieldId} className="nw-sr-only">
        {placeholder}
      </label>
      <textarea
        id={fieldId}
        value={value}
        rows={variant === "large" ? 3 : 1}
        maxLength={NAWAT_MAX_REQUEST_LENGTH}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );

  if (variant === "compact") {
    return (
      <div className={`nw-composer nw-composer--compact${disabled ? " is-disabled" : ""}`}>
        {field}
        {button}
      </div>
    );
  }

  return (
    <div className={`nw-composer nw-composer--large${disabled ? " is-disabled" : ""}`}>
      {field}
      <div className="nw-composer__actions">
        {hint && <span className="nw-composer__hint">{hint}</span>}
        <span className="nw-spacer" />
        {button}
      </div>
    </div>
  );
}

export const QUICK_SUGGESTIONS = [
  "فطار للعيلة",
  "احتياجات تنظيف البيت",
  "أكلة على قد الميزانية",
  "مقاضي الأسبوع",
] as const;

export function QuickSuggestions({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="nw-chips" role="group" aria-label="اقتراحات سريعة">
      {QUICK_SUGGESTIONS.map((text) => (
        <button
          key={text}
          type="button"
          className="nw-chip"
          disabled={disabled}
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
