import { describe, expect, it } from "vitest";
import { extractProductPicks, splitThinking, stripLeakedPlanning } from "./chat-parse";

describe("splitThinking", () => {
  it("separates real model thinking from the visible reply", () => {
    const r = splitThinking("<think>العميل عايز غدا لـ ٤</think>أكيد! دي اقتراحاتي");
    expect(r.thinking).toBe("العميل عايز غدا لـ ٤");
    expect(r.text).toBe("أكيد! دي اقتراحاتي");
  });
  it("returns no thinking for a plain chat reply", () => {
    expect(splitThinking("أهلاً بيك!")).toEqual({ thinking: "", text: "أهلاً بيك!" });
  });
});

describe("extractProductPicks", () => {
  it("reads the products block and removes it from the text", () => {
    const r = extractProductPicks(
      'خد دول:\n```products\n[{"id":"a","quantity":2,"reason":"للغدا"}]\n```',
    );
    expect(r.text).toBe("خد دول:");
    expect(r.picks).toEqual([{ id: "a", quantity: 2, reason: "للغدا" }]);
  });
  it("has no picks for normal conversation", () => {
    expect(extractProductPicks("ازيك").picks).toEqual([]);
  });
});

import { recoverAnswerFromThinking as recover } from "./chat-parse";
describe("recoverAnswerFromThinking", () => {
  it("splits reasoning from a markdown answer", () => {
    const r = recover("المستخدم بيسأل عن الخضار.\n# أفضل طرق الحفظ\n- في الثلاجة");
    expect(r.thinking).toBe("المستخدم بيسأل عن الخضار.");
    expect(r.text).toBe("# أفضل طرق الحفظ\n- في الثلاجة");
  });
  it("uses the first Arabic sentence when an unclosed thought has no blank line", () => {
    const r = recover("بفهم السؤال. دي الإجابة المناسبة ليك");
    expect(r.thinking).toBe("بفهم السؤال.");
    expect(r.text).toBe("دي الإجابة المناسبة ليك");
  });
});

describe("stripLeakedPlanning", () => {
  it("moves planning lines before the first heading into thinking", () => {
    const r = stripLeakedPlanning(
      "وأتكلم بالعامية المصرية زي ما مطلوب مني.\n# فراخ البلدي vs فراخ المزارع\nنص",
    );
    expect(r.leaked).toBe("وأتكلم بالعامية المصرية زي ما مطلوب مني.");
    expect(r.text.startsWith("# فراخ")).toBe(true);
  });
  it("keeps a normal intro line", () => {
    const r = stripLeakedPlanning("أهلاً بيك!\n# العنوان");
    expect(r.leaked).toBe("");
  });
});
