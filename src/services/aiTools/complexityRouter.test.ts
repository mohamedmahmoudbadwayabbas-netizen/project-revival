import { describe, it, expect } from "vitest";
import { pickNebrasModel } from "./complexityRouter";

describe("pickNebrasModel", () => {
  it("uses the light model for a simple stock question", () => {
    expect(pickNebrasModel("كم كيلو طماطم متاح؟")).toBe("gemini-3.1-flash-lite");
  });
  it("uses gemini-4-hydrogen for diagnosis", () => {
    expect(pickNebrasModel("حلل أخطاء نواة الأسبوع ده")).toBe("gemini-4-hydrogen");
  });
});
