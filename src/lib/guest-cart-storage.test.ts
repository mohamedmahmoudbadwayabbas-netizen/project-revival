import { describe, expect, it } from "vitest";
import {
  GUEST_CART_KEY,
  clearGuestCart,
  computeMergeUpserts,
  readGuestCart,
  sanitizeLines,
  writeGuestCart,
} from "./guest-cart-storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
  };
}

describe("guest cart storage", () => {
  it("round-trips lines after a refresh", () => {
    const s = memoryStorage();
    writeGuestCart([{ productId: "p1", quantity: 2, substitution: "auto_best" }], s);
    expect(readGuestCart(s)).toEqual([{ productId: "p1", quantity: 2, substitution: "auto_best" }]);
  });

  it("dedupes the same product keeping the larger quantity", () => {
    const lines = sanitizeLines([
      { productId: "p1", quantity: 1 },
      { productId: "p1", quantity: 3 },
      { productId: "p2", quantity: 1 },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => l.productId === "p1")?.quantity).toBe(3);
  });

  it("drops corrupted or invalid entries instead of throwing", () => {
    const s = memoryStorage({ [GUEST_CART_KEY]: "{not json" });
    expect(readGuestCart(s)).toEqual([]);
    expect(
      sanitizeLines([
        null,
        5,
        { productId: "", quantity: 1 },
        { productId: "p", quantity: -2 },
        { productId: "p", quantity: "x" },
      ]),
    ).toEqual([]);
  });

  it("removes the key when the cart becomes empty", () => {
    const s = memoryStorage();
    writeGuestCart([{ productId: "p1", quantity: 1 }], s);
    writeGuestCart([], s);
    expect(s.data[GUEST_CART_KEY]).toBeUndefined();
  });

  it("clearGuestCart removes the key", () => {
    const s = memoryStorage();
    writeGuestCart([{ productId: "p1", quantity: 1 }], s);
    clearGuestCart(s);
    expect(readGuestCart(s)).toEqual([]);
  });

  it("does not throw when storage is full or blocked", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readGuestCart(broken)).toEqual([]);
    expect(writeGuestCart([{ productId: "p1", quantity: 1 }], broken)).toBe(false);
    expect(() => clearGuestCart(broken)).not.toThrow();
  });
});

describe("computeMergeUpserts", () => {
  it("adds products missing from the account cart", () => {
    expect(computeMergeUpserts(new Map(), [{ productId: "a", quantity: 2 }])).toEqual([
      { productId: "a", quantity: 2 },
    ]);
  });

  it("takes the larger quantity and never sums (no duplication on repeat merge)", () => {
    const remote = new Map([["a", 3]]);
    expect(computeMergeUpserts(remote, [{ productId: "a", quantity: 2 }])).toEqual([]);
    expect(computeMergeUpserts(remote, [{ productId: "a", quantity: 5 }])).toEqual([
      { productId: "a", quantity: 5 },
    ]);
  });
});
