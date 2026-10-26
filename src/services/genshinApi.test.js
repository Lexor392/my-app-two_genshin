import { describe, expect, it } from "vitest";
import { getCharacterImageCandidates, getEnemyImageCandidates, repairWikiImageUrl } from "./genshinApi";

describe("Genshin image sources", () => {
  it("prioritizes the working official icon and preserves canonical character wiki URLs", () => {
    const candidates = getCharacterImageCandidates({
      filename_icon: "UI_AvatarIcon_Barbara",
      portrait: "https://static.wikia.nocookie.net/gensin-impact/images/4/4a/Character_Barbara_Portrait.png",
    });

    expect(candidates[0]).toBe("https://upload-os-bbs.mihoyo.com/game_record/genshin/character_icon/UI_AvatarIcon_Barbara.png");
    expect(candidates.some((url) => url.includes("api.ambr.top") || url.includes("api.hakush.in"))).toBe(false);
    expect(candidates).toContain("https://static.wikia.nocookie.net/gensin-impact/images/4/4a/Character_Barbara_Portrait.png");
    expect(candidates.some((url) => url.includes("/genshin-impact/"))).toBe(false);
  });

  it("resolves both Traveler icon filenames to their separate official portraits", () => {
    const aether = getCharacterImageCandidates({ filename_icon: "UI_AvatarIcon_PlayerBoy" });
    const lumine = getCharacterImageCandidates({ filename_icon: "UI_AvatarIcon_PlayerGirl" });
    expect(aether[0]).toBe("https://upload-os-bbs.mihoyo.com/game_record/genshin/character_icon/UI_AvatarIcon_PlayerBoy.png");
    expect(lumine[0]).toBe("https://upload-os-bbs.mihoyo.com/game_record/genshin/character_icon/UI_AvatarIcon_PlayerGirl.png");
    expect(aether[0]).not.toBe(lumine[0]);
  });

  it("prioritizes hosted monster icons and keeps CDN fallbacks for boss artwork", () => {
    const candidates = getEnemyImageCandidates({ filename_icon: "UI_MonsterIcon_Dvalin" });
    expect(candidates[0]).toBe("https://raw.githubusercontent.com/CMHopeSunshine/GenshinWikiMap/master/resources/monster/UI_MonsterIcon_Dvalin.png");
    expect(candidates).toContain("https://api.ambr.top/assets/UI/UI_MonsterIcon_Dvalin.png");
    expect(candidates).toContain("https://api.hakush.in/gi/UI/UI_MonsterIcon_Dvalin.webp");
    expect(getEnemyImageCandidates({ image: "https://static.wikia.nocookie.net/genshin-impact/images/1/2c/Dvalin.png" }))
      .toEqual(["https://static.wikia.nocookie.net/gensin-impact/images/1/2c/Dvalin.png"]);
  });

  it("preserves the canonical Fandom image path and repairs the incorrect spelling", () => {
    expect(repairWikiImageUrl("https://static.wikia.nocookie.net/gensin-impact/images/9/91/Enemy_Dvalin.png"))
      .toBe("https://static.wikia.nocookie.net/gensin-impact/images/9/91/Enemy_Dvalin.png");
    expect(repairWikiImageUrl("https://static.wikia.nocookie.net/genshin-impact/images/9/91/Enemy_Dvalin.png"))
      .toBe("https://static.wikia.nocookie.net/gensin-impact/images/9/91/Enemy_Dvalin.png");
    expect(repairWikiImageUrl("https://static.wikia.nocookie.net/gensin-impact/images/a/a3/Enemy_Tenebrous_Papilla.png/revision/latest/scale-to-width-down/288?cb=1"))
      .toBe("https://static.wikia.nocookie.net/gensin-impact/images/a/a3/Enemy_Tenebrous_Papilla.png/revision/latest?cb=1");
  });
});
