import { describe, expect, test } from "vitest";
import { getBrowserLanguage, getLanguageForCountry } from "./locale";

describe("automatic language selection", () => {
  test.each([
    ["RU", "ru"], ["BY", "ru"], ["CN", "zh"], ["JP", "ja"], ["KR", "ko"], ["PL", "en"], ["US", "en"],
  ])("maps %s to %s", (country, language) => {
    expect(getLanguageForCountry(country)).toBe(language);
  });

  test("uses browser language as a fallback and English for unsupported locales", () => {
    expect(getBrowserLanguage(["ja-JP", "en-US"], "")).toBe("ja");
    expect(getBrowserLanguage(["pl-PL"], "")).toBe("en");
    expect(getBrowserLanguage(["en-US"], "Asia/Shanghai")).toBe("zh");
  });
});
