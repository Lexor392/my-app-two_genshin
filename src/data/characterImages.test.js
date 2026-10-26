import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import characterImageManifest from "./characterImageManifest.json" with { type: "json" };

describe("bundled character images", () => {
  it("ships a local portrait for every character in the current catalog", () => {
    const entries = Object.entries(characterImageManifest);
    expect(entries.length).toBeGreaterThanOrEqual(120);
    for (const [, asset] of entries) {
      const filePath = `public/${asset}`;
      expect(existsSync(filePath)).toBe(true);
      expect(statSync(filePath).size).toBeGreaterThan(500);
    }
  });
});
