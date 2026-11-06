import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/cart-context";
import { buildNawatResult, collectSearchRows, extractJsonObject, fallbackResult } from "./parse";

function product(id: string, stock: number): Product {
  return {
    id,
    name: `منتج ${id}`,
    name_ar: `منتج ${id}`,
    category_id: null,
    description: null,
    price_per_unit: 10,
    old_price: null,
    image_url: null,
    is_by_weight: false,
    unit_label: "قطعة",
    is_popular: false,
    is_on_sale: false,
    stock_quantity: stock,
  };
}

const catalog = new Map<string, Product>([
  ["a", product("a", 5)],
  ["b", product("b", 0)],
  ["c", product("c", 3)],
]);

describe("extractJsonObject", () => {
  it("reads a fenced json block", () => {
    expect(extractJsonObject('نص\n```json\n{"x":1}\n```')).toEqual({ x: 1 });
  });

  it("reads a bare object with braces inside strings", () => {
    expect(extractJsonObject('رد: {"s":"قوس } داخل نص","n":2} تمت')).toEqual({
      s: "قوس } داخل نص",
      n: 2,
    });
  });

  it("returns null for text without json", () => {
    expect(extractJsonObject("مفيش JSON هنا")).toBeNull();
    expect(extractJsonObject('{"broken":')).toBeNull();
  });
});

describe("buildNawatResult", () => {
  const reply = JSON.stringify({
    understood: { conditions: ["٤ أفراد", "غدا", ""], summary: "فطار لأربعة" },
    groups: [
      {
        title: "أساسيات الوجبة",
        items: [
          { productId: "a", reason: "مناسب للفطار", quantity: 2 },
          { productId: "b", reason: "نافد" },
          { productId: "zzz", reason: "منتج مخترع" },
          { productId: "a", reason: "مكرر" },
        ],
      },
      { title: "فاضية", items: [{ productId: "zzz" }] },
      { title: "خضار", items: [{ productId: "c", quantity: 99 }] },
    ],
  });

  it("keeps only in-stock products that were really read from the catalog", () => {
    const result = buildNawatResult(reply, catalog);
    expect(result).not.toBeNull();
    expect(result!.groups.map((group) => group.title)).toEqual(["أساسيات الوجبة", "خضار"]);
    expect(result!.groups[0].items.map((item) => item.product.id)).toEqual(["a"]);
    expect(result!.groups[0].items[0].quantity).toBe(2);
    expect(result!.groups[1].items[0].quantity).toBe(20);
    expect(result!.conditions).toEqual(["٤ أفراد", "غدا"]);
    expect(result!.summary).toBe("فطار لأربعة");
  });

  it("returns null when no valid product remains", () => {
    const empty = JSON.stringify({
      groups: [{ title: "x", items: [{ productId: "b" }, { productId: "zzz" }] }],
    });
    expect(buildNawatResult(empty, catalog)).toBeNull();
    expect(buildNawatResult("نص عادي", catalog)).toBeNull();
  });
});

describe("collectSearchRows", () => {
  it("collects rows only from successful searchProducts calls", () => {
    const rows = collectSearchRows([
      { tool: "searchProducts", ok: true, data: { results: [{ id: "a" }, { name: "بدون id" }] } },
      { tool: "searchProducts", ok: false, data: { results: [{ id: "x" }] } },
      { tool: "getCategories", ok: true, data: { results: [{ id: "y" }] } },
    ]);
    expect(rows).toEqual([{ id: "a" }]);
  });
});

describe("fallbackResult", () => {
  it("lists only in-stock catalog products", () => {
    const result = fallbackResult(catalog);
    expect(result!.groups[0].items.map((item) => item.product.id)).toEqual(["a", "c"]);
  });

  it("returns null for an empty catalog", () => {
    expect(fallbackResult(new Map())).toBeNull();
  });
});
