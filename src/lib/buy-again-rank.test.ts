import { describe, expect, it } from "vitest";
import { rankPurchases } from "./buy-again-rank";

const r = (
  productId: string | null,
  quantity: number,
  orderedAt: string,
  status = "delivered",
) => ({ productId, quantity, orderedAt, status });

describe("rankPurchases", () => {
  it("ranks by frequency then recency", () => {
    const out = rankPurchases([
      r("milk", 1, "2026-10-01T10:00:00Z"),
      r("milk", 2, "2026-10-20T10:00:00Z"),
      r("rice", 1, "2026-10-25T10:00:00Z"),
      r("tea", 1, "2026-10-10T10:00:00Z"),
    ]);
    expect(out.map((x) => x.productId)).toEqual(["milk", "rice", "tea"]);
    expect(out[0]).toMatchObject({ timesBought: 2, lastQuantity: 2 });
  });
  it("ignores cancelled orders, null products and bad quantities", () => {
    expect(
      rankPurchases([
        r("a", 1, "2026-10-01T00:00:00Z", "cancelled"),
        r(null, 1, "2026-10-01T00:00:00Z"),
        r("b", 0, "2026-10-01T00:00:00Z"),
        r("c", 1, "bad-date"),
      ]),
    ).toEqual([]);
  });
  it("respects the limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => r(`p${i}`, 1, "2026-10-01T00:00:00Z"));
    expect(rankPurchases(rows, 5)).toHaveLength(5);
  });
});
