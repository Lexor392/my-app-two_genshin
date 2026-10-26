import { describe, expect, it } from "vitest";
import { countRollSessions, createRollHistoryEntries } from "./rollHistory";

describe("reroll history statistics", () => {
  it("stores every character drawn in one session while counting one reroll", () => {
    const timestamp = "2026-10-26T10:00:00.000Z";
    const results = [
      { id: "a", name: "A", rarity: 5 },
      { id: "b", name: "B", rarity: 4 },
      { id: "c", name: "C", rarity: 5 },
      { id: "d", name: "D", rarity: 4 },
    ];
    const entries = createRollHistoryEntries("characters", results, timestamp);

    expect(entries).toHaveLength(4);
    expect(new Set(entries.map((entry) => entry.rollId)).size).toBe(1);
    expect(countRollSessions(entries)).toBe(1);
    expect(countRollSessions(entries, (entry) => entry.rarity === 5)).toBe(1);
  });

  it("counts character and boss rerolls independently", () => {
    const characterResults = createRollHistoryEntries("characters", [{ id: "a" }, { id: "b" }], "2026-10-26T10:00:00Z");
    const bossResult = createRollHistoryEntries("bosses", { id: "boss" }, "2026-10-26T10:01:00Z");
    const entries = [...characterResults, ...bossResult];

    expect(countRollSessions(entries)).toBe(2);
    expect(countRollSessions(entries, (entry) => entry.stage === "characters")).toBe(1);
    expect(countRollSessions(entries, (entry) => entry.stage === "bosses")).toBe(1);
  });
});
