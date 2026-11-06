import { describe, expect, it } from "vitest";
import { analyzeOperations } from "./ops-analyze";

const now = new Date("2026-11-05T12:00:00Z").getTime();
const p = (id: string, stock: number, active = true) => ({ id, name: id, name_ar: null, stock_quantity: stock, low_stock_threshold: 5, is_active: active });

describe("analyzeOperations", () => {
  it("proposes hiding an active out-of-stock product", () => {
    const d = analyzeOperations([p("a", 0)], [], now);
    expect(d[0].raw_operation).toMatchObject({ op: "deactivate_product", product_id: "a" });
  });
  it("ignores inactive products and healthy stock", () => {
    expect(analyzeOperations([p("a", 0, false), p("b", 50)], [], now)).toHaveLength(0);
  });
  it("flags low stock at or below threshold", () => {
    expect(analyzeOperations([p("a", 5)], [], now)[0].raw_operation.op).toBe("restock_alert");
  });
  it("flags pending orders older than 24h only", () => {
    const d = analyzeOperations([], [
      { id: "o1", status: "pending", created_at: "2026-11-04T11:00:00Z", updated_at: "" },
      { id: "o2", status: "pending", created_at: "2026-11-05T01:00:00Z", updated_at: "" },
    ], now);
    expect(d[0].raw_operation.order_ids).toEqual(["o1"]);
  });
  it("delivery agent flags shipped orders older than 6h", () => {
    const d = analyzeOperations([], [{ id: "o3", status: "shipped", created_at: "", updated_at: "2026-11-05T05:00:00Z" }], now);
    expect(d[0].agent_type).toBe("delivery");
  });
});
