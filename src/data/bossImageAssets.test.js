import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bossImageAssets from "./bossImageAssets.json" with { type: "json" };

describe("local boss artwork", () => {
  it("has a bundled image for every current boss", () => {
    expect(Object.keys(bossImageAssets)).toHaveLength(111);
    for (const asset of Object.values(bossImageAssets)) {
      const filePath = `public/${asset}`;
      expect(existsSync(filePath)).toBe(true);
      expect(statSync(filePath).size).toBeGreaterThan(300);
    }
  });
});
