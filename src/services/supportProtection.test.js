import { describe, expect, test, vi } from "vitest";
import { claimSupportSubmission, isSupportHoneypotFilled } from "./supportProtection";

const createStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  };
};

describe("support form spam protection", () => {
  test("limits repeated submissions and daily volume per browser", () => {
    const storage = createStorage();
    const now = 1_800_000_000_000;

    expect(claimSupportSubmission(now, storage)).toBe(true);
    expect(claimSupportSubmission(now + 10_000, storage)).toBe(false);
    expect(claimSupportSubmission(now + 31_000, storage)).toBe(true);
    expect(claimSupportSubmission(now + 62_000, storage)).toBe(true);
    expect(claimSupportSubmission(now + 93_000, storage)).toBe(false);
    expect(claimSupportSubmission(now + 60 * 60 * 1000, storage)).toBe(true);
  });

  test("detects a filled honeypot and tolerates unavailable storage", () => {
    expect(isSupportHoneypotFilled(" ")).toBe(false);
    expect(isSupportHoneypotFilled("https://spam.example")).toBe(true);

    const brokenStorage = { getItem: vi.fn(() => { throw new Error("blocked"); }) };
    expect(claimSupportSubmission(Date.now(), brokenStorage)).toBe(true);
  });
});
