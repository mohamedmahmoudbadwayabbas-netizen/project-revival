// Shared Arabic-Indic numeral formatting — use for every price, count and time in the storefront.
const numFmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
const priceFmt = new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatNumberAr = (n: number | null | undefined) => numFmt.format(Number(n ?? 0));
export const formatPriceAr = (n: number | null | undefined) => `${priceFmt.format(Number(n ?? 0))} ج.م`;
export const formatPercentAr = (n: number) => `٪${numFmt.format(n)}`;

/** Convert any Western digits inside a string (e.g. "0.5 كجم") to Arabic-Indic. */
export const toArabicDigits = (s: string) =>
  s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]).replace(/\./g, "٫");
