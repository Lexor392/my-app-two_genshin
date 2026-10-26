import { afterEach, describe, expect, it, vi } from "vitest";
import bossHoverDetails from "../data/bossHoverDetails.json" with { type: "json" };
import { fetchHoverDetails } from "./hoverDetails";

describe("boss hover details", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads boss location and downloaded map from the local catalog", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const andrius = await fetchHoverDetails(
      { id: "lupusboreasdominatorofwolves", name: "Lupus Boreas, Dominator of Wolves" },
      "bosses",
      "en"
    );

    expect(andrius.region).toBe("Mondstadt");
    expect(andrius.area).toBe("Windwail Highland");
    expect(andrius.subarea).toBe("Wolvendom");
    expect(andrius.mapImage).toMatch(/assets\/boss-maps\/lupusboreasdominatorofwolves\.png$/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("has useful local details for every boss entry", () => {
    const records = Object.values(bossHoverDetails);
    expect(records).toHaveLength(113);
    expect(records.every((record) => (
      record.description || record.location?.region || record.location?.area || record.map
    ))).toBe(true);
  });
});
