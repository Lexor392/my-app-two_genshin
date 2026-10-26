import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bossDetails from "./bossDetails.json" with { type: "json" };

describe("local boss artwork", () => {
	it("keeps image keys and validates every bundled portrait", () => {
    expect(Object.keys(bossDetails)).toHaveLength(113);
    expect(Object.values(bossDetails).every((record) => Object.hasOwn(record, "image"))).toBe(true);
    expect(Object.values(bossDetails).every((record) => Object.hasOwn(record, "map"))).toBe(true);
    for (const asset of Object.values(bossDetails).flatMap((record) => [record.image, record.map]).filter(Boolean)) {
      const filePath = `public/${asset}`;
      expect(existsSync(filePath)).toBe(true);
      expect(statSync(filePath).size).toBeGreaterThan(300);
    }
  });
});
