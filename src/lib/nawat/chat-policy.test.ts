import { describe, expect, it } from "vitest";
import { packMessages, unpackMessages } from "./thread-store";
import type { NawatMessage } from "./chat-engine";

describe("chat persistence", () => {
  it("restores conversation context and the model's real thinking after reload", () => {
    const messages: NawatMessage[] = [{ id: "first", role: "user", content: "اسمي محمد", createdAt: "2026-11-04" }, { id: "second", role: "assistant", content: "أهلا محمد", thinking: "العميل اسمه محمد", createdAt: "2026-11-04" }];
    const restored = unpackMessages(packMessages(messages));
    expect(restored.map((m) => m.content)).toEqual(["اسمي محمد", "أهلا محمد"]);
    expect(restored[1].thinking).toBe("العميل اسمه محمد");
  });
});
