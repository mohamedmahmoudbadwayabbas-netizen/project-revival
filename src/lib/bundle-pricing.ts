import type { CartItem } from "@/lib/cart-context";

export type ActiveBundle = {
  id: string;
  name: string;
  description: string | null;
  buy_quantity: number;
  pay_quantity: number;
  product_ids: string[];
};

export type BundleEligibility = ActiveBundle & {
  matchingQuantity: number;
  missingQuantity: number;
  estimatedSaving: number;
};

export function getBundleEligibility(
  bundles: ActiveBundle[],
  items: CartItem[],
): BundleEligibility[] {
  return bundles
    .map((bundle) => {
      const allowed = new Set(bundle.product_ids);
      const matching = items.filter((item) => allowed.has(item.product.id));
      const matchingQuantity = matching.reduce((sum, item) => sum + item.quantity, 0);
      const missingQuantity = Math.max(0, bundle.buy_quantity - matchingQuantity);
      const freeUnits = Math.max(0, bundle.buy_quantity - bundle.pay_quantity);
      const prices = matching
        .flatMap((item) =>
          Array.from({ length: Math.min(Math.floor(item.quantity), bundle.buy_quantity) }, () =>
            Number(item.product.price_per_unit),
          ),
        )
        .sort((a, b) => a - b);
      const estimatedSaving =
        missingQuantity === 0
          ? +prices
              .slice(0, freeUnits)
              .reduce((sum, price) => sum + price, 0)
              .toFixed(2)
          : 0;
      return { ...bundle, matchingQuantity, missingQuantity, estimatedSaving };
    })
    .filter((bundle) => bundle.matchingQuantity > 0)
    .sort((a, b) => {
      if (a.missingQuantity !== b.missingQuantity) return a.missingQuantity - b.missingQuantity;
      return b.estimatedSaving - a.estimatedSaving;
    });
}
