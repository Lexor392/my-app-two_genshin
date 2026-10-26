import { afterEach, describe, expect, it, vi } from "vitest";
import bossDetails from "../data/bossDetails.json" with { type: "json" };
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
    expect(andrius.description).toBe(bossDetails.lupusboreasdominatorofwolves.description.en);
    expect(andrius.mapImage).toMatch(/assets\/boss-maps\/lupusboreasdominatorofwolves\.png$/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("has useful local details for every boss entry", () => {
    const records = Object.values(bossDetails);
    expect(records).toHaveLength(113);
    expect(records.every((record) => (
      record.description?.ru && record.description?.en && record.description?.zh && record.description?.ja && record.description?.ko
      && (record.location?.region || record.location?.area || record.map)
    ))).toBe(true);
    expect(records.every((record) => (
      record.names?.ru && record.names?.en && record.names?.zh && record.names?.ja && record.names?.ko
      && record.category
      && record.details && ["ru", "en", "zh", "ja", "ko"].every((locale) => Object.hasOwn(record.details, locale))
      && record.localizedLocation && ["ru", "en", "zh", "ja", "ko"].every((locale) => (
        Object.values(record.localizedLocation[locale] || {}).some(Boolean)
      ))
    ))).toBe(true);
  });

  it("uses the selected language for localized boss names and locations", async () => {
    const andrius = await fetchHoverDetails(
      { id: "lupusboreasdominatorofwolves", name: "Lupus Boreas, Dominator of Wolves" },
      "bosses",
      "ru"
    );

    expect(andrius.title).toBe(bossDetails.lupusboreasdominatorofwolves.names.ru);
    expect(andrius.region).toBe(bossDetails.lupusboreasdominatorofwolves.localizedLocation.ru.region);
    expect(andrius.additionalInfo).toBe("");
  });
});
