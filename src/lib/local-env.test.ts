import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadLocalEnvOverrides, parseEnvContent } from "./local-env.server";

describe("local env override loader", () => {
  it("parses standard lines, quotes, export statements, and ignores comments", () => {
    const parsed = parseEnvContent(`
      # comment line
      SUPABASE_URL=https://example.supabase.co
      export VITE_SUPABASE_URL="https://example.supabase.co"
      EMPTY_VAL=
      QUOTED='abc=123'
    `);
    expect(parsed).toEqual({
      SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      EMPTY_VAL: "",
      QUOTED: "abc=123",
    });
  });

  it("overrides pre-existing targetEnv values when .env.local exists", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      fs.writeFileSync(
        path.join(tmpDir, ".env.local"),
        "SUPABASE_URL=https://new-project.supabase.co\nNEW_KEY=value_1\n",
      );
      const mockEnv: Record<string, string | undefined> = {
        SUPABASE_URL: "https://old-project.supabase.co",
        UNTOUCHED: "keep_me",
      };
      const applied = loadLocalEnvOverrides(tmpDir, mockEnv);
      expect(applied).toEqual({
        SUPABASE_URL: "https://new-project.supabase.co",
        NEW_KEY: "value_1",
      });
      expect(mockEnv.SUPABASE_URL).toBe("https://new-project.supabase.co");
      expect(mockEnv.NEW_KEY).toBe("value_1");
      expect(mockEnv.UNTOUCHED).toBe("keep_me");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
