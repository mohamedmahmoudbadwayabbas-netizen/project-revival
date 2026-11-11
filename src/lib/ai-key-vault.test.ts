import { describe, expect, it } from "vitest";
import { groupByProvider, usableKeys, type VaultKey } from "./ai-key-vault.server";

const k = (p: Partial<VaultKey>): VaultKey => ({
  id: "x", provider: "dahl", label: null, api_key: "k1", base_url: null, model: null, priority: 100,
  status: "active", cooldown_until: null, last_error: null, last_used_at: null, total_requests: 0,
  created_at: "", ...p,
});

describe("ai key vault", () => {
  it("skips disabled, invalid and cooling keys but keeps exhausted-after-cooldown", () => {
    const now = Date.now();
    const keys = [
      k({ api_key: "a" }),
      k({ api_key: "b", status: "disabled" }),
      k({ api_key: "c", status: "invalid" }),
      k({ api_key: "d", status: "cooling_down", cooldown_until: new Date(now + 60000).toISOString() }),
      k({ api_key: "e", status: "cooling_down", cooldown_until: new Date(now - 1000).toISOString() }),
    ];
    expect(usableKeys(keys, now).map((x) => x.api_key)).toEqual(["a", "e"]);
  });
  it("groups keys per provider in priority order: Dahl then xKiro", () => {
    const g = groupByProvider([
      k({ api_key: "d1" }), k({ api_key: "d2" }),
      k({ api_key: "x1", provider: "xkiro" }),
    ]);
    expect(g.map((x) => x.provider)).toEqual(["dahl", "xkiro"]);
    expect(g[0].keys).toEqual(["d1", "d2"]);
    expect(g[1].baseUrl).toBe("https://api.xkiro.com/v1");
  });
});
