const STORAGE_KEY = "genshin-random-lab-support-attempts-v1";
const COOLDOWN_MS = 30_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 8;

export function claimSupportSubmission(now = Date.now(), storage = globalThis.localStorage) {
  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    const attempts = Array.isArray(stored)
      ? stored.filter((time) => Number.isFinite(time) && now - time < DAY_MS && time <= now)
      : [];

    if (attempts.some((time) => now - time < COOLDOWN_MS)) return false;
    if (attempts.filter((time) => now - time < HOUR_MS).length >= MAX_PER_HOUR) return false;
    if (attempts.length >= MAX_PER_DAY) return false;

    storage.setItem(STORAGE_KEY, JSON.stringify([...attempts, now]));
    return true;
  } catch {
    // FormSubmit's server-side CAPTCHA and spam checks remain active if storage is unavailable.
    return true;
  }
}

export function isSupportHoneypotFilled(value) {
  return typeof value === "string" && value.trim().length > 0;
}
