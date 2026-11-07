import { describe, expect, it } from "vitest";
import { getBundleEligibility } from "./bundle-pricing";
import type { CartItem } from "@/lib/cart-context";

const item = (id: string, quantity: number, price: number): CartItem => ({
  product: {
    id,
    name: id,
    category_id: null,
    description: null,
    price_per_unit: price,
    old_price: null,
    image_url: null,
    is_by_weight: false,
    unit_label: "قطعة",
    is_popular: false,
    is_on_sale: false,
  },
  quantity,
});

describe("getBundleEligibility", () => {
  it("finds eligible mix and match bundles and estimates the cheapest free item", () => {
    const [result] = getBundleEligibility(
      [
        {
          id: "b",
          name: "فطار",
          description: null,
          buy_quantity: 3,
          pay_quantity: 2,
          product_ids: ["a", "c"],
        },
      ],
      [item("a", 1, 30), item("c", 2, 20)],
    );
    expect(result).toMatchObject({ matchingQuantity: 3, missingQuantity: 0, estimatedSaving: 20 });
  });

  it("reports how many eligible products are still missing", () => {
    const [result] = getBundleEligibility(
      [
        {
          id: "b",
          name: "فطار",
          description: null,
          buy_quantity: 3,
          pay_quantity: 2,
          product_ids: ["a", "c"],
        },
      ],
      [item("a", 1, 30)],
    );
    expect(result.missingQuantity).toBe(2);
    expect(result.estimatedSaving).toBe(0);
  });
});
