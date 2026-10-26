import { describe, expect, test } from "vitest";
import { sortCharactersNewestFirst } from "./characterReleaseOrder";

describe("character release ordering", () => {
  test("places recently released characters before older catalog entries", () => {
    const sorted = sortCharactersNewestFirst([
      { id: "amber", name: "Amber" },
      { id: "varka", name: "Varka" },
      { id: "vesna", name: "Vesna" },
      { id: "vodyanitsa", name: "Vodyanitsa" },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(["vesna", "vodyanitsa", "varka", "amber"]);
  });

  test("uses actual release dates when the data provides them", () => {
    const sorted = sortCharactersNewestFirst([
      { id: "amber", name: "Amber", releaseDate: "2020-09-28" },
      { id: "venti", name: "Venti", releaseDate: "2020-09-30" },
      { id: "lisa", name: "Lisa", releaseDate: "2020-09-28" },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(["venti", "amber", "lisa"]);
  });
});
