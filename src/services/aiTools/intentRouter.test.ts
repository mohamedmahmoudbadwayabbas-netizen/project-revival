import { describe, expect, it } from "vitest";
import { MAX_ROUTED_TOOLS, TOOL_CLUSTERS, routeIntent } from "./intentRouter";

describe("intent router constitution", () => {
  it("has exactly 9 Nawat and 10 Nebras clusters (19 total)", () => {
    expect(TOOL_CLUSTERS.filter((c) => c.agent === "nawat")).toHaveLength(9);
    expect(TOOL_CLUSTERS.filter((c) => c.agent === "nebras")).toHaveLength(10);
  });
  it("never sends more than 5 tools", () => {
    const r = routeIntent("ارفع اسعار قسم الالبان 5% واعمل تقرير مبيعات وكوبون وصلاحيات وصور", "nebras");
    expect(r.tools.length).toBeLessThanOrEqual(MAX_ROUTED_TOOLS);
  });
  it("routes price increase to pricingManager", () => {
    expect(routeIntent("ارفع أسعار الألبان 5%", "nebras").tools).toContain("bulkPriceUpdate");
  });
  it("never gives a customer admin tools", () => {
    const r = routeIntent("احذف المنتج وارفع السعر", "nawat");
    expect(r.tools).not.toContain("manageProduct");
    expect(r.tools).not.toContain("bulkPriceUpdate");
  });
  it("falls back to read-only analytics for unclear admin message", () => {
    expect(routeIntent("ازيك", "nebras").tools).toEqual(["exportReportsAndAnalytics"]);
  });
});
