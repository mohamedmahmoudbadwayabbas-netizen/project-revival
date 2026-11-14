import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/cart-context";
import {
  buildOffersSlides,
  getDiscountPercent,
  inferUnitLabel,
  partitionCatalogSections,
  resolveSafeImageUrl,
} from "./storefront-home";

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    id: overrides.id,
    name: overrides.name,
    name_ar: overrides.name_ar ?? overrides.name,
    category_id: overrides.category_id ?? "cat-1",
    description: null,
    price_per_unit: overrides.price_per_unit ?? 100,
    old_price: overrides.old_price ?? null,
    image_url: overrides.image_url ?? "/images/products/egyptian-rice-5kg.jpg",
    is_by_weight: overrides.is_by_weight ?? false,
    unit_label: overrides.unit_label ?? "قطعة",
    is_popular: Boolean(overrides.is_popular),
    is_on_sale: Boolean(overrides.is_on_sale),
    is_featured: Boolean(overrides.is_featured),
  };
}

describe("inferUnitLabel", () => {
  it("extracts metric units from Arabic and English titles instead of defaulting to قطعة", () => {
    expect(
      inferUnitLabel(
        makeProduct({ id: "1", name: "Egyptian Rice", name_ar: "أرز مصري عريض الحبة 5 كجم" }),
      ),
    ).toBe("٥ كجم");

    expect(
      inferUnitLabel(
        makeProduct({ id: "2", name: "Orange Juice 1L", name_ar: "عصير برتقال طبيعي 1 لتر" }),
      ),
    ).toBe("١ لتر");

    expect(
      inferUnitLabel(
        makeProduct({
          id: "3",
          name: "Butter Croissant 4pcs",
          name_ar: "كرواسون طازج بالزبدة 4 قطع",
        }),
      ),
    ).toBe("٤ قطع");

    expect(
      inferUnitLabel(
        makeProduct({ id: "4", name: "Fresh Chicken 1.2kg", name_ar: "دجاج طازج منظف 1.2 كجم" }),
      ),
    ).toBe("١٫٢ كجم");
  });

  it("infers weight/container labels for unnumbered fresh produce, meat, and spice jars", () => {
    expect(
      inferUnitLabel(makeProduct({ id: "5", name: "Fresh Beef", name_ar: "لحم كندوز بلدي طازج" })),
    ).toBe("١ كجم");
    expect(
      inferUnitLabel(makeProduct({ id: "6", name: "Whole Cumin", name_ar: "كمون بلدي حصى فاخر" })),
    ).toBe("عبوة");
    expect(
      inferUnitLabel(
        makeProduct({
          id: "6b",
          name: "Dark Chocolate with Hazelnut Caramel",
          name_ar: "شوكولاتة داكنة بالبندق والكراميل",
        }),
      ),
    ).toBe("قطعة");
  });

  it("respects explicit non-generic unit_label and Arabic-Indic package numbers", () => {
    expect(inferUnitLabel(makeProduct({ id: "7", name: "Milk", unit_label: "زجاجة 1 لتر" }))).toBe(
      "زجاجة ١ لتر",
    );
    expect(
      inferUnitLabel(
        makeProduct({
          id: "8",
          name: "Adam Cooking Oil Carton",
          name_ar: "كرتونة زيت طعام آدم",
          unit_label: "كرتونة",
        }),
      ),
    ).toBe("كرتونة");
    expect(
      inferUnitLabel(
        makeProduct({
          id: "9",
          name: "Medjool Dates 3kg Box",
          name_ar: "بلح المجدول الفاخر علبة ٣ كجم",
          unit_label: "علبة ٣ كجم",
        }),
      ),
    ).toBe("علبة ٣ كجم");
    expect(
      inferUnitLabel(
        makeProduct({
          id: "10",
          name: "Meatco Minced Beef 350g",
          name_ar: "ميتكو لحمة مفرومة ٣٥٠ جم",
        }),
      ),
    ).toBe("٣٥٠ جم");
    expect(
      inferUnitLabel(makeProduct({ id: "11", name: "Fresh Red Onions", name_ar: "بصل أحمر طازج" })),
    ).toBe("١ كجم");
  });
});

