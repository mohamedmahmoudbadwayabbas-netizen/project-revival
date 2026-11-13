import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { routeIntent, TOOL_CLUSTERS_REGISTRY } from "./toolClusters";

describe("19-tool constitution (new manager tools)", () => {
  it("has 9 Nawat + 10 Nebras clusters", () => {
    expect(TOOL_CLUSTERS_REGISTRY.filter((c) => c.agent === "nawat")).toHaveLength(9);
    expect(TOOL_CLUSTERS_REGISTRY.filter((c) => c.agent === "nebras")).toHaveLength(10);
  });
  it("never sends more than 5 tools", () => {
    const r = routeIntent("ارفع الاسعار وكوبون ومخزون ومورد وسائق وتقرير وصورة", "nebras");
    expect(r.schemas.length).toBeLessThanOrEqual(5);
  });
  it("customer never receives admin tools", () => {
    const names = routeIntent("ارفع السعر واحذف المنتج", "nawat").schemas.map((s) => s.name);
    expect(names).not.toContain("pricingManager");
    expect(names).not.toContain("manageCatalog");
  });
});
