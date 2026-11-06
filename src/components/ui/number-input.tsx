import * as React from "react";
import { Input } from "./input";
import { normalizeDigits } from "@/lib/i18n-context";

export type NumberInputProps = Omit<React.ComponentProps<"input">, "onChange" | "type"> & {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called with the normalized ASCII string (empty string if cleared). */
  onValueChange?: (value: string) => void;
  /** Allow decimals. Defaults to true. */
  decimal?: boolean;
};

/**
 * Global numeric input.
 * - Accepts Arabic (٠-٩), Persian/Urdu (۰-۹) and ASCII digits transparently.
 * - Normalizes to ASCII before propagating value.
 * - Uses inputMode to surface the numeric keypad on mobile, dir="ltr" for digits.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ onChange, onValueChange, decimal = true, dir = "ltr", inputMode, value, ...rest }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value ?? "";
      const normalized = normalizeDigits(raw)
        // keep digits, one decimal point, leading minus
        .replace(decimal ? /[^0-9.-]/g : /[^0-9-]/g, "");
      // mutate the event value so consumers see normalized text
      e.target.value = normalized;
      onValueChange?.(normalized);
      onChange?.(e);
    };
    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode ?? (decimal ? "decimal" : "numeric")}
        dir={dir}
        value={value}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";