describe("partitionCatalogSections", () => {
  it("never duplicates a product between weeklyOffers and remainingCatalog", () => {
    const products: Product[] = Array.from({ length: 15 }, (_, idx) =>
      makeProduct({
        id: `p-${idx + 1}`,
        name: `Product ${idx + 1}`,
        price_per_unit: 80 - idx,
        old_price: 100,
      }),
    );

    const { weeklyOffers, remainingCatalog } = partitionCatalogSections(products, 5);

    expect(weeklyOffers).toHaveLength(5);
    expect(remainingCatalog).toHaveLength(10);

    const offerIds = new Set(weeklyOffers.map((p) => p.id));
    for (const item of remainingCatalog) {
      expect(offerIds.has(item.id)).toBe(false);
    }

    // Highest discount products are prioritized in weeklyOffers (idx 14 -> 34% off)
    expect(getDiscountPercent(weeklyOffers[0])).toBeGreaterThanOrEqual(
      getDiscountPercent(weeklyOffers[weeklyOffers.length - 1]),
    );
  });

  it("handles small catalogs cleanly without starving the grid", () => {
    const small = [
      makeProduct({ id: "a", name: "A", price_per_unit: 50, old_price: 75 }),
      makeProduct({ id: "b", name: "B", price_per_unit: 40, old_price: 50 }),
    ];
    const { weeklyOffers, remainingCatalog } = partitionCatalogSections(small, 6);
    expect(weeklyOffers).toHaveLength(0);
    expect(remainingCatalog).toHaveLength(2);
  });
});

describe("buildOffersSlides & resolveSafeImageUrl", () => {
  it("replaces fragile Unsplash URLs with local fallback paths", () => {
    expect(
      resolveSafeImageUrl(
        "https://images.unsplash.com/photo-1542838132-92c53300491e",
        "/images/hero/fresh-produce.jpg",
      ),
    ).toBe("/images/hero/fresh-produce.jpg");

    expect(
      resolveSafeImageUrl("/images/hero/weekly-deals.jpg", "/images/hero/fresh-produce.jpg"),
    ).toBe("/images/hero/weekly-deals.jpg");
  });

  it("builds 4 slides reflecting real max discount and free shipping threshold", () => {
    const slides = buildOffersSlides({
      freeShippingThreshold: 300,
      products: [
        makeProduct({ id: "p1", name: "Tomato", price_per_unit: 15, old_price: 20 }),
        makeProduct({ id: "p2", name: "Apples", price_per_unit: 45, old_price: 60 }),
      ],
    });

    expect(slides).toHaveLength(4);
    expect(slides[1].badge).toContain("٢٥٪");
    expect(slides[2].badge).toContain("٣٠٠");
    expect(slides.every((s) => s.imageUrl.startsWith("/images/"))).toBe(true);
  });

  it("uses database storage URLs for all slides when supplied", () => {
    const slides = buildOffersSlides({
      heroImageUrl: "https://example.supabase.co/storage/v1/object/sign/store-assets/hero/1.jpg",
      heroBgImage: "https://example.supabase.co/storage/v1/object/sign/store-assets/hero/2.jpg",
      pantryImageUrl: "https://example.supabase.co/storage/v1/object/sign/store-assets/hero/3.jpg",
      products: [],
    });

    expect(slides[0].imageUrl).toContain("/store-assets/hero/1.jpg");
    expect(slides[1].imageUrl).toContain("/store-assets/hero/2.jpg");
    expect(slides[2].imageUrl).toContain("/store-assets/hero/3.jpg");
    expect(slides[3].imageUrl).toContain("/store-assets/hero/1.jpg");
  });
});
