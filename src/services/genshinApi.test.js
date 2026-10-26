import { describe, expect, it } from "vitest";
import { getCharacterImageCandidates, getEnemyImageCandidates, repairWikiImageUrl } from "./genshinApi";

describe("Genshin image sources", () => {
  it("keeps a current Ambr icon and repairs legacy character wiki URLs", () => {
    const candidates = getCharacterImageCandidates({
      filename_icon: "UI_AvatarIcon_Barbara",
      portrait: "https://static.wikia.nocookie.net/gensin-impact/images/4/4a/Character_Barbara_Portrait.png",
    });

    expect(candidates).toContain("https://api.ambr.top/assets/UI/UI_AvatarIcon_Barbara.png");
    expect(candidates).toContain("https://static.wikia.nocookie.net/genshin-impact/images/4/4a/Character_Barbara_Portrait.png");
    expect(candidates.some((url) => url.includes("/gensin-impact/"))).toBe(false);
  });

  it("provides Ambr image fallbacks for boss artwork", () => {
    const candidates = getEnemyImageCandidates({
      filename_icon: "UI_MonsterIcon_Dvalin",
      filename_investigationIcon: "UI_MonsterIcon_Dvalin",
    });

    expect(candidates).toContain("https://api.ambr.top/assets/UI/UI_MonsterIcon_Dvalin.png");
  });

  it("repairs Fandom API thumbnail URLs returned for bosses", () => {
    expect(repairWikiImageUrl("https://static.wikia.nocookie.net/gensin-impact/images/9/91/Enemy_Dvalin.png"))
      .toBe("https://static.wikia.nocookie.net/genshin-impact/images/9/91/Enemy_Dvalin.png");
  });
});
