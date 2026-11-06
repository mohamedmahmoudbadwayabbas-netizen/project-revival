import type { Product } from "./cart-context";

export interface ParsedProductDetails {
  cleanDescription: string;
  cookingTip: string;
  characteristics: string[];
  storageInstructions: string;
  originSource: string;
  nutritionalInfo: {
    calories: string;
    protein: string;
    carbs: string;
    fiber: string;
    fats: string;
  };
  tags: string[];
}

/**
 * دالة ذكية لتحليل واستخراج كافة بيانات الذكاء الاصطناعي والمدخلات اليدوية من المنتج
 */
export function extractProductDetails(product?: Product | null): ParsedProductDetails {
  const defaultNutrition = {
    calories: "55 kcal",
    protein: "1.5 جم",
    carbs: "11 جم",
    fiber: "2.2 جم",
    fats: "0.4 جم",
  };

  if (!product) {
    return {
      cleanDescription: "",
      cookingTip: "",
      characteristics: ["طازج 100%", "جودة مضمونة", "تغليف صحي"],
      storageInstructions: "يُحفظ في مكان بارد وجاف أو في الثلاجة للحفاظ على النضارة.",
      originSource: "مزارع ومصادر محلية مصرية معتمدة ومضمونة",
      nutritionalInfo: defaultNutrition,
      tags: ["طازج", "بلدي"],
    };
  }

  const rawDesc = product.description || "";
  let cleanDesc = rawDesc;
  const tags: string[] = [];
  const characteristics: string[] = [];
  let storageInstructions = product.storage_instructions || product.storageInstructions || "";
  let originSource = product.origin_source || product.originSource || "";
  let cookingTip = product.cooking_tip || "";

  let nutrition = { ...defaultNutrition };

  // 1. Direct fields if present
  if (product.nutritional_info) {
    if (typeof product.nutritional_info === "object") {
      nutrition = {
        calories: product.nutritional_info.calories || defaultNutrition.calories,
        protein: product.nutritional_info.protein || defaultNutrition.protein,
        carbs: product.nutritional_info.carbs || defaultNutrition.carbs,
        fiber: product.nutritional_info.fiber || defaultNutrition.fiber,
        fats: product.nutritional_info.fats || defaultNutrition.fats,
      };
    }
  } else if (product.nutritionalInfo) {
    if (typeof product.nutritionalInfo === "object") {
      nutrition = {
        calories: product.nutritionalInfo.calories || defaultNutrition.calories,
        protein: product.nutritionalInfo.protein || defaultNutrition.protein,
        carbs: product.nutritionalInfo.carbs || defaultNutrition.carbs,
        fiber: product.nutritionalInfo.fiber || defaultNutrition.fiber,
        fats: product.nutritionalInfo.fats || defaultNutrition.fats,
      };
    }
  }

  if (Array.isArray(product.characteristics)) {
    characteristics.push(...product.characteristics);
  } else if (typeof product.characteristics === "string" && product.characteristics.trim()) {
    characteristics.push(
      ...product.characteristics
        .split("\n")
        .map((s) => s.replace(/^[-•*✓]\s*/, "").trim())
        .filter(Boolean),
    );
  }

  // 2. Parse from Description metadata blocks if structured
  if (rawDesc.includes("#وسوم:") || rawDesc.includes("#خصائص:") || rawDesc.includes("#تخزين:") || rawDesc.includes("#مصدر:") || rawDesc.includes("#تغذية:")) {
    // Extract Tags
    const tagsMatch = rawDesc.match(/#وسوم:\s*([^\n]+)/);
    if (tagsMatch && tagsMatch[1]) {
      tags.push(...tagsMatch[1].split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean));
    }

    // Extract Characteristics
    const charMatch = rawDesc.match(/#خصائص:\s*([\s\S]*?)(?=(#|$))/);
    if (charMatch && charMatch[1]) {
      const items = charMatch[1]
        .split("\n")
        .map((l) => l.replace(/^[-•*✓]\s*/, "").trim())
        .filter(Boolean);
      if (items.length > 0 && characteristics.length === 0) {
        characteristics.push(...items);
      }
    }

    // Extract Storage
    const storageMatch = rawDesc.match(/#تخزين:\s*([^\n]+)/);
    if (storageMatch && storageMatch[1] && !storageInstructions) {
      storageInstructions = storageMatch[1].trim();
    }

    // Extract Origin
    const originMatch = rawDesc.match(/#مصدر:\s*([^\n]+)/);
    if (originMatch && originMatch[1] && !originSource) {
      originSource = originMatch[1].trim();
    }

    // Extract Nutrition
    const nutrMatch = rawDesc.match(/#تغذية:\s*([^\n]+)/);
    if (nutrMatch && nutrMatch[1]) {
      const parts = nutrMatch[1].split("|").map((p) => p.trim());
      for (const p of parts) {
        if (p.includes("سعرات:") || p.includes("سعرة:")) nutrition.calories = p.split(":")[1]?.trim() || nutrition.calories;
        if (p.includes("بروتين:")) nutrition.protein = p.split(":")[1]?.trim() || nutrition.protein;
        if (p.includes("كربوهيدرات:") || p.includes("كارب:")) nutrition.carbs = p.split(":")[1]?.trim() || nutrition.carbs;
        if (p.includes("ألياف:")) nutrition.fiber = p.split(":")[1]?.trim() || nutrition.fiber;
        if (p.includes("دهون:")) nutrition.fats = p.split(":")[1]?.trim() || nutrition.fats;
      }
    }

    // Clean main description
    cleanDesc = rawDesc
      .replace(/#وسوم:[\s\S]*?(?=(#[a-zA-Z\u0600-\u06FF]|$))/g, "")
      .replace(/#خصائص:[\s\S]*?(?=(#[a-zA-Z\u0600-\u06FF]|$))/g, "")
      .replace(/#تخزين:[\s\S]*?(?=(#[a-zA-Z\u0600-\u06FF]|$))/g, "")
      .replace(/#مصدر:[\s\S]*?(?=(#[a-zA-Z\u0600-\u06FF]|$))/g, "")
      .replace(/#تغذية:[\s\S]*?(?=(#[a-zA-Z\u0600-\u06FF]|$))/g, "")
      .trim();
  }

  // Fallbacks based on category/name if still empty
  const name = product.name || "";
  if (!cookingTip) {
    if (name.includes("لحم") || name.includes("كفتة") || name.includes("فراخ") || name.includes("دجاج")) {
      cookingTip = "نصيحة الشيف: للحصول على أفضل مذاق وطراوة، يُتبل اللحم قبل الطهي بنصف ساعة مع قليل من زيت الزيتون والبهارات الطازجة.";
    } else if (name.includes("جبن") || name.includes("لبن") || name.includes("قشطة") || name.includes("زبادي")) {
      cookingTip = "نصيحة الشيف: يُقدم بارداً مع رشة زعتر بري وزيت زيتون بكر وخبز بلدي ساخن لوجبة إفطار متكاملة.";
    } else {
      cookingTip = "نصيحة الشيف: يُفضل استخدامه طازجاً في وصفاتك اليومية لإبراز النكهة الطبيعية الغنية والقيمة الغذائية العالية.";
    }
  }

  if (characteristics.length === 0) {
    if (name.includes("لحم") || name.includes("دجاج") || name.includes("فراخ")) {
      characteristics.push("لحوم بلدية طازجة 100%", "ذبح وتجهيز يومي معتمد", "إشراف ورقابة بيطرية كاملة");
    } else if (name.includes("جبن") || name.includes("حليب") || name.includes("لبن")) {
      characteristics.push("ألبان طبيعية 100%", "غني بالكالسيوم والبروتينات", "خالي من الزيوت النباتية المهدرجة");
    } else {
      characteristics.push("طبيعي وطازج 100%", "منتقى بعناية من أفضل المزارع", "تغليف صحي آمن ومحكم");
    }
  }

  if (!storageInstructions) {
    if (name.includes("لحم") || name.includes("دجاج") || name.includes("فراخ")) {
      storageInstructions = "يُحفظ مبرداً عند 0 إلى 2 مئوية للاستهلاك خلال يومين، أو يُجمد عند -18 مئوية.";
    } else if (name.includes("جبن") || name.includes("حليب") || name.includes("لبن")) {
      storageInstructions = "يُحفظ في الثلاجة في درجة حرارة 2 - 5 مئوية داخل عبوة محكمة الإغلاق.";
    } else {
      storageInstructions = "يُحفظ في مكان جاف وبارد أو في درج الثلاجة لضمان بقائه نضراً وطازجاً.";
    }
  }

  if (!originSource) {
    originSource = "مزارع ومصادر محلية مصرية معتمدة بأعلى معايير الجودة والرقابة الصحية";
  }

  return {
    cleanDescription: cleanDesc || product.name,
    cookingTip,
    characteristics,
    storageInstructions,
    originSource,
    nutritionalInfo: nutrition,
    tags,
  };
}

/**
 * دالة لتجميع البيانات في نص الوصف المنظم لحفظها
 */
export function formatProductDescriptionWithMetadata(
  cleanDescription: string,
  meta: {
    characteristics?: string[];
    storageInstructions?: string;
    originSource?: string;
    nutritionalInfo?: {
      calories?: string;
      protein?: string;
      carbs?: string;
      fiber?: string;
      fats?: string;
    };
    tags?: string[];
  },
): string {
  const parts: string[] = [cleanDescription.trim()];

  if (meta.characteristics && meta.characteristics.length > 0) {
    parts.push(`\n\n#خصائص:\n${meta.characteristics.map((c) => `- ${c}`).join("\n")}`);
  }

  if (meta.storageInstructions?.trim()) {
    parts.push(`\n#تخزين: ${meta.storageInstructions.trim()}`);
  }

  if (meta.originSource?.trim()) {
    parts.push(`\n#مصدر: ${meta.originSource.trim()}`);
  }

  if (meta.nutritionalInfo) {
    const nut = meta.nutritionalInfo;
    const nutParts: string[] = [];
    if (nut.calories) nutParts.push(`سعرات: ${nut.calories}`);
    if (nut.protein) nutParts.push(`بروتين: ${nut.protein}`);
    if (nut.carbs) nutParts.push(`كربوهيدرات: ${nut.carbs}`);
    if (nut.fiber) nutParts.push(`ألياف: ${nut.fiber}`);
    if (nut.fats) nutParts.push(`دهون: ${nut.fats}`);
    if (nutParts.length > 0) {
      parts.push(`\n#تغذية: ${nutParts.join(" | ")}`);
    }
  }

  if (meta.tags && meta.tags.length > 0) {
    parts.push(`\n#وسوم: ${meta.tags.join(", ")}`);
  }

  return parts.join("").trim();
}
