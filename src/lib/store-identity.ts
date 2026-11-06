export const STORE_IDENTITY = {
  green: "#2F5D4B",
  cream: "#F8F5EB",
  soft: "#EEEEDA",
  ink: "#283C31",
  secondaryInk: "#4D5A52",
  border: "#DDDED4",
  rust: "#B6502E",
  disabled: "#E2E5DE",
  greenHsl: "153 33% 27%",
  creamHsl: "46 43% 95%",
  softHsl: "60 36% 90%",
  inkHsl: "140 20% 20%",
  rustHsl: "15 60% 45%",
} as const;

const LEGACY_PRIMARY = new Set(["#036233", "#024a26", "142 76% 24%"]);
const LEGACY_ACCENT = new Set(["#e85d2f", "#e55300", "18 85% 55%"]);
const LEGACY_BACKGROUND = new Set(["48 33% 97%"]);
const LEGACY_FOREGROUND = new Set(["120 18% 12%"]);

function legacyMatch(value: unknown, values: Set<string>) {
  return typeof value === "string" && values.has(value.trim().toLowerCase());
}

/** Upgrade only the previous built-in palette; preserve explicit custom theme choices. */
export function normalizeStoreIdentity<T extends object>(settings: T): T {
  const next = { ...settings } as Record<string, unknown>;
  if (legacyMatch(next.primary_color, LEGACY_PRIMARY)) next.primary_color = STORE_IDENTITY.greenHsl;
  if (legacyMatch(next.accent_color, LEGACY_ACCENT)) next.accent_color = STORE_IDENTITY.rustHsl;
  if (legacyMatch(next.background_color, LEGACY_BACKGROUND)) next.background_color = STORE_IDENTITY.creamHsl;
  if (legacyMatch(next.foreground_color, LEGACY_FOREGROUND)) next.foreground_color = STORE_IDENTITY.inkHsl;
  if (legacyMatch(next.announcement_bg_color, LEGACY_PRIMARY)) next.announcement_bg_color = STORE_IDENTITY.greenHsl;
  if (legacyMatch(next.primary_hex, LEGACY_PRIMARY)) next.primary_hex = STORE_IDENTITY.green;
  if (legacyMatch(next.accent_hex, LEGACY_ACCENT)) next.accent_hex = STORE_IDENTITY.rust;
  return next as T;
}
